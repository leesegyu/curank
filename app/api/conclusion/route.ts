import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { fetchNaverScoreData } from "@/lib/search";
import { getKeywordTrend } from "@/lib/datalab";
import { classifyKeywordIntent } from "@/lib/intent-classifier";
import { calcFactorScores, type FactorInput, type Platform } from "@/lib/factor-model";
import { generateConclusion } from "@/lib/conclusion-generator";
import { buildTitlesRuleBased } from "@/lib/title-builder";
import { mineKeywordsFromTitles } from "@/lib/title-miner";
import { classifyKeywordV2 } from "@/lib/ontology";
import { getCategoryPool } from "@/lib/category-pool";
import { getUsage, getPlanLimits, isAdmin } from "@/lib/usage";
import { v2Cache, V2_CACHE_TYPE, type KeywordV2 } from "@/app/api/keywords-v2/route";
import { getL2Cache } from "@/lib/cache-db";
import { validateKeyword } from "@/lib/keyword-validator";
import NodeCache from "node-cache";

const titleMineCache = new NodeCache({ stdTTL: 60 * 60 * 6, maxKeys: 500 });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/conclusion?keyword=X&platform=naver
 *   → 저장된 결론 반환 (없으면 cached: false)
 *
 * GET /api/conclusion?keyword=X&platform=naver&generate=true
 *   → 새로 생성 + DB 저장 + 반환
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  }

  const rawKeyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "naver") as Platform;
  const shouldGenerate = req.nextUrl.searchParams.get("generate") === "true";
  const shouldRegenerate = req.nextUrl.searchParams.get("regenerate") === "true";

  const validation = validateKeyword(rawKeyword);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const keyword = rawKeyword as string;

  const userId = session.user.id as string;

  // ── 재생성 한도 정보 헬퍼 ──
  async function getRegenInfo() {
    const usage = await getUsage(userId);
    // 관리자: 키워드당 3회 재생성 허용 (이전: Infinity)
    const limits = isAdmin(userId)
      ? { regeneration: 3 }
      : getPlanLimits(usage?.plan ?? "free");
    const { data: row } = await supabaseAdmin
      .from("analysis_conclusions")
      .select("regeneration_count")
      .eq("user_id", userId)
      .eq("keyword", keyword)
      .eq("platform", platform)
      .single();
    const used = row?.regeneration_count ?? 0;
    return { limit: limits.regeneration, used, plan: usage?.plan ?? "free" };
  }

  // ── 조회 모드: 저장된 결론 반환 ──
  if (!shouldGenerate && !shouldRegenerate) {
    const { data, error: selectError } = await supabaseAdmin
      .from("analysis_conclusions")
      .select("result, generated_at, regeneration_count")
      .eq("user_id", userId)
      .eq("keyword", keyword)
      .eq("platform", platform)
      .single();

    if (selectError) {
      console.log("[conclusion] lookup:", { userId, keyword, platform, error: selectError.message });
    }

    if (data) {
      const regen = await getRegenInfo();
      return NextResponse.json({
        ...data.result,
        generatedAt: data.generated_at,
        cached: true,
        regeneration: { used: regen.used, limit: regen.limit, plan: regen.plan },
      });
    }

    return NextResponse.json({ cached: false, combinations: null });
  }

  // ── 재생성 모드: plan 한도 검사 ──
  if (shouldRegenerate) {
    const regen = await getRegenInfo();
    if (regen.limit <= 0) {
      return NextResponse.json({
        error: "무료 플랜은 결론 재생성을 지원하지 않습니다. 업그레이드해주세요.",
        regeneration: { used: regen.used, limit: regen.limit, plan: regen.plan },
      }, { status: 403 });
    }
    if (regen.used >= regen.limit) {
      return NextResponse.json({
        error: `재생성 한도 초과 (${regen.used}/${regen.limit}회)`,
        regeneration: { used: regen.used, limit: regen.limit, plan: regen.plan },
      }, { status: 403 });
    }
    // 한도 OK → 아래 생성 로직으로 진행
  }

  // ── 생성 모드: 이미 있으면 기존 결과 반환 (재생성이 아닌 경우) ──
  if (!shouldRegenerate) {
    const { data: existing } = await supabaseAdmin
      .from("analysis_conclusions")
      .select("result, generated_at")
      .eq("user_id", userId)
      .eq("keyword", keyword)
      .eq("platform", platform)
      .single();

    if (existing) {
      const regen = await getRegenInfo();
      return NextResponse.json({
        ...existing.result,
        generatedAt: existing.generated_at,
        cached: true,
        regeneration: { used: regen.used, limit: regen.limit, plan: regen.plan },
      });
    }
  }

  try {
    // 1. 6 Factor 데이터 수집
    const [naverScore, trend] = await Promise.allSettled([
      fetchNaverScoreData(keyword),
      getKeywordTrend(keyword),
    ]);

    const ns = naverScore.status === "fulfilled" ? naverScore.value : null;
    const tr = trend.status === "fulfilled" ? trend.value : null;

    const intent = classifyKeywordIntent(keyword);

    let recentSlope = 0;
    let longSlope = 0;
    if (tr?.weeklyData && tr.weeklyData.length >= 8) {
      const wd = tr.weeklyData;
      const recent4 = wd.slice(-4).reduce((a, b) => a + b.ratio, 0) / 4;
      const prev4 = wd.slice(-8, -4).reduce((a, b) => a + b.ratio, 0) / 4;
      recentSlope = recent4 - prev4;
      if (wd.length >= 16) {
        const recent8 = wd.slice(-8).reduce((a, b) => a + b.ratio, 0) / 8;
        const prev8 = wd.slice(-16, -8).reduce((a, b) => a + b.ratio, 0) / 8;
        longSlope = recent8 - prev8;
      }
    } else if (tr?.data && tr.data.length >= 4) {
      const md = tr.data;
      const recent2 = md.slice(-2).reduce((a, b) => a + b.ratio, 0) / 2;
      const prev2 = md.slice(-4, -2).reduce((a, b) => a + b.ratio, 0) / 2;
      recentSlope = recent2 - prev2;
      if (md.length >= 6) {
        const recent3 = md.slice(-3).reduce((a, b) => a + b.ratio, 0) / 3;
        const prev3 = md.slice(-6, -3).reduce((a, b) => a + b.ratio, 0) / 3;
        longSlope = recent3 - prev3;
      }
    }

    const factorInput: FactorInput = {
      keyword,
      totalCount: ns?.totalCount ?? 0,
      coupangRatio: ns?.coupangRatio ?? 0,
      priceStats: ns?.priceStats ?? { min: 0, max: 0, avg: 0 },
      compIdx: ns?.compIdx,
      intentScore: intent.intentScore,
      specificityScore: intent.specificityScore,
      trendDirection: tr?.direction ?? "안정",
      trendSlope: recentSlope,
      longSlope,
      monthlyVolume: (tr?.current ?? 0) * 1000,
      trendPeak: tr?.peak ?? 0,
      trendCurrent: tr?.current ?? 0,
      products: [],
      entryBarrier: null,
      reviewBarrier: null,
      rocketBarrier: null,
      dominanceScore: null,
      rocketRatio: null,
    };

    const factorScores = calcFactorScores(factorInput, platform);

    // 2. 추천 키워드 수집 — 캐시 우선 (L1 → L2 → 최후 fetch)
    let v2Keywords: KeywordV2[] = [];
    const l1 = v2Cache.get<KeywordV2[]>(keyword);
    if (l1) {
      v2Keywords = l1;
    } else {
      const l2 = await getL2Cache<KeywordV2[]>(keyword, V2_CACHE_TYPE);
      if (l2) {
        v2Cache.set(keyword, l2);
        v2Keywords = l2;
      } else {
        // 최후 수단: 내부 fetch (analyze-run SSE 이후엔 거의 발생 안 함)
        const kwUrl = new URL("/api/keywords-v2", req.nextUrl.origin);
        kwUrl.searchParams.set("keyword", keyword);
        const kwRes = await fetch(kwUrl.toString(), {
          headers: { cookie: req.headers.get("cookie") ?? "" },
        });
        const kwData = kwRes.ok ? await kwRes.json() : { keywords: [] };
        v2Keywords = (kwData.keywords ?? []) as KeywordV2[];
      }
    }
    const recommendedKeywords = v2Keywords
      .slice(0, 15)
      .map((k: { keyword: string; score: number }) => ({
        keyword: k.keyword,
        score: k.score,
      }));

    // 기회분석 키워드 (scoreChance 기준 상위 10개)
    const opportunityKeywords = [...v2Keywords]
      .sort((a: { scoreChance: number }, b: { scoreChance: number }) => b.scoreChance - a.scoreChance)
      .slice(0, 10)
      .map((k: { keyword: string; scoreChance: number }) => ({
        keyword: k.keyword,
        scoreChance: k.scoreChance,
      }));

    // 3. 크리에이티브 키워드 top1 수집
    let creativeKeyword: string | undefined;
    try {
      const crUrl = new URL("/api/keywords-creative", req.nextUrl.origin);
      crUrl.searchParams.set("keyword", keyword);
      crUrl.searchParams.set("platform", platform);
      const crRes = await fetch(crUrl.toString());
      if (crRes.ok) {
        const crData = await crRes.json();
        const top5 = (crData.keywords ?? []).slice(0, 5);
        if (top5.length > 0) {
          creativeKeyword = top5[0].keyword;
        }
      }
    } catch {
      // 크리에이티브 실패해도 결론 생성은 계속
    }

    // 5. 최종 후보 비교 Top (factor-score-batch 재사용, L1 캐시 HIT 시 추가 비용 0)
    let topAggregatedKeyword:
      | { keyword: string; overallScore: number; topFactorKey: string; topFactorScore: number }
      | undefined;
    try {
      const candidates = [
        keyword,
        ...v2Keywords.slice(0, 5).map((k: { keyword: string }) => k.keyword),
      ];
      const batchUrl = new URL("/api/factor-score-batch", req.nextUrl.origin);
      batchUrl.searchParams.set("keywords", candidates.join(","));
      batchUrl.searchParams.set("platform", platform);
      const batchRes = await fetch(batchUrl.toString());
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        const results: Array<{ keyword: string; factors: Array<{ key: string; score: number }> }> =
          batchData.results ?? [];
        const scored = results
          .map((r) => {
            const avg = r.factors.reduce((sum, f) => sum + f.score, 0) / r.factors.length;
            const topFactor = [...r.factors].sort((a, b) => b.score - a.score)[0];
            return {
              keyword: r.keyword,
              overallScore: Math.round(avg),
              topFactorKey: topFactor?.key ?? "ranking",
              topFactorScore: topFactor?.score ?? 0,
            };
          })
          .sort((a, b) => b.overallScore - a.overallScore);
        if (scored.length > 0) topAggregatedKeyword = scored[0];
      }
    } catch {
      // 실패해도 결론 생성은 계속
    }

    // 6. 세부 유형(합성어) Top1 수집
    let topVariantKeyword: string | undefined;
    try {
      const varUrl = new URL("/api/keywords-variant", req.nextUrl.origin);
      varUrl.searchParams.set("keyword", keyword);
      const varRes = await fetch(varUrl.toString());
      if (varRes.ok) {
        const varData = await varRes.json();
        if (Array.isArray(varData.keywords) && varData.keywords.length > 0) {
          topVariantKeyword = varData.keywords[0].keyword;
        }
      }
    } catch {
      // 실패해도 결론 생성은 계속
    }

    // 7. 규칙 기반 제목+태그 생성 (LLM 미사용)
    //    title-miner로 실제 상위 상품 제목에서 키워드 추출 → 조립
    let titleMinedKeywords = titleMineCache.get<import("@/lib/title-miner").TitleMinedKeyword[]>(keyword);
    if (!titleMinedKeywords) {
      try {
        titleMinedKeywords = await mineKeywordsFromTitles(keyword);
        titleMineCache.set(keyword, titleMinedKeywords);
      } catch {
        titleMinedKeywords = [];
      }
    }

    const ontologyResult = classifyKeywordV2(keyword, platform === "naver" ? "smartstore" : "coupang");
    let ontologyNode: import("@/lib/ontology/types").OntologyNode | null = null;
    let categoryPoolKeywords: import("@/lib/category-pool").CategoryPoolKeyword[] | undefined;
    if (ontologyResult) {
      const { getNodesV2 } = await import("@/lib/ontology");
      const nodes = getNodesV2(ontologyResult.platform);
      ontologyNode = nodes.find((n) => n.id === ontologyResult.path) ?? null;
      try {
        const pool = await getCategoryPool(ontologyResult.path, ontologyResult.platform);
        categoryPoolKeywords = pool?.keywords.slice(0, 50);
      } catch { /* pool 실패해도 계속 */ }
    }

    // 상위 상품에서 브랜드 top 5 추출
    let topBrands: string[] = [];
    try {
      const { searchNaver } = await import("@/lib/naver");
      const shopRes = await searchNaver(keyword, 20);
      const brandCount = new Map<string, number>();
      for (const item of shopRes.items) {
        const b = (item as { brand?: string; maker?: string }).brand || (item as { brand?: string; maker?: string }).maker;
        if (b && b.length >= 2) brandCount.set(b, (brandCount.get(b) ?? 0) + 1);
      }
      topBrands = [...brandCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);
    } catch { /* 브랜드 추출 실패해도 계속 */ }

    let result;
    if (titleMinedKeywords.length > 0 || ontologyNode) {
      // 규칙 기반 생성 (OpenAI 비용 0)
      result = buildTitlesRuleBased({
        keyword, platform, factorScores, recommendedKeywords,
        opportunityKeywords, creativeKeyword,
        topAggregatedKeyword, topVariantKeyword,
        titleMinedKeywords: titleMinedKeywords ?? [],
        ontologyNode,
        categoryPoolKeywords,
        topBrands,
      });
    } else {
      // 폴백: 데이터 부족 시 기존 LLM 사용
      result = await generateConclusion({
        keyword, platform, factorScores, recommendedKeywords,
        opportunityKeywords, creativeKeyword,
        topAggregatedKeyword, topVariantKeyword,
      });
    }

    // 4. DB에 저장 (upsert) + 재생성 카운트 증가
    const now = new Date().toISOString();
    if (shouldRegenerate) {
      // 재생성: 기존 카운트 읽고 +1 업데이트
      const { data: cur } = await supabaseAdmin
        .from("analysis_conclusions")
        .select("regeneration_count")
        .eq("user_id", userId).eq("keyword", keyword).eq("platform", platform)
        .single();
      const newCount = (cur?.regeneration_count ?? 0) + 1;
      const { error: updateErr } = await supabaseAdmin
        .from("analysis_conclusions")
        .update({ result, generated_at: now, regeneration_count: newCount, last_regenerated_at: now })
        .eq("user_id", userId).eq("keyword", keyword).eq("platform", platform);
      if (updateErr) console.error("[conclusion] regenerate update failed:", updateErr.message);
    } else {
      const { error: upsertError } = await supabaseAdmin
        .from("analysis_conclusions")
        .upsert(
          { user_id: userId, keyword, platform, result, generated_at: now },
          { onConflict: "user_id,keyword,platform" }
        );
      if (upsertError) console.error("[conclusion] upsert failed:", upsertError.message);
    }

    const regen = await getRegenInfo();
    return NextResponse.json({
      ...result,
      generatedAt: now,
      cached: false,
      regeneration: { used: regen.used, limit: regen.limit, plan: regen.plan },
    });
  } catch (err) {
    console.error("[conclusion]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "결론 생성 실패" },
      { status: 500 }
    );
  }
}
