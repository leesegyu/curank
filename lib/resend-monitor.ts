import { createClient } from "@supabase/supabase-js";
import { sendTelegram } from "./telegram";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Resend 무료 플랜 한도
const DAILY_LIMIT   = 100;
const MONTHLY_LIMIT = 3000;
const THRESHOLDS    = [0.3, 0.6, 0.8, 0.9]; // 30%, 60%, 80%, 90%

/**
 * 이메일 발송 1건 기록 + 한도 체크 + 텔레그램 알림
 * 가입 API에서 이메일 발송 성공 후 호출
 */
export async function trackEmailSend() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const monthKey = now.toISOString().slice(0, 7); // YYYY-MM

  // email_send_log 테이블에 기록
  await supabaseAdmin.from("email_send_log").insert({ sent_at: now.toISOString() });

  // 오늘 발송 수
  const { count: dailyCount } = await supabaseAdmin
    .from("email_send_log")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", `${today}T00:00:00`)
    .lt("sent_at", `${today}T23:59:59.999`);

  // 이번 달 발송 수
  const { count: monthlyCount } = await supabaseAdmin
    .from("email_send_log")
    .select("*", { count: "exact", head: true })
    .gte("sent_at", `${monthKey}-01T00:00:00`)
    .lt("sent_at", `${monthKey}-31T23:59:59.999`);

  const daily = dailyCount ?? 0;
  const monthly = monthlyCount ?? 0;

  // 일간 한도 체크
  for (const t of THRESHOLDS) {
    const limit = Math.floor(DAILY_LIMIT * t);
    if (daily === limit) {
      await sendTelegram(
        `⚠️ <b>[쿠랭크] Resend 일간 한도 ${Math.round(t * 100)}% 도달</b>\n\n` +
        `오늘 발송: <b>${daily}/${DAILY_LIMIT}건</b>\n` +
        `남은 한도: ${DAILY_LIMIT - daily}건\n\n` +
        `${t >= 0.8 ? "🚨 한도 초과 시 회원가입 이메일 발송 불가!" : "📊 모니터링 중"}`
      );
    }
  }

  // 월간 한도 체크
  for (const t of THRESHOLDS) {
    const limit = Math.floor(MONTHLY_LIMIT * t);
    if (monthly === limit) {
      await sendTelegram(
        `⚠️ <b>[쿠랭크] Resend 월간 한도 ${Math.round(t * 100)}% 도달</b>\n\n` +
        `이번 달 발송: <b>${monthly}/${MONTHLY_LIMIT}건</b>\n` +
        `남은 한도: ${MONTHLY_LIMIT - monthly}건\n\n` +
        `${t >= 0.8 ? "🚨 Resend 유료 플랜 전환을 검토하세요!\nhttps://resend.com/pricing" : "📊 모니터링 중"}`
      );
    }
  }
}
