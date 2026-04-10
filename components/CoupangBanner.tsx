"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 쿠팡 파트너스 다이나믹 배너 (iframe 격리 방식)
 *
 * 쿠팡 g.js는 document.write()를 사용하는데, 페이지 로드 후 비동기로 실행되면
 * document.write가 문서 전체를 덮어쓰거나 body 끝에 쏟아집니다.
 * iframe 내부에서 실행하면 iframe document에만 영향을 주므로 레이아웃 격리가 완벽합니다.
 *
 * - PC: 680x140 (id: 979932)
 * - 모바일: 320x250 (id: 979933)
 */
export default function CoupangBanner() {
  const pcIframeRef = useRef<HTMLIFrameElement>(null);
  const mobileIframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const injectBanner = (
      iframe: HTMLIFrameElement,
      config: Record<string, string | number>,
    ) => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  html, body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
  body { display: flex; justify-content: center; align-items: center; }
</style>
</head>
<body>
<script src="https://ads-partners.coupang.com/g.js"></script>
<script>
  try {
    new PartnersCoupang.G(${JSON.stringify(config)});
  } catch (e) {
    console.warn("쿠팡 배너 초기화 실패:", e);
  }
</script>
</body>
</html>`);
      doc.close();
    };

    if (pcIframeRef.current) {
      injectBanner(pcIframeRef.current, {
        id: 979932,
        template: "carousel",
        trackingCode: "AF8667975",
        width: "680",
        height: "140",
        tsource: "",
      });
    }

    if (mobileIframeRef.current) {
      injectBanner(mobileIframeRef.current, {
        id: 979933,
        template: "carousel",
        trackingCode: "AF8667975",
        width: "320",
        height: "250",
        tsource: "",
      });
    }

    // 로드 완료 표시 (disclaimer 노출용)
    const t = setTimeout(() => setLoaded(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="w-full my-4 flex flex-col items-center">
      {/* PC 배너 */}
      <iframe
        ref={pcIframeRef}
        title="쿠팡 파트너스 배너"
        className="hidden sm:block"
        style={{
          width: 680,
          maxWidth: "100%",
          height: 150,
          border: 0,
          display: "block",
        }}
        scrolling="no"
      />
      {/* 모바일 배너 */}
      <iframe
        ref={mobileIframeRef}
        title="쿠팡 파트너스 배너"
        className="block sm:hidden"
        style={{
          width: 320,
          height: 260,
          border: 0,
          display: "block",
        }}
        scrolling="no"
      />
      {loaded && (
        <p className="mt-1.5 text-[10px] text-gray-400 text-center">
          ※ 쿠팡 파트너스 활동의 일환으로 일정액의 수수료를 제공받을 수 있음
        </p>
      )}
    </div>
  );
}
