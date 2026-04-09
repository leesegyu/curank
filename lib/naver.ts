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

import { trackApiCall } from "./api-monitor";

export async function searchNaver(
  keyword: string,
  display = 20
): Promise<NaverShopResponse> {
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

  return data;
}
