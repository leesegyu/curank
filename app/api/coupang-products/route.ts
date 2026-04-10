import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";

const CACHE_TYPE = "coupang_products";
const cache = new NodeCache({ stdTTL: 3600 }); // L1: 1시간

const PARTNERS_ID = process.env.COUPANG_PARTNERS_ID || process.env.NEXT_PUBLIC_COUPANG_PARTNERS_ID || "";

interface CoupangProduct {
  title: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  productUrl: string;
  rocketDelivery: boolean;
}

interface CoupangProductsResponse {
  keyword: string;
  products: CoupangProduct[];
  fallback: boolean;
  searchUrl: string;
}

/**
 * 쿠팡 검색 페이지 스크래핑 — 상위 상품 5개 추출
 * Cloudflare 탐지 우회를 위해 최신 브라우저 헤더 사용
 */
async function scrapeCoupangSearch(keyword: string): Promise<CoupangProduct[]> {
  const searchUrl = `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}&channel=user`;

  const res = await fetch(searchUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Referer: "https://www.coupang.com/",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Upgrade-Insecure-Requests": "1",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`Coupang HTTP ${res.status}`);
  }

  const html = await res.text();
  const products: CoupangProduct[] = [];

  // 쿠팡 검색 결과 상품 블록 파싱
  // <li class="search-product ... " data-product-id="123"> ... </li>
  const itemRegex =
    /<li[^>]*class="[^"]*search-product[^"]*"[^>]*data-product-id="(\d+)"[\s\S]*?<\/li>/g;

  const matches = Array.from(html.matchAll(itemRegex)).slice(0, 15);

  for (const m of matches) {
    const block = m[0];
    const productId = m[1];

    // 상품명
    const titleMatch = block.match(/class="name"[^>]*>([^<]+)</);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();

    // 가격
    const priceMatch = block.match(/class="price-value"[^>]*>([\d,]+)/);
    if (!priceMatch) continue;
    const price = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    if (isNaN(price) || price === 0) continue;

    // 원가 (할인 있을 때)
    const originalMatch = block.match(/class="base-price"[^>]*>([\d,]+)/);
    const originalPrice = originalMatch
      ? parseInt(originalMatch[1].replace(/,/g, ""), 10)
      : undefined;

    // 할인율
    const discountMatch = block.match(/class="discount-percentage"[^>]*>(\d+)/);
    const discount = discountMatch ? parseInt(discountMatch[1], 10) : undefined;

    // 이미지 URL
    const imgMatch = block.match(/class="search-product-wrap-img"[^>]*src="([^"]+)"/)
      || block.match(/<img[^>]*src="(\/\/[^"]+)"/);
    let imageUrl = imgMatch ? imgMatch[1] : "";
    if (imageUrl.startsWith("//")) imageUrl = `https:${imageUrl}`;

    // 별점
    const ratingMatch = block.match(/class="star"[^>]*rating="([\d.]+)"/)
      || block.match(/class="rating"[^>]*>([\d.]+)/);
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : 0;

    // 리뷰 수
    const reviewMatch = block.match(/class="rating-total-count"[^>]*>\(([\d,]+)\)/);
    const reviewCount = reviewMatch
      ? parseInt(reviewMatch[1].replace(/,/g, ""), 10)
      : 0;

    // 로켓배송 여부
    const rocketDelivery = /rocket|로켓/i.test(block);

    // 상품 URL (파트너스 추적 포함)
    const baseUrl = `https://www.coupang.com/vp/products/${productId}`;
    const productUrl = PARTNERS_ID ? `${baseUrl}?lptag=${PARTNERS_ID}` : baseUrl;

    products.push({
      title,
      imageUrl,
      price,
      originalPrice: originalPrice !== price ? originalPrice : undefined,
      discount,
      rating,
      reviewCount,
      productUrl,
      rocketDelivery,
    });

    if (products.length >= 5) break;
  }

  return products;
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword)
    return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });

  // 쿠팡 검색 URL (파트너스 추적 포함) — fallback 용도
  const baseSearchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword)}`;
  const searchUrl = PARTNERS_ID
    ? `${baseSearchUrl}&lptag=${PARTNERS_ID}`
    : baseSearchUrl;

  // L1 캐시
  const l1 = cache.get<CoupangProductsResponse>(keyword);
  if (l1) return NextResponse.json(l1);

  // L2 캐시 (Supabase, 24시간)
  const l2 = await getL2Cache<CoupangProductsResponse>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json(l2);
  }

  try {
    const products = await scrapeCoupangSearch(keyword);
    const response: CoupangProductsResponse = {
      keyword,
      products,
      fallback: products.length === 0,
      searchUrl,
    };

    cache.set(keyword, response);
    if (products.length > 0) setL2Cache(keyword, CACHE_TYPE, response);

    return NextResponse.json(response);
  } catch (err) {
    console.warn("[coupang-products] 스크래핑 실패:", err instanceof Error ? err.message : err);
    // 스크래핑 실패 → fallback 응답 (검색 링크만)
    const response: CoupangProductsResponse = {
      keyword,
      products: [],
      fallback: true,
      searchUrl,
    };
    return NextResponse.json(response);
  }
}
