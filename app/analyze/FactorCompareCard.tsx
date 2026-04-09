"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { FactorScoreSet, FactorDelta } from "@/lib/factor-model";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";

interface Props {
  mainKeyword: string;
  recommendations: { keyword: string; score: number }[];
  platform: string;
}

interface CompareResult {
  altKeyword: string;
  mainFactors: FactorScoreSet;
  altFactors: FactorScoreSet;
  deltas: FactorDelta[];
}

const MAX_CUSTOM_SEARCHES = 5;

const DELTA_COLOR = (d: number, invert = false) => {
  const v = invert ? -d : d;
  if (v > 3) return "text-green-600";
  if (v < -3) return "text-red-500";
  return "text-gray-400";
};

const DELTA_ARROW = (d: number, invert = false) => {
  const v = invert ? -d : d;
  if (v > 3) return "↑";
  if (v < -3) return "↓";
  return "→";
};

const FACTOR_LABELS: Record<string, string> = {
  ranking: "상위 노출",
  conversion: "구매전환",
  growth: "시장 성장",
  profitability: "수익성",
  entryBarrier: "진입 난이도",
  crossPlatform: "플랫폼 기회",
};

export default function FactorCompareCard({ mainKeyword, recommendations: initialRecs, platform }: Props) {
  const [mainFactors, setMainFactors] = useState<FactorScoreSet | null>(null);
  const [recommendations, setRecommendations] = useState(initialRecs);
  const [selected, setSelected] = useState<CompareResult | null>(null);
  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingAlt, setLoadingAlt] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customCount, setCustomCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoadingMain(true);
    fetch(`/api/factor-score?keyword=${encodeURIComponent(mainKeyword)}&platform=${platform}`)
      .then((r) => r.json())
      .then((d) => setMainFactors(d))
      .catch(() => {})
      .finally(() => setLoadingMain(false));

    // recommendations가 비어있으면 v2 API에서 자체 로드
    if (initialRecs.length === 0) {
      fetch(`/api/keywords-v2?keyword=${encodeURIComponent(mainKeyword)}`)
        .then((r) => r.json())
        .then((d) => {
          const kws = (d.keywords ?? []).slice(0, 5).map((k: { keyword: string; score: number }) => ({
            keyword: k.keyword,
            score: k.score,
          }));
          setRecommendations(kws);
        })
        .catch(() => {});
    }
  }, [mainKeyword, platform, initialRecs.length]);

  const analyze = useCallback(async (kw: string) => {
    if (!mainFactors || !kw.trim()) return;
    setLoadingAlt(true);
    try {
      const res = await fetch(`/api/factor-score?keyword=${encodeURIComponent(kw.trim())}&platform=${platform}`);
      const altFactors: FactorScoreSet = await res.json();
      const deltas: FactorDelta[] = mainFactors.factors.map((mf) => {
        const af = altFactors.factors.find((f) => f.key === mf.key)!;
        return {
          key: mf.key, label: mf.label,
          mainScore: mf.score, altScore: af.score, delta: af.score - mf.score,
          mainPercent: mf.percent, altPercent: af.percent,
          deltaPercent: mf.percent != null && af.percent != null ? af.percent - mf.percent : undefined,
        };
      });
      setSelected({ altKeyword: kw.trim(), mainFactors, altFactors, deltas });
    } catch {
      setSelected(null);
    } finally {
      setLoadingAlt(false);
    }
  }, [mainFactors, platform]);

  const handleCustomSearch = () => {
    if (customCount >= MAX_CUSTOM_SEARCHES || !customInput.trim()) return;
    setCustomCount((c) => c + 1);
    analyze(customInput.trim());
    setCustomInput("");
  };

  if (loadingMain || !mainFactors || recommendations.length === 0) return null;

  const visibleCount = showAll ? 10 : 5;
  const visibleRecs = recommendations.slice(0, visibleCount);
  const hasMore = recommendations.length > visibleCount;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-4">
      {/* ── 헤더 ── */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-black text-gray-800">추천 키워드 효과 비교</span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-medium">
            Factor 변화 예측
          </span>
        </div>
        <p className="text-xs text-gray-400">
          추천 키워드를 클릭하거나, 직접 키워드를 입력하여 6개 Factor 변화를 비교할 수 있습니다.
        </p>
      </div>

      {/* ── 추천 키워드 버튼 ── */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {visibleRecs.map((kw) => (
          <button
            key={kw.keyword}
            type="button"
            onClick={() => analyze(kw.keyword)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
              selected?.altKeyword === kw.keyword
                ? "bg-indigo-600 text-white border-indigo-600 font-bold"
                : "bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-200"
            }`}
          >
            {kw.keyword}
          </button>
        ))}
        {!showAll && hasMore && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 transition-all"
          >
            +{Math.min(recommendations.length, 10) - visibleCount}개 더보기
          </button>
        )}
      </div>

      {/* ── 직접 입력 검색창 ── */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) handleCustomSearch(); }}
            placeholder="직접 키워드를 입력해보세요 (예: 에어팟 프로 2세대 케이스)"
            disabled={customCount >= MAX_CUSTOM_SEARCHES}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none bg-white placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-300"
          />
          <button
            type="button"
            onClick={handleCustomSearch}
            disabled={customCount >= MAX_CUSTOM_SEARCHES || !customInput.trim() || loadingAlt}
            className="px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)" }}
          >
            비교
          </button>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">
          직접 입력 {customCount}/{MAX_CUSTOM_SEARCHES}회 사용
          {customCount >= MAX_CUSTOM_SEARCHES && " — 더 비교하려면 페이지를 새로고침하세요"}
        </p>
      </div>

      {/* ── 로딩 ── */}
      {loadingAlt && (
        <div className="animate-pulse space-y-2 py-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-50 rounded-lg" />)}
        </div>
      )}

      {/* ── 비교 결과 ── */}
      {selected && !loadingAlt && (
        <div>
          {/* 비교 대상 표시 */}
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 font-medium">{mainKeyword}</span>
            <span className="text-gray-300 font-bold">vs</span>
            <span className="px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold">{selected.altKeyword}</span>
          </div>

          {/* 핵심 수치 변화 */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-center">
              <p className="text-[11px] text-green-600 font-semibold mb-1">상위 노출 가능성</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold text-gray-400">{selected.mainFactors.rankingPercent}%</span>
                <span className="text-green-600 font-black">→</span>
                <span className="text-xl font-black text-green-700">{selected.altFactors.rankingPercent}%</span>
              </div>
              {selected.deltas.find(d => d.key === "ranking")?.deltaPercent != null && (
                <span className={`text-xs font-bold ${DELTA_COLOR(selected.deltas.find(d => d.key === "ranking")!.deltaPercent!)}`}>
                  {selected.deltas.find(d => d.key === "ranking")!.deltaPercent! > 0 ? "+" : ""}
                  {selected.deltas.find(d => d.key === "ranking")!.deltaPercent!}%p
                </span>
              )}
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
              <p className="text-[11px] text-blue-600 font-semibold mb-1">구매전환율</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-bold text-gray-400">{selected.mainFactors.conversionPercent}%</span>
                <span className="text-blue-600 font-black">→</span>
                <span className="text-xl font-black text-blue-700">{selected.altFactors.conversionPercent}%</span>
              </div>
              {selected.deltas.find(d => d.key === "conversion")?.deltaPercent != null && (
                <span className={`text-xs font-bold ${DELTA_COLOR(selected.deltas.find(d => d.key === "conversion")!.deltaPercent!)}`}>
                  {selected.deltas.find(d => d.key === "conversion")!.deltaPercent! > 0 ? "+" : ""}
                  {selected.deltas.find(d => d.key === "conversion")!.deltaPercent!}%p
                </span>
              )}
            </div>
          </div>

          {/* 6개 Factor 비교 테이블 */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Factor</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-400 w-16">현재</th>
                  <th className="text-center py-2 px-3 w-8" />
                  <th className="text-center py-2 px-3 font-medium text-indigo-600 w-16">비교</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-500 w-16">변화</th>
                </tr>
              </thead>
              <tbody>
                {selected.deltas.map((d) => {
                  const isBarrier = d.key === "entryBarrier";
                  return (
                    <tr key={d.key} className="border-t border-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-700">{FACTOR_LABELS[d.key] ?? d.label}</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-500">{d.mainScore}</td>
                      <td className="py-2 px-3 text-center text-gray-300">→</td>
                      <td className="py-2 px-3 text-center font-bold text-gray-900">{d.altScore}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`font-bold ${DELTA_COLOR(d.delta, isBarrier)}`}>
                          {DELTA_ARROW(d.delta, isBarrier)} {d.delta > 0 ? "+" : ""}{d.delta}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 요약 */}
          {(() => {
            const ranking = selected.deltas.find(d => d.key === "ranking")!;
            const conversion = selected.deltas.find(d => d.key === "conversion")!;
            const barrier = selected.deltas.find(d => d.key === "entryBarrier")!;
            const benefits: string[] = [];
            if (ranking.delta > 3) benefits.push(`상위 노출 가능성이 ${ranking.deltaPercent ?? ranking.delta}%p 상승`);
            if (conversion.delta > 3) benefits.push(`구매전환율이 ${conversion.deltaPercent ?? conversion.delta}%p 상승`);
            if (barrier.delta < -3) benefits.push(`진입 난이도가 ${Math.abs(barrier.delta)}점 낮아짐`);
            const downsides: string[] = [];
            if (ranking.delta < -3) downsides.push(`상위 노출 가능성이 ${Math.abs(ranking.deltaPercent ?? ranking.delta)}%p 하락`);
            if (conversion.delta < -3) downsides.push(`구매전환율이 ${Math.abs(conversion.deltaPercent ?? conversion.delta)}%p 하락`);

            if (benefits.length === 0 && downsides.length === 0) return null;

            return (
              <div className="mt-3 rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
                <p className="text-xs font-bold text-indigo-700 mb-1">
                  &ldquo;{selected.altKeyword}&rdquo; 키워드 효과 요약
                </p>
                {benefits.length > 0 && (
                  <ul className="space-y-0.5 mb-1">
                    {benefits.map((b, i) => (
                      <li key={i} className="text-xs text-green-600 flex items-center gap-1.5">
                        <span className="font-bold">+</span> {b}
                      </li>
                    ))}
                  </ul>
                )}
                {downsides.length > 0 && (
                  <ul className="space-y-0.5">
                    {downsides.map((b, i) => (
                      <li key={i} className="text-xs text-red-500 flex items-center gap-1.5">
                        <span className="font-bold">-</span> {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}

          {/* CTA */}
          <div className="mt-3 text-center">
            <AnalyzeKeywordLink
              keyword={selected.altKeyword}
              platform={platform}
              className="inline-block text-xs font-bold text-indigo-600 hover:text-indigo-700 underline"
            >
              &ldquo;{selected.altKeyword}&rdquo; 전체 분석 보기 →
            </AnalyzeKeywordLink>
          </div>
        </div>
      )}

      {/* 선택 전 안내 */}
      {!selected && !loadingAlt && (
        <div className="text-center py-4 text-gray-300">
          <p className="text-sm">추천 키워드를 클릭하거나 직접 입력하면</p>
          <p className="text-sm">현재 키워드 대비 Factor 변화를 비교합니다</p>
        </div>
      )}
    </div>
  );
}
