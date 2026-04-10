"use client";

import { useEffect, useRef } from "react";

/**
 * 쿠팡 파트너스 다이나믹 배너 (반응형)
 * - PC: 680x140 (id: 979932)
 * - 모바일: 320x250 (id: 979933)
 *
 * 쿠팡 파트너스 스크립트는 g.js를 전역 로드 후 PartnersCoupang.G()를 호출하는 방식.
 * Next.js에서 안전하게 렌더링하기 위해 useEffect로 동적 삽입.
 */
export default function CoupangBanner() {
  const pcRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 쿠팡 파트너스 스크립트 로드 (한 번만)
    const SCRIPT_SRC = "https://ads-partners.coupang.com/g.js";
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );

    const initBanners = () => {
      const PC = (window as unknown as { PartnersCoupang?: { G: new (opts: Record<string, unknown>) => unknown } }).PartnersCoupang;
      if (!PC) return;

      // PC 배너
      if (pcRef.current && pcRef.current.childNodes.length === 0) {
        try {
          new PC.G({
            id: 979932,
            template: "carousel",
            trackingCode: "AF8667975",
            width: "680",
            height: "140",
            tsource: "",
          });
        } catch (e) {
          console.warn("쿠팡 PC 배너 초기화 실패:", e);
        }
      }

      // 모바일 배너
      if (mobileRef.current && mobileRef.current.childNodes.length === 0) {
        try {
          new PC.G({
            id: 979933,
            template: "carousel",
            trackingCode: "AF8667975",
            width: "320",
            height: "250",
            tsource: "",
          });
        } catch (e) {
          console.warn("쿠팡 모바일 배너 초기화 실패:", e);
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = initBanners;
      document.body.appendChild(script);
    } else if ((window as unknown as { PartnersCoupang?: unknown }).PartnersCoupang) {
      initBanners();
    } else {
      script.addEventListener("load", initBanners);
    }
  }, []);

  return (
    <div className="w-full my-6 flex flex-col items-center">
      {/* PC 배너 (sm 이상에서 표시) */}
      <div
        ref={pcRef}
        className="hidden sm:block"
        style={{ width: "680px", maxWidth: "100%", minHeight: "140px" }}
      />
      {/* 모바일 배너 (sm 미만에서 표시) */}
      <div
        ref={mobileRef}
        className="block sm:hidden"
        style={{ width: "320px", minHeight: "250px" }}
      />
      <p className="mt-2 text-[10px] text-gray-400 text-center">
        ※ 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있음
      </p>
    </div>
  );
}
