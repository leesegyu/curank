import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { searchNaver } from "@/lib/naver";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";

/**
 * "이 키워드 쿠팡 TOP 5 상품" API
 *
 * 전략:
 * 1. 네이버 쇼핑 API로 상위 상품 정보 수집 (이미지/가격/리뷰 등)
 *    - 쿠팡 직접 스크래핑은 Cloudflare/Vercel IP 차단으로 실패
 *    - 네이버 쇼핑은 안정적이고 이미 인프라가 있음
 * 2. 각 상품에 대응하는 "쿠팡 검색" URL 생성 (lptag 포함)
 *    - 상품명으로 쿠팡 검색 → 유사 상품 노출 → 파트너스 수수료
 * 3. 경쟁 분석용 정보 제공 (이미지/가격대/브랜드 파악)
 */

const CACHE_TYPE = "coupang_products";
const cache = new NodeCache({ stdTTL: 3600 });

const PARTNERS_ID =
  process.env.COUPANG_PARTNERS_ID ||
  process.env.NEXT_PUBLIC_COUPANG_PARTNERS_ID ||
  "";

interface TopProduct {
  title: string;
  imageUrl: string;
  price: number;
  mallName: string;
  brand: string;
  category: string;
  /** 해당 상품명으로 쿠팡 검색하는 URL (파트너스 추적 포함) */
  coupangSearchUrl: string;
  /** 원본(네이버) 상품 URL */
  sourceUrl: string;
}

interface Response {
  keyword: string;
  products: TopProduct[];
  /** 키워드 자체의 쿠팡 검색 URL (전체 보기 버튼용) */
  coupangKeywordUrl: string;
}

function buildCoupangSearchUrl(query: string): string {
  const base = `https://www.coupang.com/np/search?q=${encodeURIComponent(query)}`;
  return PARTNERS_ID ? `${base}&lptag=${PARTNERS_ID}` : base;
}

/** 상품명에서 브랜드/수식어 제거하여 검색 품질 향상 (옵션) */
function cleanForSearch(title: string): string {
  // 특수문자/괄호 제거, 30자 이내로 제한
  return title
    .replace(/[\[\](){}<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword)
    return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });

  const coupangKeywordUrl = buildCoupangSearchUrl(keyword);

  // L1 캐시
  const l1 = cache.get<Response>(keyword);
  if (l1) return NextResponse.json(l1);

  // L2 캐시 (24시간)
  const l2 = await getL2Cache<Response>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json(l2);
  }

  try {
    const shopResult = await searchNaver(keyword, 10); // 상위 10개 가져와서 필터 후 5개 선별

    // 이미지와 가격이 있는 상품만 필터, 같은 브랜드 중복 제거
    const seen = new Set<string>();
    const products: TopProduct[] = [];

    for (const item of shopResult.items) {
      if (products.length >= 5) break;
      if (!item.image || !item.lprice) continue;

      const price = parseInt(item.lprice, 10);
      if (isNaN(price) || price <= 0) continue;

      // 같은 몰 중복 방지 (다양성 확보)
      const dedupeKey = item.mallName || item.brand || item.title.slice(0, 10);
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const searchQuery = cleanForSearch(item.title);

      products.push({
        title: item.title,
        imageUrl: item.image,
        price,
        mallName: item.mallName || "",
        brand: item.brand || "",
        category: [item.category1, item.category2, item.category3]
          .filter(Boolean)
          .join(" > "),
        coupangSearchUrl: buildCoupangSearchUrl(searchQuery),
        sourceUrl: item.link,
      });
    }

    const response: Response = {
      keyword,
      products,
      coupangKeywordUrl,
    };

    cache.set(keyword, response);
    if (products.length > 0) setL2Cache(keyword, CACHE_TYPE, response);

    return NextResponse.json(response);
  } catch (err) {
    console.warn(
      "[coupang-products] 네이버 쇼핑 조회 실패:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({
      keyword,
      products: [],
      coupangKeywordUrl,
    });
  }
}
