/**
 * 앱 내 브라우저(WebView) 감지 유틸
 *
 * 카카오톡, 인스타그램, 페이스북 등 인앱 브라우저는 Google OAuth에서
 * "disallowed_useragent" 403 에러가 발생합니다.
 * 감지 후 외부 브라우저로 열도록 안내해야 합니다.
 */

export interface InAppBrowserInfo {
  isInApp: boolean;
  name: string;
  isIOS: boolean;
  isAndroid: boolean;
}

export function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof navigator === "undefined") {
    return { isInApp: false, name: "", isIOS: false, isAndroid: false };
  }
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  const patterns: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /kakaotalk/, name: "카카오톡" },
    { pattern: /instagram/, name: "인스타그램" },
    { pattern: /fban|fbav|fbios/, name: "페이스북" },
    { pattern: /naver\(inapp/, name: "네이버" },
    { pattern: /line\//, name: "라인" },
    { pattern: /daumapps/, name: "다음" },
    { pattern: /everytimeapp/, name: "에브리타임" },
    { pattern: /whale/, name: "웨일" },
    { pattern: /micromessenger/, name: "위챗" },
    { pattern: /trill|musical_ly|tiktok/, name: "틱톡" },
    { pattern: /snapchat/, name: "스냅챗" },
    { pattern: /threads/, name: "스레드" },
    { pattern: /bytedance/, name: "바이트댄스" },
    { pattern: /; wv\)/, name: "안드로이드 WebView" },
  ];

  for (const { pattern, name } of patterns) {
    if (pattern.test(ua)) {
      return { isInApp: true, name, isIOS, isAndroid };
    }
  }
  return { isInApp: false, name: "", isIOS, isAndroid };
}

/**
 * 외부 브라우저로 열기 시도
 * - Android: Chrome intent:// URL로 강제 열기
 * - iOS: URL 복사 (강제 외부 열기 불가)
 */
export function openInExternalBrowser(info: InAppBrowserInfo): { copied: boolean } {
  const currentUrl = window.location.href;

  if (info.isAndroid) {
    const intentUrl = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = intentUrl;
    return { copied: false };
  }

  // iOS 또는 기타
  if (navigator.clipboard) {
    navigator.clipboard.writeText(currentUrl).catch(() => {
      window.prompt("URL을 복사해서 Safari나 Chrome에서 열어주세요:", currentUrl);
    });
    return { copied: true };
  }
  window.prompt("URL을 복사해서 Safari나 Chrome에서 열어주세요:", currentUrl);
  return { copied: true };
}
