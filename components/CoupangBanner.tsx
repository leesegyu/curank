"use client";

import { useEffect, useRef } from "react";

/**
 * 쿠팡 파트너스 다이나믹 배너 (반응형)
 * - PC: 680x140 (id: 979932)
 * - 모바일: 320x250 (id: 979933)
 *
 * 쿠팡 g.js는 document.currentScript 위치에 배너를 주입하므로
 * 반드시 inline script를 원하는 컨테이너 내부에 생성해야 함.
 */
export default function CoupangBanner() {
  const pcRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SCRIPT_SRC = "https://ads-partners.coupang.com/g.js";

    const injectBanner = (
      container: HTMLDivElement,
      config: Record<string, string | number>,
    ) => {
      // 이미 주입된 경우 스킵 (StrictMode 중복 실행 방지)
      if (container.dataset.coupangInited === "1") return;
      container.dataset.coupangInited = "1";

      // 컨테이너 내부에 inline script 삽입 → g.js가 여기에 렌더링
      const inline = document.createElement("script");
      inline.text = `new PartnersCoupang.G(${JSON.stringify(config)});`;
      container.appendChild(inline);
    };

    const runInject = () => {
      if (pcRef.current) {
        injectBanner(pcRef.current, {
          id: 979932,
          template: "carousel",
          trackingCode: "AF8667975",
          width: "680",
          height: "140",
          tsource: "",
        });
      }
      if (mobileRef.current) {
        injectBanner(mobileRef.current, {
          id: 979933,
          template: "carousel",
          trackingCode: "AF8667975",
          width: "320",
          height: "250",
          tsource: "",
        });
      }
    };

    // g.js 전역 스크립트 로드 (한 번만)
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );

    if (
      (window as unknown as { PartnersCoupang?: unknown }).PartnersCoupang
    ) {
      // 이미 로드되어 있음
      runInject();
    } else if (existing) {
      existing.addEventListener("load", runInject);
    } else {
      const gjs = document.createElement("script");
      gjs.src = SCRIPT_SRC;
      gjs.async = true;
      gjs.onload = runInject;
      document.head.appendChild(gjs);
    }
  }, []);

  return (
    <div className="w-full my-6 flex flex-col items-center overflow-hidden">
      {/* PC 배너 (sm 이상) */}
      <div
        ref={pcRef}
        className="hidden sm:block"
        style={{ width: 680, maxWidth: "100%", minHeight: 140 }}
      />
      {/* 모바일 배너 (sm 미만) */}
      <div
        ref={mobileRef}
        className="block sm:hidden"
        style={{ width: 320, minHeight: 250 }}
      />
      <p className="mt-2 text-[10px] text-gray-400 text-center">
        ※ 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있음
      </p>
    </div>
  );
}
