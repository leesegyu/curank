import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { fetchNaverScoreData } from "@/lib/search";
import { getKeywordTrend } from "@/lib/datalab";
import { classifyKeywordIntent } from "@/lib/intent-classifier";
import { calcFactorScores, type FactorInput, type Platform } from "@/lib/factor-model";
import { generateConclusion } from "@/lib/conclusion-generator";

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

  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "naver") as Platform;
  const shouldGenerate = req.nextUrl.searchParams.get("generate") === "true";

  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  // ── 조회 모드: 저장된 결론 반환 ──
  if (!shouldGenerate) {
    const userId = session.user.id as string;
    const { data, error: selectError } = await supabaseAdmin
      .from("analysis_conclusions")
      .select("result, generated_at")
      .eq("user_id", userId)
      .eq("keyword", keyword)
      .eq("platform", platform)
      .single();

    if (selectError) {
      console.log("[conclusion] lookup:", { userId, keyword, platform, error: selectError.message });
    }

    if (data) {
      return NextResponse.json({
        ...data.result,
        generatedAt: data.generated_at,
        cached: true,
      });
    }

    return NextResponse.json({ cached: false, combinations: null });
  }

  // ── 생성 모드: 이미 있으면 기존 결과 반환 (1회만 생성) ──
  const { data: existing } = await supabaseAdmin
    .from("analysis_conclusions")
    .select("result, generated_at")
    .eq("user_id", session.user.id)
    .eq("keyword", keyword)
    .eq("platform", platform)
    .single();

  if (existing) {
    return NextResponse.json({
      ...existing.result,
      generatedAt: existing.generated_at,
      cached: true,
    });
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

    // 2. 추천 키워드 수집
    const kwUrl = new URL("/api/keywords-v2", req.nextUrl.origin);
    kwUrl.searchParams.set("keyword", keyword);
    const kwRes = await fetch(kwUrl.toString(), {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    });
    const kwData = kwRes.ok ? await kwRes.json() : { keywords: [] };
    const v2Keywords = kwData.keywords ?? [];
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

    // 4. GPT-4o mini로 결론 생성
    const result = await generateConclusion({
      keyword,
      platform,
      factorScores,
      recommendedKeywords,
      opportunityKeywords,
      creativeKeyword,
    });

    // 4. DB에 저장 (upsert)
    const userId = session.user.id as string;
    const { error: upsertError } = await supabaseAdmin
      .from("analysis_conclusions")
      .upsert(
        {
          user_id: userId,
          keyword,
          platform,
          result,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,keyword,platform" }
      );
    if (upsertError) {
      console.error("[conclusion] upsert failed:", upsertError.message, upsertError.details);
    }

    return NextResponse.json({
      ...result,
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  } catch (err) {
    console.error("[conclusion]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "결론 생성 실패" },
      { status: 500 }
    );
  }
}
