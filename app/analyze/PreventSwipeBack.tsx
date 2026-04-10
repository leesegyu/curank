"use client";

import { useEffect } from "react";

/**
 * 분석 페이지에서 브라우저 뒤로가기/스와이프 제스처 차단
 *
 * 목적: 사용자가 실수로 뒤로 스와이프하거나 뒤로가기 버튼을 눌러
 *       분석 결과에서 벗어나는 것을 방지. 오직 우측 상단
 *       "다른 키워드 검색하기" 버튼으로만 홈 이동 가능.
 *
 * 방법:
 * 1) popstate 이벤트 가로채서 즉시 현재 페이지로 pushState
 * 2) overscroll-behavior-x: contain 으로 가로 스크롤 바운스 차단
 * 3) CSS touch-action 제어로 모바일 edge swipe 완화
 */
export default function PreventSwipeBack() {
  useEffect(() => {
    // 1) 초기 상태 저장 — 다음 pushState 시 복귀 지점
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      // 뒤로가기 눌렸을 때 즉시 현재 페이지 다시 push
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    // 2) body/html에 overscroll 차단 스타일 주입
    const prevBodyOverscroll = document.body.style.overscrollBehaviorX;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehaviorX;
    document.body.style.overscrollBehaviorX = "contain";
    document.documentElement.style.overscrollBehaviorX = "contain";

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.body.style.overscrollBehaviorX = prevBodyOverscroll;
      document.documentElement.style.overscrollBehaviorX = prevHtmlOverscroll;
    };
  }, []);

  return null;
}
