/**
 * 시즌 기회 점수 (Season Opportunity Score, SOS)
 *
 * Historical(작년 인기) 데이터를 기반으로 V2(시장 데이터)와 Creativity(발굴)를
 * 융합하여 "검증된 시즌 수요 + 현재 진입 가능성"을 하나의 점수로 표현.
 *
 * 5 Sub-Factors:
 *   S1 시즌 검증도   (0.25) — 작년 DataLab 인기도. 높을수록 검증된 수요
 *   S2 선점 갭       (0.25) — 과거 대비 현재 검색량 하락폭. 클수록 시즌 전 진입 기회
 *   S3 진입 용이성   (0.20) — 광고경쟁·공급량 역수. 낮은 경쟁 = 높은 점수
 *   S4 구매 전환력   (0.15) — 구매 의도 + 키워드 구체성. 실구매 연결 가능성
 *   S5 시장 규모     (0.15) — 월간 검색량 log 스케일. 최소 시장 크기 보장
 *
 * 설계 근거:
 *   - Historical score는 pastPopularity(40%) + gap(40%) + volume(20%)인데
 *     gap이 크더라도 경쟁이 높으면 진입 불가 → S3으로 보완
 *   - gap이 크더라도 정보 탐색 키워드면 전환 안 됨 → S4로 보완
 *   - S1+S2 = 50%로 시즌 신호가 지배적, S3+S4+S5 = 50%로 실행 가능성 검증
 *
 * Before (Historical만):
 *   "수박 선물세트" gap=35, pastPop=80 → score=72 (높음)
 *   but 경쟁 "매우 높음", 대기업 독점 → 실제 진입 불가
 *
 * After (SOS 적용):
 *   S1=80, S2=70, S3=10(경쟁↑), S4=65, S5=60
 *   SOS = 80*0.25 + 70*0.25 + 10*0.20 + 65*0.15 + 60*0.15 = 58.25 → 58
 *   → 적절히 하향 조정되어 셀러에게 "가능하지만 경쟁 주의" 시그널
 */

import { classifyKeywordIntent } from "./intent-classifier";

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function logNorm(value: number, scale: number): number {
  if (value <= 0) return 0;
  return Math.min(100, (Math.log10(value + 1) / Math.log10(scale + 1)) * 100);
}

// ── 타입 ──────────────────────────────────────────────────

export interface SOSSubFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
}

export interface SeasonOpportunityResult {
  keyword: string;
  /** 종합 SOS 0~100 */
  score: number;
  subfactors: SOSSubFactor[];
  /** 가장 기여도 높은 factor */
  topFactor: string;
  /** 셀러 조언 */
  advice: string;
  /** 등급 */
  tier: "최고" | "좋음" | "보통" | "관망";
  // 원본 데이터 (UI 표시용)
  pastPopularity: number;
  currentPopularity: number;
  gap: number;
  monthlyVolume: number;
  seasonHint: string;
  competitionLevel: string;
}

export interface SOSInput {
  keyword: string;
  /** DataLab 과거 인기도 0~100 */
  pastPopularity: number;
  /** DataLab 현재 인기도 0~100 */
  currentPopularity: number;
  /** 과거 - 현재 갭 */
  gap: number;
  /** Ad API 월간 검색량 */
  monthlyVolume: number;
  /** 광고 경쟁 지수 */
  competitionLevel: string;
  /** 시즌 힌트 (Historical에서 계승) */
  seasonHint: string;
}

// ── S1: 시즌 검증도 (Season Validation) ──────────────────

function calcSeasonValidation(pastPopularity: number): number {
  // 작년 인기도가 높을수록 검증된 수요
  // pastPopularity 0~100 → 그대로 사용, 다만 30 미만은 약하게 처리
  if (pastPopularity < 5) return 0;
  if (pastPopularity < 15) return clamp(pastPopularity * 2);
  return clamp(pastPopularity);
}

// ── S2: 선점 갭 (Pre-season Gap) ──────────────────────────

function calcPreseasonGap(gap: number, pastPopularity: number): number {
  // gap이 클수록 "작년에는 인기였는데 지금은 아직" = 시즌 전 진입 기회
  // 단, pastPopularity가 낮으면 gap이 커도 무의미
  if (pastPopularity < 10) return 0;

  // gap: 0~100 범위, 현실적으로 0~50 정도가 일반적
  // gap 30+ = 최고 기회, gap 15~30 = 좋은 기회
  const gapNorm = clamp(gap * 2, 0, 100); // gap 50 = 100점
  const pastWeight = Math.min(pastPopularity / 50, 1); // past 50 이상이면 100% 반영

  return clamp(gapNorm * pastWeight);
}

// ── S3: 진입 용이성 (Entry Feasibility) ──────────────────

function calcEntryFeasibility(competitionLevel: string, monthlyVolume: number): number {
  // 광고 경쟁 낮을수록 높은 점수
  const compMap: Record<string, number> = {
    "낮음": 90,
    "보통": 55,
    "높음": 25,
    "매우 높음": 8,
  };
  const compScore = compMap[competitionLevel] ?? 55;

  // 검색량이 너무 높으면 대형 셀러 진입 = 경쟁 가중
  // 1만~5만: 적정, 5만+: 레드오션 리스크
  let volumePenalty = 0;
  if (monthlyVolume > 50000) volumePenalty = -15;
  else if (monthlyVolume > 100000) volumePenalty = -25;

  return clamp(compScore + volumePenalty);
}

// ── S4: 구매 전환력 (Purchase Convertibility) ─────────────

function calcPurchaseConvertibility(keyword: string): number {
  const intent = classifyKeywordIntent(keyword);

  // 구매 의도 60% + 구체성 40%
  const score = intent.intentScore * 0.6 + intent.specificityScore * 0.4;

  // 정보 탐색 키워드 페널티
  const penalty = intent.type === "informational" ? -15 : 0;

  return clamp(score + penalty);
}

// ── S5: 시장 규모 (Market Size) ───────────────────────────

function calcMarketSize(monthlyVolume: number): number {
  if (monthlyVolume <= 0) return 30; // 데이터 없으면 중립
  // log 스케일: 100 = 20점, 1000 = 50점, 10000 = 67점, 100000 = 83점
  return clamp(logNorm(monthlyVolume, 500000));
}

// ── 등급 판정 ─────────────────────────────────────────────

function getTier(score: number): SeasonOpportunityResult["tier"] {
  if (score >= 70) return "최고";
  if (score >= 50) return "좋음";
  if (score >= 35) return "보통";
  return "관망";
}

// ── 조언 생성 ─────────────────────────────────────────────

function generateAdvice(
  tier: SeasonOpportunityResult["tier"],
  topFactorKey: string,
  gap: number,
  competitionLevel: string,
): string {
  if (tier === "최고") {
    return `작년에 검증된 높은 수요가 있고 현재 경쟁이 낮습니다. 시즌이 오기 전에 상품을 등록하면 선점 효과가 매우 큽니다. 상품명에 시즌 키워드를 정확히 포함하세요.`;
  }
  if (tier === "좋음") {
    if (topFactorKey === "preseasonGap") {
      return `작년 대비 검색량 갭이 커서 곧 수요가 돌아올 가능성이 높습니다. 미리 상품을 준비하되, 소량 테스트 후 재고를 늘리세요.`;
    }
    if (competitionLevel === "높음" || competitionLevel === "매우 높음") {
      return `시즌 수요는 확실하지만 경쟁이 세므로 '키워드+수식어' 롱테일로 먼저 진입하는 전략을 추천합니다.`;
    }
    return `시즌 수요와 진입 가능성이 모두 양호합니다. 상품 등록 시기를 1~2개월 앞당기면 시즌 피크에서 상위 노출을 잡을 수 있습니다.`;
  }
  if (tier === "보통") {
    return `시즌 수요가 있지만 ${gap < 10 ? "갭이 작아 이미 경쟁이 시작된 상태입니다" : "진입 난이도가 높아 롱테일 키워드 병행이 필요합니다"}. 틈새 수식어를 활용한 차별화를 고려하세요.`;
  }
  return `현재 시점에서 시즌 기회가 제한적입니다. 다른 추천 키워드를 먼저 공략하고, 이 키워드는 트렌드가 상승할 때 재진입을 고려하세요.`;
}

// ── 메인 함수 ─────────────────────────────────────────────

export function calcSeasonOpportunityScore(input: SOSInput): SeasonOpportunityResult {
  const { keyword, pastPopularity, currentPopularity, gap, monthlyVolume, competitionLevel, seasonHint } = input;

  const s1 = calcSeasonValidation(pastPopularity);
  const s2 = calcPreseasonGap(gap, pastPopularity);
  const s3 = calcEntryFeasibility(competitionLevel, monthlyVolume);
  const s4 = calcPurchaseConvertibility(keyword);
  const s5 = calcMarketSize(monthlyVolume);

  const subfactors: SOSSubFactor[] = [
    { key: "seasonValidation",       label: "시즌 검증도",  score: s1, weight: 0.25 },
    { key: "preseasonGap",           label: "선점 갭",      score: s2, weight: 0.25 },
    { key: "entryFeasibility",       label: "진입 용이성",  score: s3, weight: 0.20 },
    { key: "purchaseConvertibility", label: "구매 전환력",  score: s4, weight: 0.15 },
    { key: "marketSize",             label: "시장 규모",    score: s5, weight: 0.15 },
  ];

  const raw =
    s1 * 0.25 +
    s2 * 0.25 +
    s3 * 0.20 +
    s4 * 0.15 +
    s5 * 0.15;

  const score = clamp(raw);

  const topSub = subfactors.reduce((a, b) => (a.score * a.weight > b.score * b.weight ? a : b));
  const tier = getTier(score);
  const advice = generateAdvice(tier, topSub.key, gap, competitionLevel);

  return {
    keyword,
    score,
    subfactors,
    topFactor: topSub.label,
    advice,
    tier,
    pastPopularity,
    currentPopularity,
    gap,
    monthlyVolume,
    seasonHint,
    competitionLevel,
  };
}
