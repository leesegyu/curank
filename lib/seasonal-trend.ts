/**
 * 시즌 트렌드 분석 유틸
 *
 * 작년 12개월 월별 곡선을 받아:
 *   1) 시즌성 여부 판별
 *   2) 피크/저점 식별
 *   3) 현재 월 기준 phase 계산 (dormant/rising/rising_fast/peak/declining/stable)
 *   4) "rising" 구간(10~30% of peak, 상승 중) 키워드만 추천 대상
 *
 * DB 조회 + 로컬 연산 → API 호출 0
 */

import { createClient } from "@supabase/supabase-js";
import NodeCache from "node-cache";

export interface MonthlyRatio {
  month: number; // 1~12
  ratio: number; // 0~100
}

export interface SeasonalTrendRow {
  keyword: string;
  monthly_ratios: MonthlyRatio[];
  peak_month: number;
  peak_ratio: number;
  trough_month: number;
  trough_ratio: number;
  seasonality: number;
  season_type: SeasonType;
  fetched_at: string;
}

export type SeasonType =
  | "summer"      // 6~8월 피크
  | "winter"      // 12~2월 피크
  | "spring"      // 3~5월 피크
  | "autumn"      // 9~11월 피크
  | "year_round"  // 연중 일정
  | "irregular";  // 불규칙

export type SeasonPhase =
  | "dormant"      // < 10% of peak
  | "rising"       // 10~30% + 상승중  ← 추천 핵심 구간
  | "rising_fast"  // 30~65% + 상승중
  | "peak"         // ≥ 80%
  | "declining"    // 20~70% + 하락중
  | "stable";      // 그 외

export interface PhaseAnalysis {
  keyword: string;
  currentMonth: number;
  currentRatio: number;
  currentPercentOfPeak: number; // 0~100
  peakMonth: number;
  peakRatio: number;
  phase: SeasonPhase;
  isRising: boolean;
  monthsToPeak: number;  // 몇 개월 후 피크
  upsidePercent: number; // 현재→피크 예상 상승폭 (%)
  seasonality: number;
  isSeasonal: boolean;
  seasonType: SeasonType;
  advice: string;
}

// ─────────────────────────────────────────────
// 1. 배치 단계에서 사용: monthly_ratios에서 메타 계산
// ─────────────────────────────────────────────

export function computeSeasonalMeta(monthlyRatios: MonthlyRatio[]): {
  peakMonth: number;
  peakRatio: number;
  troughMonth: number;
  troughRatio: number;
  seasonality: number;
  seasonType: SeasonType;
} {
  if (monthlyRatios.length === 0) {
    return { peakMonth: 0, peakRatio: 0, troughMonth: 0, troughRatio: 0, seasonality: 0, seasonType: "irregular" };
  }

  const sorted = [...monthlyRatios].sort((a, b) => b.ratio - a.ratio);
  const peak = sorted[0];
  const trough = sorted[sorted.length - 1];

  const values = monthlyRatios.map((m) => m.ratio);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // 변동 계수 — 클수록 시즌성
  const seasonality = avg > 0 ? (max - min) / avg : 0;

  // 피크 월 기반 시즌 타입
  const pm = peak.month;
  let seasonType: SeasonType = "year_round";
  if (seasonality >= 0.6) {
    if (pm >= 6 && pm <= 8) seasonType = "summer";
    else if (pm === 12 || pm <= 2) seasonType = "winter";
    else if (pm >= 3 && pm <= 5) seasonType = "spring";
    else if (pm >= 9 && pm <= 11) seasonType = "autumn";
    else seasonType = "irregular";
  }

  return {
    peakMonth: peak.month,
    peakRatio: Math.round(peak.ratio * 100) / 100,
    troughMonth: trough.month,
    troughRatio: Math.round(trough.ratio * 100) / 100,
    seasonality: Math.round(seasonality * 100) / 100,
    seasonType,
  };
}

// ─────────────────────────────────────────────
// 2. 분석 시점에서 사용: 현재 월 기준 phase 계산
// ─────────────────────────────────────────────

/**
 * @param currentMonth 기본: 오늘 월. 테스트용으로 override 가능
 */
export function analyzePhase(row: SeasonalTrendRow, currentMonth?: number): PhaseAnalysis {
  const now = currentMonth ?? new Date().getMonth() + 1;
  const ratios = row.monthly_ratios;

  const ratioOf = (m: number): number => {
    const match = ratios.find((r) => r.month === m);
    return match ? match.ratio : 0;
  };

  const currentRatio = ratioOf(now);
  const peakRatio = row.peak_ratio;
  const percentOfPeak = peakRatio > 0 ? (currentRatio / peakRatio) * 100 : 0;

  // 상승/하락 판단 (이전 2개월 평균 vs 현재)
  const prev1 = ratioOf(now === 1 ? 12 : now - 1);
  const prev2 = ratioOf(now <= 2 ? 12 - (2 - now) : now - 2);
  const prevAvg = (prev1 + prev2) / 2;
  const isRising = currentRatio > prevAvg + 1; // 약간의 노이즈 허용

  // 피크까지 남은 개월
  let monthsToPeak = row.peak_month - now;
  if (monthsToPeak < 0) monthsToPeak += 12;

  // 예상 상승폭 (현재 → 피크)
  const upsidePercent = currentRatio > 0
    ? Math.round(((peakRatio - currentRatio) / currentRatio) * 100)
    : (peakRatio > 0 ? 999 : 0);

  // Phase 결정
  let phase: SeasonPhase;
  if (percentOfPeak < 10) phase = "dormant";
  else if (percentOfPeak >= 80) phase = "peak";
  else if (isRising) {
    if (percentOfPeak <= 30) phase = "rising";       // ← 추천 대상
    else if (percentOfPeak <= 65) phase = "rising_fast";
    else phase = "stable";
  } else {
    if (percentOfPeak >= 20 && percentOfPeak <= 70) phase = "declining";
    else phase = "stable";
  }

  const isSeasonal = row.seasonality >= 0.6;

  const advice = generatePhaseAdvice(phase, monthsToPeak, upsidePercent, row.peak_month, isSeasonal);

  return {
    keyword: row.keyword,
    currentMonth: now,
    currentRatio: Math.round(currentRatio * 10) / 10,
    currentPercentOfPeak: Math.round(percentOfPeak),
    peakMonth: row.peak_month,
    peakRatio,
    phase,
    isRising,
    monthsToPeak,
    upsidePercent,
    seasonality: row.seasonality,
    isSeasonal,
    seasonType: row.season_type,
    advice,
  };
}

function generatePhaseAdvice(
  phase: SeasonPhase,
  monthsToPeak: number,
  upsidePercent: number,
  peakMonth: number,
  isSeasonal: boolean,
): string {
  if (!isSeasonal) {
    return "시즌성이 약한 키워드입니다. 연중 일정한 수요라 진입 시기보다 경쟁력이 중요합니다.";
  }
  if (phase === "rising") {
    return `작년 패턴 기준 ${peakMonth}월 피크까지 ${monthsToPeak}개월 남았고 현재 상승 초입입니다. 지금 등록하면 피크에서 최대 +${upsidePercent}% 노출 기회를 잡을 수 있습니다.`;
  }
  if (phase === "rising_fast") {
    return `이미 수요가 급상승 중입니다. ${peakMonth}월 피크까지 ${monthsToPeak}개월 — 지금 진입하면 경쟁이 빠르게 늘어날 수 있으니 즉시 상품 준비를 시작하세요.`;
  }
  if (phase === "peak") {
    return `작년 기준 현재가 거의 피크입니다. 새로 진입하기엔 너무 늦었어요. 다음 시즌(${peakMonth}월) 2~3개월 전을 노리세요.`;
  }
  if (phase === "declining") {
    return `수요가 하락 중입니다. 재고 리스크가 있으니 신규 진입 비추천.`;
  }
  if (phase === "dormant") {
    return `지금은 휴면기(연중 최저 근처). ${peakMonth}월 피크 2~3개월 전에 다시 검토하세요.`;
  }
  return `안정기입니다. 시즌 효과는 제한적이니 경쟁력/차별화로 승부하세요.`;
}

// ─────────────────────────────────────────────
// 3. DB 조회 (L1 캐시)
// ─────────────────────────────────────────────

const trendCache = new NodeCache({ stdTTL: 60 * 60 * 12, maxKeys: 5000 });

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function getSeasonalTrends(keywords: string[]): Promise<Map<string, SeasonalTrendRow>> {
  const result = new Map<string, SeasonalTrendRow>();
  const missing: string[] = [];

  for (const kw of keywords) {
    const cached = trendCache.get<SeasonalTrendRow>(kw);
    if (cached) result.set(kw, cached);
    else missing.push(kw);
  }

  if (missing.length === 0) return result;

  const sb = getSupabase();
  if (!sb) return result;

  try {
    // Supabase in-query 한도 고려해 배치 분할 (500씩)
    for (let i = 0; i < missing.length; i += 500) {
      const batch = missing.slice(i, i + 500);
      const { data } = await sb
        .from("keyword_seasonal_trend")
        .select("*")
        .in("keyword", batch);
      if (!data) continue;
      for (const row of data as SeasonalTrendRow[]) {
        result.set(row.keyword, row);
        trendCache.set(row.keyword, row);
      }
    }
  } catch {
    // swallow; 부분 결과 반환
  }

  return result;
}

export async function getSeasonalTrend(keyword: string): Promise<SeasonalTrendRow | null> {
  const map = await getSeasonalTrends([keyword]);
  return map.get(keyword) ?? null;
}

// ─────────────────────────────────────────────
// 4. 후보 리스트를 Phase 기준으로 필터/정렬
// ─────────────────────────────────────────────

export interface SeasonalCandidate {
  keyword: string;
  analysis: PhaseAnalysis;
}

/**
 * 사용자의 카테고리와 관련 있는 후보 키워드들을 입력받아
 * "rising" 구간(10~30% of peak, 상승 중) 키워드만 반환.
 *
 * 정렬: upsidePercent 내림차순 (남은 잠재력이 큰 것 먼저)
 */
export async function pickRisingCandidates(
  candidates: string[],
  opts?: { limit?: number; includeRisingFast?: boolean },
): Promise<SeasonalCandidate[]> {
  const limit = opts?.limit ?? 20;
  const includeFast = opts?.includeRisingFast ?? false;

  const trends = await getSeasonalTrends(candidates);
  const scored: SeasonalCandidate[] = [];

  for (const kw of candidates) {
    const row = trends.get(kw);
    if (!row) continue;
    const analysis = analyzePhase(row);
    if (!analysis.isSeasonal) continue;
    if (analysis.phase === "rising" || (includeFast && analysis.phase === "rising_fast")) {
      scored.push({ keyword: kw, analysis });
    }
  }

  // 상승 초입(rising)을 rising_fast보다 우선
  scored.sort((a, b) => {
    if (a.analysis.phase !== b.analysis.phase) {
      return a.analysis.phase === "rising" ? -1 : 1;
    }
    return b.analysis.upsidePercent - a.analysis.upsidePercent;
  });

  return scored.slice(0, limit);
}
