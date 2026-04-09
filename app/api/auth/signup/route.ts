import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { sendVerificationEmail } from "@/lib/mail";
import { trackEmailSend } from "@/lib/resend-monitor";
import { notifyNewSignup } from "@/lib/signup-notify";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, password, name, sellingExperience, mainCategories, mainPlatform, platformCategories } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력해주세요" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "유효하지 않은 이메일 형식입니다" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 중복 이메일 확인
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id, email_verified")
    .eq("email", normalizedEmail)
    .single();

  if (existing) {
    // 미인증 상태면 토큰 재발급 허용
    if (!existing.email_verified) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("users")
        .update({ email_verify_token: token, email_verify_expires: expires })
        .eq("id", existing.id);

      try {
        await sendVerificationEmail(normalizedEmail, token);
        trackEmailSend().catch(() => {}); // 비동기 모니터링 (실패해도 무시)
      } catch {
        return NextResponse.json({ error: "인증 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
      }

      return NextResponse.json({ success: true, needVerification: true });
    }
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24시간

  const { error } = await supabaseAdmin.from("users").insert({
    email: normalizedEmail,
    name: name?.trim() || null,
    password_hash,
    selling_experience: sellingExperience || null,
    main_categories:    Array.isArray(mainCategories) ? mainCategories : [],
    main_platform:      mainPlatform || null,
    platform_categories: platformCategories ?? { smartstore: [], coupang: [] },
    email_verified:      false,
    email_verify_token:  token,
    email_verify_expires: expires,
  });

  if (error) {
    return NextResponse.json({ error: "회원가입에 실패했습니다" }, { status: 500 });
  }

  // 텔레그램 신규 가입 알림
  notifyNewSignup(normalizedEmail, name?.trim() || null).catch(() => {});

  // 인증 이메일 발송
  try {
    await sendVerificationEmail(normalizedEmail, token);
    trackEmailSend().catch(() => {}); // 비동기 모니터링
  } catch {
    // 가입은 성공, 이메일만 실패 → 로그인 페이지에서 재발송 가능
    console.error("[signup] 인증 이메일 발송 실패:", normalizedEmail);
  }

  return NextResponse.json({ success: true, needVerification: true });
}
