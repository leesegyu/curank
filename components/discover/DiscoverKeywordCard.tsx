"use client";

import Link from "next/link";
import MiniSeasonChart from "./MiniSeasonChart";

interface MonthlyRatio {
  month: number;
  ratio: number;
}

interface DiscoverKeyword {
  keyword: string;
  phase: string;
  seasonType: string;
  currentPercentOfPeak: number;
  peakMonth: number;
  monthsToPeak: number;
  upsidePercent: number;
  seasonality: number;
  monthlyRatios: MonthlyRatio[];
  monthlyTotal: number | null;
  compIdx: string | null;
  categoryL1: string;
  categoryL2: string;
}

const SEASON_LABELS: Record<string, string> = {
  summer: "여름",
  winter: "겨울",
  spring: "봄",
  autumn: "가을",
  year_round: "연중",
  irregular: "불규칙",
};

const SEASON_EMOJI: Record<string, string> = {
  summer: "☀️",
  winter: "❄️",
  spring: "🌸",
  autumn: "🍂",
  year_round: "📊",
  irregular: "📊",
};

const COMP_COLORS: Record<string, string> = {
  "낮음": "text-emerald-600",
  "보통": "text-blue-600",
  "높음": "text-orange-600",
  "매우 높음": "text-red-600",
};

function formatVolume(v: number): string {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}만`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}천`;
  return String(v);
}

export default function DiscoverKeywordCard({ kw, isFree = false }: { kw: DiscoverKeyword; isFree?: boolean }) {
  const phaseBadge = kw.phase === "rising"
    ? { label: "상승 초입", cls: "bg-emerald-100 text-emerald-700" }
    : { label: "급상승", cls: "bg-orange-100 text-orange-700" };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* 배지 행 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${phaseBadge.cls}`}>
          {phaseBadge.label}
        </span>
        <span className="text-xs text-gray-400">
          {SEASON_EMOJI[kw.seasonType]} {SEASON_LABELS[kw.seasonType] ?? kw.seasonType}
        </span>
        {kw.categoryL2 && (
          <span className="text-xs text-gray-300">{kw.categoryL1} &gt; {kw.categoryL2}</span>
        )}
      </div>

      {/* 키워드 + 분석 링크 */}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-gray-800">{kw.keyword}</span>
        {isFree ? (
          <span className="text-[11px] text-gray-300 shrink-0">유료 플랜에서 분석</span>
        ) : (
          <Link
            href={`/analyze?keyword=${encodeURIComponent(kw.keyword)}&platform=naver`}
            className="text-xs text-blue-500 font-bold hover:text-blue-700 shrink-0"
          >
            분석 →
          </Link>
        )}
      </div>

      {/* 미니 차트 — 무료는 숨김 */}
      {!isFree && kw.monthlyRatios.length > 0 && (
        <MiniSeasonChart monthlyRatios={kw.monthlyRatios} peakMonth={kw.peakMonth} />
      )}
      {isFree && (
        <div className="h-10 bg-gray-50 rounded flex items-center justify-center">
          <span className="text-[10px] text-gray-300">차트는 유료 플랜에서 확인</span>
        </div>
      )}

      {/* 메트릭 행 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-gray-500">
          현재 <span className="font-bold text-gray-700">{kw.currentPercentOfPeak}%</span>
        </div>
        <div className="text-gray-500">
          피크 <span className="font-bold text-gray-700">{kw.peakMonth}월</span>
          <span className="text-gray-400"> ({kw.monthsToPeak}개월)</span>
        </div>
        <div>
          <span className="font-bold text-emerald-600">+{kw.upsidePercent}%</span>
          <span className="text-gray-400"> 잠재</span>
        </div>
        {!isFree && kw.monthlyTotal != null && kw.monthlyTotal > 0 ? (
          <div className="text-gray-500">
            검색량 <span className="font-bold text-gray-700">{formatVolume(kw.monthlyTotal)}</span>/월
          </div>
        ) : isFree ? (
          <div className="text-gray-300 text-[11px]">검색량 유료</div>
        ) : (
          <div />
        )}
      </div>

      {/* 경쟁도 */}
      {!isFree && kw.compIdx && (
        <div className="text-xs text-gray-400">
          경쟁도 <span className={`font-bold ${COMP_COLORS[kw.compIdx] ?? "text-gray-600"}`}>{kw.compIdx}</span>
        </div>
      )}
    </div>
  );
}
