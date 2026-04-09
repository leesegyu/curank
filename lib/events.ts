/**
 * 사용자 이벤트 수집 (AI 학습 데이터 파이프라인)
 *
 * Supabase user_events 테이블에 비동기 적재 (응답 블록 안 함)
 * nightly export script → 로컬 PostgreSQL curank_ml DB로 이관
 */

import { supabase } from "./db";

export type EventType =
  | "search"              // 홈에서 키워드 검색
  | "analyze"             // /analyze 페이지 도달
  | "analyze_dwell"       // /analyze 페이지 이탈 시 체류시간
  | "copy_keyword"        // 추천 키워드 복사
  | "click_recommendation"; // 추천 키워드 클릭 → /analyze 이동

export interface EventMeta {
  position?: number;      // 추천 리스트에서의 순위
  source?: string;        // 'blue_ocean'|'v2'|'category'|'direct'
  session_id?: string;    // 클라이언트에서 생성한 세션 UUID
  dwell_ms?: number;      // 체류 시간
  model_version?: string; // 어떤 추천 모델이 노출했는지
  platform?: string;      // 'naver'|'coupang'|'all'
}

/**
 * 이벤트 기록 (Server-side: API Route / Server Action에서 호출)
 */
export async function trackEvent(
  userId: string,
  eventType: EventType,
  keyword: string,
  meta?: EventMeta
): Promise<void> {
  if (!supabase) return;

  supabase
    .from("user_events")
    .insert({
      user_id: userId,
      event_type: eventType,
      keyword,
      metadata: meta ?? {},
      ts: new Date().toISOString(),
    })
    .then(() => {}); // 비동기 fire-and-forget
}

/**
 * 이벤트 기록 — API Route 전용 (fetch 기반, 클라이언트에서 호출)
 * /api/events POST 엔드포인트 사용
 * 세션 ID는 자동으로 주입됨
 */
export async function trackEventClient(
  eventType: EventType,
  keyword: string,
  meta?: EventMeta
): Promise<void> {
  try {
    // 세션 ID 자동 주입 (동적 import로 SSR-safe)
    const { getOrCreateSessionId } = await import("./use-session-id");
    const sessionId = getOrCreateSessionId();

    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, keyword, meta: { ...meta, session_id: sessionId } }),
      // keepalive: 페이지 이탈 시에도 요청 완료
      keepalive: true,
    });
  } catch {
    // 이벤트 수집 실패는 무시 (사용자 경험에 영향 주면 안 됨)
  }
}
