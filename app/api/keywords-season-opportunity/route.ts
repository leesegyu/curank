/**
 * 시즌 기회 키워드 추천 API — DB 기반 재작성 (2026-04-11)
 *
 * 핵심 변경:
 *   - DataLab 런타임 호출 제거 (0콜)
 *   - keyword_seasonal_trend 사전 배치 DB 조회
 *   - "rising" 구간(현재가 피크의 10~30%이고 상승 중)만 노출
 *   - 시즌성 약한 키워드(seasonality < 0.6)는 자동 제외
 *
 * 후보 소스:
 *   1) category_keyword_pool 시드 카테고리 풀 (이미 수집된 키워드)
 *   2) V2 캐시
 *   3) 온톨로지 롱테일
 *
 * → 세 소스 결합 → keyword_seasonal_trend 일괄 조회 → rising 필터 → 정렬
 */

import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";
import { v2Cache, V2_CACHE_TYPE, type KeywordV2 } from "@/app/api/keywords-v2/route";
import { calcOntologyRelevance } from "@/lib/ontology-relevance";
import { generateOntologyLongtails, classifyKeywordV2 } from "@/lib/ontology";
import { validateKeyword } from "@/lib/keyword-validator";
import { getCategoryPool } from "@/lib/category-pool";
import { pickRisingCandidates, type PhaseAnalysis } from "@/lib/seasonal-trend";
import type { Platform as OntoPlatform } from "@/lib/ontology/types";

// 응답 형태 — 기존 카드와 호환되는 필드명 유지
// sosScore를 score로, advice/tier/topFactor 모두 변환
export interface SeasonOpportunityResult {
  keyword: string;
  score: number;                  // currentPercentOfPeak 역전치 (잠재력 점수)
  tier: "최고" | "좋음" | "보통" | "관망";
  topFactor: string;              // "상승 초입" 등
  advice: string;
  // 시즌 전용 메타 (UI 확장)
  currentPercentOfPeak: number;
  peakMonth: number;
  monthsToPeak: number;
  upsidePercent: number;
  seasonType: string;
  seasonality: number;
  phase: string;
  /** 작년 12개월 월별 상대 검색량 (0~100) — 정확한 차트 렌더링용 */
  monthlyRatios: Array<{ month: number; ratio: number }>;
  // 레거시 호환
  pastPopularity: number;
  currentPopularity: number;
  gap: number;
  monthlyVolume: number;
  competitionLevel: string;
  seasonHint: string;
}

const CACHE_TYPE = "keywords_season_opp_5"; // v5: DB 기반
const cache = new NodeCache({ stdTTL: 3600, maxKeys: 500 });

export async function GET(req: NextRequest) {
  const rawKeyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const validation = validateKeyword(rawKeyword);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const keyword = rawKeyword as string;
  const platformRaw = req.nextUrl.searchParams.get("platform") ?? "smartstore";
  const ontoPlatform: OntoPlatform = platformRaw === "coupang" ? "coupang" : "smartstore";

  // L1/L2 캐시
  const l1 = cache.get<SeasonOpportunityResult[]>(keyword);
  if (l1) return NextResponse.json({ keywords: l1, cached: true });

  const l2 = await getL2Cache<SeasonOpportunityResult[]>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json({ keywords: l2, cached: true });
  }

  try {
    // ══════════════════════════════════════════════════════════
    // 1) 후보 수집
    //    - 카테고리 풀 top 300
    //    - V2 캐시 (현재 분석 대상 키워드의 V2 결과)
    //    - 온톨로지 롱테일
    //    - 시드 자체
    // ══════════════════════════════════════════════════════════
    const candidateSet = new Set<string>();
    candidateSet.add(keyword);

    // 1-a) 카테고리 풀
    const classified = classifyKeywordV2(keyword, ontoPlatform);
    if (classified?.path) {
      const pool = await getCategoryPool(classified.path, ontoPlatform);
      if (pool) {
        for (const k of pool.keywords) candidateSet.add(k.keyword);
      }
    }

    // 1-b) V2 캐시 (L1 우선, 없으면 L2)
    let v2Keywords: KeywordV2[] | null = v2Cache.get<KeywordV2[]>(keyword) ?? null;
    if (!v2Keywords) {
      v2Keywords = await getL2Cache<KeywordV2[]>(keyword, V2_CACHE_TYPE);
    }
    const v2Map = new Map<string, KeywordV2>();
    if (v2Keywords) {
      for (const k of v2Keywords) {
        candidateSet.add(k.keyword);
        v2Map.set(k.keyword, k);
      }
    }

    // 1-c) 온톨로지 롱테일
    for (const k of generateOntologyLongtails(keyword, "smartstore", 20)) {
      candidateSet.add(k);
    }

    // ══════════════════════════════════════════════════════════
    // 2) 시드 관련도 필터 — 카테고리 풀에는 brand/noise가 섞여있음
    // ══════════════════════════════════════════════════════════
    const seedTokens = keyword.split(/\s+/);
    const relevantCandidates = [...candidateSet].filter((kw) => {
      if (kw === keyword) return true;
      const containsSeed = seedTokens.some((t) => kw.includes(t));
      if (containsSeed) return true;
      const rel = calcOntologyRelevance(keyword, kw);
      return rel.score >= 20;
    });

    if (relevantCandidates.length === 0) {
      cache.set(keyword, []);
      return NextResponse.json({ keywords: [] });
    }

    // ══════════════════════════════════════════════════════════
    // 3) keyword_seasonal_trend 조회 + "rising" 필터
    // ══════════════════════════════════════════════════════════
    const rising = await pickRisingCandidates(relevantCandidates, {
      limit: 40,
      includeRisingFast: true,
    });

    // ══════════════════════════════════════════════════════════
    // 4) 응답 포맷 변환 (기존 카드 필드와 호환)
    // ══════════════════════════════════════════════════════════
    const results: SeasonOpportunityResult[] = rising.map(({ keyword: kw, analysis }) => {
      // score = "잠재력" 점수: rising이면 기본 80점 + upside 보너스
      // rising_fast면 기본 60점 + upside 보너스
      const base = analysis.phase === "rising" ? 80 : 60;
      const upsideBonus = Math.min(20, Math.floor(analysis.upsidePercent / 20));
      const score = Math.min(100, base + upsideBonus);

      const tier: SeasonOpportunityResult["tier"] =
        score >= 90 ? "최고" : score >= 75 ? "좋음" : score >= 60 ? "보통" : "관망";

      const topFactor =
        analysis.phase === "rising" ? "상승 초입" : "급상승 구간";

      const v2 = v2Map.get(kw);

      return {
        keyword: kw,
        score,
        tier,
        topFactor,
        advice: analysis.advice,
        currentPercentOfPeak: analysis.currentPercentOfPeak,
        peakMonth: analysis.peakMonth,
        monthsToPeak: analysis.monthsToPeak,
        upsidePercent: analysis.upsidePercent,
        seasonType: analysis.seasonType,
        seasonality: analysis.seasonality,
        phase: analysis.phase,
        monthlyRatios: analysis.monthlyRatios,
        // legacy fields
        pastPopularity: analysis.peakRatio,
        currentPopularity: analysis.currentRatio,
        gap: Math.round(analysis.peakRatio - analysis.currentRatio),
        monthlyVolume: v2?.monthlyVolume ?? 0,
        competitionLevel: v2?.competitionLevel ?? "보통",
        seasonHint: `${analysis.peakMonth}월 피크 · +${analysis.upsidePercent}% 잠재`,
      };
    });

    cache.set(keyword, results);
    setL2Cache(keyword, CACHE_TYPE, results);

    return NextResponse.json({ keywords: results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "시즌 기회 분석 실패" },
      { status: 500 },
    );
  }
}
