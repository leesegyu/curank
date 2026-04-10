import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
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
    return NextResponse.json({ error: "이미 사용 중인 이메일입니다" }, { status: 409 });
  }

  const password_hash = await bcrypt.hash(password, 12);

  const { error } = await supabaseAdmin.from("users").insert({
    email: normalizedEmail,
    name: name?.trim() || null,
    password_hash,
    selling_experience: sellingExperience || null,
    main_categories:    Array.isArray(mainCategories) ? mainCategories : [],
    main_platform:      mainPlatform || null,
    platform_categories: platformCategories ?? { smartstore: [], coupang: [] },
    email_verified:      true,  // 임시: 이메일 인증 비활성화 — 커스텀 도메인 확보 후 false로 복원
  });

  if (error) {
    return NextResponse.json({ error: "회원가입에 실패했습니다" }, { status: 500 });
  }

  // 텔레그램 신규 가입 알림
  notifyNewSignup(normalizedEmail, name?.trim() || null).catch(() => {});

  // 이메일 인증 비활성화 상태 → 자동 로그인 가능
  return NextResponse.json({ success: true, needVerification: false });
}
