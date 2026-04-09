import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email_verify_expires, email_verified")
    .eq("email_verify_token", token)
    .single();

  if (!user) {
    return NextResponse.redirect(new URL("/verify-email?status=invalid", req.url));
  }

  if (user.email_verified) {
    return NextResponse.redirect(new URL("/verify-email?status=already", req.url));
  }

  if (new Date(user.email_verify_expires) < new Date()) {
    return NextResponse.redirect(new URL("/verify-email?status=expired", req.url));
  }

  // 인증 완료 처리
  await supabaseAdmin
    .from("users")
    .update({
      email_verified: true,
      email_verify_token: null,
      email_verify_expires: null,
    })
    .eq("id", user.id);

  return NextResponse.redirect(new URL("/verify-email?status=success", req.url));
}
