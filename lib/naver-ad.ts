/**
 * 네이버 검색광고 API 클라이언트
 * - 실제 월간 검색량(PC+모바일) 조회
 * - 연관 키워드 목록 조회
 * - HMAC-SHA256 서명 인증
 * - L1 (인메모리 1h) + L2 (Supabase 24h) 캐시
 */

import { createHmac } from "crypto";
import NodeCache from "node-cache";
import { getL2Cache, setL2Cache } from "./cache-db";
import { trackApiCall } from "./api-monitor";

const AD_API_BASE = "https://api.naver.com";

// L1 인메모리 캐시 (1시간)
const adCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const acCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

/**
 * Naver 검색광고 API HMAC 서명 헤더 생성
 *
 * ⚠️ 규격 주의:
 *   - 메시지 구분자는 "." (period), \n 아님
 *   - 서명 path는 **쿼리스트링 제외** (/keywordstool 까지만)
 *   - 서명 path에 쿼리를 포함하거나 \n 구분자를 쓰면 403 invalid-signature
 *
 * 2026-04-11 수정: 기존 코드가 \n + 쿼리포함으로 서명해 프로덕션 Ad API
 * 호출이 전부 403으로 실패하던 버그를 수정. 기존 코드는 catch에서 빈 배열을
 * 조용히 반환해 증상이 감춰져 있었음.
 *
 * @param method HTTP 메서드 (GET/POST)
 * @param pathOnly 쿼리스트링을 제외한 경로 (예: "/keywordstool")
 */
function getAdHeaders(method: string, pathOnly: string) {
  const timestamp = Date.now().toString();
  const customerId = process.env.NAVER_AD_CUSTOMER_ID!;
  const accessLicense = process.env.NAVER_AD_ACCESS_LICENSE!;
  const secretKey = process.env.NAVER_AD_SECRET_KEY!;

  const message = `${timestamp}.${method}.${pathOnly}`;
  const signature = createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");

  return {
    "X-Timestamp": timestamp,
    "X-API-KEY": accessLicense,
    "X-Customer": customerId,
    "X-Signature": signature,
  };
}

export interface NaverAdKeyword {
  relKeyword: string;
  monthlyPcQcCnt: number;
  monthlyMobileQcCnt: number;
  monthlyAvgPcClkCnt: number;
  monthlyAvgMobileClkCnt: number;
  compIdx: string;
  plAvgDepth: number;
}

/**
 * 시드 키워드 기반 연관 키워드 + 검색량 조회 (L1+L2 캐시)
 */
export async function getNaverAdKeywords(keyword: string): Promise<NaverAdKeyword[]> {
  const cacheKey = `ad:${keyword}`;

  // L1 히트
  const l1 = adCache.get<NaverAdKeyword[]>(cacheKey);
  if (l1) return l1;

  // L2 히트
  const l2 = await getL2Cache<NaverAdKeyword[]>(keyword, "naver_ad");
  if (l2) { adCache.set(cacheKey, l2); return l2; }

  // API 호출 (한도 체크)
  if (!trackApiCall("naver_ad")) return [];

  const path = "/keywordstool";
  const query = new URLSearchParams({ hintKeywords: keyword, showDetail: "1" });
  const fullPath = `${path}?${query}`;

  try {
    const res = await fetch(`${AD_API_BASE}${fullPath}`, {
      headers: getAdHeaders("GET", path), // ⚠️ 서명은 path만 (쿼리 제외)
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[naver-ad] getNaverAdKeywords(${keyword}) ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`);
      return [];
    }

    const json = await res.json();
    const list: NaverAdKeyword[] = (json?.keywordList ?? [])
      .map((item: NaverAdKeyword) => ({
        ...item,
        monthlyPcQcCnt: typeof item.monthlyPcQcCnt === "number" ? item.monthlyPcQcCnt : 0,
        monthlyMobileQcCnt: typeof item.monthlyMobileQcCnt === "number" ? item.monthlyMobileQcCnt : 0,
      }))
      .filter((item: NaverAdKeyword) => item.relKeyword && item.relKeyword.length >= 2);

    adCache.set(cacheKey, list);
    setL2Cache(keyword, "naver_ad", list);
    return list;
  } catch (err) {
    console.warn(`[naver-ad] getNaverAdKeywords(${keyword}) 예외:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/** PC + 모바일 합산 월간 검색량 */
export function totalMonthlyVolume(item: NaverAdKeyword): number {
  return (item.monthlyPcQcCnt ?? 0) + (item.monthlyMobileQcCnt ?? 0);
}

/** 검색량 맵 생성: keyword → totalVolume */
export async function getVolumeMap(keyword: string): Promise<Map<string, number>> {
  const items = await getNaverAdKeywords(keyword);
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.relKeyword, totalMonthlyVolume(item));
  }
  return map;
}

/** 시드 키워드 자체의 월간 검색량 반환 */
export async function getSeedKeywordVolume(keyword: string): Promise<number> {
  const items = await getNaverAdKeywords(keyword);
  if (items.length === 0) return 0;
  const exact = items.find((item) => item.relKeyword === keyword);
  return totalMonthlyVolume(exact ?? items[0]);
}

/**
 * 특정 키워드 목록의 검색량·경쟁도 조회 (최대 5개, L1+L2 캐시)
 */
export async function getNaverAdKeywordsForHints(keywords: string[]): Promise<NaverAdKeyword[]> {
  if (keywords.length === 0) return [];
  const hintsKey = keywords.slice(0, 5).sort().join(",");
  const cacheKey = `adh:${hintsKey}`;

  const l1 = adCache.get<NaverAdKeyword[]>(cacheKey);
  if (l1) return l1;

  const l2 = await getL2Cache<NaverAdKeyword[]>(hintsKey, "naver_ad_hints");
  if (l2) { adCache.set(cacheKey, l2); return l2; }

  if (!trackApiCall("naver_ad")) return [];

  const path = "/keywordstool";
  const query = new URLSearchParams({ hintKeywords: keywords.slice(0, 5).join(","), showDetail: "1" });
  const fullPath = `${path}?${query}`;

  try {
    const res = await fetch(`${AD_API_BASE}${fullPath}`, {
      headers: getAdHeaders("GET", path), // ⚠️ 서명은 path만 (쿼리 제외)
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[naver-ad] getNaverAdKeywordsForHints(${keywords.join(",")}) ${res.status}`);
      return [];
    }
    const json = await res.json();
    const list: NaverAdKeyword[] = (json?.keywordList ?? [])
      .map((item: NaverAdKeyword) => ({
        ...item,
        monthlyPcQcCnt: typeof item.monthlyPcQcCnt === "number" ? item.monthlyPcQcCnt : 0,
        monthlyMobileQcCnt: typeof item.monthlyMobileQcCnt === "number" ? item.monthlyMobileQcCnt : 0,
      }))
      .filter((item: NaverAdKeyword) => item.relKeyword && item.relKeyword.length >= 2);

    adCache.set(cacheKey, list);
    setL2Cache(hintsKey, "naver_ad_hints", list);
    return list;
  } catch {
    return [];
  }
}

/**
 * 네이버 쇼핑 자동완성 (L1 캐시 1h)
 */
export async function getNaverShoppingAutocomplete(keyword: string): Promise<string[]> {
  const cacheKey = `ac:${keyword}`;
  const cached = acCache.get<string[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://ac.shopping.naver.com/ac?q=${encodeURIComponent(keyword)}&target=suggest`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    });
    if (!res.ok) return [];
    const json = await res.json();

    let result: string[] = [];
    if (Array.isArray(json?.items)) {
      result = (json.items as unknown[])
        .map((item) => (Array.isArray(item) ? item[0] : null))
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 15);
    } else if (Array.isArray(json) && Array.isArray(json[0]?.[1])) {
      result = (json[0][1] as unknown[])
        .map((item) => (Array.isArray(item) ? item[0] : null))
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 15);
    }

    if (result.length > 0) acCache.set(cacheKey, result);
    return result;
  } catch {
    return [];
  }
}
