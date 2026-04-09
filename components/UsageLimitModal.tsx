"use client";

import { useEffect, useState } from "react";

/**
 * 한도 초과 시 표시되는 모달
 * window.dispatchEvent(new CustomEvent("usage-limit-reached"))
 */
export default function UsageLimitModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handle() { setOpen(true); }
    window.addEventListener("usage-limit-reached", handle);
    return () => window.removeEventListener("usage-limit-reached", handle);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-sm w-full mx-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h2 className="text-lg font-black text-gray-900 mb-2">
          이번 달 무료 분석을 모두 사용했어요
        </h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          매월 1일에 분석 횟수가 초기화됩니다.<br/>
          현재 무료 플랜만 운영 중이며, 서비스 개선 후 유료 플랜을 오픈할 예정입니다.
        </p>

        <div className="space-y-2">
          {/* 추후 /pricing 페이지 연결 */}
          <button
            onClick={() => setOpen(false)}
            className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            확인
          </button>
        </div>

        <p className="text-xs text-gray-300 mt-4">
          현재 무료 플랜: 월 10회 분석
        </p>
      </div>
    </div>
  );
}
