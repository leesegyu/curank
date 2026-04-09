"use client";

import { useEffect, useState } from "react";

type ToastData = { used: number; limit: number; remaining: number };

/**
 * 분석 1회 소모 시 우측 하단에 뜨는 토스트
 * window.dispatchEvent(new CustomEvent("usage-toast", { detail: { used, limit, remaining } }))
 */
export default function UsageToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleToast(e: Event) {
      const data = (e as CustomEvent<ToastData>).detail;
      setToast(data);
      setVisible(true);

      setTimeout(() => setVisible(false), 3000);
      setTimeout(() => setToast(null), 3500);
    }

    window.addEventListener("usage-toast", handleToast);
    return () => window.removeEventListener("usage-toast", handleToast);
  }, []);

  if (!toast) return null;

  const isWarning = toast.remaining <= 5;

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${isWarning ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
          isWarning ? "bg-amber-500" : "bg-blue-500"
        }`}>
          +1
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">
            분석 1회 사용
          </p>
          <p className={`text-xs ${isWarning ? "text-amber-600 font-bold" : "text-gray-400"}`}>
            {toast.remaining > 0
              ? `이번 달 ${toast.used}/${toast.limit}회 (${toast.remaining}회 남음)`
              : "이번 달 무료 분석을 모두 사용했습니다"}
          </p>
        </div>
      </div>
    </div>
  );
}
