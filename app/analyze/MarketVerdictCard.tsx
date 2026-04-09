"use client";

import { useEffect, useState } from "react";
import { calcMarketVerdict } from "@/lib/market-verdict";

interface Props {
  keyword: string;
  competitionScore: number;
  competitionLevel: string;
  trendDirection: string;
  trendSlope: number;
  totalProducts: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  avgRatingCount: number | null;
}

const LEVEL_STYLE: Record<string, { bg: string; border: string; icon: string; gradient: string }> = {
  go: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "🟢",
    gradient: "linear-gradient(135deg, #10b981, #059669)",
  },
  conditional: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "🟡",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
  },
  nogo: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "🔴",
    gradient: "linear-gradient(135deg, #ef4444, #dc2626)",
  },
};

function formatWon(amount: number): string {
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(0)}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

export default function MarketVerdictCard(props: Props) {
  const [monthlyVolume, setMonthlyVolume] = useState(0);

  useEffect(() => {
    fetch(`/api/volume?keyword=${encodeURIComponent(props.keyword)}`)
      .then((r) => r.json())
      .then((d) => setMonthlyVolume(d.volume ?? 0))
      .catch(() => {});
  }, [props.keyword]);

  const verdict = calcMarketVerdict({ ...props, monthlyVolume });
  const style = LEVEL_STYLE[verdict.level];

  return (
    <div className={`rounded-2xl border-2 ${style.border} ${style.bg} p-6 mb-4`}>
      {/* 헤더: 판정 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{style.icon}</span>
        <span
          className="text-lg font-black text-white px-4 py-1 rounded-full"
          style={{ background: style.gradient }}
        >
          {verdict.title}
        </span>
      </div>

      {/* 설명 */}
      <p className="text-sm font-medium text-gray-700 mb-4 leading-relaxed">
        {verdict.description}
      </p>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {verdict.estimatedMonthlySales && (
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">월 예상 매출</p>
            <p className="text-sm font-black text-gray-800">
              {formatWon(verdict.estimatedMonthlySales.min)}~{formatWon(verdict.estimatedMonthlySales.max)}
            </p>
          </div>
        )}
        {monthlyVolume > 0 && (
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">월 검색량</p>
            <p className="text-sm font-black text-gray-800">
              {monthlyVolume.toLocaleString()}회
              <span className={`text-xs ml-1 ${
                verdict.trendDirection === "상승" ? "text-green-500" :
                verdict.trendDirection === "하락" ? "text-red-400" : "text-gray-400"
              }`}>
                {verdict.trendDirection === "상승" ? "↑" : verdict.trendDirection === "하락" ? "↓" : "→"} {verdict.trendDirection}
              </span>
            </p>
          </div>
        )}
        {verdict.priceRange && (
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 mb-1">적정 가격대</p>
            <p className="text-sm font-black text-gray-800">
              {formatWon(verdict.priceRange.low)}~{formatWon(verdict.priceRange.high)}
            </p>
          </div>
        )}
        <div className="bg-white rounded-xl p-3 border border-gray-100">
          <p className="text-[10px] text-gray-400 mb-1">경쟁 강도</p>
          <p className="text-sm font-black text-gray-800">
            {props.competitionLevel} ({verdict.competitionScore}점)
          </p>
        </div>
      </div>

      {/* 근거 + 주의사항 */}
      {verdict.reasons.length > 0 && (
        <div className="mb-2">
          {verdict.reasons.map((r, i) => (
            <p key={i} className="text-xs text-green-700 mb-0.5">✓ {r}</p>
          ))}
        </div>
      )}
      {verdict.cautions.length > 0 && (
        <div>
          {verdict.cautions.map((c, i) => (
            <p key={i} className="text-xs text-amber-700 mb-0.5">⚠ {c}</p>
          ))}
        </div>
      )}
    </div>
  );
}
