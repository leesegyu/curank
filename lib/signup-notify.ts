import { createClient } from "@supabase/supabase-js";
import { sendTelegram } from "./telegram";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 신규 회원가입 시 텔레그램으로 회원 현황 알림
 */
export async function notifyNewSignup(email: string, name: string | null) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  // 이번 주 월요일 계산
  const day = now.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  const weekStart = monday.toISOString().slice(0, 10);

  // 이번 달 1일
  const monthStart = `${now.toISOString().slice(0, 7)}-01`;

  // 병렬로 총/일/주/월 회원수 조회
  const [totalRes, dailyRes, weeklyRes, monthlyRes] = await Promise.all([
    supabaseAdmin.from("users").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true })
      .gte("created_at", `${today}T00:00:00`),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true })
      .gte("created_at", `${weekStart}T00:00:00`),
    supabaseAdmin.from("users").select("*", { count: "exact", head: true })
      .gte("created_at", `${monthStart}T00:00:00`),
  ]);

  const total   = totalRes.count ?? 0;
  const daily   = dailyRes.count ?? 0;
  const weekly  = weeklyRes.count ?? 0;
  const monthly = monthlyRes.count ?? 0;

  const displayName = name || email.split("@")[0];

  await sendTelegram(
    `🎉 <b>[쿠랭크] 새 회원가입!</b>\n\n` +
    `👤 ${displayName} (${email})\n\n` +
    `━━━━━━━━━━━━━━━\n` +
    `📊 <b>회원 현황</b>\n` +
    `━━━━━━━━━━━━━━━\n` +
    `총 회원수: <b>${total}명</b>\n` +
    `오늘 가입: <b>${daily}명</b>\n` +
    `이번 주:   <b>${weekly}명</b>\n` +
    `이번 달:   <b>${monthly}명</b>`
  );
}
