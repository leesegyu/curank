"use client";

/**
 * 시즌 기회 키워드 추천 카드 — 2026-04-11 재설계
 *
 * 핵심 가치: 작년 12개월 곡선을 기반으로 "상승 초입(피크의 10~30%)" 키워드 추천.
 * 사용자가 시즌 피크가 오기 전에 미리 상품을 준비할 수 있도록 "남은 잠재력"과
 * "피크까지 몇 개월"을 시각적으로 표시.
 */

import { useEffect, useState } from "react";
import type { SeasonOpportunityResult } from "@/app/api/keywords-season-opportunity/route";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";
import { excludePureGenericModifiers } from "@/lib/keyword-shape";

interface Props {
  keyword: string;
  platform: string;
  preloadedData?: unknown[] | null;
}

function phaseBadge(phase: string) {
  if (phase === "rising") {
    return { text: "상승 초입", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  }
  if (phase === "rising_fast") {
    return { text: "급상승", color: "text-orange-700 bg-orange-50 border-orange-200" };
  }
  return { text: phase, color: "text-gray-500 bg-gray-50 border-gray-200" };
}

function seasonLabel(type: string): string {
  switch (type) {
    case "summer": return "🌞 여름";
    case "winter": return "❄️ 겨울";
    case "spring": return "🌸 봄";
    case "autumn": return "🍂 가을";
    default: return "연중";
  }
}

function monthName(m: number): string {
  return `${m}월`;
}

export default function KeywordRecommendationsSeasonOpportunity({ keyword, platform, preloadedData }: Props) {
  const [data, setData] = useState<SeasonOpportunityResult[]>((preloadedData as SeasonOpportunityResult[]) ?? []);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (preloadedData?.length) {
      setData(preloadedData as SeasonOpportunityResult[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/keywords-season-opportunity?keyword=${encodeURIComponent(keyword)}&platform=${platform === "coupang" ? "coupang" : "smartstore"}`)
      .then((r) => r.json())
      .then((json) => setData(json.keywords ?? []))
      .catch(() => setError("시즌 기회 데이터를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData, platform]);

  const filtered = excludePureGenericModifiers(data, keyword);
  const display = expanded ? filtered : filtered.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">시즌 기회 키워드</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
            >
              상승 초입
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || filtered.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">시즌 기회 키워드</span>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
            >
              상승 초입
            </span>
          </div>
        </div>
        <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 font-medium mb-1">
            지금은 상승 초입 키워드가 없어요
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            작년 데이터 기준 현재 시점에 피크의 10~30% 구간에서 상승 중인<br />
            시즌성 키워드가 없습니다. 시즌성이 약한 카테고리이거나,<br />
            이미 피크가 지나갔을 수 있어요.
          </p>
        </div>
      </div>
    );
  }

  const selected = selectedIdx !== null ? filtered[selectedIdx] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-700">시즌 기회 키워드</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            상승 초입
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          작년 패턴 기준 지금 상승 초입(피크의 10~30%)에 있는 시즌성 키워드예요.
          지금 준비하면 피크까지 최대 몇 %까지 기회가 남아있는지 확인할 수 있어요
        </p>
      </div>

      {/* 키워드 리스트 */}
      <div className="space-y-1.5">
        {display.map((kw, idx) => {
          const pBadge = phaseBadge(kw.phase);
          const isSelected = selectedIdx === idx;

          return (
            <div key={kw.keyword}>
              <div
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "border-orange-300 bg-orange-50/50"
                    : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                }`}
                onClick={() => setSelectedIdx(isSelected ? null : idx)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-xs font-bold text-orange-500 w-5 shrink-0">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AnalyzeKeywordLink keyword={kw.keyword} platform={platform}>
                        <p className="text-sm font-bold text-gray-800 truncate group-hover:text-orange-700 transition-colors">
                          {kw.keyword}
                        </p>
                      </AnalyzeKeywordLink>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pBadge.color}`}>
                        {pBadge.text}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {seasonLabel(kw.seasonType)} · {monthName(kw.peakMonth)} 피크까지{" "}
                      <span className="font-bold text-orange-600">{kw.monthsToPeak}개월</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 현재 위치 게이지 */}
                  <div className="w-16 hidden sm:block">
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${kw.currentPercentOfPeak}%`,
                          background: "linear-gradient(90deg, #10b981, #f59e0b)",
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 text-center mt-0.5">
                      현재 {kw.currentPercentOfPeak}%
                    </p>
                  </div>
                  {/* 잠재력 */}
                  <div className="text-right px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-[9px] text-emerald-600 font-bold">잠재</p>
                    <p className="text-sm font-black text-emerald-700 tabular-nums">+{kw.upsidePercent}%</p>
                  </div>
                </div>
              </div>

              {/* 확장: 12개월 곡선 + 조언 */}
              {isSelected && selected && (
                <div className="mx-4 mt-1 mb-2 p-4 bg-orange-50/50 rounded-lg border border-orange-100">
                  {/* 월별 막대 차트 (12개월) */}
                  <MonthlyBarChart kw={selected} />
                  {/* 조언 */}
                  <p className="text-[11px] text-gray-700 leading-relaxed mt-3">
                    {kw.advice}
                  </p>
                  {/* 추가 정보 */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                    <span>시즌성 지수: <span className="font-bold text-gray-700">{kw.seasonality.toFixed(2)}</span></span>
                    {kw.monthlyVolume > 0 && (
                      <span>월검색량: <span className="font-bold text-gray-700">{kw.monthlyVolume.toLocaleString()}</span></span>
                    )}
                    <span>경쟁도: <span className="font-bold text-gray-700">{kw.competitionLevel}</span></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 푸터 */}
      {filtered.length > 3 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            작년 월별 데이터 · 현재 피크의 {filtered[0]?.currentPercentOfPeak ?? 0}% 구간
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                downloadCSV(
                  filtered.map((kw) => ({
                    키워드: kw.keyword,
                    Phase: kw.phase,
                    "현재%_피크대비": kw.currentPercentOfPeak,
                    "피크월": kw.peakMonth,
                    "피크까지(월)": kw.monthsToPeak,
                    "잠재력(%)": kw.upsidePercent,
                    시즌타입: kw.seasonType,
                    시즌성: kw.seasonality,
                  })),
                  `${keyword}_시즌기회`,
                )
              }
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              CSV
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {expanded ? "접기" : `전체보기 (${filtered.length}개)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 12개월 막대 차트 — API에서 받은 monthlyRatios 실데이터 사용
 * 현재 월은 emerald, 피크 월은 orange, 나머지는 gray
 */
function MonthlyBarChart({ kw }: { kw: SeasonOpportunityResult }) {
  const peakMonth = kw.peakMonth;
  const currentMonth = new Date().getMonth() + 1;
  const ratios = kw.monthlyRatios ?? [];

  // 월별 맵 (없으면 0)
  const byMonth = new Map(ratios.map((r) => [r.month, r.ratio]));

  return (
    <div>
      <p className="text-[10px] text-gray-500 mb-2 font-medium">
        작년 월별 검색량 (100 = 연중 피크)
      </p>
      <div className="flex items-end justify-between gap-0.5 h-16 px-1">
        {Array.from({ length: 12 }).map((_, i) => {
          const m = i + 1;
          const isPeak = m === peakMonth;
          const isCurrent = m === currentMonth;
          const h = byMonth.get(m) ?? 0;

          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className={`w-full rounded-t transition-all ${isCurrent ? "ring-1 ring-emerald-500" : ""}`}
                  style={{
                    height: `${Math.max(3, h)}%`,
                    background: isPeak
                      ? "#f59e0b"
                      : isCurrent
                      ? "#10b981"
                      : "#d1d5db",
                  }}
                  title={`${m}월: ${h.toFixed(1)}`}
                />
              </div>
              <span
                className={`text-[8px] ${
                  isCurrent
                    ? "text-emerald-600 font-bold"
                    : isPeak
                    ? "text-orange-600 font-bold"
                    : "text-gray-400"
                }`}
              >
                {m}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-gray-400 mt-1 px-1">
        <span>
          <span className="inline-block w-2 h-2 bg-emerald-500 rounded-sm mr-1" />
          현재 {currentMonth}월 ({kw.currentPercentOfPeak}%)
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-orange-500 rounded-sm mr-1" />
          피크 {peakMonth}월
        </span>
      </div>
    </div>
  );
}
