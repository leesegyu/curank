/**
 * Supabase 기반 L2 캐시 (분석 결과 영구 저장, 24시간 TTL)
 * L1: node-cache (인메모리, 1시간)
 * L2: analysis_cache 테이블 (Supabase, 24시간)
 *
 * 효과: Naver API 호출 ~90% 감소 → MAU 20만명 대응 가능
 */

import { supabase } from "./db";

const TTL_SECONDS = 86_400; // 24시간

export async function getL2Cache<T>(
  keyword: string,
  cacheType: string
): Promise<T | null> {
  if (!supabase) return null;

  const { data } = await supabase
    .from("analysis_cache")
    .select("result, expires_at")
    .eq("keyword", keyword)
    .eq("cache_type", cacheType)
    .single();

  if (!data) return null;

  if (new Date(data.expires_at) < new Date()) {
    // 만료 — 비동기로 삭제
    supabase
      .from("analysis_cache")
      .delete()
      .eq("keyword", keyword)
      .eq("cache_type", cacheType)
      .then(() => {});
    return null;
  }

  return data.result as T;
}

export async function setL2Cache<T>(
  keyword: string,
  cacheType: string,
  result: T
): Promise<void> {
  if (!supabase) return;

  const expiresAt = new Date(Date.now() + TTL_SECONDS * 1000).toISOString();

  supabase
    .from("analysis_cache")
    .upsert({
      keyword,
      cache_type: cacheType,
      result: result as object,
      cached_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .then(() => {}); // 비동기 저장 (응답 블록하지 않음)
}
