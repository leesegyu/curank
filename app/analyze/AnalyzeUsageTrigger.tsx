"use client";

import { useEffect } from "react";

/**
 * 서버에서 분석 1회 차감 후, 클라이언트에서 토스트 + 배지 갱신 트리거
 * 마운트 시 1회만 실행
 */
export default function AnalyzeUsageTrigger({
  used,
  limit,
  remaining,
}: {
  used: number;
  limit: number;
  remaining: number;
}) {
  useEffect(() => {
    // "+1 사용" 토스트 표시
    window.dispatchEvent(
      new CustomEvent("usage-toast", { detail: { used, limit, remaining } })
    );

    // 헤더 배지 갱신
    window.dispatchEvent(new Event("usage-updated"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
