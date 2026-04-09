"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  keyword: string;
  platform: string;
  className?: string;
  children: React.ReactNode;
}

export default function AnalyzeKeywordLink({ keyword, platform, className, children }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    setShowConfirm(true);
  }

  function handleConfirm() {
    setShowConfirm(false);
    // 홈으로 이동 + URL 파라미터로 자동 검색 트리거 (일반 검색과 동일 플로우)
    router.push(`/?q=${encodeURIComponent(keyword)}&platform=${platform}`);
  }

  return (
    <>
      <a
        href={`/analyze?keyword=${encodeURIComponent(keyword)}&platform=${platform}`}
        onClick={handleClick}
        className={className}
      >
        {children}
      </a>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-4 text-center">
            <p className="text-base font-bold text-gray-800 mb-2">
              새 키워드를 분석할까요?
            </p>
            <p className="text-sm text-gray-500 mb-1">
              &ldquo;{keyword}&rdquo; 분석 시
            </p>
            <p className="text-sm text-gray-500 mb-5">
              월 분석 횟수가 <span className="font-bold text-blue-600">1회 차감</span>됩니다.
            </p>
            <p className="text-xs text-gray-400 mb-5">
              이미 분석한 키워드는 차감 없이 재조회됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                분석하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
