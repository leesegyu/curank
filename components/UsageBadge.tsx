"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type UsageInfo = { used: number; limit: number; plan: string; remaining: number };

/**
 * 헤더에 표시되는 분석 사용량 배지
 * "분석 3/30" 형태, 사용률에 따라 색상 변화
 */
export default function UsageBadge() {
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {});
  }, [session]);

  // 커스텀 이벤트로 외부에서 갱신 트리거 가능
  useEffect(() => {
    function refresh() {
      fetch("/api/user/usage")
        .then((r) => r.json())
        .then(setUsage)
        .catch(() => {});
    }
    window.addEventListener("usage-updated", refresh);
    return () => window.removeEventListener("usage-updated", refresh);
  }, []);

  if (!session?.user || !usage) return null;

  const percent = usage.limit === Infinity ? 0 : (usage.used / usage.limit) * 100;

  // 색상: 0~59% 파랑, 60~79% 노랑, 80%+ 빨강
  let color = "text-blue-600 bg-blue-50 border-blue-200";
  let barColor = "bg-blue-500";
  if (percent >= 80) {
    color = "text-red-600 bg-red-50 border-red-200";
    barColor = "bg-red-500";
  } else if (percent >= 60) {
    color = "text-amber-600 bg-amber-50 border-amber-200";
    barColor = "bg-amber-500";
  }

  const limitText = usage.limit === Infinity ? "∞" : usage.limit;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${color}`}>
      <span>분석</span>
      <span>{usage.used}/{limitText}</span>
      {/* 미니 프로그레스 바 */}
      {usage.limit !== Infinity && (
        <div className="w-8 h-1.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
