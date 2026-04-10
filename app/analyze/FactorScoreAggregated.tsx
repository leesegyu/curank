"use client";

import { useEffect, useMemo, useState } from "react";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { dedupeByTokens } from "@/lib/keyword-shape";

/**
 * STEP 3 추천 카드들의 top 키워드를 6개 Factor로 종합 비교하는 카드
 *
 * 동작:
 * 1. 각 카드 preloadedData에서 상위 키워드 추출
 * 2. 시드 키워드 포함 (baseline)
 * 3. 중복 제거
 * 4. /api/factor-score-batch 호출
 * 5. 종합 점수 내림차순 정렬
 */

interface FactorResult {
  key: string;
  label: string;
  score: number;
  percent?: number;
  percentLabel?: string;
}

interface FactorScoreSet {
  platform: string;
  keyword: string;
  factors: FactorResult[];
  rankingPercent: number;
  conversionPercent: number;
}

interface Props {
  keyword: string;          // 시드 키워드
  platform?: string;
  sources: {
    v2?: unknown[] | null;
    creative?: unknown[] | null;
    graph?: unknown[] | null;
    sos?: unknown[] | null;
    variant?: unknown | null;  // { keywords?: [{keyword}] }
    modifiers?: Array<{ keyword: string }>; // 수식어 카드 결과 (옵션)
  };
}

interface CandidateWithSource {
  keyword: string;
  source: string;
}

/** 각 카드에서 상위 키워드 N개씩 추출 */
function collectCandidates(props: Props): CandidateWithSource[] {
  const { keyword, sources } = props;
  const candidates: CandidateWithSource[] = [];

  // 1) 시드 키워드 (baseline)
  candidates.push({ keyword, source: "seed" });

  // 2) V2 상위 3개
  if (Array.isArray(sources.v2)) {
    const top = sources.v2
      .slice(0, 10)
      .map((raw) => raw as { keyword?: string; score?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
    for (const kw of top) candidates.push({ keyword: kw.keyword!, source: "기회분석" });
  }

  // 3) Creative 상위 3개
  if (Array.isArray(sources.creative)) {
    const top = sources.creative
      .slice(0, 10)
      .map((raw) => raw as { keyword?: string; score?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 3);
    for (const kw of top) candidates.push({ keyword: kw.keyword!, source: "크리에이티브" });
  }

  // 4) Graph 상위 2개
  if (Array.isArray(sources.graph)) {
    const top = sources.graph
      .slice(0, 10)
      .map((raw) => raw as { keyword?: string; similarity?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 2);
    for (const kw of top) candidates.push({ keyword: kw.keyword!, source: "연관" });
  }

  // 5) SOS 상위 2개
  if (Array.isArray(sources.sos)) {
    const top = sources.sos
      .slice(0, 10)
      .map((raw) => raw as { keyword?: string; sosScore?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.sosScore ?? 0) - (a.sosScore ?? 0))
      .slice(0, 2);
    for (const kw of top) candidates.push({ keyword: kw.keyword!, source: "시즌" });
  }

  // 6) Variant 상위 2개
  if (sources.variant && typeof sources.variant === "object") {
    const v = sources.variant as { keywords?: Array<{ keyword: string }> };
    if (Array.isArray(v.keywords)) {
      const top = v.keywords.slice(0, 2);
      for (const kw of top) candidates.push({ keyword: kw.keyword, source: "세부유형" });
    }
  }

  // 7) Modifiers 상위 2개
  if (Array.isArray(sources.modifiers)) {
    const top = sources.modifiers.slice(0, 2);
    for (const kw of top) candidates.push({ keyword: kw.keyword, source: "수식어" });
  }

  // 중복 제거 (어순 무관) — 시드 우선 유지
  const seenKeys = new Set<string>();
  const deduped: CandidateWithSource[] = [];
  for (const c of candidates) {
    const key = c.keyword.trim().toLowerCase().split(/\s+/).sort().join(" ");
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(c);
    }
  }
  return deduped.slice(0, 12); // 최대 12개 (API 제한)
}

/** 6 Factor 평균으로 종합 점수 계산 (0~100) */
function overallScore(result: FactorScoreSet): number {
  if (!result.factors || result.factors.length === 0) return 0;
  const sum = result.factors.reduce((acc, f) => acc + (f.score ?? 0), 0);
  return Math.round(sum / result.factors.length);
}

const SOURCE_COLORS: Record<string, string> = {
  seed: "bg-gray-100 text-gray-600",
  기회분석: "bg-indigo-50 text-indigo-600",
  크리에이티브: "bg-pink-50 text-pink-600",
  연관: "bg-teal-50 text-teal-600",
  시즌: "bg-orange-50 text-orange-600",
  세부유형: "bg-violet-50 text-violet-600",
  수식어: "bg-blue-50 text-blue-600",
};

function ScoreBar({ value }: { value: number }) {
  const color = value >= 70 ? "bg-green-500" : value >= 45 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 w-6 text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function FactorScoreAggregated(props: Props) {
  const { keyword, platform = "naver" } = props;
  const [results, setResults] = useState<Map<string, FactorScoreSet>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const candidates = useMemo(() => collectCandidates(props), [props]);

  useEffect(() => {
    if (candidates.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    const keywordList = candidates.map((c) => c.keyword).join(",");
    fetch(`/api/factor-score-batch?keywords=${encodeURIComponent(keywordList)}&platform=${platform}`)
      .then((r) => r.json())
      .then((json: { results?: FactorScoreSet[] }) => {
        if (!json.results) {
          setError(true);
          return;
        }
        const map = new Map<string, FactorScoreSet>();
        for (const r of json.results) {
          map.set(r.keyword, r);
        }
        setResults(map);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [candidates, platform]);

  // 정렬된 결과
  const sorted = useMemo(() => {
    return candidates
      .map((c) => ({
        candidate: c,
        result: results.get(c.keyword),
      }))
      .filter((item) => !!item.result)
      .map((item) => ({
        ...item,
        score: overallScore(item.result!),
      }))
      .sort((a, b) => b.score - a.score);
  }, [candidates, results]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
          <p className="text-xs text-center text-gray-400 mt-2">
            추천 키워드 {candidates.length}개 종합 비교 중... (약 10초)
          </p>
        </div>
      </div>
    );
  }

  if (error || sorted.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm text-gray-400 text-center py-4">
          종합 비교 데이터를 불러오지 못했습니다
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-gray-700">최종 후보 비교</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}>
          AI
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        STEP 3에서 추천된 키워드들을 6개 판매 성공 지표로 종합 비교했어요. 종합점수가 높은 순서대로 도전하세요
      </p>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-2 px-2 text-left w-44">
                <span className="text-xs text-gray-600 font-bold block">키워드</span>
                <span className="text-[10px] text-gray-400 font-normal block leading-tight">출처 / 클릭하면 분석</span>
              </th>
              <th className="py-2 px-2 text-center w-14">
                <span className="text-xs text-gray-600 font-bold block">종합</span>
                <span className="text-[10px] text-gray-400 font-normal block leading-tight">6 Factor 평균</span>
              </th>
              {sorted[0]?.result?.factors.map((f) => (
                <th key={f.key} className="py-2 px-2 text-left w-20">
                  <span className="text-[11px] text-gray-600 font-bold block leading-tight">{f.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ candidate, result, score }) => (
              <tr key={candidate.keyword} className="border-b border-gray-50 hover:bg-purple-50/30 transition-colors">
                <td className="py-2.5 px-2">
                  <AnalyzeKeywordLink
                    keyword={candidate.keyword}
                    platform={platform}
                    className="text-sm font-medium text-gray-800 hover:text-purple-700 block"
                  >
                    {candidate.keyword === keyword && (
                      <span className="text-[9px] text-gray-400 mr-1">[시드]</span>
                    )}
                    {candidate.keyword}
                  </AnalyzeKeywordLink>
                  <span
                    className={`inline-block mt-0.5 text-[9px] px-1.5 py-0.5 rounded font-medium ${
                      SOURCE_COLORS[candidate.source] ?? "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {candidate.source}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center">
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full tabular-nums"
                    style={{
                      background: score >= 70 ? "linear-gradient(135deg, #a855f7, #6366f1)" : undefined,
                      backgroundColor: score >= 70 ? undefined : score >= 45 ? "#ede9fe" : "#f3f4f6",
                      color: score >= 70 ? "white" : score >= 45 ? "#7c3aed" : "#9ca3af",
                      minWidth: 36,
                      display: "inline-block",
                      textAlign: "center",
                    }}
                  >
                    {score}
                  </span>
                </td>
                {result?.factors.map((f) => (
                  <td key={f.key} className="py-2.5 px-2">
                    <ScoreBar value={f.score} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[10px] text-gray-400 text-center">
        종합점수는 6개 Factor(상위 노출·구매전환·시장성장·수익성·진입난이도·크로스플랫폼) 평균
      </p>
    </div>
  );
}
