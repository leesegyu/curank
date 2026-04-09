/**
 * 확장프로그램 API 키 발급/검증 유틸
 *
 * 흐름:
 *   1. 확장프로그램 → curank.com/ext-auth?requestId=UUID 탭 오픈
 *   2. 사용자 로그인 확인 후 PUT /api/ext/token (requestId, userId)
 *   3. 확장프로그램 폴링 GET /api/ext/token?requestId=UUID
 *   4. 완료 시 API 키 반환, chrome.storage 저장
 */

import crypto from "crypto";
import { supabase } from "./db";

const KEY_PREFIX = "crk_live_";
const KEY_BYTES  = 24; // base64url → 32자

// ── API 키 생성 ──────────────────────────────────────────────────────────────

/** 새 API 키 생성 (평문) */
function generateRawKey(): string {
  const bytes = crypto.randomBytes(KEY_BYTES);
  return KEY_PREFIX + bytes.toString("base64url");
}

/** SHA-256 해시 (DB 저장용) */
function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── DB 작업 ──────────────────────────────────────────────────────────────────

/**
 * 사용자의 API 키를 생성하거나 기존 키를 반환.
 * DB에는 해시만 저장, 평문은 한 번만 반환.
 */
export async function issueApiKey(userId: string): Promise<string | null> {
  if (!supabase) return null;

  const raw  = generateRawKey();
  const hash = hashKey(raw);

  // upsert: 사용자당 1개 (is_active true인 것 교체)
  const { error } = await supabase.from("api_keys").upsert(
    {
      user_id:    userId,
      key_hash:   hash,
      key_prefix: raw.slice(0, 12) + "...", // 표시용
      is_active:  true,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[ext-auth] issueApiKey:", error.message);
    return null;
  }
  return raw;
}

/**
 * API 키 검증 → userId 반환 (실패 시 null)
 * last_used_at도 갱신
 */
export async function verifyApiKey(raw: string): Promise<{ userId: string; plan: string } | null> {
  if (!supabase || !raw.startsWith(KEY_PREFIX)) return null;

  const hash = hashKey(raw);
  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id, is_active, users(plan)")
    .eq("key_hash", hash)
    .single();

  if (error || !data || !data.is_active) return null;

  // last_used_at 갱신 (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", hash)
    .then(() => {});

  const plan = (data.users as { plan?: string } | null)?.plan ?? "free";
  return { userId: data.user_id as string, plan };
}

// ── 로그인 토큰 (ext_tokens) ─────────────────────────────────────────────────

/** requestId로 ext_token 레코드 생성 (확장→웹 핸드오프용) */
export async function createExtToken(requestId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase.from("ext_tokens").upsert(
    {
      request_id: requestId,
      user_id:    userId,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5분
    },
    { onConflict: "request_id" },
  );
  return !error;
}

/**
 * 확장프로그램이 폴링할 때 호출.
 * 완료되었으면 API 키 발급 후 토큰 삭제.
 */
export async function consumeExtToken(requestId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("ext_tokens")
    .select("user_id, expires_at")
    .eq("request_id", requestId)
    .single();

  if (error || !data) return null;

  // 만료 체크
  if (new Date(data.expires_at as string) < new Date()) {
    await supabase.from("ext_tokens").delete().eq("request_id", requestId);
    return null;
  }

  // API 키 발급
  const apiKey = await issueApiKey(data.user_id as string);
  if (!apiKey) return null;

  // 토큰 삭제 (1회성)
  await supabase.from("ext_tokens").delete().eq("request_id", requestId);

  return apiKey;
}
