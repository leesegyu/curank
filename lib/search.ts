/**
 * 통합 검색 레이어
 * - 쿠팡 파트너스 API 키 있으면 → coupang.ts 사용
 * - 없고 네이버 API 키 있으면 → naver.ts 사용
 * - 둘 다 없으면 → 데모 목 데이터
 */

import { searchNaver } from "./naver";
import { searchProducts as searchCoupang } from "./coupang";
import NodeCache from "node-cache";

// 10분 인메모리 캐시 — 분석→전체보기→돌아가기 시 재호출 방지
const searchCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

export type DataSource = "coupang" | "naver" | "demo";

export interface Product {
  productId: string;
  productName: string;
  salePrice: number;
  originalPrice: number;
  mallName: string;
  productImage: string;
  productUrl: string;
  // 브랜드/제조사 (네이버 쇼핑 API 제공)
  brand?: string;
  maker?: string;
  // 쿠팡 파트너스 API 전용 (네이버에선 없음)
  ratingCount?: number;
  productRating?: number;
  isRocket?: boolean;
}

export interface UnifiedSearchResult {
  products: Product[];
  totalCount: number;   // 총 검색 결과 수 (경쟁도 계산 핵심)
  keyword: string;
  source: DataSource;
  relatedKeywords: string[];
}

// 연관 키워드 생성 (카테고리 + 수식어 조합)
function buildRelatedKeywords(keyword: string, categories: string[]): string[] {
  const suffixes = ["추천", "가성비", "인기", "저렴한"];
  const unique = new Set<string>();

  // 카테고리에서 추출 (키워드와 다른 것만)
  categories.forEach((c) => {
    if (c && c !== keyword && c.length > 1) unique.add(c);
  });

  // 수식어 조합
  suffixes.forEach((s) => unique.add(`${keyword} ${s}`));

  return Array.from(unique).slice(0, 6);
}

// 데모 목 데이터
function mockSearch(keyword: string): UnifiedSearchResult {
  const basePrice = Math.floor(Math.random() * 80000) + 10000;
  const total = Math.floor(Math.random() * 90000) + 500;

  const products: Product[] = Array.from({ length: 20 }, (_, i) => ({
    productId: `demo-${i}`,
    productName: `[샘플] ${keyword} 상품 ${i + 1}호`,
    salePrice: Math.floor(basePrice * (0.7 + Math.random() * 0.6)),
    originalPrice: Math.floor(basePrice * 1.2),
    mallName: ["쿠팡", "11번가", "G마켓", "옥션"][Math.floor(Math.random() * 4)],
    productImage: "",
    productUrl: "#",
    ratingCount: Math.floor(Math.random() * 500),
    isRocket: Math.random() > 0.5,
  }));

  return {
    products,
    totalCount: total,
    keyword,
    source: "demo",
    relatedKeywords: buildRelatedKeywords(keyword, []),
  };
}

export interface NaverScoreData {
  totalCount: number;
  coupangRatio: number;
  priceStats: { min: number; max: number; avg: number };
  /** 네이버 광고 API 공식 경쟁 지수 — 있으면 product count보다 우선 사용 */
  compIdx?: "낮음" | "보통" | "높음";
}

/** Naver 경쟁점수 계산용 경량 fetch — 10분 캐시 */
export async function fetchNaverScoreData(keyword: string): Promise<NaverScoreData | null> {
  const cacheKey = `score:${keyword}`;
  const cached = searchCache.get<NaverScoreData>(cacheKey);
  if (cached) return cached;

  const hasNaver =
    process.env.NAVER_CLIENT_ID &&
    !process.env.NAVER_CLIENT_ID.includes("입력");
  if (!hasNaver) return null;

  try {
    const data = await searchNaver(keyword, 20);

    const prices = data.items
      .map((i) => parseInt(i.lprice))
      .filter((p) => p > 0);
    const coupangCount = data.items.filter((i) => i.mallName === "쿠팡").length;

    // 광고 API 없이 상품 수 기반으로 compIdx 추정
    const total = data.total;
    const compIdx: "낮음" | "보통" | "높음" =
      total < 1000 ? "낮음" : total < 10000 ? "보통" : "높음";

    const result: NaverScoreData = {
      totalCount: total,
      coupangRatio: Math.round((coupangCount / Math.max(data.items.length, 1)) * 100),
      priceStats: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
        avg: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      },
      compIdx,
    };
    searchCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function unifiedSearch(
  keyword: string,
  // 미래: platform에 따라 쿠팡/네이버/양쪽 분기
  _platform?: "naver" | "coupang" | "all",
): Promise<UnifiedSearchResult> {
  const cacheKey = `search:${keyword}:${_platform ?? "naver"}`;
  const cached = searchCache.get<UnifiedSearchResult>(cacheKey);
  if (cached) return cached;
  const hasCoupang =
    process.env.COUPANG_ACCESS_KEY &&
    !process.env.COUPANG_ACCESS_KEY.includes("입력");

  const hasNaver =
    process.env.NAVER_CLIENT_ID &&
    !process.env.NAVER_CLIENT_ID.includes("입력");

  // 1순위: 쿠팡 파트너스 API
  if (hasCoupang) {
    const { products: raw } = await searchCoupang(keyword, 20);
    const products: Product[] = raw.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      salePrice: p.salePrice,
      originalPrice: p.originalPrice,
      mallName: "쿠팡",
      productImage: p.productImage,
      productUrl: p.productUrl,
      ratingCount: p.ratingCount,
      productRating: p.productRating,
      isRocket: p.isRocket,
    }));
    const result: UnifiedSearchResult = {
      products,
      totalCount: products.length, // 파트너스는 total 미제공 → 반환 수로 대체
      keyword,
      source: "coupang",
      relatedKeywords: buildRelatedKeywords(keyword, []),
    };
    searchCache.set(cacheKey, result);
    return result;
  }

  // 2순위: 네이버 쇼핑 API
  if (hasNaver) {
    const data = await searchNaver(keyword, 20);

    // 카테고리 수집 (연관 키워드 용)
    const categories = Array.from(
      new Set(
        data.items.flatMap((i) =>
          [i.category1, i.category2, i.category3, i.category4].filter(Boolean)
        )
      )
    );

    const products: Product[] = data.items.map((item) => ({
      productId: item.productId || `naver-${Math.random()}`,
      productName: item.title,
      salePrice: parseInt(item.lprice) || 0,
      originalPrice: parseInt(item.hprice) || 0,
      mallName: item.mallName,
      productImage: item.image,
      productUrl: item.link,
      brand: item.brand || undefined,
      maker: item.maker || undefined,
    }));

    const result: UnifiedSearchResult = {
      products,
      totalCount: data.total,
      keyword,
      source: "naver",
      relatedKeywords: buildRelatedKeywords(keyword, categories),
    };
    searchCache.set(cacheKey, result);
    return result;
  }

  // 3순위: 데모
  const result = await mockSearch(keyword);
  searchCache.set(cacheKey, result);
  return result;
}
