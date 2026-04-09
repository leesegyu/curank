/**
 * GET /api/ext/me
 * X-CuRank-Key 헤더로 사용자 정보 조회.
 * 확장프로그램 popup이 로그인 상태 확인 시 호출.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey }              from "@/lib/ext-auth";
import { supabase }                  from "@/lib/db";

export async function GET(req: NextRequest) {
  const rawKey = req.headers.get("X-CuRank-Key") ?? "";
  if (!rawKey) {
    return NextResponse.json({ error: "missing api key" }, { status: 401 });
  }

  const verified = await verifyApiKey(rawKey);
  if (!verified) {
    return NextResponse.json({ error: "invalid or expired api key" }, { status: 401 });
  }

  // users 테이블에서 이메일 조회
  let email = "";
  if (supabase) {
    const { data } = await supabase
      .from("users")
      .select("email, plan")
      .eq("id", verified.userId)
      .single();
    email = (data?.email as string | undefined) ?? "";
  }

  return NextResponse.json({
    userId: verified.userId,
    email,
    plan:   verified.plan,
  });
}
