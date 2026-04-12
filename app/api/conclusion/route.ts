import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { classifyKeywordIntent } from "@/lib/intent-classifier";
import { calcFactorScores, type FactorInput, type Platform } from "@/lib/factor-model";
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
  const regenComboParam = req.nextUrl.searchParams.get("regenerateCombo");
  const regenComboIdx = regenComboParam !== null ? parseInt(regenComboParam, 10) : -1;

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

  // ── 개별 제안안 재생성 모드 ──
  if (regenComboIdx >= 0) {
    try {
      // 기존 결론 로드
      const { data: existing } = await supabaseAdmin
        .from("analysis_conclusions")
        .select("result, generated_at")
        .eq("user_id", userId).eq("keyword", keyword).eq("platform", platform)
        .single();

      if (!existing?.result) {
        return NextResponse.json({ error: "기존 결론이 없습니다. 먼저 결론을 생성해주세요." }, { status: 400 });
      }

      const prevCombos = (existing.result as { combinations: import("@/lib/conclusion-generator").TitleTagCombo[] }).combinations;
      if (!prevCombos || regenComboIdx >= prevCombos.length) {
        return NextResponse.json({ error: "잘못된 제안안 인덱스" }, { status: 400 });
      }

      // title-miner + ontology 데이터 수집
      let minedKw = titleMineCache.get<import("@/lib/title-miner").TitleMinedKeyword[]>(keyword);
      if (!minedKw) {
        try { minedKw = await mineKeywordsFromTitles(keyword); titleMineCache.set(keyword, minedKw); } catch { minedKw = []; }
      }
      const cls = classifyKeywordV2(keyword, platform === "naver" ? "smartstore" : "coupang");
      let oNode: import("@/lib/ontology/types").OntologyNode | null = null;
      let poolKw: import("@/lib/category-pool").CategoryPoolKeyword[] | undefined;
      if (cls) {
        const { getNodesV2 } = await import("@/lib/ontology");
        oNode = getNodesV2(cls.platform).find((n) => n.id === cls.path) ?? null;
        try { const p = await getCategoryPool(cls.path, cls.platform); poolKw = p?.keywords.slice(0, 50); } catch {}
      }

      // 더미 factorScores (개별 재생성은 제목 조립만 하므로 OK)
      const dummyFactors = {
        overall: 50,
        factors: [
          { key: "ranking", label: "상위노출", score: 50, description: "" },
          { key: "conversion", label: "전환율", score: 50, description: "" },
          { key: "growth", label: "성장성", score: 50, description: "" },
          { key: "profitability", label: "수익성", score: 50, description: "" },
          { key: "entryBarrier", label: "진입장벽", score: 50, description: "" },
          { key: "crossPlatform", label: "크로스", score: 50, description: "" },
        ],
      } as unknown as import("@/lib/factor-model").FactorScoreSet;

      const fullResult = buildTitlesRuleBased({
        keyword, platform, factorScores: dummyFactors,
        recommendedKeywords: [], titleMinedKeywords: minedKw ?? [], ontologyNode: oNode, categoryPoolKeywords: poolKw,
      });

      // 해당 인덱스에 새 combo 삽입 (전략명/highlightFactor 유지, 제목/태그/reasoning만 교체)
      const srcIdx = regenComboIdx % fullResult.combinations.length;
      const newCombo = fullResult.combinations[srcIdx];
      if (newCombo) {
        newCombo.strategy = prevCombos[regenComboIdx].strategy;
        newCombo.highlightFactor = prevCombos[regenComboIdx].highlightFactor;
      }
      prevCombos[regenComboIdx] = newCombo ?? prevCombos[regenComboIdx];

      const updatedResult = { combinations: prevCombos };
      const now = new Date().toISOString();
      await supabaseAdmin
        .from("analysis_conclusions")
        .update({ result: updatedResult, last_regenerated_at: now })
        .eq("user_id", userId).eq("keyword", keyword).eq("platform", platform);

      const regen = await getRegenInfo();
      return NextResponse.json({
        ...updatedResult,
        generatedAt: now,
        cached: true,
        regeneration: { used: regen.used, limit: regen.limit, plan: regen.plan },
      });
    } catch (err) {
      console.error("[conclusion] regenerateCombo error:", err);
      return NextResponse.json({ error: "재생성 중 오류가 발생했습니다. 다시 시도해주세요." }, { status: 500 });
    }
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
    // ── 스냅샷에서 모든 데이터 읽기 (외부 API 호출 0) ──
    const { getSnapshot } = await import("@/lib/snapshot");
    const snap = await getSnapshot(userId, keyword, platform);

    // 1. factorScores — 스냅샷 우선, 없으면 로컬 계산
    let factorScores: import("@/lib/factor-model").FactorScoreSet;
    if (snap?.snapshot.factorScore) {
      factorScores = snap.snapshot.factorScore as import("@/lib/factor-model").FactorScoreSet;
    } else {
      // 스냅샷에 factor가 없는 경우 (레거시) — 최소한의 로컬 계산
      const intent = classifyKeywordIntent(keyword);
      const factorInput: FactorInput = {
        keyword, totalCount: 0, coupangRatio: 0,
        priceStats: { min: 0, max: 0, avg: 0 }, compIdx: undefined,
        intentScore: intent.intentScore, specificityScore: intent.specificityScore,
        trendDirection: "안정", trendSlope: 0, longSlope: 0,
        monthlyVolume: 0, trendPeak: 0, trendCurrent: 0,
        products: [], entryBarrier: null, reviewBarrier: null,
        rocketBarrier: null, dominanceScore: null, rocketRatio: null,
      };
      factorScores = calcFactorScores(factorInput, platform);
    }

    // 2. 추천 키워드 — 스냅샷 → L1 → L2 (self-fetch 제거)
    let v2Keywords: KeywordV2[] = [];
    if (snap?.snapshot.keywordsV2) {
      v2Keywords = snap.snapshot.keywordsV2 as KeywordV2[];
    } else {
      const l1 = v2Cache.get<KeywordV2[]>(keyword);
      if (l1) { v2Keywords = l1; }
      else {
        const l2 = await getL2Cache<KeywordV2[]>(keyword, V2_CACHE_TYPE);
        if (l2) { v2Cache.set(keyword, l2); v2Keywords = l2; }
      }
    }
    const recommendedKeywords = v2Keywords
      .slice(0, 15)
      .map((k: { keyword: string; score: number }) => ({ keyword: k.keyword, score: k.score }));
    const opportunityKeywords = [...v2Keywords]
      .sort((a: { scoreChance: number }, b: { scoreChance: number }) => b.scoreChance - a.scoreChance)
      .slice(0, 10)
      .map((k: { keyword: string; scoreChance: number }) => ({ keyword: k.keyword, scoreChance: k.scoreChance }));

    // 3. 크리에이티브 — 스냅샷에서 읽기 (self-fetch 제거)
    let creativeKeyword: string | undefined;
    if (snap?.snapshot.keywordsCreative) {
      const crArr = snap.snapshot.keywordsCreative as { keyword: string }[];
      if (crArr.length > 0) creativeKeyword = crArr[0].keyword;
    }

    // 4. 최종 후보 Top — 스냅샷에서 읽기 (factor-score-batch self-fetch 제거)
    let topAggregatedKeyword:
      | { keyword: string; overallScore: number; topFactorKey: string; topFactorScore: number }
      | undefined;
    if (snap?.snapshot.factorAggregated) {
      const aggArr = snap.snapshot.factorAggregated as { keyword: string; factors: { key: string; score: number }[] }[];
      if (aggArr.length > 0) {
        const top = aggArr[0];
        const avg = top.factors?.reduce((s, f) => s + f.score, 0) / (top.factors?.length || 1);
        const topF = top.factors ? [...top.factors].sort((a, b) => b.score - a.score)[0] : null;
        topAggregatedKeyword = {
          keyword: top.keyword,
          overallScore: Math.round(avg),
          topFactorKey: topF?.key ?? "ranking",
          topFactorScore: topF?.score ?? 0,
        };
      }
    }

    // 5. 변형 키워드 — 스냅샷에서 읽기 (self-fetch 제거)
    let topVariantKeyword: string | undefined;
    if (snap?.snapshot.keywordsVariant) {
      const varArr = snap.snapshot.keywordsVariant as { keyword: string }[];
      if (varArr.length > 0) topVariantKeyword = varArr[0].keyword;
    }

    // 6. 브랜드 — 스냅샷에서 읽기 (searchNaver 중복 호출 제거)
    let topBrands: string[] = [];
    if (snap?.snapshot.brandDistribution) {
      const brands = snap.snapshot.brandDistribution as { name: string; count: number }[];
      topBrands = brands.slice(0, 5).map((b) => b.name);
    }

    // 7. title-miner + 온톨로지 (로컬 연산 + 무료 API)
    let titleMinedKeywords = titleMineCache.get<import("@/lib/title-miner").TitleMinedKeyword[]>(keyword);
    if (!titleMinedKeywords) {
      try {
        titleMinedKeywords = await mineKeywordsFromTitles(keyword);
        titleMineCache.set(keyword, titleMinedKeywords);
      } catch { titleMinedKeywords = []; }
    }

    const ontologyResult = classifyKeywordV2(keyword, platform === "naver" ? "smartstore" : "coupang");
    let ontologyNode: import("@/lib/ontology/types").OntologyNode | null = null;
    let categoryPoolKeywords: import("@/lib/category-pool").CategoryPoolKeyword[] | undefined;
    if (ontologyResult) {
      const { getNodesV2 } = await import("@/lib/ontology");
      ontologyNode = getNodesV2(ontologyResult.platform).find((n) => n.id === ontologyResult.path) ?? null;
      try {
        const pool = await getCategoryPool(ontologyResult.path, ontologyResult.platform);
        categoryPoolKeywords = pool?.keywords.slice(0, 50);
      } catch {}
    }

    // 8. 규칙 기반 제목+태그 생성 (외부 API 0, LLM 0)
    const result = buildTitlesRuleBased({
      keyword, platform, factorScores, recommendedKeywords,
      opportunityKeywords, creativeKeyword,
      topAggregatedKeyword, topVariantKeyword,
      titleMinedKeywords: titleMinedKeywords ?? [],
      ontologyNode, categoryPoolKeywords, topBrands,
    });

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
