/**
 * 시즌 기회 키워드 추천 API
 * GET /api/keywords-season-opportunity?keyword=수박
 *
 * 3개 소스 통합 후보 + 출신 가중치:
 *   1) Historical 캐시 — 작년 인기 키워드 (가중치 +15, 검증된 과거 수요)
 *   2) V2 캐시 — 현재 시장 데이터 (기본 점수)
 *   3) 온톨로지 롱테일 — 형제/자식 노드 확장
 *   → 양쪽 모두 존재하면 가중치 +20 (과거+현재 검증)
 *
 * SOS 전용 DataLab: 정확히 1년전 ~ 1년전+2개월 말일
 * Season Opportunity Score (SOS) 5F 모델로 채점
 */

import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";
import { v2Cache, V2_CACHE_TYPE, type KeywordV2 } from "@/app/api/keywords-v2/route";
import type { HistoricalKeyword } from "@/app/api/keywords-historical/route";
import { calcSeasonOpportunityScore, type SeasonOpportunityResult } from "@/lib/season-opportunity";
import { calcOntologyRelevance } from "@/lib/ontology-relevance";
import { generateOntologyLongtails } from "@/lib/ontology";
import { trackApiCall } from "@/lib/api-monitor";

const CACHE_TYPE = "keywords_season_opp_4"; // v4: V2+Historical+온톨로지 통합 + 가중치
const cache = new NodeCache({ stdTTL: 3600 });
const historicalCache = new NodeCache({ stdTTL: 3600 });

const DATALAB_BASE = "https://openapi.naver.com/v1/datalab";
function getHeaders() {
  return {
    "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
    "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    "Content-Type": "application/json",
  };
}

/** SOS 전용 DataLab 조회: 정확히 1년전 ~ 1년전+2개월 말일 */
async function fetchSOSTrend(keywords: string[]): Promise<Map<string, { past: number; current: number }>> {
  const result = new Map<string, { past: number; current: number }>();
  if (keywords.length === 0) return result;

  const now = new Date();
  const pastStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const pastEnd = new Date(now.getFullYear() - 1, now.getMonth() + 3, 0);
  const currentStart = new Date(now);
  currentStart.setMonth(currentStart.getMonth() - 3);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const keywordGroups = batch.map((kw) => ({ groupName: kw, keywords: [kw] }));

    if (!trackApiCall("naver_datalab")) continue;

    const [pastRes, currentRes] = await Promise.allSettled([
      fetch(`${DATALAB_BASE}/search`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ startDate: fmt(pastStart), endDate: fmt(pastEnd), timeUnit: "month", keywordGroups }),
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`${DATALAB_BASE}/search`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ startDate: fmt(currentStart), endDate: fmt(now), timeUnit: "month", keywordGroups }),
        cache: "no-store",
      }).then((r) => r.json()),
    ]);

    const pastResults = pastRes.status === "fulfilled" ? pastRes.value?.results ?? [] : [];
    const currentResults = currentRes.status === "fulfilled" ? currentRes.value?.results ?? [] : [];

    for (let j = 0; j < batch.length; j++) {
      const kw = batch[j];
      const pastPts = pastResults[j]?.data ?? [];
      const currentPts = currentResults[j]?.data ?? [];
      const pastAvg = pastPts.length > 0
        ? pastPts.reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / pastPts.length : 0;
      const currentAvg = currentPts.length > 0
        ? currentPts.reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / currentPts.length : 0;
      result.set(kw, { past: Math.round(pastAvg * 10) / 10, current: Math.round(currentAvg * 10) / 10 });
    }
  }
  return result;
}

export type { SeasonOpportunityResult };

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });
  }

  const cached = cache.get<SeasonOpportunityResult[]>(keyword);
  if (cached) return NextResponse.json({ keywords: cached, cached: true });

  const l2 = await getL2Cache<SeasonOpportunityResult[]>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json({ keywords: l2, cached: true });
  }

  try {
    // ══════════════════════════════════════════════════════════
    // 1단계: 3개 소스에서 후보 통합
    // ══════════════════════════════════════════════════════════

    // 소스 A: Historical 캐시
    let historicalKeywords: HistoricalKeyword[] | null =
      historicalCache.get<HistoricalKeyword[]>(keyword) ?? null;
    if (!historicalKeywords) {
      historicalKeywords = await getL2Cache<HistoricalKeyword[]>(keyword, "keywords_historical_3");
    }
    if (!historicalKeywords) {
      try {
        const baseUrl = process.env.AUTH_URL || "http://localhost:3000";
        const res = await fetch(
          `${baseUrl}/api/keywords-historical?keyword=${encodeURIComponent(keyword)}`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const json = await res.json();
          historicalKeywords = json.keywords ?? [];
        }
      } catch { /* 폴백 실패 */ }
    }

    // 소스 B: V2 캐시
    let v2Keywords: KeywordV2[] | null = v2Cache.get<KeywordV2[]>(keyword) ?? null;
    if (!v2Keywords) {
      v2Keywords = await getL2Cache<KeywordV2[]>(keyword, V2_CACHE_TYPE);
    }

    // 소스 C: 온톨로지 롱테일
    const ontologyKws = generateOntologyLongtails(keyword, "smartstore", 20);

    // ══════════════════════════════════════════════════════════
    // 2단계: 후보 통합 + 출신 태깅
    // ══════════════════════════════════════════════════════════

    const historicalSet = new Set<string>();
    const v2Set = new Set<string>();
    const candidateSet = new Set<string>();

    // V2 맵 (경쟁/검색량 데이터)
    const v2Map = new Map<string, KeywordV2>();
    if (v2Keywords) {
      for (const k of v2Keywords) {
        if (k.keyword === keyword) continue;
        v2Map.set(k.keyword, k);
        v2Set.add(k.keyword);
        candidateSet.add(k.keyword);
      }
    }

    // Historical 맵 (과거 인기 데이터)
    const historicalMap = new Map<string, HistoricalKeyword>();
    if (historicalKeywords) {
      for (const hk of historicalKeywords) {
        if (hk.keyword === keyword) continue;
        historicalMap.set(hk.keyword, hk);
        historicalSet.add(hk.keyword);
        candidateSet.add(hk.keyword);
      }
    }

    // 온톨로지 롱테일
    for (const kw of ontologyKws) {
      if (kw !== keyword) candidateSet.add(kw);
    }

    // ══════════════════════════════════════════════════════════
    // 3단계: 연관도 필터
    // ══════════════════════════════════════════════════════════

    const seedTokens = keyword.split(/\s+/);
    const filtered = [...candidateSet].filter((kw) => {
      const containsSeedToken = seedTokens.some((t) => kw.includes(t));
      if (containsSeedToken) return true;
      const rel = calcOntologyRelevance(keyword, kw);
      return rel.score >= 15;
    });

    if (filtered.length === 0) {
      cache.set(keyword, []);
      return NextResponse.json({ keywords: [] });
    }

    // ══════════════════════════════════════════════════════════
    // 4단계: SOS DataLab 조회 (1년전 ~ +2개월)
    // ══════════════════════════════════════════════════════════

    const sosTrendMap = await fetchSOSTrend(filtered);

    // ══════════════════════════════════════════════════════════
    // 5단계: SOS 5F 채점 + 출신 가중치
    // ══════════════════════════════════════════════════════════

    const results: SeasonOpportunityResult[] = [];

    for (const kw of filtered) {
      const sosTrend = sosTrendMap.get(kw);
      const v2Data = v2Map.get(kw);
      const hkData = historicalMap.get(kw);

      const pastPop = sosTrend?.past ?? hkData?.pastPopularity ?? 0;
      const currentPop = sosTrend?.current ?? hkData?.currentPopularity ?? 0;

      // DataLab에 데이터 없으면 스킵
      if (pastPop < 3 && !v2Data) continue;

      const gap = Math.round((pastPop - currentPop) * 10) / 10;
      const competitionLevel = v2Data?.competitionLevel ?? "보통";
      const monthlyVolume = v2Data?.monthlyVolume ?? hkData?.monthlyVolume ?? 0;

      const sosResult = calcSeasonOpportunityScore({
        keyword: kw,
        pastPopularity: pastPop,
        currentPopularity: currentPop,
        gap,
        monthlyVolume,
        competitionLevel,
        seasonHint: gap > 15 ? "시즌 전 선점 기회" : gap > 0 ? "곧 수요 회복 예상" : "꾸준한 수요",
      });

      // ── 출신 가중치 ──
      const fromHistorical = historicalSet.has(kw);
      const fromV2 = v2Set.has(kw);

      let bonus = 0;
      if (fromHistorical && fromV2) bonus = 20;      // 양쪽 검증
      else if (fromHistorical)      bonus = 15;      // 과거 수요 검증
      // V2 only, 온톨로지 only → bonus 0

      const boostedScore = Math.min(100, sosResult.score + bonus);

      results.push({ ...sosResult, score: boostedScore });
    }

    const sorted = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);

    cache.set(keyword, sorted);
    setL2Cache(keyword, CACHE_TYPE, sorted);

    return NextResponse.json({ keywords: sorted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "시즌 기회 분석 실패" },
      { status: 500 },
    );
  }
}
