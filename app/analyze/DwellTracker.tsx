"use client";

import { useEffect, useRef } from "react";
import { trackEventClient } from "@/lib/events";

/**
 * 분석 페이지 체류시간(dwell_ms) 트래커
 *
 * - 페이지 마운트 시점부터 경과 시간을 측정
 * - visibilitychange(hidden) 또는 beforeunload 시 analyze_dwell 이벤트 전송
 * - 최소 2초 이상 체류해야 전송 (봇/우발 클릭 필터)
 * - 중복 전송 방지 (sent ref)
 */
export default function DwellTracker({ keyword }: { keyword: string }) {
  const startRef = useRef(Date.now());
  const sentRef = useRef(false);

  useEffect(() => {
    startRef.current = Date.now();
    sentRef.current = false;

    const send = () => {
      if (sentRef.current) return;
      const dwell_ms = Date.now() - startRef.current;
      if (dwell_ms < 2000) return; // 2초 미만 무시
      sentRef.current = true;
      trackEventClient("analyze_dwell", keyword, { dwell_ms });
    };

    const onVisChange = () => {
      if (document.visibilityState === "hidden") send();
    };

    document.addEventListener("visibilitychange", onVisChange);
    window.addEventListener("beforeunload", send);

    return () => {
      send(); // SPA 내 이동 시에도 전송
      document.removeEventListener("visibilitychange", onVisChange);
      window.removeEventListener("beforeunload", send);
    };
  }, [keyword]);

  return null;
}
