export interface NaverShopItem {
  title: string;
  link: string;
  image: string;
  lprice: string;
  hprice: string;
  mallName: string;
  productId: string;
  productType: string;
  brand: string;
  maker: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
}

export interface NaverShopResponse {
  total: number;
  start: number;
  display: number;
  items: NaverShopItem[];
}

// HTML 태그 제거 (네이버 API 응답에 <b> 태그 포함됨)
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

import NodeCache from "node-cache";
import { trackApiCall } from "./api-monitor";

// L1 인메모리 캐시 (1시간) — 동일 키워드 중복 호출 방지
const shopCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

export async function searchNaver(
  keyword: string,
  display = 20
): Promise<NaverShopResponse> {
  // L1 캐시: keyword+display 조합으로 캐싱
  // display가 더 큰 기존 캐시가 있으면 재사용 (슬라이스)
  const cacheKey = `shop:${keyword}:${display}`;
  const cached = shopCache.get<NaverShopResponse>(cacheKey);
  if (cached) return cached;

  // 더 큰 display로 캐시된 결과가 있으면 슬라이스해서 재사용
  for (const d of [100, 80, 60, 40, 20, 10, 1]) {
    if (d > display) {
      const larger = shopCache.get<NaverShopResponse>(`shop:${keyword}:${d}`);
      if (larger) {
        const sliced: NaverShopResponse = {
          ...larger,
          display,
          items: larger.items.slice(0, display),
        };
        shopCache.set(cacheKey, sliced);
        return sliced;
      }
    }
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 없습니다.");
  }

  if (!trackApiCall("naver_shop")) {
    return { total: 0, start: 1, display: 0, items: [] };
  }

  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(keyword)}&display=${display}&sort=sim`;

  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`네이버 API 오류 ${res.status}: ${text}`);
  }

  const data: NaverShopResponse = await res.json();

  // title HTML 태그 제거
  data.items = data.items.map((item) => ({
    ...item,
    title: stripHtml(item.title),
  }));

  shopCache.set(cacheKey, data);
  return data;
}
