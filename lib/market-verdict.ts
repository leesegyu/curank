/**
 * 시장 진입 판단 엔진 (Go / No-Go)
 *
 * 규칙 기반 — GPT 미사용, 일관된 판단 보장
 * 입력: 경쟁 분석 + 트렌드 + 검색량 데이터
 * 출력: 🟢 진입 추천 / 🟡 조건부 진입 / 🔴 진입 비추천
 */

export type VerdictLevel = "go" | "conditional" | "nogo";

export interface MarketVerdict {
  level: VerdictLevel;
  title: string;
  description: string;
  reasons: string[];
  cautions: string[]; // 🟡일 때 주의사항
  estimatedMonthlySales: { min: number; max: number } | null;
  priceRange: { low: number; high: number } | null;
  competitionScore: number;
  trendDirection: string;
}

interface VerdictInput {
  competitionScore: number;         // 0-100
  competitionLevel: string;         // 낮음/보통/높음/매우높음
  trendDirection: string;           // 상승/하락/안정
  trendSlope?: number;              // 기울기
  monthlyVolume?: number;           // 월 검색량
  totalProducts: number;            // 총 상품 수
  avgPrice: number;                 // 평균 가격
  minPrice: number;                 // 최저 가격
  maxPrice: number;                 // 최고 가격
  avgRatingCount?: number | null;   // 평균 리뷰 수
}

export function calcMarketVerdict(input: VerdictInput): MarketVerdict {
  const {
    competitionScore,
    competitionLevel,
    trendDirection,
    trendSlope = 0,
    monthlyVolume = 0,
    totalProducts,
    avgPrice,
    minPrice,
    maxPrice,
    avgRatingCount,
  } = input;

  const reasons: string[] = [];
  const cautions: string[] = [];

  // ── 점수 체계: 진입 유리도 (0~100) ──
  let entryScore = 0;

  // 1. 경쟁 강도 (최대 40점)
  if (competitionScore < 25) {
    entryScore += 40;
    reasons.push(`경쟁이 매우 낮습니다 (${competitionScore}점)`);
  } else if (competitionScore < 50) {
    entryScore += 30;
    reasons.push(`경쟁이 적당한 수준입니다 (${competitionScore}점)`);
  } else if (competitionScore < 75) {
    entryScore += 15;
    cautions.push(`경쟁이 다소 치열합니다 (${competitionScore}점)`);
  } else {
    entryScore += 0;
    cautions.push(`경쟁이 매우 치열합니다 (${competitionScore}점) — 상위 셀러 대비 차별화 필수`);
  }

  // 2. 트렌드 (최대 25점)
  if (trendDirection === "상승") {
    entryScore += 25;
    reasons.push(`검색량이 증가 추세입니다 (↑${trendSlope > 0 ? ` +${trendSlope.toFixed(1)}` : ""})`);
  } else if (trendDirection === "안정") {
    entryScore += 15;
    reasons.push("검색량이 안정적입니다");
  } else {
    entryScore += 0;
    cautions.push(`검색량이 감소 추세입니다 (↓${trendSlope < 0 ? ` ${trendSlope.toFixed(1)}` : ""})`);
  }

  // 3. 검색량 (최대 20점)
  if (monthlyVolume >= 5000) {
    entryScore += 20;
    reasons.push(`월 검색량이 충분합니다 (${monthlyVolume.toLocaleString()}회)`);
  } else if (monthlyVolume >= 1000) {
    entryScore += 15;
    reasons.push(`월 검색량이 있습니다 (${monthlyVolume.toLocaleString()}회)`);
  } else if (monthlyVolume >= 100) {
    entryScore += 8;
    cautions.push(`월 검색량이 적은 편입니다 (${monthlyVolume.toLocaleString()}회)`);
  } else if (monthlyVolume > 0) {
    entryScore += 3;
    cautions.push(`월 검색량이 매우 적습니다 (${monthlyVolume.toLocaleString()}회)`);
  } else {
    entryScore += 5; // 검색량 미확인 = 중립
  }

  // 4. 상품 수 / 공급 과잉 (최대 15점)
  if (totalProducts < 1000) {
    entryScore += 15;
    reasons.push(`등록 상품이 적어 진입 여지가 있습니다 (${totalProducts.toLocaleString()}개)`);
  } else if (totalProducts < 10000) {
    entryScore += 10;
  } else if (totalProducts < 100000) {
    entryScore += 5;
    cautions.push(`등록 상품이 많습니다 (${totalProducts.toLocaleString()}개)`);
  } else {
    entryScore += 0;
    cautions.push(`등록 상품이 매우 많아 노출이 어려울 수 있습니다 (${totalProducts.toLocaleString()}개)`);
  }

  // ── 판정 ──
  let level: VerdictLevel;
  let title: string;
  let description: string;

  if (entryScore >= 65) {
    level = "go";
    title = "진입 추천";
    description = `이 시장은 경쟁이 ${competitionLevel}하고 ${trendDirection === "상승" ? "성장하고 있어" : "수요가 안정적이어서"} 진입하기 좋은 시점입니다.`;
  } else if (entryScore >= 40) {
    level = "conditional";
    title = "조건부 진입";
    description = `진입 가능하지만 ${competitionScore >= 50 ? "경쟁이 있어 차별화 전략이 필요합니다" : "시장 규모가 작아 니치 전략이 필요합니다"}.`;
  } else {
    level = "nogo";
    title = "진입 비추천";
    description = `이 시장은 ${competitionLevel === "매우 높음" || competitionLevel === "높음" ? "경쟁이 치열하고" : "수요가 부족하고"} ${trendDirection === "하락" ? "검색량도 감소 추세라" : "성장 가능성이 낮아"} 다른 키워드를 추천합니다.`;
  }

  // ── 예상 월 매출 계산 ──
  let estimatedMonthlySales: MarketVerdict["estimatedMonthlySales"] = null;
  if (monthlyVolume > 0 && avgPrice > 0) {
    // 경쟁 기반 노출률 추정
    const exposureRate = competitionScore < 30 ? 0.05 : competitionScore < 50 ? 0.03 : competitionScore < 75 ? 0.015 : 0.005;
    const ctr = 0.03; // 평균 클릭률 3%
    const conversionRate = 0.02; // 평균 전환율 2%

    const monthlyClicks = monthlyVolume * exposureRate * ctr;
    const monthlySales = monthlyClicks * conversionRate;
    const revenue = monthlySales * avgPrice;

    // 범위로 표시 (0.5x ~ 2x)
    estimatedMonthlySales = {
      min: Math.round(revenue * 0.5),
      max: Math.round(revenue * 2),
    };
  }

  // ── 적정 가격대 ──
  let priceRange: MarketVerdict["priceRange"] = null;
  if (avgPrice > 0) {
    // 25~75 percentile 근사
    priceRange = {
      low: Math.round(minPrice * 1.1 / 100) * 100, // 최저가 +10%, 100원 단위
      high: Math.round(avgPrice * 1.1 / 100) * 100, // 평균가 +10%, 100원 단위
    };
    // 최소값 보정
    if (priceRange.low < 1000) priceRange.low = 1000;
    if (priceRange.high <= priceRange.low) priceRange.high = priceRange.low * 2;
  }

  return {
    level,
    title,
    description,
    reasons,
    cautions,
    estimatedMonthlySales,
    priceRange,
    competitionScore,
    trendDirection,
  };
}
