import { NextRequest, NextResponse } from "next/server";
import { fetchNaverScoreData } from "@/lib/search";
import { getKeywordTrend } from "@/lib/datalab";
import { classifyKeywordIntent } from "@/lib/intent-classifier";
import { calcFactorScores, type FactorInput, type Platform, type FactorScoreSet } from "@/lib/factor-model";
import { factorCache } from "@/lib/factor-cache";
import { validateKeyword } from "@/lib/keyword-validator";

/**
 * 배치 factor score 계산
 *
 * GET /api/factor-score-batch?keywords=kw1,kw2,kw3&platform=naver
 * → { results: FactorScoreSet[] }
 *
 * 사용 시나리오: STEP 3 추천 카드들의 top 키워드를 한번에 채점하여 종합 비교
 */

const MAX_KEYWORDS = 100; // CSV 최대치
const CONCURRENCY = 10; // 동시 호출 제한 (네이버 rate limit 보호)

async function computeFactor(keyword: string, platform: Platform): Promise<FactorScoreSet | null> {
  // L1 캐시 — 단일 factor-score와 동일한 키 사용하여 재활용
  const cacheKey = `factor:${keyword}:${platform}`;
  const cached = factorCache.get<FactorScoreSet>(cacheKey);
  if (cached) return cached;

  try {
    const [naverScore, trend] = await Promise.allSettled([
      fetchNaverScoreData(keyword),
      getKeywordTrend(keyword),
    ]);

    const ns = naverScore.status === "fulfilled" ? naverScore.value : null;
    const tr = trend.status === "fulfilled" ? trend.value : null;

    const intent = classifyKeywordIntent(keyword);

    // Trend slope 계산
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
      products: [],
      entryBarrier: null,
      reviewBarrier: null,
      rocketBarrier: null,
      dominanceScore: null,
      rocketRatio: null,
    };

    const result = calcFactorScores(input, platform);
    factorCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn(`[factor-score-batch] ${keyword} 실패:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const keywordsParam = req.nextUrl.searchParams.get("keywords")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") ?? "naver") as Platform;

  if (!keywordsParam) {
    return NextResponse.json({ error: "keywords required" }, { status: 400 });
  }

  const rawKeywords = keywordsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((k) => validateKeyword(k).ok); // 스팸/노이즈 키워드 제외

  // 중복 제거 + 최대 개수 제한
  const keywords = Array.from(new Set(rawKeywords)).slice(0, MAX_KEYWORDS);
  if (keywords.length === 0) {
    return NextResponse.json({ results: [] });
  }

  // 동시성 제한 배치 처리 (한 번에 CONCURRENCY개씩)
  const results: FactorScoreSet[] = [];
  for (let i = 0; i < keywords.length; i += CONCURRENCY) {
    const chunk = keywords.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((kw) => computeFactor(kw, platform)));
    for (const r of settled) {
      if (r.status === "fulfilled" && r.value) {
        results.push(r.value);
      }
    }
  }

  return NextResponse.json({ results });
}
