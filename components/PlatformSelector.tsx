"use client";

import { useState, useEffect, useCallback } from "react";

export type SearchPlatform = "naver" | "coupang" | "all";

const PLATFORMS: { value: SearchPlatform; label: string; enabled: boolean }[] = [
  { value: "coupang", label: "쿠팡", enabled: false },
  { value: "naver", label: "스마트스토어", enabled: true },
  { value: "all", label: "모두보기", enabled: false },
];

interface PlatformSelectorProps {
  value: SearchPlatform;
  onChange: (p: SearchPlatform) => void;
  size?: "sm" | "md";
}

export default function PlatformSelector({
  value,
  onChange,
  size = "md",
}: PlatformSelectorProps) {
  const [tooltip, setTooltip] = useState(false);

  // 2초 후 자동 fade-out
  useEffect(() => {
    if (!tooltip) return;
    const t = setTimeout(() => setTooltip(false), 2000);
    return () => clearTimeout(t);
  }, [tooltip]);

  const handleClick = useCallback(
    (p: (typeof PLATFORMS)[number]) => {
      if (p.enabled) {
        onChange(p.value);
        setTooltip(false);
      } else {
        setTooltip(true);
      }
    },
    [onChange],
  );

  const pill = size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-4 py-2";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        {PLATFORMS.map((p) => {
          const isActive = p.value === value && p.enabled;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => handleClick(p)}
              className={[
                pill,
                "font-semibold transition-all duration-200 flex items-center gap-1",
                isActive
                  ? "text-white"
                  : p.enabled
                    ? "text-gray-500 hover:bg-gray-100"
                    : "text-gray-300 cursor-not-allowed",
              ].join(" ")}
              style={
                isActive
                  ? { background: "linear-gradient(135deg, #3b82f6, #6366f1)" }
                  : undefined
              }
            >
              {!p.enabled && (
                <svg
                  width={size === "sm" ? 10 : 12}
                  height={size === "sm" ? 10 : 12}
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  className="opacity-50"
                >
                  <path d="M9 4.5V4a3 3 0 0 0-6 0v.5A1.5 1.5 0 0 0 1.5 6v4A1.5 1.5 0 0 0 3 11.5h6A1.5 1.5 0 0 0 10.5 10V6A1.5 1.5 0 0 0 9 4.5ZM4 4a2 2 0 1 1 4 0v.5H4V4Zm5.5 6a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v4Z" />
                </svg>
              )}
              {p.label}
            </button>
          );
        })}
      </div>

      {/* 비활성 클릭 안내 */}
      <p
        className={[
          "text-xs text-gray-400 transition-opacity duration-300",
          tooltip ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        쿠팡 기반 키워드 검색은 아직 개발중입니다
      </p>
    </div>
  );
}
