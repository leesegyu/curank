import { Product, UnifiedSearchResult, DataSource, NaverScoreData } from "./search";

export interface PlatformScore {
  score: number;
  level: "낮음" | "보통" | "높음" | "매우 높음";
  breakdown: ScoreBreakdown;
  advice: string;
}

export interface ScoreBreakdown {
  // 쿠팡 전용
  reviewBarrier?: number;       // 상위 3개 평균 리뷰 장벽 (0-100)
  entryBarrier?: number;        // 10위 진입 리뷰 장벽 — 신규 셀러 진입 기준 (0-100)
  rocketBarrier?: number;       // 로켓배송 점유율 기반 (0-100)
  dominanceScore?: number;      // 상위 판매자 독점도 (0-100)
  // 공통
  supplyScore?: number;         // 공급 포화도 (0-100)
  priceCompression?: number;    // 가격 압축도 (0-100)
  coupangPenetration?: number;  // 쿠팡 시장 침투율 (0-100)
  adCompIdx?: number;           // 네이버 광고 API compIdx 반영 점수 (0-100)
  /** 10위 진입에 필요한 실제 리뷰 수 (조언 메시지용) */
  entryReviewCount?: number;
}

export interface AnalysisResult {
  keyword: string;
  source: DataSource;
  competitionScore: number;       // 0-100 (primary)
  totalCount: number;             // 총 검색 결과 수
  avgRatingCount: number | null;  // 평균 리뷰 수 (쿠팡만 제공)
  rocketRatio: number | null;     // 로켓배송 비율 % (쿠팡만 제공)
  coupangRatio: number;           // 쿠팡 상품 비율 % (네이버 기준)
  priceStats: {
    min: number;
    max: number;
    avg: number;
  };
  competitionLevel: "낮음" | "보통" | "높음" | "매우 높음";
  advice: string;
  scoreBreakdown: ScoreBreakdown;
  coupangPlatformScore: PlatformScore | null;  // 쿠팡 전용 점수 (리뷰 데이터 있을 때)
  naverPlatformScore: PlatformScore | null;    // 네이버 점수 (별도 호출 결과)
  relatedKeywords: string[];
  products: Product[];
  analyzedAt: string;
}

// ─── 공통 유틸 ────────────────────────────────────────────────────────────────

function getLevel(score: number): AnalysisResult["competitionLevel"] {
  if (score < 25) return "낮음";
  if (score < 50) return "보통";
  if (score < 75) return "높음";
  return "매우 높음";
}

/** 로그 스케일 정규화: value를 [0, maxValue] 범위에서 0-100점으로 변환 */
function logNorm(value: number, maxValue: number): number {
  if (value <= 0) return 0;
  return Math.min(100, Math.round((Math.log10(value + 1) / Math.log10(maxValue + 1)) * 100));
}

// ─── 쿠팡 API 기반 알고리즘 ──────────────────────────────────────────────────

export function calcCoupangScore(
  products: Product[],
  rocketRatio: number
): { score: number; breakdown: ScoreBreakdown } {
  const reviews = products
    .map((p) => p.ratingCount ?? 0)
    .filter((r) => r > 0)
    .sort((a, b) => b - a);

  const hasReviews = reviews.length > 0;

  // 1. 상위 3개 평균 리뷰 장벽 (로그 스케일, 10,000개 = 100점)
  const top3Avg = hasReviews
    ? reviews.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, reviews.length)
    : 0;
  const reviewBarrier = logNorm(top3Avg, 10_000);

  // 2. 10위 진입 리뷰 장벽 — "신규 셀러가 상위 10위 안에 들려면 최소 몇 개 리뷰가 필요한가?"
  //    10위 상품 리뷰 수 기준. 300개 = 100점 (넘기 매우 어려움)
  const entryReviewCount = reviews[Math.min(9, reviews.length - 1)] ?? 0;
  const entryBarrier = logNorm(entryReviewCount, 300);

  // 3. 로켓배송 장벽: 로켓 비율이 높을수록 물류 경쟁 심화 (100% = 90점)
  const rocketBarrier = Math.round(rocketRatio * 0.9);

  // 4. 상위 판매자 독점도: top3 / 전체 평균 비율 (1배=0점, 10배 이상=100점)
  const allAvg = hasReviews ? reviews.reduce((a, b) => a + b, 0) / reviews.length : 0;
  const dominanceRatio = allAvg > 0 ? Math.min(20, top3Avg / allAvg) : 1;
  const dominanceScore = Math.round(((dominanceRatio - 1) / 19) * 100);

  // 5. 가격 압축도: (1 - 최저가/평균가) → 격차 클수록 가격경쟁 심화
  const prices = products.map((p) => p.salePrice).filter((p) => p > 0);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const priceRatio = avgPrice > 0 ? minPrice / avgPrice : 1;
  const priceCompression = Math.round(Math.max(0, Math.min(100, (1 - priceRatio) * 100)));

  // ─── 가중 합산 ────────────────────────────────────────────────────────────
  // entryBarrier(10위 기준)이 신규 셀러 입장에서 가장 직접적인 진입 장벽
  const score = Math.min(
    100,
    Math.round(
      entryBarrier   * 0.35 +
      reviewBarrier  * 0.20 +
      rocketBarrier  * 0.20 +
      dominanceScore * 0.15 +
      priceCompression * 0.10
    )
  );

  return {
    score,
    breakdown: { reviewBarrier, entryBarrier, entryReviewCount, rocketBarrier, dominanceScore, priceCompression },
  };
}

// ─── 네이버 API 기반 알고리즘 ─────────────────────────────────────────────────

export function calcNaverScore(
  totalCount: number,
  coupangRatio: number,
  priceStats: { min: number; max: number; avg: number },
  compIdx?: "낮음" | "보통" | "높음"
): { score: number; breakdown: ScoreBreakdown } {
  // 1. 공급 포화도: 로그 스케일 (1,000,000개 = 100점 기준)
  const supplyScore = logNorm(totalCount, 1_000_000);

  // 2. 네이버 광고 API compIdx 반영 (있으면 supplyScore와 블렌딩)
  //    compIdx는 광고 입찰 경쟁도 → 유기적 랭킹 경쟁도와 강한 상관관계
  const adCompIdxScore = compIdx
    ? ({ 낮음: 20, 보통: 52, 높음: 82 }[compIdx])
    : null;
  const blendedSupply = adCompIdxScore !== null
    ? Math.round(supplyScore * 0.4 + adCompIdxScore * 0.6)
    : supplyScore;

  // 3. 쿠팡 시장 침투율 (100% = 75점)
  const coupangPenetration = Math.round(coupangRatio * 0.75);

  // 4. 가격 압축도
  const priceRatio =
    priceStats.avg > 0 && priceStats.min > 0
      ? priceStats.min / priceStats.avg
      : 0.5;
  const priceCompression = Math.round(Math.max(0, Math.min(100, (1 - priceRatio) * 100)));

  // ─── 가중 합산 ────────────────────────────────────────────────────────────
  const score = Math.min(
    100,
    Math.round(
      blendedSupply      * 0.55 +
      coupangPenetration * 0.25 +
      priceCompression   * 0.20
    )
  );

  return {
    score,
    breakdown: {
      supplyScore: blendedSupply,
      adCompIdx: adCompIdxScore ?? undefined,
      coupangPenetration,
      priceCompression,
    },
  };
}

// ─── 상황별 조언 ──────────────────────────────────────────────────────────────

function getAdvice(
  score: number,
  breakdown: ScoreBreakdown,
  source: DataSource,
  totalCount: number,
  rocketRatio: number | null
): string {
  if (source === "coupang") {
    const { entryBarrier = 0, entryReviewCount = 0, dominanceScore: ds = 0, rocketBarrier: rb = 0 } = breakdown;

    if (score < 25) {
      const needed = entryReviewCount > 0 ? entryReviewCount : 0;
      return needed > 0
        ? `상위 10위 진입에 리뷰 ${needed.toLocaleString()}개면 충분합니다. 쿠팡 로켓그로스로 빠르게 입점하고, 체험단으로 초기 리뷰를 확보하면 검색 1페이지 노출이 가능합니다.`
        : "리뷰도 적고 경쟁자도 많지 않은 초기 시장입니다. 지금 등록하면 선점 효과가 큽니다. 상품 등록 후 7일 내 리뷰 5개를 만들어 '신규 상품 부스팅'을 받으세요.";
    }
    if (entryBarrier >= 70 && entryReviewCount > 0) {
      return `상위 10위 진입에 리뷰 ${entryReviewCount.toLocaleString()}개 이상 필요 — 직접 공략은 비효율적입니다. 이 키워드의 롱테일(예: "키워드 + 수식어")로 먼저 리뷰와 판매량을 쌓은 뒤, 메인 키워드 순위를 점진적으로 올리세요.`;
    }
    if (ds >= 70) {
      return "1위 판매자가 리뷰·판매량을 독점하고 있습니다. 정면 승부보다 사이즈·색상·용도 등 세분화된 옵션으로 틈새를 공략하세요. 번들(묶음) 상품도 독점 구도를 피하는 효과적인 방법입니다.";
    }
    if (rb >= 70) {
      const pct = rocketRatio ?? 0;
      return `상위 상품의 ${pct}%가 로켓배송 — 일반 배송으로는 구매전환이 어렵습니다. 로켓그로스(위탁배송)로 입점하여 로켓배송 뱃지를 확보하는 것이 최우선입니다.`;
    }
    if (score < 50) {
      const needed = entryReviewCount > 0 ? ` 10위 진입 기준 리뷰 약 ${entryReviewCount.toLocaleString()}개.` : "";
      return `적당한 경쟁입니다.${needed} 경쟁력 있는 가격 설정 + 메인 이미지 클릭률 최적화 + 초기 리뷰 확보 3가지를 동시에 진행하세요.`;
    }
    if (score < 75) {
      const needed = entryReviewCount > 0 ? ` (10위 진입 기준 리뷰 ${entryReviewCount.toLocaleString()}개+)` : "";
      return `치열한 경쟁입니다${needed}. 쿠팡 검색광고(CPC)로 초기 노출을 확보하면서, 리뷰 이벤트로 빠르게 리뷰 수를 늘려야 합니다. 광고 ROAS를 모니터링하며 수익성을 확인하세요.`;
    }
    return `매우 포화된 시장입니다. 메인 키워드 직접 공략 시 광고비 대비 수익이 나지 않을 가능성이 높습니다. 3~4단어 롱테일로 시작하여 판매 이력을 쌓은 뒤 점진적으로 확장하세요.`;
  }

  // Naver 소스 — 스마트스토어 진입 전략
  const { supplyScore = 0, coupangPenetration = 0, priceCompression = 0 } = breakdown;
  const totalStr = totalCount.toLocaleString("ko-KR");

  if (score < 25) {
    return `경쟁 상품 ${totalStr}개 — 진입 장벽이 낮습니다. 상품명 앞 25자에 핵심 키워드를 배치하고, 초기 리뷰 10개만 확보해도 1페이지 노출이 가능한 시장입니다.`;
  }
  if (supplyScore >= 60 && coupangPenetration < 30) {
    return `상품은 ${totalStr}개로 많지만, 쿠팡 비율이 ${Math.round(coupangPenetration / 0.75)}%로 낮습니다. 네이버 쇼핑에서 이 키워드를 검색하는 소비자 대부분이 스마트스토어에서 구매합니다. 상품명·태그 최적화에 집중하세요.`;
  }
  if (coupangPenetration >= 60) {
    return `쿠팡이 검색 결과의 ${Math.round(coupangPenetration / 0.75)}%를 차지합니다. 가격 경쟁만으로는 불리하므로, 블로그 체험단·상세페이지 스토리텔링·묶음 구성으로 네이버 쇼핑 상위에 올라야 합니다.`;
  }
  if (priceCompression >= 60) {
    return `최저가와 평균가 격차가 크고 가격 출혈 경쟁이 심한 시장입니다. 단품 가격 인하보다 2+1 묶음, 사은품 구성, 프리미엄 패키지로 객단가를 높이는 전략이 효과적입니다.`;
  }
  if (score < 50) {
    return `경쟁 상품 ${totalStr}개 — 적당한 경쟁입니다. 상품명에 핵심 키워드 + 수식어(가성비, 대용량 등)를 조합하고, 상세페이지 체류 시간을 늘려 네이버 검색 알고리즘 점수를 높이세요.`;
  }
  if (score < 75) {
    return `경쟁 상품 ${totalStr}개 — 포화에 가까운 시장입니다. 이 키워드 단독보다 "키워드 + 세부 수식���"(예: 남성용, 캠핑용) 롱테일 조합으로 먼저 상위 노출을 확보한 뒤, 메인 키워드로 확장하세요.`;
  }
  return `경쟁 상품 ${totalStr}개 — 매우 포화 상태입니다. 메인 키워드 직접 공략은 비효율적입니다. 3~4단어 롱테일 키워드로 틈새를 먼저 잡고, 리뷰·판매량을 쌓아 점진적으로 메인 키워드 순위를 올리세요.`;
}

/** NaverScoreData → PlatformScore 변환 */
export function buildNaverPlatformScore(nd: NaverScoreData): PlatformScore {
  const { score, breakdown } = calcNaverScore(nd.totalCount, nd.coupangRatio, nd.priceStats, nd.compIdx);
  const level = getLevel(score);
  const advice = getAdvice(score, breakdown, "naver", nd.totalCount, null);
  return { score, level, breakdown, advice };
}

// ─── 메인 분석 함수 ───────────────────────────────────────────────────────────

export function analyze(
  data: UnifiedSearchResult,
  naverScoreData?: NaverScoreData | null
): AnalysisResult {
  const { products, totalCount, keyword, source, relatedKeywords } = data;

  const prices = products.map((p) => p.salePrice).filter((p) => p > 0);
  const priceStats = {
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    avg: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
  };

  // 로켓배송 비율 (쿠팡만)
  const rocketRatio =
    source === "coupang"
      ? Math.round((products.filter((p) => p.isRocket).length / Math.max(products.length, 1)) * 100)
      : null;

  // 평균 리뷰 수 (쿠팡만)
  const avgRatingCount =
    source === "coupang"
      ? Math.round(
          products.reduce((s, p) => s + (p.ratingCount ?? 0), 0) / Math.max(products.length, 1)
        )
      : null;

  // 쿠팡 상품 비율 (네이버 기준)
  const coupangRatio = Math.round(
    (products.filter((p) => p.mallName === "쿠팡").length / Math.max(products.length, 1)) * 100
  );

  // ─── 플랫폼별 점수 계산 ─────────────────────────────────────────────────

  // 쿠팡 플랫폼 점수: 리뷰 데이터 있을 때만 (Coupang API 소스)
  let coupangPlatformScore: PlatformScore | null = null;
  if (source === "coupang" && products.some((p) => p.ratingCount)) {
    const { score, breakdown } = calcCoupangScore(products, rocketRatio ?? 0);
    coupangPlatformScore = {
      score,
      level: getLevel(score),
      breakdown,
      advice: getAdvice(score, breakdown, "coupang", totalCount, rocketRatio),
    };
  }

  // 네이버 플랫폼 점수: 별도 호출 결과 사용 (항상 네이버 totalCount 기반)
  let naverPlatformScore: PlatformScore | null = null;
  const naverBase: NaverScoreData | null = naverScoreData ?? (source === "naver" ? { totalCount, coupangRatio, priceStats } : null);
  if (naverBase) {
    // FIX: compIdx를 누락하면 광고 경쟁도가 점수에 반영되지 않음
    const { score, breakdown } = calcNaverScore(naverBase.totalCount, naverBase.coupangRatio, naverBase.priceStats, naverBase.compIdx);
    naverPlatformScore = {
      score,
      level: getLevel(score),
      breakdown,
      advice: getAdvice(score, breakdown, "naver", naverBase.totalCount, null),
    };
  }

  // primary 점수 (기존 호환성 유지 — 쿠팡 우선)
  const primaryScore = coupangPlatformScore ?? naverPlatformScore;
  const competitionScore = primaryScore?.score ?? 50;
  const scoreBreakdown = primaryScore?.breakdown ?? {};

  return {
    keyword,
    source,
    competitionScore,
    totalCount,
    avgRatingCount,
    rocketRatio,
    coupangRatio,
    priceStats,
    competitionLevel: getLevel(competitionScore),
    advice: primaryScore?.advice ?? "",
    scoreBreakdown,
    coupangPlatformScore,
    naverPlatformScore,
    relatedKeywords,
    products,
    analyzedAt: new Date().toISOString(),
  };
}
