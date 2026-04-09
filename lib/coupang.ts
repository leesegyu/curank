import crypto from "crypto";

const BASE_URL = "https://api-gateway.coupang.com";

// HMAC-SHA256 서명 생성
function generateHmacSignature(
  method: string,
  path: string,
  query: string,
  secretKey: string
): { authorization: string; datetime: string } {
  const datetime = new Date()
    .toISOString()
    .replace(/[:\-]|\.\d{3}/g, "")
    .slice(0, 14);

  const message = datetime + method + path + query;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("hex");

  const accessKey = process.env.COUPANG_ACCESS_KEY!;
  const authorization = `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;

  return { authorization, datetime };
}

export interface CoupangProduct {
  productId: string;
  productName: string;
  salePrice: number;
  originalPrice: number;
  productRating: number;
  ratingCount: number;
  isRocket: boolean;
  isFreeShipping: boolean;
  productImage: string;
  productUrl: string;
}

export interface SearchResult {
  products: CoupangProduct[];
  keyword: string;
}

// 데모용 목 데이터 생성
function generateMockProducts(keyword: string, limit: number): CoupangProduct[] {
  const rocketChance = Math.random();
  const baseReviews = Math.floor(Math.random() * 800) + 50;
  const basePrice = Math.floor(Math.random() * 80000) + 10000;

  return Array.from({ length: limit }, (_, i) => ({
    productId: `mock-${i + 1}`,
    productName: `[${i < 3 ? "베스트" : "일반"}] ${keyword} 상품 ${i + 1}호 - 고품질 정품`,
    salePrice: Math.floor(basePrice * (0.7 + Math.random() * 0.6)),
    originalPrice: Math.floor(basePrice * (1.1 + Math.random() * 0.4)),
    productRating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
    ratingCount: Math.max(0, Math.floor(baseReviews * (1 - i * 0.08) + Math.random() * 100)),
    isRocket: Math.random() < rocketChance * 0.8,
    isFreeShipping: Math.random() > 0.3,
    productImage: "",
    productUrl: `https://www.coupang.com/search?q=${encodeURIComponent(keyword)}`,
  }));
}

// 쿠팡 파트너스 API 상품 검색
export async function searchProducts(
  keyword: string,
  limit = 20
): Promise<SearchResult & { isDemo: boolean }> {
  const accessKey = process.env.COUPANG_ACCESS_KEY;
  const secretKey = process.env.COUPANG_SECRET_KEY;

  // API 키 없으면 목 데이터로 동작
  if (
    !accessKey ||
    !secretKey ||
    accessKey.includes("입력") ||
    secretKey.includes("입력")
  ) {
    return {
      products: generateMockProducts(keyword, limit),
      keyword,
      isDemo: true,
    };
  }

  const path = "/v2/providers/affiliate_open_api/apis/openapi/products/search";
  const queryParams = `keyword=${encodeURIComponent(keyword)}&limit=${limit}&subId=curank`;
  const query = `?${queryParams}`;

  const { authorization } = generateHmacSignature(
    "GET",
    path,
    queryParams,
    secretKey
  );

  const response = await fetch(`${BASE_URL}${path}${query}`, {
    method: "GET",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json;charset=UTF-8",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`쿠팡 API 오류: ${response.status}`);
  }

  const data = await response.json();

  if (data.rCode !== "00") {
    throw new Error(`쿠팡 API 응답 오류: ${data.rMessage}`);
  }

  const products: CoupangProduct[] = (data.data?.productData || []).map(
    (item: Record<string, unknown>) => ({
      productId: String(item.productId),
      productName: String(item.productName),
      salePrice: Number(item.salePrice) || 0,
      originalPrice: Number(item.originalPrice) || 0,
      productRating: Number(item.productRating) || 0,
      ratingCount: Number(item.ratingCount) || 0,
      isRocket: Boolean(item.isRocket),
      isFreeShipping: Boolean(item.isFreeShipping),
      productImage: String(item.productImage || ""),
      productUrl: String(item.productUrl || ""),
    })
  );

  return { products, keyword, isDemo: false };
}
