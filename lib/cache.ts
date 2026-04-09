/**
 * 키워드 캐시 레이어
 * - Supabase 설정 시: 영구 DB 캐시 (서버 재시작/배포 후에도 유지)
 * - 미설정 시: 인메모리 폴백 (기존 node-cache 방식)
 *
 * TTL 전략:
 *   competition  6h   (검색 결과 수, 자주 변함)
 *   trend       24h   (네이버 검색 트렌드, 일 단위 갱신)
 *   demo         7d   (성별/연령, 월 단위 갱신)
 */

import NodeCache from "node-cache";
import { supabase } from "./db";

// ─── TTL 정의 (ms) ──────────────────────────────────────────────
const TTL = {
  competition: 6   * 60 * 60 * 1000,
  trend:       24  * 60 * 60 * 1000,
  demo:        7   * 24 * 60 * 60 * 1000,
} as const;

type CacheField = keyof typeof TTL;

// ─── 인메모리 폴백 (Supabase 미설정 시) ─────────────────────────
const memCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

function memKey(keyword: string, field: CacheField) {
  return `${field}:${keyword}`;
}

// ─── 캐시 읽기 ───────────────────────────────────────────────────
export async function cacheGet<T>(
  keyword: string,
  field: CacheField
): Promise<T | null> {
  if (!supabase) {
    return memCache.get<T>(memKey(keyword, field)) ?? null;
  }

  const col  = `${field}_data`;
  const colAt = `${field}_cached_at`;

  const { data, error } = await supabase
    .from("keyword_cache")
    .select(`${col}, ${colAt}`)
    .eq("keyword", keyword)
    .single();

  if (error || !data) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = data as any;
  const cachedAt = row[colAt] as string | null;
  if (!cachedAt) return null;

  const age = Date.now() - new Date(cachedAt).getTime();
  if (age > TTL[field]) return null; // 만료

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (row[col] as T) ?? null;
}

// ─── 캐시 쓰기 ───────────────────────────────────────────────────
export async function cacheSet<T>(
  keyword: string,
  field: CacheField,
  value: T
): Promise<void> {
  if (!supabase) {
    memCache.set(memKey(keyword, field), value, TTL[field] / 1000);
    return;
  }

  const col   = `${field}_data`;
  const colAt = `${field}_cached_at`;
  const now   = new Date().toISOString();

  await supabase.from("keyword_cache").upsert(
    {
      keyword,
      [col]:   value,
      [colAt]: now,
      last_searched_at: now,
    },
    { onConflict: "keyword" }
  );

  // hit_count 증가 (별도 업데이트)
  await supabase.rpc("increment_hit_count", { kw: keyword }).then(() => {});
}

// ─── 검색 횟수 기록 (히트카운트, last_searched) ──────────────────
export async function recordSearch(keyword: string): Promise<void> {
  if (!supabase) return;
  await supabase
    .from("keyword_cache")
    .upsert(
      { keyword, last_searched_at: new Date().toISOString(), hit_count: 1 },
      { onConflict: "keyword" }
    )
    .then(() => {});
}
