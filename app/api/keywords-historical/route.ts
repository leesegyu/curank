/**
 * 1년 전 데이터 기반 키워드 추천 API
 * GET /api/keywords-historical?keyword=수박
 *
 * 작년 이맘때 인기였던 연관 키워드를 발굴하여 셀러에게 시즌 선점 아이디어를 제공.
 * 핵심 가치:
 *   - 시즌 선점: 작년에 뭐가 팔렸는지 → 올해 미리 준비
 *   - 아이디어 확장: 현재 데이터에 없는 과거 트렌드 발굴
 *   - 검증된 수요: 실제 검색 데이터 기반이므로 신뢰도 높음
 */

import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { trackApiCall } from "@/lib/api-monitor";
import { getNaverAdKeywords, totalMonthlyVolume } from "@/lib/naver-ad";
import { generateOntologyLongtails, classifyKeyword } from "@/lib/ontology";
import { calcOntologyRelevance } from "@/lib/ontology-relevance";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";

const CACHE_TYPE = "keywords_historical_1";
const cache = new NodeCache({ stdTTL: 3600 });

export interface HistoricalKeyword {
  keyword: string;
  /** 1년 전 상대 검색량 (DataLab ratio 0~100) */
  pastPopularity: number;
  /** 현재 상대 검색량 (DataLab ratio 0~100) */
  currentPopularity: number;
  /** 과거-현재 갭 (양수 = 과거가 높았음 = 기회) */
  gap: number;
  /** 종합 점수 (0~100) */
  score: number;
  /** 시즌 힌트 */
  seasonHint: string;
  /** 현재 월간 검색량 (Ad API) */
  monthlyVolume: number;
}

const DATALAB_BASE = "https://openapi.naver.com/v1/datalab";

function getHeaders() {
  return {
    "X-Naver-Client-Id": process.env.NAVER_CLIENT_ID!,
    "X-Naver-Client-Secret": process.env.NAVER_CLIENT_SECRET!,
    "Content-Type": "application/json",
  };
}

/** 1년 전 같은 시기 3개월 구간의 DataLab 트렌드 조회 */
async function fetchPastTrend(keywords: string[]): Promise<Map<string, { past: number; current: number }>> {
  const result = new Map<string, { past: number; current: number }>();
  if (keywords.length === 0) return result;

  const now = new Date();
  // 과거 구간: 15개월 전 ~ 9개월 전 (1년 전 ±3개월)
  const pastStart = new Date(now);
  pastStart.setMonth(pastStart.getMonth() - 15);
  const pastEnd = new Date(now);
  pastEnd.setMonth(pastEnd.getMonth() - 9);
  // 현재 구간: 최근 3개월
  const currentStart = new Date(now);
  currentStart.setMonth(currentStart.getMonth() - 3);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // 5개씩 배치 (DataLab keywordGroups 제한)
  for (let i = 0; i < keywords.length; i += 5) {
    const batch = keywords.slice(i, i + 5);
    const keywordGroups = batch.map((kw) => ({ groupName: kw, keywords: [kw] }));

    if (!trackApiCall("naver_datalab")) continue;

    const [pastRes, currentRes] = await Promise.allSettled([
      fetch(`${DATALAB_BASE}/search`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          startDate: fmt(pastStart),
          endDate: fmt(pastEnd),
          timeUnit: "month",
          keywordGroups,
        }),
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(`${DATALAB_BASE}/search`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          startDate: fmt(currentStart),
          endDate: fmt(now),
          timeUnit: "month",
          keywordGroups,
        }),
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
        ? pastPts.reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / pastPts.length
        : 0;
      const currentAvg = currentPts.length > 0
        ? currentPts.reduce((s: number, d: { ratio: number }) => s + d.ratio, 0) / currentPts.length
        : 0;

      result.set(kw, { past: Math.round(pastAvg * 10) / 10, current: Math.round(currentAvg * 10) / 10 });
    }
  }

  return result;
}

function getSeasonHint(keyword: string, gap: number): string {
  if (gap > 30) return "작년 이맘때 매우 인기 — 올해도 수요 예상";
  if (gap > 15) return "작년에 높은 관심 — 미리 준비하면 유리";
  if (gap > 0) return "작년 대비 현재 검색량 감소 — 시즌 대비 기회";
  return "꾸준한 수요 유지";
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });
  }

  const cached = cache.get<HistoricalKeyword[]>(keyword);
  if (cached) return NextResponse.json({ keywords: cached, cached: true });

  const l2 = await getL2Cache<HistoricalKeyword[]>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json({ keywords: l2, cached: true });
  }

  try {
    // 1. 후보 키워드 생성 — Ad API 연관 + 온톨로지 롱테일
    const [adsResult, ontologyLongtails] = await Promise.allSettled([
      getNaverAdKeywords(keyword),
      Promise.resolve(generateOntologyLongtails(keyword, "smartstore", 15)),
    ]);

    const adsKeywords = adsResult.status === "fulfilled" ? adsResult.value : [];
    const ontology = ontologyLongtails.status === "fulfilled" ? ontologyLongtails.value : [];

    // 후보 통합 (시드 제외, 중복 제거)
    const candidateSet = new Set<string>();
    const volumeMap = new Map<string, number>();

    for (const ad of adsKeywords) {
      if (ad.relKeyword !== keyword) {
        candidateSet.add(ad.relKeyword);
        volumeMap.set(ad.relKeyword, totalMonthlyVolume(ad));
      }
    }
    for (const lt of ontology) {
      if (lt !== keyword) candidateSet.add(lt);
    }

    // 연관도 필터: 시드와 무관한 키워드 차단 (V2와 동일 로직)
    const seedTokens = keyword.split(/\s+/);
    const filteredSet = [...candidateSet].filter((kw) => {
      const containsSeedToken = seedTokens.some((t) => kw.includes(t));
      if (containsSeedToken) return true;
      const rel = calcOntologyRelevance(keyword, kw);
      return rel.score >= 15;
    });

    const candidates = filteredSet.slice(0, 50); // 30→50: 더 많은 결과 확보
    if (candidates.length === 0) {
      cache.set(keyword, []);
      return NextResponse.json({ keywords: [] });
    }

    // 2. DataLab: 1년 전 vs 현재 트렌드 비교
    const trendMap = await fetchPastTrend(candidates);

    // 3. 점수 계산 + 필터링
    const results: HistoricalKeyword[] = [];

    for (const kw of candidates) {
      const trend = trendMap.get(kw);
      if (!trend || (trend.past === 0 && trend.current === 0)) continue;

      const gap = trend.past - trend.current;
      // 과거에 인기가 있었어야 의미 있음 (past >= 3)
      if (trend.past < 3) continue;

      const monthlyVolume = volumeMap.get(kw) ?? 0;

      // 점수: pastPopularity(40%) + gap(40%) + 현재검색량보너스(20%)
      const pastScore = Math.min(trend.past, 100) * 0.4;
      const gapScore = Math.max(0, Math.min(gap, 50)) * 0.4 * 2; // gap 50 = 만점
      const volumeBonus = monthlyVolume > 0 ? Math.min(Math.log10(monthlyVolume + 1) / 5 * 100, 100) * 0.2 : 0;
      const score = Math.round(pastScore + gapScore + volumeBonus);

      results.push({
        keyword: kw,
        pastPopularity: trend.past,
        currentPopularity: trend.current,
        gap: Math.round(gap * 10) / 10,
        score,
        seasonHint: getSeasonHint(kw, gap),
        monthlyVolume,
      });
    }

    const sorted = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    cache.set(keyword, sorted);
    setL2Cache(keyword, CACHE_TYPE, sorted);
    return NextResponse.json({ keywords: sorted });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "과거 키워드 분석 실패" },
      { status: 500 }
    );
  }
}
