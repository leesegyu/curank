/**
 * GET  /api/ext/token?requestId=XXX  → 확장프로그램 폴링 (API 키 완성 여부)
 * PUT  /api/ext/token                → 웹 페이지(ext-auth)에서 requestId + 로그인 세션으로 API 키 예약
 */

import { NextRequest, NextResponse } from "next/server";
import { auth }                      from "@/auth";
import { createExtToken, consumeExtToken } from "@/lib/ext-auth";

// ── GET: 확장프로그램 폴링 ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const requestId = req.nextUrl.searchParams.get("requestId");
  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const apiKey = await consumeExtToken(requestId);
  if (!apiKey) {
    // 아직 미완성 or 만료
    return NextResponse.json({ pending: true }, { status: 202 });
  }

  return NextResponse.json({ apiKey });
}

// ── PUT: ext-auth 페이지에서 로그인 완료 후 호출 ────────────────────────────

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as { requestId?: string };
  const { requestId } = body;
  if (!requestId) {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const ok = await createExtToken(requestId, session.user.id);
  if (!ok) {
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
