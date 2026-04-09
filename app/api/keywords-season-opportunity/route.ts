/**
 * 시즌 기회 키워드 추천 API
 * GET /api/keywords-season-opportunity?keyword=수박
 *
 * Historical(작년 인기) + V2(시장 데이터) 융합:
 *   1) Historical API에서 작년 인기 키워드 + DataLab 갭 데이터 획득
 *   2) V2 캐시에서 해당 키워드의 경쟁/검색량/의도 데이터 보강
 *   3) Season Opportunity Score (SOS) 5F 모델로 재채점
 *
 * 추가 API 호출: 0회 (Historical + V2 캐시 재사용)
 * → 이미 analyze-run에서 Historical과 V2를 병렬 호출하므로
 *   이 API는 캐시된 데이터만 읽어 SOS를 계산
 */

import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";
import { v2Cache, V2_CACHE_TYPE, type KeywordV2 } from "@/app/api/keywords-v2/route";
import type { HistoricalKeyword } from "@/app/api/keywords-historical/route";
import { calcSeasonOpportunityScore, type SeasonOpportunityResult } from "@/lib/season-opportunity";

const CACHE_TYPE = "keywords_season_opp_1";
const cache = new NodeCache({ stdTTL: 3600 });

/** Historical API 캐시 키 (keywords-historical/route.ts와 동일 TTL) */
const historicalCache = new NodeCache({ stdTTL: 3600 });

export type { SeasonOpportunityResult };

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });
  }

  // L1 캐시 히트
  const cached = cache.get<SeasonOpportunityResult[]>(keyword);
  if (cached) return NextResponse.json({ keywords: cached, cached: true });

  // L2 캐시 히트
  const l2 = await getL2Cache<SeasonOpportunityResult[]>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json({ keywords: l2, cached: true });
  }

  try {
    // ── 1단계: Historical 데이터 획득 ────────────────────────
    // Historical API를 내부 호출하지 않고 L2 캐시에서 읽기 (0 API 콜)
    let historicalKeywords: HistoricalKeyword[] | null = null;

    // L1 캐시 시도 (같은 요청 사이클이면 히트)
    historicalKeywords = historicalCache.get<HistoricalKeyword[]>(keyword) ?? null;

    if (!historicalKeywords) {
      // L2 캐시 시도 (keywords-historical이 저장한 Supabase 캐시)
      historicalKeywords = await getL2Cache<HistoricalKeyword[]>(keyword, "keywords_historical_1");
    }

    if (!historicalKeywords || historicalKeywords.length === 0) {
      // 캐시 미스 → Historical API 직접 호출 (폴백)
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
      } catch {
        // 폴백도 실패 → 빈 결과
      }
    }

    if (!historicalKeywords || historicalKeywords.length === 0) {
      cache.set(keyword, []);
      return NextResponse.json({ keywords: [] });
    }

    // ── 2단계: V2 데이터로 경쟁/검색량 보강 ──────────────────
    let v2Keywords: KeywordV2[] | null = v2Cache.get<KeywordV2[]>(keyword) ?? null;
    if (!v2Keywords) {
      v2Keywords = await getL2Cache<KeywordV2[]>(keyword, V2_CACHE_TYPE);
    }

    // V2 키워드를 맵으로 변환 (빠른 lookup)
    const v2Map = new Map<string, KeywordV2>();
    if (v2Keywords) {
      for (const k of v2Keywords) {
        v2Map.set(k.keyword, k);
      }
    }

    // ── 3단계: SOS 계산 ──────────────────────────────────────
    const results: SeasonOpportunityResult[] = [];

    for (const hk of historicalKeywords) {
      const v2Data = v2Map.get(hk.keyword);

      // V2가 있으면 정밀 데이터 사용, 없으면 Historical 데이터 + 기본값
      const competitionLevel = v2Data?.competitionLevel ?? "보통";
      const monthlyVolume = v2Data?.monthlyVolume ?? hk.monthlyVolume;

      const sosResult = calcSeasonOpportunityScore({
        keyword: hk.keyword,
        pastPopularity: hk.pastPopularity,
        currentPopularity: hk.currentPopularity,
        gap: hk.gap,
        monthlyVolume,
        competitionLevel,
        seasonHint: hk.seasonHint,
      });

      results.push(sosResult);
    }

    // 점수 내림차순 정렬, 상위 40개
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
