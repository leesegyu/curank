"use client";

import { useEffect, useState } from "react";
import type { FactorScoreSet, FactorResult, SubFactor } from "@/lib/factor-model";

interface Props {
  keyword: string;
  platform: string;
}

const FACTOR_STYLE: Record<string, { color: string; bg: string; ring: string; text: string; label: string }> = {
  ranking:       { color: "#22c55e", bg: "bg-green-50",  ring: "text-green-500",  text: "text-green-700",  label: "상위 노출" },
  conversion:    { color: "#3b82f6", bg: "bg-blue-50",   ring: "text-blue-500",   text: "text-blue-700",   label: "구매전환" },
  growth:        { color: "#a855f7", bg: "bg-purple-50", ring: "text-purple-500", text: "text-purple-700", label: "시장 성장" },
  profitability: { color: "#f59e0b", bg: "bg-amber-50",  ring: "text-amber-500",  text: "text-amber-700",  label: "수익성" },
  entryBarrier:  { color: "#ef4444", bg: "bg-red-50",    ring: "text-red-500",    text: "text-red-700",    label: "진입 난이도" },
  crossPlatform: { color: "#6366f1", bg: "bg-indigo-50", ring: "text-indigo-500", text: "text-indigo-700", label: "플랫폼 우위" },
};

const FACTOR_ICON: Record<string, string> = {
  ranking: "📊", conversion: "🛒", growth: "📈",
  profitability: "💰", entryBarrier: "🚧", crossPlatform: "🔄",
};

const FACTOR_DESC: Record<string, string> = {
  crossPlatform: "현재 플랫폼이 상대 플랫폼 대비 얼마나 유리한지 나타냅니다",
  entryBarrier: "낮을수록 진입이 쉽습니다",
};

/** SVG 도넛 게이지 */
function DonutGauge({ percent, color, size = 80 }: { percent: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

/** 점수 레벨 텍스트 */
function scoreLevel(score: number, invert = false): { label: string; color: string } {
  const s = invert ? 100 - score : score;
  if (s >= 70) return { label: "좋음", color: "text-green-600 bg-green-50" };
  if (s >= 45) return { label: "보통", color: "text-yellow-600 bg-yellow-50" };
  return { label: "주의", color: "text-red-600 bg-red-50" };
}

function SubFactorRow({ sf }: { sf: SubFactor }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-xs text-gray-500 w-28 shrink-0 truncate">{sf.name}</span>
      <div className="flex-1">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 rounded-full bg-gray-400 transition-all" style={{ width: `${sf.score}%` }} />
        </div>
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{sf.score}</span>
      {!sf.measured && (
        <span className="text-[10px] px-1 py-0.5 rounded bg-yellow-50 text-yellow-600 border border-yellow-200 shrink-0">추정</span>
      )}
    </div>
  );
}

/** 미니 Factor 카드 (3x2 그리드용) */
function MiniFactorCard({ factor, onClick, isOpen }: { factor: FactorResult; onClick: () => void; isOpen: boolean }) {
  const s = FACTOR_STYLE[factor.key] ?? FACTOR_STYLE.ranking;
  const icon = FACTOR_ICON[factor.key] ?? "📋";
  const isBarrier = factor.key === "entryBarrier";
  const level = scoreLevel(factor.score, isBarrier);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all hover:shadow-sm ${
        isOpen ? s.bg + " border-gray-300 shadow-sm" : "bg-white border-gray-100 hover:border-gray-200"
      }`}
    >
      {/* 아이콘 + 라벨 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold text-gray-700">{s.label}</span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-gray-300 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
        >
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* 점수 + 게이지 바 */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xl font-black ${s.text}`}>{factor.score}</span>
        <span className="text-[10px] text-gray-400">/100</span>
        {factor.percentLabel && (
          <span className={`text-xs font-bold ${s.text} ml-auto`}>{factor.percentLabel}</span>
        )}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${factor.score}%`, backgroundColor: s.color }}
        />
      </div>

      {/* 레벨 뱃지 */}
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${level.color}`}>{level.label}</span>
        {FACTOR_DESC[factor.key] && (
          <span className="text-[10px] text-gray-300 truncate max-w-[100px]">{FACTOR_DESC[factor.key]}</span>
        )}
      </div>
    </button>
  );
}

export default function FactorScoreCard({ keyword, platform }: Props) {
  const [data, setData] = useState<FactorScoreSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/factor-score?keyword=${encodeURIComponent(keyword)}&platform=${platform}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [keyword, platform]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-100 rounded w-48" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-50 rounded-xl" />
            <div className="h-32 bg-gray-50 rounded-xl" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 bg-gray-50 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.factors?.length) return null;

  const openFactor = data.factors.find((f) => f.key === openKey);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-800">판매 성공 Factor 분석</span>
          <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
            platform === "naver" ? "bg-green-50 text-green-600 border border-green-200" : "bg-blue-50 text-blue-600 border border-blue-200"
          }`}>
            {platform === "naver" ? "스마트스토어" : "쿠팡"} 전용
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">내 키워드가 매출로 이어지려면 어떤 조건이 필요한지 보여줘요. 약한 지표를 집중 개선하면 성과가 달라집니다</p>
      </div>

      {/* ── 핵심 2대 지표: 도넛 게이지 ── */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* 상위 노출 가능성 */}
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-4 flex flex-col items-center">
          <p className="text-xs text-green-600 font-semibold mb-2">상위 노출 가능성</p>
          <div className="relative">
            <DonutGauge percent={data.rankingPercent} color="#22c55e" size={90} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-green-700">{data.rankingPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] text-green-500 mt-1">1페이지 진입 확률</p>
        </div>

        {/* 구매전환율 */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4 flex flex-col items-center">
          <p className="text-xs text-blue-600 font-semibold mb-2">구매전환율</p>
          <div className="relative">
            <DonutGauge percent={Math.min(data.conversionPercent * 7.4, 100)} color="#3b82f6" size={90} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-blue-700">{data.conversionPercent}%</span>
            </div>
          </div>
          <p className="text-[10px] text-blue-500 mt-1">방문자 대비 구매</p>
        </div>
      </div>

      {/* ── 6개 Factor 미니 카드 그리드 ── */}
      <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-300">
          <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        각 항목을 클릭하면 세부 분석과 전략 TIP을 확인할 수 있습니다
      </p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {data.factors.map((f) => (
          <MiniFactorCard
            key={f.key}
            factor={f}
            isOpen={openKey === f.key}
            onClick={() => setOpenKey(openKey === f.key ? null : f.key)}
          />
        ))}
      </div>

      {/* ── 펼침 상세 패널 (선택된 Factor) ── */}
      {openFactor && (
        <div className={`rounded-xl border p-4 mt-2 ${FACTOR_STYLE[openFactor.key]?.bg ?? "bg-gray-50"} border-gray-200`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">{FACTOR_ICON[openFactor.key]}</span>
            <span className="text-sm font-bold text-gray-800">{openFactor.label} 상세 분석</span>
          </div>

          {/* 세부 요소 */}
          <div className="space-y-0.5 mb-3">
            {openFactor.subfactors.map((sf) => (
              <SubFactorRow key={sf.name} sf={sf} />
            ))}
          </div>

          {/* 전략 TIP */}
          <div className="bg-white rounded-lg px-3 py-2.5 border border-gray-100">
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-green-600 mr-1">TIP</span>
              {openFactor.advice}
            </p>
          </div>

          {/* 측정 불가 팁 */}
          {openFactor.subfactors.filter((sf) => sf.tip).map((sf) => (
            <p key={sf.name} className="text-[11px] text-yellow-600 mt-1.5 leading-relaxed">
              <span className="font-bold mr-0.5">*</span> {sf.name}: {sf.tip}
            </p>
          ))}
        </div>
      )}

      {/* 면책 */}
      <p className="text-[10px] text-gray-300 text-center mt-4">
        * 확률은 키워드 데이터 기반 추정치이며, 실제 결과는 상품 품질·광고·시장 변화 등에 따라 다를 수 있습니다
      </p>
    </div>
  );
}
