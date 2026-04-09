import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { fetchNaverScoreData } from "@/lib/search";
import { getKeywordTrend } from "@/lib/datalab";
import { classifyKeywordIntent } from "@/lib/intent-classifier";
import { calcFactorScores, type FactorInput, type Platform } from "@/lib/factor-model";

const factorCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "naver") as Platform;

  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  // L1 캐시 히트
  const cacheKey = `factor:${keyword}:${platform}`;
  const cached = factorCache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // 병렬 데이터 수집
    const [naverScore, trend] = await Promise.allSettled([
      fetchNaverScoreData(keyword),
      getKeywordTrend(keyword),
    ]);

    const ns = naverScore.status === "fulfilled" ? naverScore.value : null;
    const tr = trend.status === "fulfilled" ? trend.value : null;

    // NLP 의도 분류
    const intent = classifyKeywordIntent(keyword);

    // 트렌드 slope 계산 (주간 데이터 우선, 없으면 월별 근사)
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
      // 월별 데이터로 slope 근사 (주별 lazy 로딩 시 폴백)
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

    const input: FactorInput = {
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
      products: [], // API에서는 products 없이 계산 (독점도는 page.tsx에서 보완)
      // 쿠팡 데이터 (현재 비활성)
      entryBarrier: null,
      reviewBarrier: null,
      rocketBarrier: null,
      dominanceScore: null,
      rocketRatio: null,
    };

    const result = calcFactorScores(input, platform);
    factorCache.set(cacheKey, result);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[factor-score]", err);
    return NextResponse.json({ error: "Factor score 계산 실패" }, { status: 500 });
  }
}
