/**
 * 플랫폼별 판매 성공 Factor 모델
 *
 * 스마트스토어/쿠팡 각각 6개 Factor:
 *   F1 상위 노출 가능성 (Ranking)
 *   F2 구매전환율 (Conversion)
 *   F3 시장 성장성 (Growth)
 *   F4 수익성 (Profitability)
 *   F5 진입 난이도 (Entry Barrier) — 낮을수록 좋음
 *   F6 크로스 플랫폼 기회 (Cross-Platform)
 */

import type { Product } from "./search";

// ── 타입 ──────────────────────────────────────────────────

export type Platform = "naver" | "coupang";

export interface SubFactor {
  name: string;
  score: number;       // 0~100
  weight: number;      // 0~1
  measured: boolean;   // 실데이터 vs 추정/중립
  tip?: string;        // 측정 불가 시 셀러 조언
}

export interface FactorResult {
  key: string;
  label: string;
  score: number;          // 0~100
  percent?: number;       // F1→상위 노출 %, F2→전환율 %
  percentLabel?: string;  // "62%" or "5.8%"
  subfactors: SubFactor[];
  advice: string;         // Factor별 한줄 조언
}

export interface FactorScoreSet {
  platform: Platform;
  keyword: string;
  factors: FactorResult[];
  rankingPercent: number;   // 상위 노출 가능성 %
  conversionPercent: number; // 구매전환율 %
}

export interface FactorInput {
  keyword: string;
  totalCount: number;
  coupangRatio: number;
  priceStats: { min: number; max: number; avg: number };
  compIdx?: "낮음" | "보통" | "높음";
  intentScore: number;          // 0~100
  specificityScore: number;     // 0~100
  trendDirection: "상승" | "하락" | "안정";
  trendSlope: number;           // -100~+100
  longSlope: number;            // -100~+100
  monthlyVolume: number;        // 실제 or 추정
  trendPeak: number;
  trendCurrent: number;
  products: Product[];
  // 쿠팡 전용 (없으면 null → 중립값)
  entryBarrier?: number | null;
  reviewBarrier?: number | null;
  rocketBarrier?: number | null;
  dominanceScore?: number | null;
  rocketRatio?: number | null;
}

// ── 유틸리티 ──────────────────────────────────────────────

const NEUTRAL = 50;

function logNorm(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(value + 1) / Math.log10(maxValue + 1)) * 100));
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function linearClamp(value: number, inMin: number, inMax: number): number {
  return clamp(((value - inMin) / (inMax - inMin)) * 100);
}

function sigmoid(score: number, k: number, x0: number): number {
  return 1 / (1 + Math.exp(-k * (score - x0)));
}

// ── 확률 변환 ─────────────────────────────────────────────

/** Ranking Score 0~100 → 상위 노출 가능성 5%~90% */
export function rankingToPercent(score: number): number {
  return Math.round(sigmoid(score, 0.06, 45) * 85 + 5);
}

/** Conversion Score 0~100 → 구매전환율 1.5%~13.5% */
export function conversionToPercent(score: number): number {
  return Math.round(sigmoid(score, 0.05, 50) * 120 + 15) / 10;
}

// ── 스마트스토어 Factor 계산 ──────────────────────────────

function calcNaverRanking(i: FactorInput): FactorResult {
  const supplyRaw = logNorm(i.totalCount, 1_000_000);
  const supplyFactor = 100 - supplyRaw;

  const adMap: Record<string, number> = { "낮음": 80, "보통": 48, "높음": 18 };
  const adFactor = i.compIdx ? adMap[i.compIdx] : NEUTRAL;

  const salesFactor = NEUTRAL;
  const relevancy = i.specificityScore;
  const hasCoupangData = i.coupangRatio > 0;
  const platformOpp = hasCoupangData ? (100 - i.coupangRatio * 0.75) : NEUTRAL;

  const score = clamp(
    supplyFactor * 0.30 +
    adFactor * 0.20 +
    salesFactor * 0.20 +
    relevancy * 0.15 +
    platformOpp * 0.15
  );

  const pct = rankingToPercent(score);

  // 점수 기반 조언
  let advice: string;
  if (score >= 70) {
    advice = `경쟁이 낮아 상품명에 이 키워드를 정확히 넣으면 1페이지 노출 가능성이 높습니다. 상품 등록 후 초기 리뷰 10개를 빠르게 확보하세요.`;
  } else if (score >= 45) {
    advice = `적정 경쟁입니다. 상품명 앞 25자에 핵심 키워드를 배치하고, 태그 10개 이상 + 정확한 카테고리 설정이 필수입니다. 블로그 체험단으로 외부 유입도 병행하세요.`;
  } else {
    advice = `경쟁이 치열합니다. 이 키워드 단독 공략보다 '키워드+수식어' 롱테일로 먼저 상위 노출을 잡고, 판매 실적을 쌓아 메인 키워드 순위를 올리세요.`;
  }

  return {
    key: "ranking",
    label: "상위 노출 가능성",
    score,
    percent: pct,
    percentLabel: `${pct}%`,
    subfactors: [
      { name: "공급 포화도", score: supplyFactor, weight: 0.30, measured: true },
      { name: "광고 경쟁도", score: adFactor, weight: 0.20, measured: !!i.compIdx },
      { name: "최근 판매량 장벽", score: salesFactor, weight: 0.20, measured: false, tip: "상위 10위 상품의 최근 7일 판매량 30%를 첫 주에 달성하면 1페이지 진입 가능" },
      { name: "키워드 적합도", score: clamp(relevancy), weight: 0.15, measured: true },
      { name: "플랫폼 기회", score: clamp(platformOpp), weight: 0.15, measured: hasCoupangData, tip: hasCoupangData ? undefined : "쿠팡 상품 분석 시스템 준비중 — 연동 시 정밀 분석 가능" },
    ],
    advice,
  };
}

function calcNaverConversion(i: FactorInput): FactorResult {
  const intentFactor = i.intentScore;
  // FIX: 기존엔 ctrFactor = intentScore 로 두 신호가 100% 동치 → 가중치 0.55가 같은 축에 몰림.
  //      Ad API 비활성 시에는 intent + 구체성의 가중평균(0.6/0.4)으로 대체하여 신호 중복을 줄임.
  const ctrFactor = clamp(i.intentScore * 0.6 + i.specificityScore * 0.4);
  const specFactor = i.specificityScore;

  // 가격 적정성: U자 커브 (20~50% 최적)
  const pc = clamp((1 - (i.priceStats.avg > 0 && i.priceStats.min > 0 ? i.priceStats.min / i.priceStats.avg : 0.5)) * 100);
  let priceFactor: number;
  if (pc < 20) priceFactor = 40 + pc;
  else if (pc < 50) priceFactor = 60 + (pc - 20);
  else priceFactor = Math.max(20, 90 - (pc - 50) * 1.4);

  const contentFactor = NEUTRAL;

  const score = clamp(
    intentFactor * 0.35 +
    ctrFactor * 0.20 +
    specFactor * 0.20 +
    priceFactor * 0.15 +
    contentFactor * 0.10
  );

  const pct = conversionToPercent(score);

  let advice: string;
  if (score >= 65) {
    advice = `구매 의도가 높은 키워드입니다. 메인 이미지에 핵심 셀링포인트를 넣고, 상세페이지 상단에 구매 결정 포인트(가격·배송·혜택)를 배치하면 높은 전환율을 기대할 수 있습니다.`;
  } else if (score >= 40) {
    advice = `탐색 단계의 소비자가 많습니다. 상세페이지에 비교 정보·사용 후기·Q&A를 충실히 넣어 '탐색→구매' 전환을 유도하세요. 쿠폰·적립금도 전환율에 효과적입니다.`;
  } else {
    advice = `정보 탐색 목적의 검색이 많아 즉시 구매 전환은 낮을 수 있습니다. 블로그·리뷰 콘텐츠로 상품 인지도를 먼저 높이고, 구매의도가 높은 롱테일 키워드를 병행하세요.`;
  }

  return {
    key: "conversion",
    label: "구매전환율",
    score,
    percent: pct,
    percentLabel: `${pct}%`,
    subfactors: [
      { name: "구매 의도", score: clamp(intentFactor), weight: 0.35, measured: true },
      { name: "클릭률 (CTR)", score: clamp(ctrFactor), weight: 0.20, measured: false, tip: "네이버 광고 API 연동 시 실제 클릭률 기반 정밀 분석 가능" },
      { name: "키워드 구체성", score: clamp(specFactor), weight: 0.20, measured: true },
      { name: "가격 적정성", score: clamp(priceFactor), weight: 0.15, measured: true },
      { name: "상세페이지 품질", score: contentFactor, weight: 0.10, measured: false, tip: "이미지 10장 이상 + 체류시간 40초 이상이면 전환율 2배 상승 (네이버 공식 가이드)" },
    ],
    advice,
  };
}

function calcGrowth(i: FactorInput): FactorResult {
  const dirBase: Record<string, number> = { "상승": 75, "안정": 50, "하락": 25 };
  const slopeAdj = clamp(i.trendSlope * 0.5, -25, 25);
  const trendFactor = clamp((dirBase[i.trendDirection] ?? 50) + slopeAdj);

  const momentumFactor = clamp(50 + (i.trendSlope * 0.7 + i.longSlope * 0.3));

  const vol = i.monthlyVolume > 0 ? i.monthlyVolume : i.trendCurrent * 1000;
  const sizeFactor = Math.min(100, Math.round((Math.log10(Math.max(vol, 1) + 1) / 6) * 100));

  const seasonRatio = i.trendPeak > 0 ? i.trendCurrent / i.trendPeak : 0.5;
  let seasonFactor: number;
  if (seasonRatio > 0.8) seasonFactor = 70;
  else if (i.trendDirection === "상승") seasonFactor = 80;
  else if (i.trendDirection === "하락") seasonFactor = 25;
  else seasonFactor = 50;

  const score = clamp(
    trendFactor * 0.35 +
    momentumFactor * 0.30 +
    sizeFactor * 0.20 +
    seasonFactor * 0.15
  );

  let advice: string;
  if (score >= 65) {
    advice = `성장 중인 시장입니다. 지금 진입하면 트렌드 상승에 따라 자연 검색 유입이 계속 늘어납니다. 빠른 진입이 유리합니다.`;
  } else if (score >= 40) {
    advice = `안정적인 시장입니다. 급격한 성장은 어렵지만 꾸준한 수요가 있어, 장기적으로 안정적인 매출을 기대할 수 있습니다.`;
  } else {
    advice = `수요가 감소 추세입니다. 이 키워드에 대규모 투자보다는 관련 상승 키워드를 함께 공략하는 전략이 안전합니다.`;
  }

  return {
    key: "growth",
    label: "시장 성장성",
    score,
    subfactors: [
      { name: "트렌드 방향", score: trendFactor, weight: 0.35, measured: true },
      { name: "트렌드 모멘텀", score: momentumFactor, weight: 0.30, measured: true },
      { name: "시장 규모", score: sizeFactor, weight: 0.20, measured: i.monthlyVolume > 0 },
      { name: "계절성", score: seasonFactor, weight: 0.15, measured: true },
    ],
    advice,
  };
}

function calcNaverProfit(i: FactorInput): FactorResult {
  const avg = i.priceStats.avg;
  const priceFactor = linearClamp(avg, 5000, 100000);

  const pc = clamp((1 - (avg > 0 && i.priceStats.min > 0 ? i.priceStats.min / avg : 0.5)) * 100);
  const stabilityFactor = 100 - pc;

  const feeRate = 5 + 3.74; // 기본 수수료 5% + 네이버페이
  const feeFactor = clamp(100 - feeRate * 5);

  const sourcing = avg * 0.4;
  const fee = avg * (feeRate / 100);
  const margin = avg - sourcing - fee - 2500;
  const marginRate = avg > 0 ? (margin / avg) * 100 : 0;
  const marginFactor = linearClamp(marginRate, 0, 50);

  const shippingRatio = avg > 0 ? (2500 / avg) * 100 : 50;
  const shippingFactor = clamp(100 - shippingRatio * 3);

  const score = clamp(
    priceFactor * 0.30 +
    stabilityFactor * 0.25 +
    feeFactor * 0.20 +
    marginFactor * 0.15 +
    shippingFactor * 0.10
  );

  let advice: string;
  if (score >= 65) {
    advice = `마진 구조가 양호합니다. 평균가 ${avg.toLocaleString()}원 수준에서 소싱가를 40% 이하로 맞추면 안정적인 수익이 가능합니다.`;
  } else if (score >= 40) {
    advice = `마진이 빠듯할 수 있습니다. 묶음 판매로 객단가를 높이거나, 소싱 원가를 낮추는 방법을 검토하세요.`;
  } else {
    advice = `저가 상품이라 배송비·수수료 비중이 커 수익이 나기 어렵습니다. 세트 구성이나 프리미엄 라인으로 객단가를 높이는 전략이 필요합니다.`;
  }

  return {
    key: "profitability",
    label: "수익성",
    score,
    subfactors: [
      { name: "평균가 수준", score: priceFactor, weight: 0.30, measured: true },
      { name: "가격 안정성", score: clamp(stabilityFactor), weight: 0.25, measured: true },
      { name: "수수료 부담", score: feeFactor, weight: 0.20, measured: true },
      { name: "추정 마진율", score: clamp(marginFactor), weight: 0.15, measured: true },
      { name: "배송비 부담", score: clamp(shippingFactor), weight: 0.10, measured: true },
    ],
    advice,
  };
}

function calcNaverEntryBarrier(i: FactorInput): FactorResult {
  const supplyFactor = logNorm(i.totalCount, 1_000_000);

  const adMap: Record<string, number> = { "낮음": 20, "보통": 52, "높음": 82 };
  const adFactor = i.compIdx ? adMap[i.compIdx] : NEUTRAL;

  // 판매자 독점도
  const top10 = i.products.slice(0, 10).map((p) => p.mallName);
  const uniqueRatio = top10.length > 0 ? new Set(top10).size / top10.length : 0.5;
  const dominanceFactor = clamp((1 - uniqueRatio) * 100);

  const pc = clamp((1 - (i.priceStats.avg > 0 && i.priceStats.min > 0 ? i.priceStats.min / i.priceStats.avg : 0.5)) * 100);
  const priceWarFactor = pc;

  const reviewFactor = NEUTRAL;

  const score = clamp(
    supplyFactor * 0.30 +
    adFactor * 0.25 +
    dominanceFactor * 0.20 +
    priceWarFactor * 0.15 +
    reviewFactor * 0.10
  );

  let advice: string;
  if (score <= 30) {
    advice = `진입 장벽이 매우 낮습니다. 상품만 등록하면 바로 경쟁에 참여할 수 있습니다. 초기 광고 없이도 자연 노출로 시작 가능합니다.`;
  } else if (score <= 55) {
    advice = `보통 수준의 진입 장벽입니다. 네이버 쇼핑 검색광고(월 5~10만원)를 초기 2주간 집행하면서 자연 노출 순위를 끌어올리세요.`;
  } else {
    advice = `진입 장벽이 높습니다. 기존 셀러가 강하므로, 이 키워드보다 경쟁이 낮은 롱테일 키워드부터 시작하는 것을 강력히 권장합니다.`;
  }

  return {
    key: "entryBarrier",
    label: "진입 난이도",
    score,
    subfactors: [
      { name: "공급 포화도", score: supplyFactor, weight: 0.30, measured: true },
      { name: "광고 비용 장벽", score: adFactor, weight: 0.25, measured: !!i.compIdx },
      { name: "판매자 독점도", score: dominanceFactor, weight: 0.20, measured: true },
      { name: "가격 출혈 리스크", score: priceWarFactor, weight: 0.15, measured: true },
      { name: "초기 리뷰 허들", score: reviewFactor, weight: 0.10, measured: false, tip: "체험단으로 초기 리뷰 10개 확보 시 전환율 3배 상승" },
    ],
    advice,
  };
}

function calcCrossplatform(i: FactorInput, platform: Platform): FactorResult {
  const isNaver = platform === "naver";
  const hasCoupangData = i.coupangRatio > 0;

  const focusScore = hasCoupangData ? (isNaver ? (100 - i.coupangRatio) : i.coupangRatio) : NEUTRAL;
  const ecosystemFactor = NEUTRAL; // 향후 블로그 API
  const rocketGap = hasCoupangData
    ? (isNaver ? clamp(100 - i.coupangRatio * 0.8) : clamp(i.coupangRatio * 0.8))
    : NEUTRAL;

  const score = clamp(
    focusScore * 0.50 +
    ecosystemFactor * 0.30 +
    rocketGap * 0.20
  );

  const otherPlatform = isNaver ? "쿠팡" : "스마트스토어";
  let advice: string;
  if (score >= 65) {
    advice = `이 키워드는 ${isNaver ? "네이버 쇼핑" : "쿠팡"}에서 특히 강세입니다. ${isNaver ? "스마트스토어" : "쿠팡"} 진입에 매우 유리한 환경입니다.`;
  } else if (score >= 40) {
    advice = `양 플랫폼에서 비슷한 수준의 경쟁입니다. ${otherPlatform}에서도 동시 판매를 고려해보세요.`;
  } else {
    advice = `${otherPlatform}이 이 키워드에서 더 강세입니다. ${isNaver ? "스마트스토어" : "쿠팡"} 진입 시 차별화 전략이 반드시 필요합니다.`;
  }

  return {
    key: "crossPlatform",
    label: "크로스 플랫폼 기회",
    score,
    subfactors: [
      { name: isNaver ? "네이버 집중도" : "쿠팡 집중도", score: clamp(focusScore), weight: 0.50, measured: hasCoupangData, tip: hasCoupangData ? undefined : "쿠팡 상품 분석 시스템 준비중" },
      { name: "생태계 연동성", score: ecosystemFactor, weight: 0.30, measured: false, tip: "향후 블로그·카페 데이터 연동 시 정밀 분석 가능" },
      { name: isNaver ? "로켓배송 부재 기회" : "로켓배송 우위", score: clamp(rocketGap), weight: 0.20, measured: hasCoupangData, tip: hasCoupangData ? undefined : "쿠팡 상품 분석 시스템 준비중" },
    ],
    advice,
  };
}

// ── 쿠팡 Factor 계산 ─────────────────────────────────────

function calcCoupangRanking(i: FactorInput): FactorResult {
  const entryReview = i.entryBarrier != null ? (100 - i.entryBarrier) : NEUTRAL;
  const topReview = i.reviewBarrier != null ? (100 - i.reviewBarrier) : NEUTRAL;
  const rocket = i.rocketBarrier != null ? (100 - i.rocketBarrier) : NEUTRAL;
  const relevancy = i.specificityScore;
  const supplyInv = 100 - logNorm(i.totalCount, 1_000_000);

  const hasCoupangData = i.entryBarrier != null;

  const score = clamp(
    entryReview * 0.30 +
    topReview * 0.20 +
    rocket * 0.20 +
    relevancy * 0.15 +
    supplyInv * 0.15
  );

  const pct = rankingToPercent(score);

  let advice: string;
  if (!hasCoupangData) {
    advice = `쿠팡 API 연동 전이라 리뷰·로켓배송 데이터를 추정값으로 계산했습니다. 실제 데이터 연동 시 정밀도가 크게 향상됩니다.`;
  } else if (score >= 65) {
    advice = `리뷰 장벽이 낮아 빠르게 상위 노출이 가능합니다. 로켓그로스 입점 후 체험단으로 초기 리뷰를 모으세요.`;
  } else if (score >= 40) {
    advice = `적당한 경쟁입니다. 쿠팡 검색광고(CPC)를 초기에 활용하면서 리뷰를 쌓아 자연 순위를 올리세요.`;
  } else {
    advice = `리뷰·로켓 장벽이 높습니다. 롱테일 키워드로 우회하여 판매 이력을 먼저 쌓는 전략이 필요합니다.`;
  }

  return {
    key: "ranking",
    label: "상위 노출 가능성",
    score,
    percent: pct,
    percentLabel: `${pct}%`,
    subfactors: [
      { name: "10위 진입 리뷰 장벽", score: entryReview, weight: 0.30, measured: hasCoupangData },
      { name: "상위3 리뷰 장벽", score: topReview, weight: 0.20, measured: hasCoupangData },
      { name: "로켓배송 장벽", score: rocket, weight: 0.20, measured: hasCoupangData },
      { name: "키워드 적합도", score: clamp(relevancy), weight: 0.15, measured: true },
      { name: "공급 포화도", score: clamp(supplyInv), weight: 0.15, measured: true },
    ],
    advice,
  };
}

function calcCoupangConversion(i: FactorInput): FactorResult {
  const intentFactor = i.intentScore;
  const rocketFactor = i.rocketRatio != null ? clamp(i.rocketRatio * 0.9) : NEUTRAL;
  const specFactor = i.specificityScore;
  const pc = clamp((1 - (i.priceStats.avg > 0 && i.priceStats.min > 0 ? i.priceStats.min / i.priceStats.avg : 0.5)) * 100);
  const priceFactor = 100 - pc;
  const ratingFactor = NEUTRAL; // 쿠팡 API 비활성 시

  const score = clamp(
    intentFactor * 0.30 +
    rocketFactor * 0.25 +
    specFactor * 0.20 +
    priceFactor * 0.15 +
    ratingFactor * 0.10
  );

  const pct = conversionToPercent(score);

  let advice: string;
  if (score >= 60) {
    advice = `구매전환이 높을 것으로 예상됩니다. 로켓배송 뱃지 + 경쟁력 있는 가격이 핵심입니다. 메인 이미지에 핵심 셀링포인트를 부각하세요.`;
  } else {
    advice = `쿠팡에서의 전환을 높이려면 로켓배송 필수 + 상세 이미지 5장 이상 + 리뷰 응대를 철저히 하세요. 할인 쿠폰도 전환에 효과적입니다.`;
  }

  return {
    key: "conversion",
    label: "구매전환율",
    score,
    percent: pct,
    percentLabel: `${pct}%`,
    subfactors: [
      { name: "구매 의도", score: clamp(intentFactor), weight: 0.30, measured: true },
      { name: "로켓배송 효과", score: rocketFactor, weight: 0.25, measured: i.rocketRatio != null },
      { name: "키워드 구체성", score: clamp(specFactor), weight: 0.20, measured: true },
      { name: "가격 경쟁력", score: clamp(priceFactor), weight: 0.15, measured: true },
      { name: "별점 경쟁", score: ratingFactor, weight: 0.10, measured: false, tip: "쿠팡 API 연동 시 경쟁 상품 별점 기반 분석 가능" },
    ],
    advice,
  };
}

function calcCoupangProfit(i: FactorInput): FactorResult {
  const avg = i.priceStats.avg;
  const priceFactor = linearClamp(avg, 5000, 100000);

  const pc = clamp((1 - (avg > 0 && i.priceStats.min > 0 ? i.priceStats.min / avg : 0.5)) * 100);
  const stabilityFactor = 100 - pc;

  const feeRate = 10; // 쿠팡 평균 수수료
  const feeFactor = clamp(100 - feeRate * 4);

  const sourcing = avg * 0.4;
  const fee = avg * (feeRate / 100);
  const logistics = 3000; // 로켓그로스 기본 물류비
  const margin = avg - sourcing - fee - logistics;
  const marginRate = avg > 0 ? (margin / avg) * 100 : 0;
  const marginFactor = linearClamp(marginRate, 0, 50);

  const logisticsFactor = avg > 0 ? clamp(100 - (logistics / avg) * 300) : 20;

  const score = clamp(
    priceFactor * 0.25 +
    stabilityFactor * 0.25 +
    feeFactor * 0.20 +
    marginFactor * 0.20 +
    logisticsFactor * 0.10
  );

  let advice: string;
  if (score >= 60) {
    advice = `마진 구조가 양호합니다. 로켓그로스 물류비(기본 3,000원)를 감안해도 수익이 나는 가격대입니다.`;
  } else {
    advice = `쿠팡 수수료(평균 10%) + 로켓그로스 물류비를 감안하면 마진이 빠듯합니다. 묶음 판매로 객단가를 높이거나, 일반 배송으로 물류비를 줄이는 방법을 검토하세요.`;
  }

  return {
    key: "profitability",
    label: "수익성",
    score,
    subfactors: [
      { name: "평균가 수준", score: priceFactor, weight: 0.25, measured: true },
      { name: "가격 안정성", score: clamp(stabilityFactor), weight: 0.25, measured: true },
      { name: "수수료 부담", score: feeFactor, weight: 0.20, measured: true },
      { name: "추정 마진율", score: clamp(marginFactor), weight: 0.20, measured: true },
      { name: "물류비 부담", score: clamp(logisticsFactor), weight: 0.10, measured: false, tip: "로켓그로스 기본 3,000원 + 부피/무게별 추가" },
    ],
    advice,
  };
}

function calcCoupangEntryBarrier(i: FactorInput): FactorResult {
  const entryReview = i.entryBarrier ?? NEUTRAL;
  const rocket = i.rocketBarrier ?? NEUTRAL;
  const dominance = i.dominanceScore ?? NEUTRAL;
  const pc = clamp((1 - (i.priceStats.avg > 0 && i.priceStats.min > 0 ? i.priceStats.min / i.priceStats.avg : 0.5)) * 100);
  const inventoryFactor = NEUTRAL;

  const score = clamp(
    entryReview * 0.30 +
    rocket * 0.25 +
    dominance * 0.20 +
    pc * 0.15 +
    inventoryFactor * 0.10
  );

  const hasCoupangData = i.entryBarrier != null;

  let advice: string;
  if (!hasCoupangData) {
    advice = `쿠팡 API 연동 전이라 추정값입니다. 연동 시 리뷰·로켓 기반 정밀 진입 난이도 분석이 가능합니다.`;
  } else if (score <= 35) {
    advice = `진입이 쉬운 시장입니다. 로켓그로스 입점 후 바로 경쟁에 참여 가능합니다. 초기 재고 50개부터 시작하세요.`;
  } else {
    advice = `기존 셀러의 리뷰·로켓배송 장벽이 있습니다. 롱테일 키워드로 우회 진입을 권장합니다.`;
  }

  return {
    key: "entryBarrier",
    label: "진입 난이도",
    score,
    subfactors: [
      { name: "10위 진입 리뷰", score: entryReview, weight: 0.30, measured: hasCoupangData },
      { name: "로켓배송 점유율", score: rocket, weight: 0.25, measured: hasCoupangData },
      { name: "판매자 독점도", score: dominance, weight: 0.20, measured: hasCoupangData },
      { name: "가격 출혈 리스크", score: pc, weight: 0.15, measured: true },
      { name: "초기 재고 비용", score: inventoryFactor, weight: 0.10, measured: false, tip: `로켓그로스 최소 입고 50개. 평균가 기준 약 ${(i.priceStats.avg * 50).toLocaleString()}원` },
    ],
    advice,
  };
}

// ── 메인 API ──────────────────────────────────────────────

export function calcFactorScores(input: FactorInput, platform: Platform): FactorScoreSet {
  const factors: FactorResult[] = platform === "naver"
    ? [
        calcNaverRanking(input),
        calcNaverConversion(input),
        calcGrowth(input),
        calcNaverProfit(input),
        calcNaverEntryBarrier(input),
        calcCrossplatform(input, "naver"),
      ]
    : [
        calcCoupangRanking(input),
        calcCoupangConversion(input),
        calcGrowth(input),
        calcCoupangProfit(input),
        calcCoupangEntryBarrier(input),
        calcCrossplatform(input, "coupang"),
      ];

  const ranking = factors.find((f) => f.key === "ranking")!;
  const conversion = factors.find((f) => f.key === "conversion")!;

  return {
    platform,
    keyword: input.keyword,
    factors,
    rankingPercent: ranking.percent ?? 0,
    conversionPercent: conversion.percent ?? 0,
  };
}

// ── 키워드 비교 ───────────────────────────────────────────

export interface FactorDelta {
  key: string;
  label: string;
  mainScore: number;
  altScore: number;
  delta: number;
  mainPercent?: number;
  altPercent?: number;
  deltaPercent?: number;
}

export function compareFactors(
  mainScores: FactorScoreSet,
  altScores: FactorScoreSet,
): FactorDelta[] {
  return mainScores.factors.map((mf) => {
    const af = altScores.factors.find((f) => f.key === mf.key)!;
    return {
      key: mf.key,
      label: mf.label,
      mainScore: mf.score,
      altScore: af.score,
      delta: af.score - mf.score,
      mainPercent: mf.percent,
      altPercent: af.percent,
      deltaPercent: mf.percent != null && af.percent != null ? af.percent - mf.percent : undefined,
    };
  });
}
