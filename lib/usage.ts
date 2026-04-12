import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── 플랜별 한도 정의 ──────────────────────────────────────────

export interface PlanLimits {
  analysis: number;        // 월 분석 횟수
  comparison: number;      // 추천 키워드 효과 비교 횟수
  regeneration: number;    // 결론 재생성 횟수 (각 키워드당)
  historyMax: number;      // 분석 이력 보관 개수
  snapshotDays: number;    // 스냅샷 보관일
  pdfDownload: boolean;    // PDF 다운로드 가능 여부
  discoverLimit: number;   // 상품발굴 열람 개수
}

const PLAN_CONFIG: Record<string, PlanLimits> = {
  free:       { analysis: 8,   comparison: 5,  regeneration: 10, historyMax: 10, snapshotDays: 10,       pdfDownload: false, discoverLimit: 3 },
  standard:   { analysis: 30,  comparison: 10, regeneration: 20, historyMax: 30, snapshotDays: 30,       pdfDownload: true,  discoverLimit: 15 },
  business:   { analysis: 80,  comparison: 20, regeneration: 30, historyMax: 50, snapshotDays: Infinity, pdfDownload: true,  discoverLimit: 40 },
  premium:    { analysis: 200, comparison: 30, regeneration: 40, historyMax: 50, snapshotDays: Infinity, pdfDownload: true,  discoverLimit: 9999 },
  membership: { analysis: 500, comparison: 50, regeneration: 50, historyMax: 50, snapshotDays: Infinity, pdfDownload: true,  discoverLimit: 9999 },
};

/** 관리자 계정 — 무제한 */
const ADMIN_IDS = new Set([
  "6c490b88-db93-4ee4-95b5-e5a60e1ed953", // sellerking4137@gmail.com
]);

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
}

export function isAdmin(userId: string): boolean {
  return ADMIN_IDS.has(userId);
}

// ─── 기존 UsageInfo (하위 호환) ─────────────────────────────────

export type UsageInfo = {
  used: number;
  limit: number;
  plan: string;
  remaining: number;
};

/**
 * 월이 바뀌었으면 사용량 자동 리셋
 */
async function resetIfNewMonth(userId: string, resetAt: string) {
  const resetDate = new Date(resetAt);
  const now = new Date();

  if (
    resetDate.getFullYear() !== now.getFullYear() ||
    resetDate.getMonth() !== now.getMonth()
  ) {
    await supabaseAdmin
      .from("users")
      .update({
        monthly_usage: 0,
        usage_reset_at: now.toISOString(),
      })
      .eq("id", userId);
    return true;
  }
  return false;
}

/**
 * 사용량 조회 (헤더 배지 등에 사용)
 */
export async function getUsage(userId: string): Promise<UsageInfo> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("plan, monthly_usage, usage_reset_at")
    .eq("id", userId)
    .single();

  if (!data) return { used: 0, limit: 10, plan: "free", remaining: 10 };

  if (ADMIN_IDS.has(userId)) {
    return { used: data.monthly_usage ?? 0, limit: Infinity, plan: "admin", remaining: Infinity };
  }

  const plan = data.plan || "free";
  const limits = getPlanLimits(plan);

  // 월 리셋 체크
  const wasReset = await resetIfNewMonth(userId, data.usage_reset_at);
  const used = wasReset ? 0 : (data.monthly_usage ?? 0);

  return { used, limit: limits.analysis, plan, remaining: Math.max(0, limits.analysis - used) };
}

/**
 * 분석 1회 차감. 한도 초과 시 false 반환.
 */
export async function consumeUsage(userId: string): Promise<{ ok: boolean; usage: UsageInfo }> {
  const usage = await getUsage(userId);

  if (usage.remaining <= 0) {
    return { ok: false, usage };
  }

  const newUsed = usage.used + 1;

  await supabaseAdmin
    .from("users")
    .update({ monthly_usage: newUsed })
    .eq("id", userId);

  const updated = {
    ...usage,
    used: newUsed,
    remaining: Math.max(0, usage.limit - newUsed),
  };

  return { ok: true, usage: updated };
}
