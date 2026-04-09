/**
 * POST /api/events
 * 클라이언트에서 사용자 행동 이벤트 수집
 * auth 미들웨어 없이 동작 (세션 검증은 내부에서)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { trackEvent, EventType } from "@/lib/events";

const VALID_EVENTS = new Set<EventType>([
  "search",
  "analyze",
  "analyze_dwell",
  "copy_keyword",
  "click_recommendation",
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    // 비로그인 사용자 이벤트는 수집하지 않음
    return NextResponse.json({ ok: true });
  }

  try {
    const body = await req.json();
    const { eventType, keyword, meta } = body;

    if (!VALID_EVENTS.has(eventType) || typeof keyword !== "string" || !keyword.trim()) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    await trackEvent(session.user.id, eventType, keyword.trim(), meta);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // 이벤트 실패는 조용히 처리
  }
}
