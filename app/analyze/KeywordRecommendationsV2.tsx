"use client";

import { useEffect, useState } from "react";
import type { KeywordV2 } from "@/app/api/keywords-v2/route";
import { trackEventClient } from "@/lib/events";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";
import { excludePureGenericModifiers } from "@/lib/keyword-shape";

async function trackExpose(queryKeyword: string, keywords: { keyword: string }[], modelVersion: string) {
  fetch("/api/rl/expose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      queryKeyword,
      candidates: keywords.slice(0, 5).map((k, i) => ({ keyword: k.keyword, rank: i + 1 })),
      modelVersion,
    }),
    keepalive: true,
  }).catch(() => {});
}

// ── 공통 UI ──────────────────────────────────────────────

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-6 text-right tabular-nums">{value}</span>
    </div>
  );
}

function TotalBadge({ score }: { score: number }) {
  if (score >= 800)
    return <span className="text-xs font-black px-2 py-0.5 rounded-full text-white tabular-nums" style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)", minWidth: 44, display: "inline-block", textAlign: "center" }}>{score}</span>;
  if (score >= 400)
    return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 tabular-nums" style={{ minWidth: 44, display: "inline-block", textAlign: "center" }}>{score}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 tabular-nums" style={{ minWidth: 44, display: "inline-block", textAlign: "center" }}>{score}</span>;
}

const COMP_COLOR: Record<string, string> = { "낮음": "text-green-600", "보통": "text-yellow-600", "높음": "text-orange-500", "매우 높음": "text-red-500" };
const TREND_ICON: Record<string, string> = { "상승": "↑", "하락": "↓", "안정": "→" };
const TREND_COLOR: Record<string, string> = { "상승": "text-green-500", "하락": "text-red-400", "안정": "text-gray-400" };

function KeywordCell({ kw, keyword, platform, index }: { kw: KeywordV2; keyword: string; platform: string; index: number }) {
  return (
    <td className="py-2.5 px-2">
      <AnalyzeKeywordLink
        keyword={kw.keyword}
        platform={platform}
        className="text-sm font-medium text-gray-800 hover:text-indigo-700 block"
      >
        {kw.keyword}
      </AnalyzeKeywordLink>
      <VolumeText kw={kw} />
    </td>
  );
}

function VolumeText({ kw }: { kw: KeywordV2 }) {
  if (kw.monthlyVolume > 0) {
    return (
      <span className={`text-[10px] tabular-nums ${kw.volumeConfirmed ? "text-gray-400" : "text-yellow-500"}`}>
        {!kw.volumeConfirmed && "추정 "}월 {kw.monthlyVolume >= 10000 ? `${(kw.monthlyVolume / 10000).toFixed(1)}만` : Math.round(kw.monthlyVolume).toLocaleString()}회
      </span>
    );
  }
  return <span className="text-[10px] text-gray-400">검색량미확인</span>;
}

/** 2줄 칼럼 헤더: 제목 + subtitle 상시 표시 */
function ColHeader({ label, sub, align = "left", className = "" }: { label: string; sub: string; align?: "left" | "center" | "right"; className?: string }) {
  return (
    <th className={`py-2 px-2 text-${align} ${className}`}>
      <span className="text-xs text-gray-600 font-bold block">{label}</span>
      <span className="text-[10px] text-gray-400 font-normal block leading-tight">{sub}</span>
    </th>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────

export default function KeywordRecommendationsV2({ keyword, platform = "naver", preloadedData }: { keyword: string; platform?: string; preloadedData?: unknown[] | null }) {
  const [data, setData] = useState<KeywordV2[]>((preloadedData as KeywordV2[]) ?? []);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState(false);
  const [expandedA, setExpandedA] = useState(false);
  const [expandedB, setExpandedB] = useState(false);

  useEffect(() => {
    if (preloadedData?.length) {
      setData(preloadedData as KeywordV2[]);
      setLoading(false);
      trackExpose(keyword, preloadedData as KeywordV2[], "v2");
      return;
    }
    setLoading(true);
    setError(false);
    fetch(`/api/keywords-v2?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.keywords) {
          setData(json.keywords);
          trackExpose(keyword, json.keywords, "v2");
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-11 bg-gray-100 rounded-xl animate-pulse" />
          ))}
          <p className="text-xs text-center text-gray-400 mt-2">상위 상품 분석 + 검색량 조회 중... 잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) return <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-sm text-gray-400 text-center py-4">데이터를 불러오지 못했습니다.</p></div>;

  // 범용 수식어 조합만 제외 ("수박 추천", "수박 가성비" 등)
  // 도메인 가치 있는 longtail("국내산 수박", "수박 1kg", "수박 선물세트")은 유지
  const filtered = excludePureGenericModifiers(data, keyword);

  if (filtered.length === 0) return <div className="bg-white rounded-2xl border border-gray-100 p-5"><p className="text-sm text-gray-400 text-center py-4">추천 키워드가 없습니다.</p></div>;

  // 기회 분석: 기회발굴/구매의도/연관도 3개 팩터 종합점수
  const calcOpportunityScore = (kw: KeywordV2) =>
    Math.round((kw.scoreChance * 0.45 + kw.scoreIntent * 0.30 + kw.scoreRelation * 0.25) * 10);

  const allOpportunity = [...filtered]
    .map((kw) => ({ ...kw, _oppScore: calcOpportunityScore(kw) }))
    .sort((a, b) => b._oppScore - a._oppScore);

  const opportunityRanked = expandedA ? allOpportunity.slice(0, 30) : allOpportunity.slice(0, 5);

  // AI 심층 비교: 수요/의도/구체성/성장률/진입/연관도 6개 팩터 종합점수
  const calcDeepScore = (kw: KeywordV2) =>
    Math.round((kw.scoreDemand * 0.20 + kw.scoreIntent * 0.25 + kw.scoreSpecificity * 0.15
      + kw.scoreGrowth * 0.15 + kw.scorePenetrability * 0.15 + kw.scoreRelation * 0.10) * 10);

  const allDeep = [...filtered]
    .map((kw) => ({ ...kw, _deepScore: calcDeepScore(kw) }))
    .sort((a, b) => b._deepScore - a._deepScore);

  const deepPreview = expandedB ? allDeep.slice(0, 30) : allDeep.slice(0, 5);

  const kwParam = encodeURIComponent(keyword);

  return (
    <div className="space-y-4">
      {/* ═══ A: 기회 분석 ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-700">기회 분석</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)" }}>AI</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          종합점수가 높은 키워드부터 도전하세요. 검색 수요가 있으면서 경쟁이 적은 키워드가 가장 좋은 기회예요
        </p>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <ColHeader label="키워드" sub="클릭하면 분석" className="w-44" />
                <ColHeader label="종합" sub="기회 점수" align="center" className="w-14" />
                <ColHeader label="기회 발굴" sub="새로운 수요 선점 가능성" className="w-28" />
                <ColHeader label="구매 의도" sub="실제 구매로 이어지는 비율" className="w-28" />
                <ColHeader label="연관도" sub="분석 키워드와의 관련성" className="w-28" />
              </tr>
            </thead>
            <tbody>
              {opportunityRanked.map((kw, i) => (
                <tr key={kw.keyword} className="border-b border-gray-50 hover:bg-indigo-50/50 transition-colors">
                  <KeywordCell kw={kw} keyword={keyword} platform={platform} index={i} />
                  <td className="py-2.5 px-2 text-center"><TotalBadge score={kw._oppScore} /></td>
                  <td className="py-2.5 px-2"><ScoreBar value={kw.scoreChance} color="bg-purple-500" /></td>
                  <td className="py-2.5 px-2"><ScoreBar value={kw.scoreIntent} color="bg-violet-400" /></td>
                  <td className="py-2.5 px-2"><ScoreBar value={kw.scoreRelation} color="bg-teal-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 px-1">
          <button
            onClick={() => downloadCSV(allOpportunity.map(kw => ({ 키워드: kw.keyword, 종합: kw._oppScore, 기회발굴: kw.scoreChance, 구매의도: kw.scoreIntent, 연관도: kw.scoreRelation })), `${keyword}_기회분석`)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            CSV
          </button>
          {data.length > 5 && (
            <button
              onClick={() => setExpandedA(!expandedA)}
              className="text-xs font-bold text-indigo-500 hover:text-indigo-700"
            >
              {expandedA ? "접기 ↑" : `전체보기 (${Math.min(data.length, 30)}) ↓`}
            </button>
          )}
        </div>
      </div>

      {/* ═══ B: AI 심층 비교 ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-700">AI 심층 비교</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "linear-gradient(135deg, #3b82f6, #06b6d4)" }}>AI</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          어떤 키워드가 검색도 많고, 구매 전환도 높고, 아직 성장 중인지 한눈에 비교할 수 있어요
        </p>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <ColHeader label="키워드" sub="클릭하면 분석" className="w-44" />
                <ColHeader label="종합" sub="심층 점수" align="center" className="w-14" />
                <ColHeader label="수요" sub="검색 빈도" className="w-20" />
                <ColHeader label="의도" sub="구매 전환" className="w-20" />
                <ColHeader label="구체성" sub="키워드 길이/구체적" className="w-20" />
                <ColHeader label="성장률" sub="검색량 증가 추세" className="w-20" />
                <ColHeader label="진입" sub="경쟁 적은 정도" className="w-20" />
                <ColHeader label="연관도" sub="키워드 관련성" className="w-20" />
                <ColHeader label="검색량" sub="월간" align="right" className="w-16" />
              </tr>
            </thead>
            <tbody>
              {deepPreview.map((kw, i) => (
                <tr key={kw.keyword} className="border-b border-gray-50 hover:bg-blue-50/50 transition-colors">
                  <KeywordCell kw={kw} keyword={keyword} platform={platform} index={i} />
                  <td className="py-2 px-1 text-center"><TotalBadge score={kw._deepScore} /></td>
                  <td className="py-2 px-1"><ScoreBar value={kw.scoreDemand} color="bg-blue-400" /></td>
                  <td className="py-2 px-1"><ScoreBar value={kw.scoreIntent} color="bg-violet-400" /></td>
                  <td className="py-2 px-1"><ScoreBar value={kw.scoreSpecificity} color="bg-amber-400" /></td>
                  <td className="py-2 px-1"><ScoreBar value={kw.scoreGrowth} color="bg-green-400" /></td>
                  <td className="py-2 px-1"><ScoreBar value={kw.scorePenetrability} color="bg-pink-400" /></td>
                  <td className="py-2 px-1"><ScoreBar value={kw.scoreRelation} color="bg-teal-400" /></td>
                  <td className="py-2 px-1 text-right"><VolumeText kw={kw} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 px-1">
          <button
            onClick={() => downloadCSV(allDeep.map(kw => ({ 키워드: kw.keyword, 종합: kw._deepScore, 수요: kw.scoreDemand, 의도: kw.scoreIntent, 구체성: kw.scoreSpecificity, 성장률: kw.scoreGrowth, 진입: kw.scorePenetrability, 연관도: kw.scoreRelation, 월간검색량: kw.monthlyVolume ?? "" })), `${keyword}_AI심층비교`)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            CSV
          </button>
          {data.length > 5 && (
            <button
              onClick={() => setExpandedB(!expandedB)}
              className="text-xs font-bold text-blue-500 hover:text-blue-700"
            >
              {expandedB ? "접기 ↑" : `전체보기 (${Math.min(data.length, 30)}) ↓`}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

// ── 판매 성공 지표 (STEP 4용 독립 컴포넌트) ──────────────────

export function FactorPredictionCard({ keyword, platform = "naver", preloadedData }: { keyword: string; platform?: string; preloadedData?: unknown[] | null }) {
  const [data, setData] = useState<KeywordV2[]>((preloadedData as KeywordV2[]) ?? []);
  const [loading, setLoading] = useState(!preloadedData);
  const [expandedF, setExpandedF] = useState(false);

  useEffect(() => {
    if (preloadedData?.length) {
      setData(preloadedData as KeywordV2[]);
      setLoading(false);
      return;
    }
    fetch(`/api/keywords-v2?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => { if (json.keywords) setData(json.keywords); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-11 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) return null;

  const calcDeepScore = (kw: KeywordV2) =>
    Math.round((kw.scoreDemand * 0.20 + kw.scoreIntent * 0.25 + kw.scoreSpecificity * 0.15
      + kw.scoreGrowth * 0.15 + kw.scorePenetrability * 0.15 + kw.scoreRelation * 0.10) * 10);

  const allSorted = [...data]
    .map((kw) => ({ ...kw, _deepScore: calcDeepScore(kw) }))
    .sort((a, b) => b._deepScore - a._deepScore);

  // 행당 factor-score API 1회 호출 → 최대 10개로 제한
  const preview = expandedF ? allSorted.slice(0, 10) : allSorted.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-gray-700">판매 성공 지표</span>
        <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 font-medium">6 Factor</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        이 키워드로 상품을 등록하면 상위에 뜰 수 있는지, 마진은 남는지, 시장은 커지고 있는지를 미리 예측해줘요
      </p>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <ColHeader label="키워드" sub="클릭하면 분석" className="w-44" />
              <ColHeader label="노출" sub="검색 상위 노출 가능성" className="w-20" />
              <ColHeader label="전환율" sub="본 사람 중 구매 비율" className="w-20" />
              <ColHeader label="성장성" sub="시장이 커질 가능성" className="w-20" />
              <ColHeader label="수익성" sub="마진을 남길 여유" className="w-20" />
              <ColHeader label="진입 난이도" sub="낮을수록 진입 쉬움" className="w-20" />
              <ColHeader label="크로스" sub="타 플랫폼 판매 기회" className="w-20" />
            </tr>
          </thead>
          <tbody>
            {preview.map((kw, i) => (
              <FactorRow key={kw.keyword} kw={kw} keyword={keyword} platform={platform} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 px-1">
        {data.length > 5 && (
          <button
            onClick={() => setExpandedF(!expandedF)}
            className="text-xs font-bold text-amber-600 hover:text-amber-700"
          >
            {expandedF ? "접기 ↑" : `전체보기 (10) ↓`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── C섹션: 개별 키워드의 6 Factor 점수 행 ──────────────────

function FactorRow({ kw, keyword, platform, index }: { kw: KeywordV2; keyword: string; platform: string; index: number }) {
  const [factors, setFactors] = useState<{ key: string; score: number }[] | null>(null);

  useEffect(() => {
    fetch(`/api/factor-score?keyword=${encodeURIComponent(kw.keyword)}&platform=${platform}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.factors) setFactors(d.factors);
      })
      .catch(() => {});
  }, [kw.keyword, platform]);

  const getScore = (key: string) => factors?.find((f) => f.key === key)?.score ?? -1;
  const factorKeys = ["ranking", "conversion", "growth", "profitability", "entryBarrier", "crossPlatform"];
  const factorColors = ["bg-green-400", "bg-blue-400", "bg-purple-400", "bg-amber-400", "bg-red-400", "bg-indigo-400"];

  return (
    <tr className="border-b border-gray-50 hover:bg-amber-50/50 transition-colors">
      <KeywordCell kw={kw} keyword={keyword} platform={platform} index={index} />
      {factorKeys.map((key, fi) => (
        <td key={key} className="py-2 px-1">
          {factors === null ? (
            <div className="w-14 h-1.5 bg-gray-100 rounded-full animate-pulse" />
          ) : getScore(key) >= 0 ? (
            <ScoreBar value={getScore(key)} color={factorColors[fi]} />
          ) : (
            <span className="text-[10px] text-gray-300">-</span>
          )}
        </td>
      ))}
    </tr>
  );
}
