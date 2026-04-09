/**
 * 제품 단위 경쟁 위협도 (Competitor Threat Score, CTS)
 *
 * - 경쟁강도: "이 시장이 얼마나 치열한가?" (키워드 단위)
 * - 경쟁 위협도: "이 상품이 나한테 얼마나 위협적인가?" (제품 단위)
 *
 * 플랫폼별 factor 분리:
 *   스마트스토어: 검색순위(30%) + 가격경쟁력(25%) + 할인율(15%) + 쿠팡침투(15%) + 브랜드파워(15%)
 *   쿠팡:        리뷰파워(25%) + 로켓배송(20%) + 가격경쟁력(20%) + 평점품질(15%) + 검색순위(10%) + 할인율(10%)
 */

import type { Product } from "./search";

// ── 타입 ──────────────────────────────────────────────────

export type CTSPlatform = "naver" | "coupang";

export interface CTSSubFactor {
  key: string;
  label: string;
  score: number;    // 0~100
  weight: number;   // 0~1
  measured: boolean; // 실데이터 vs 중립/추정
  desc: string;     // 사용자 설명
}

export interface ProductCTS {
  product: Product;
  cts: number;              // 0~100 (가중합)
  level: "낮음" | "보통" | "높음" | "매우 높음";
  rank: number;             // CTS 순위 (1=가장 위협적)
  factors: CTSSubFactor[];
  platform: CTSPlatform;
}

export interface CTSResult {
  keyword: string;
  platform: CTSPlatform;
  products: ProductCTS[];   // CTS 내림차순 정렬
  avgCTS: number;           // Top5 평균 CTS (시장 경쟁강도 보조지표)
}

// ── 유틸 ──────────────────────────────────────────────────

function logNorm(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(value + 1) / Math.log10(maxValue + 1)) * 100));
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function getLevel(score: number): ProductCTS["level"] {
  if (score < 25) return "낮음";
  if (score < 50) return "보통";
  if (score < 75) return "높음";
  return "매우 높음";
}

// ── 스마트스토어 (네이버) CTS ─────────────────────────────

function calcNaverCTS(
  product: Product,
  index: number,
  totalProducts: number,
  priceAvg: number,
  mallFrequency: Map<string, number>,
  maxMallFreq: number,
): { cts: number; factors: CTSSubFactor[] } {
  // F1: 검색 순위 (30%) — 1위 = 100점, 20위 = 0점
  const rankScore = clamp((1 - index / Math.max(totalProducts, 1)) * 100);

  // F2: 가격 경쟁력 (25%) — 시장 평균 대비 저가일수록 위협적
  let priceScore = 50;
  if (priceAvg > 0 && product.salePrice > 0) {
    const ratio = product.salePrice / priceAvg;
    if (ratio <= 0.5) priceScore = 100;
    else if (ratio <= 1.0) priceScore = clamp(100 - (ratio - 0.5) * 200);
    else priceScore = clamp(Math.max(0, 50 - (ratio - 1.0) * 100));
  }

  // F3: 할인율 (15%) — 높은 할인 = 소비자 유인, 가격 전쟁 선점
  let discountScore = 0;
  if (product.originalPrice > 0 && product.salePrice > 0 && product.originalPrice > product.salePrice) {
    const discount = (product.originalPrice - product.salePrice) / product.originalPrice;
    discountScore = clamp(discount * 200); // 50% 할인 = 100점
  }

  // F4: 쿠팡 침투 (15%) — 쿠팡 판매자가 네이버에 진출 = 가격/물류 경쟁 심화
  const isCoupangSeller = product.mallName.includes("쿠팡") || product.mallName.includes("Coupang");
  const coupangScore = isCoupangSeller ? 80 : 0;

  // F5: 브랜드 파워 (15%) — 동일 셀러 상위 다수 점유 = 독점 위협
  const freq = mallFrequency.get(product.mallName) || 1;
  const brandScore = clamp((freq / Math.max(maxMallFreq, 1)) * 100);

  const factors: CTSSubFactor[] = [
    { key: "searchRank",     label: "검색 순위",    score: rankScore,     weight: 0.30, measured: true,  desc: `상위 ${index + 1}위 — 높을수록 트래픽 독점` },
    { key: "priceCompete",   label: "가격 경쟁력",  score: priceScore,    weight: 0.25, measured: true,  desc: `시장 평균 대비 ${product.salePrice > priceAvg ? "고가" : "저가"} — 저가일수록 위협적` },
    { key: "discountRate",   label: "할인율",       score: discountScore, weight: 0.15, measured: true,  desc: `할인 배지 = 클릭률 상승` },
    { key: "coupangInvasion", label: "쿠팡 침투",   score: coupangScore,  weight: 0.15, measured: true,  desc: isCoupangSeller ? "쿠팡 셀러 진출 — 가격/물류 경쟁 심화" : "비쿠팡 셀러" },
    { key: "brandPower",     label: "브랜드 파워",  score: brandScore,    weight: 0.15, measured: true,  desc: `동일 셀러 상위 ${freq}개 점유` },
  ];

  const cts = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));

  return { cts, factors };
}

// ── 쿠팡 CTS ──────────────────────────────────────────────

function calcCoupangCTS(
  product: Product,
  index: number,
  totalProducts: number,
  priceAvg: number,
): { cts: number; factors: CTSSubFactor[] } {
  const hasReviewData = product.ratingCount !== undefined && product.ratingCount !== null;
  const hasRocketData = product.isRocket !== undefined && product.isRocket !== null;
  const hasRatingData = product.productRating !== undefined && product.productRating !== null;

  // F1: 리뷰 파워 (25%) — 리뷰 수 log 스케일. 10,000 리뷰 = 100점
  const reviewScore = hasReviewData ? logNorm(product.ratingCount!, 10_000) : 50;

  // F2: 로켓배송 우위 (20%) — 로켓 = 100, 비로켓 = 0
  const rocketScore = hasRocketData ? (product.isRocket ? 100 : 0) : 50;

  // F3: 가격 경쟁력 (20%)
  let priceScore = 50;
  if (priceAvg > 0 && product.salePrice > 0) {
    const ratio = product.salePrice / priceAvg;
    if (ratio <= 0.5) priceScore = 100;
    else if (ratio <= 1.0) priceScore = clamp(100 - (ratio - 0.5) * 200);
    else priceScore = clamp(Math.max(0, 50 - (ratio - 1.0) * 100));
  }

  // F4: 평점 품질 (15%) — 5.0 = 100점, 4.0 = 80점
  const ratingScore = hasRatingData ? clamp(product.productRating! * 20) : 50;

  // F5: 검색 순위 (10%)
  const rankScore = clamp((1 - index / Math.max(totalProducts, 1)) * 100);

  // F6: 할인율 (10%)
  let discountScore = 0;
  if (product.originalPrice > 0 && product.salePrice > 0 && product.originalPrice > product.salePrice) {
    const discount = (product.originalPrice - product.salePrice) / product.originalPrice;
    discountScore = clamp(discount * 200);
  }

  const factors: CTSSubFactor[] = [
    { key: "reviewPower",  label: "리뷰 파워",     score: reviewScore,   weight: 0.25, measured: hasReviewData, desc: hasReviewData ? `리뷰 ${product.ratingCount!.toLocaleString()}개 — 신뢰도 + 진입장벽` : "쿠팡 API 연결 시 활성화" },
    { key: "rocketAdvantage", label: "로켓배송 우위", score: rocketScore, weight: 0.20, measured: hasRocketData, desc: hasRocketData ? (product.isRocket ? "로켓배송 — 배송 경쟁 압도적 우위" : "일반배송") : "쿠팡 API 연결 시 활성화" },
    { key: "priceCompete", label: "가격 경쟁력",    score: priceScore,    weight: 0.20, measured: true,         desc: `시장 평균 대비 가격 위치` },
    { key: "ratingQuality", label: "평점 품질",     score: ratingScore,   weight: 0.15, measured: hasRatingData, desc: hasRatingData ? `평점 ${product.productRating}점 — 전환율 영향` : "쿠팡 API 연결 시 활성화" },
    { key: "searchRank",   label: "검색 순위",      score: rankScore,     weight: 0.10, measured: true,         desc: `상위 ${index + 1}위` },
    { key: "discountRate",  label: "할인율",        score: discountScore, weight: 0.10, measured: true,         desc: `할인 배지 효과` },
  ];

  const cts = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));

  return { cts, factors };
}

// ── 메인 함수 ─────────────────────────────────────────────

export function calcCompetitorThreat(
  keyword: string,
  products: Product[],
  platform: CTSPlatform,
  priceAvg: number,
): CTSResult {
  if (products.length === 0) {
    return { keyword, platform, products: [], avgCTS: 0 };
  }

  // 브랜드 파워 계산용: 셀러 빈도
  const mallFrequency = new Map<string, number>();
  for (const p of products) {
    mallFrequency.set(p.mallName, (mallFrequency.get(p.mallName) || 0) + 1);
  }
  const maxMallFreq = Math.max(...mallFrequency.values());

  const scored: ProductCTS[] = products.map((product, index) => {
    const { cts, factors } = platform === "coupang"
      ? calcCoupangCTS(product, index, products.length, priceAvg)
      : calcNaverCTS(product, index, products.length, priceAvg, mallFrequency, maxMallFreq);

    return {
      product,
      cts,
      level: getLevel(cts),
      rank: 0, // 아래에서 재설정
      factors,
      platform,
    };
  });

  // CTS 내림차순 정렬 + 순위 부여
  scored.sort((a, b) => b.cts - a.cts);
  scored.forEach((item, i) => { item.rank = i + 1; });

  // Top5 평균 CTS (시장 경쟁강도 보조지표)
  const top5 = scored.slice(0, 5);
  const avgCTS = Math.round(top5.reduce((s, p) => s + p.cts, 0) / top5.length);

  return { keyword, platform, products: scored, avgCTS };
}
