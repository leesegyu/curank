/**
 * 카테고리 키워드 풀 조회 유틸
 *
 * Ad API relKwdStat 결과를 사전 배치로 수집해 `category_keyword_pool`에 저장해 둔
 * 풀을 읽어 분석 시 실시간 Ad API 호출을 대체한다.
 *
 * 사용 패턴:
 *   1) 사용자 키워드 → classifyKeywordV2() → node
 *   2) getCategoryPool(node.id, platform) → 이미 수집된 키워드 목록
 *   3) 풀이 있고 충분하면 실시간 Ad API SKIP
 *   4) 풀이 없으면 기존 로직 fallback
 */

import { createClient } from "@supabase/supabase-js";
import NodeCache from "node-cache";
import type { Platform } from "./ontology/types";
import { classifyKeywordV2 } from "./ontology";
import { getNaverAdKeywords, type NaverAdKeyword } from "./naver-ad";

export interface CategoryPoolKeyword {
  keyword: string;
  monthlyTotal: number;
  monthlyPc: number;
  monthlyMobile: number;
  compIdx: string | null;
  adDepth: number | null;
  rank: number;
}

export interface CategoryPoolResult {
  nodeId: string;
  platform: Platform;
  fetchedAt: string | null;
  keywords: CategoryPoolKeyword[];
}

// L1 인메모리 캐시 — 프로세스 재시작 시까지 유지 (풀 자체가 월 단위로 갱신되므로 길게 잡아도 OK)
const poolCache = new NodeCache({ stdTTL: 60 * 60 * 6, checkperiod: 600, maxKeys: 1000 });

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * 노드 ID + 플랫폼으로 키워드 풀 조회
 */
export async function getCategoryPool(
  nodeId: string,
  platform: Platform,
): Promise<CategoryPoolResult | null> {
  const cacheKey = `pool:${platform}:${nodeId}`;
  const cached = poolCache.get<CategoryPoolResult>(cacheKey);
  if (cached) return cached;

  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("category_keyword_pool")
      .select("keyword, monthly_pc, monthly_mobile, monthly_total, comp_idx, ad_depth, rank, fetched_at")
      .eq("node_id", nodeId)
      .eq("platform", platform)
      .order("rank", { ascending: true })
      .limit(500);

    if (error || !data || data.length === 0) {
      // 미스도 짧게 캐시해서 반복 조회 방지
      poolCache.set(cacheKey, null as unknown as CategoryPoolResult, 60);
      return null;
    }

    const result: CategoryPoolResult = {
      nodeId,
      platform,
      fetchedAt: data[0].fetched_at ?? null,
      keywords: data.map((row) => ({
        keyword: row.keyword,
        monthlyTotal: row.monthly_total ?? 0,
        monthlyPc: row.monthly_pc ?? 0,
        monthlyMobile: row.monthly_mobile ?? 0,
        compIdx: row.comp_idx ?? null,
        adDepth: row.ad_depth ?? null,
        rank: row.rank ?? 0,
      })),
    };

    poolCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

/**
 * 키워드로부터 자동 분류 → 풀 조회
 */
export async function getCategoryPoolForKeyword(
  keyword: string,
  platform: Platform,
): Promise<CategoryPoolResult | null> {
  const classified = classifyKeywordV2(keyword, platform);
  if (!classified?.path) return null;
  return getCategoryPool(classified.path, platform);
}

/**
 * 시드 키워드 자체의 월 검색량을 풀에서 찾아 반환 (캐시 히트 시 Ad API 우회)
 */
export function findSeedVolumeInPool(
  pool: CategoryPoolResult,
  seedKeyword: string,
): number | null {
  const normalized = seedKeyword.trim().toLowerCase();
  const hit = pool.keywords.find(
    (k) => k.keyword.trim().toLowerCase() === normalized,
  );
  return hit ? hit.monthlyTotal : null;
}

/**
 * 카테고리 풀 키워드를 Ad API 응답 포맷(NaverAdKeyword)으로 변환
 *
 * 다운스트림 코드(keywords-v2 등)가 getNaverAdKeywords() 반환을 소비하므로
 * 동일 포맷으로 매핑하면 drop-in 교체 가능하다.
 */
export function poolToAdKeywords(pool: CategoryPoolResult): NaverAdKeyword[] {
  return pool.keywords.map((k) => ({
    relKeyword: k.keyword,
    monthlyPcQcCnt: k.monthlyPc,
    monthlyMobileQcCnt: k.monthlyMobile,
    monthlyAvgPcClkCnt: 0,
    monthlyAvgMobileClkCnt: 0,
    compIdx: k.compIdx ?? "보통",
    plAvgDepth: k.adDepth ?? 0,
  }));
}

/**
 * 풀 우선 Ad API 키워드 조회
 *
 * 동작:
 *   1) classifyKeywordV2로 카테고리 분류
 *   2) category_keyword_pool 히트면 풀을 NaverAdKeyword[]로 변환해 반환
 *      (+ 시드가 풀에 없으면 Ad API로 시드만 보강)
 *   3) 미스면 기존 Ad API 호출로 fallback
 *
 * 반환 형식은 기존 getNaverAdKeywords와 동일.
 */
export async function getAdKeywordsWithPool(
  keyword: string,
  platform: Platform = "smartstore",
): Promise<{ keywords: NaverAdKeyword[]; source: "pool" | "api"; fetchedAt?: string | null }> {
  const pool = await getCategoryPoolForKeyword(keyword, platform);

  // 풀이 충분하면(>=30개) 풀 사용
  if (pool && pool.keywords.length >= 30) {
    const poolKws = poolToAdKeywords(pool);

    // 시드 자체가 풀에 없으면 Ad API로 보강 (1회 호출)
    const normalized = keyword.trim().toLowerCase();
    const seedExists = poolKws.some(
      (k) => k.relKeyword.trim().toLowerCase() === normalized,
    );

    if (!seedExists) {
      try {
        const seedOnly = await getNaverAdKeywords(keyword);
        const seedItem = seedOnly.find(
          (k) => k.relKeyword.trim().toLowerCase() === normalized,
        );
        if (seedItem) poolKws.unshift(seedItem);
      } catch {
        // 보강 실패해도 풀 그대로 사용
      }
    }

    return { keywords: poolKws, source: "pool", fetchedAt: pool.fetchedAt };
  }

  // 풀 미스 → 기존 Ad API 호출
  const apiKws = await getNaverAdKeywords(keyword);
  return { keywords: apiKws, source: "api" };
}
