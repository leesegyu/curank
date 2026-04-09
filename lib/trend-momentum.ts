/**
 * 트렌드 모멘텀 (C 알고리즘)
 * Jungle Scout 방식: 트렌드 가속도 기반으로 "지금 뜨는 키워드" 선점 추천
 *
 * - 네이버 검색광고 API: 실제 월간 검색량 (PC + 모바일)
 * - Datalab 주간 트렌드: 최근 4주 vs 이전 4주 slope 계산
 * - 두 신호를 결합 → Momentum Score
 */

import { getKeywordTrendBatch, type TrendData } from "./datalab";
import { upsertEdges } from "./keyword-graph";

export interface MomentumResult {
  keyword: string;
  monthlyVolume: number;   // 월간 총 검색량
  recentSlope: number;     // 최근 4주 평균 - 이전 4주 평균 (-100 ~ +100)
  longSlope: number;       // 최근 8주 평균 - 이전 8주 평균
  momentumScore: number;   // 최종 모멘텀 점수
  direction: "상승" | "하락" | "안정";
}

// ─── 트렌드 slope 계산 ───────────────────────────────────────────
function calcSlope(weeklyRatios: number[]): { recent: number; long: number } {
  if (weeklyRatios.length < 8) {
    return { recent: 0, long: 0 };
  }
  const n = weeklyRatios.length;
  // recent: 마지막 4주 vs 그 이전 4주
  const recent4 = weeklyRatios.slice(-4);
  const prev4   = weeklyRatios.slice(-8, -4);
  const recentAvg = recent4.reduce((s, v) => s + v, 0) / 4;
  const prevAvg4  = prev4.reduce((s, v) => s + v, 0) / 4;
  const recentSlope = recentAvg - prevAvg4;

  // long: 마지막 8주 vs 그 이전 8주
  if (n >= 16) {
    const long8   = weeklyRatios.slice(-8);
    const prev8   = weeklyRatios.slice(-16, -8);
    const long8avg = long8.reduce((s, v) => s + v, 0) / 8;
    const prev8avg = prev8.reduce((s, v) => s + v, 0) / 8;
    return { recent: recentSlope, long: long8avg - prev8avg };
  }

  return { recent: recentSlope, long: recentSlope * 0.5 };
}

/**
 * 키워드 목록의 트렌드 모멘텀 계산
 * @param candidates 최대 12개 권장 (Datalab 호출 수 제한)
 * @param volumeMap  네이버 검색광고 API에서 가져온 keyword→volume 맵
 */
export async function calcMomentumScores(
  candidates: string[],
  volumeMap: Map<string, number>
): Promise<Map<string, MomentumResult>> {
  const resultMap = new Map<string, MomentumResult>();

  // Datalab 호출은 최대 12개로 제한
  const limited = candidates.slice(0, 12);

  // 배치 트렌드 조회 (5개씩 묶어 API 호출 절약: 24회→6회)
  const trendMap = await getKeywordTrendBatch(limited);

  const trendSimilarEdges: { source: string; target: string; relationType: "TREND_SIMILAR"; weight: number }[] = [];

  const slopes: { keyword: string; recentSlope: number }[] = [];

  limited.forEach((kw) => {
    const trend = trendMap.get(kw);
    if (!trend) return;
    const weeklyRatios = trend.weeklyData.map((d) => d.ratio);
    const { recent, long } = calcSlope(weeklyRatios);

    const monthlyVolume = volumeMap.get(kw) ?? 0;
    // 검색량 없으면 Datalab current 값으로 대체 (상대 지수)
    const effectiveVolume = monthlyVolume > 0 ? monthlyVolume : trend.current * 100;

    // Momentum Score: 검색량 × (1 + slope 보정) × 중기 방향
    const slopeBonus = 1 + (recent * 0.7 + long * 0.3) / 100;
    const momentumScore = Math.round(
      Math.log10(effectiveVolume + 10) * 20 * Math.max(slopeBonus, 0.1)
    );

    const direction = recent > 3 ? "상승" : recent < -3 ? "하락" : "안정";

    resultMap.set(kw, {
      keyword: kw,
      monthlyVolume: effectiveVolume,
      recentSlope: Math.round(recent * 10) / 10,
      longSlope: Math.round(long * 10) / 10,
      momentumScore,
      direction,
    });

    slopes.push({ keyword: kw, recentSlope: recent });
  });

  // TREND_SIMILAR 엣지 생성: 비슷한 상승 트렌드 키워드끼리 연결 (D 그래프 축적)
  // 양쪽 모두 최근 slope > 2 인 쌍만 연결
  for (let i = 0; i < slopes.length; i++) {
    for (let j = i + 1; j < slopes.length; j++) {
      const a = slopes[i];
      const b = slopes[j];
      if (a.recentSlope > 2 && b.recentSlope > 2) {
        const similarity = 1 - Math.abs(a.recentSlope - b.recentSlope) / (Math.abs(a.recentSlope) + Math.abs(b.recentSlope) + 1);
        if (similarity > 0.6) {
          trendSimilarEdges.push({ source: a.keyword, target: b.keyword, relationType: "TREND_SIMILAR", weight: similarity });
        }
      }
    }
  }

  if (trendSimilarEdges.length > 0) {
    upsertEdges(trendSimilarEdges).catch(() => {});
  }

  return resultMap;
}
