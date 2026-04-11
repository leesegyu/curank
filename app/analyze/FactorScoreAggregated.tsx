"use client";

import { useEffect, useMemo, useState } from "react";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";
import { sanitizeCandidateKeyword } from "@/lib/keyword-shape";

/**
 * STEP 3 추천 카드들의 top 키워드를 6개 Factor로 종합 비교하는 카드
 *
 * - 기본 표시: 상위 10개
 * - 전체보기: 최대 40개 (마운트 시 pre-fetch)
 * - CSV 다운로드: 최대 100개 (클릭 시 lazy fetch)
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
  keyword: string;
  platform?: string;
  sources: {
    v2?: unknown[] | null;
    creative?: unknown[] | null;
    graph?: unknown[] | null;
    sos?: unknown[] | null;
    variant?: unknown | null;
    modifiers?: Array<{ keyword: string }>;
  };
  /** 스냅샷에 사전 계산된 결과 — 있으면 즉시 렌더, 없으면 기존처럼 fetch */
  preloaded?: {
    candidates: Array<{ keyword: string; source: string }>;
    results: FactorScoreSet[];
  } | null;
}

interface CandidateWithSource {
  keyword: string;
  source: string;
}

const INITIAL_FETCH = 40;
const MAX_FETCH = 100;
const DISPLAY_COLLAPSED = 10;
const DISPLAY_EXPANDED = 40;

/**
 * 각 카드에서 상위 키워드 충분히 수집 (최대 ~100개)
 */
function collectCandidates(props: Props): CandidateWithSource[] {
  const { keyword, sources } = props;
  const candidates: CandidateWithSource[] = [];
  const push = (kw: string | undefined, source: string) => {
    if (!kw) return;
    const s = sanitizeCandidateKeyword(kw);
    if (!s) return;
    candidates.push({ keyword: s, source });
  };

  // 1) 시드 (baseline) — 원문 유지
  candidates.push({ keyword, source: "seed" });

  // 2) V2 상위 25개
  if (Array.isArray(sources.v2)) {
    const top = sources.v2
      .map((raw) => raw as { keyword?: string; score?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 25);
    for (const kw of top) push(kw.keyword, "기회분석");
  }

  // 3) Creative 상위 20개
  if (Array.isArray(sources.creative)) {
    const top = sources.creative
      .map((raw) => raw as { keyword?: string; score?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 20);
    for (const kw of top) push(kw.keyword, "크리에이티브");
  }

  // 4) Graph 상위 15개
  if (Array.isArray(sources.graph)) {
    const top = sources.graph
      .map((raw) => raw as { keyword?: string; similarity?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, 15);
    for (const kw of top) push(kw.keyword, "연관");
  }

  // 5) SOS 상위 15개
  if (Array.isArray(sources.sos)) {
    const top = sources.sos
      .map((raw) => raw as { keyword?: string; sosScore?: number })
      .filter((kw) => kw?.keyword)
      .sort((a, b) => (b.sosScore ?? 0) - (a.sosScore ?? 0))
      .slice(0, 15);
    for (const kw of top) push(kw.keyword, "시즌");
  }

  // 6) Variant 상위 20개 — 광범위 시드는 variant에만 풍부할 수 있음
  if (sources.variant && typeof sources.variant === "object") {
    const v = sources.variant as { keywords?: Array<{ keyword: string }> };
    if (Array.isArray(v.keywords)) {
      const top = v.keywords.slice(0, 20);
      for (const kw of top) push(kw.keyword, "세부유형");
    }
  }

  // 7) Modifiers 상위 15개
  if (Array.isArray(sources.modifiers)) {
    const top = sources.modifiers.slice(0, 15);
    for (const kw of top) push(kw.keyword, "수식어");
  }

  // 중복 제거 (어순 무관) — 시드 우선 유지
  const seenKeys = new Set<string>();
  const deduped: CandidateWithSource[] = [];
  for (const c of candidates) {
    const key = c.keyword.trim().toLowerCase().split(/\s+/).sort().join(" ");
    if (key && !seenKeys.has(key)) {
      seenKeys.add(key);
      deduped.push(c);
    }
  }
  return deduped.slice(0, MAX_FETCH);
}

/** 6 Factor 평균으로 종합 점수 계산 */
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

/** 주어진 키워드 배열로 API 호출 후 맵 반환 */
async function fetchFactorBatch(
  keywords: string[],
  platform: string,
): Promise<Map<string, FactorScoreSet>> {
  if (keywords.length === 0) return new Map();
  const res = await fetch(
    `/api/factor-score-batch?keywords=${encodeURIComponent(keywords.join(","))}&platform=${platform}`,
  );
  const json: { results?: FactorScoreSet[] } = await res.json();
  const map = new Map<string, FactorScoreSet>();
  for (const r of json.results ?? []) {
    map.set(r.keyword, r);
  }
  return map;
}

export default function FactorScoreAggregated(props: Props) {
  const { keyword, platform = "naver", preloaded } = props;

  // 사전 계산된 결과가 있으면 초기 state에 즉시 주입 (로딩 스킵)
  const initialMap = useMemo(() => {
    const map = new Map<string, FactorScoreSet>();
    if (preloaded?.results && Array.isArray(preloaded.results)) {
      for (const r of preloaded.results) {
        if (r?.keyword) map.set(r.keyword, r);
      }
    }
    return map;
  }, [preloaded]);

  const [results, setResults] = useState<Map<string, FactorScoreSet>>(initialMap);
  const [loading, setLoading] = useState(initialMap.size === 0);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  // 후보 목록: 스냅샷에 있으면 그대로 사용, 없으면 props로 재계산
  const candidates = useMemo(() => {
    if (preloaded?.candidates && preloaded.candidates.length > 0) {
      return preloaded.candidates;
    }
    return collectCandidates(props);
  }, [props, preloaded]);

  // 사전 계산 결과가 없을 때만 마운트 fetch
  useEffect(() => {
    if (initialMap.size > 0) {
      return; // 이미 프리로드됨 → 추가 fetch 불필요
    }
    if (candidates.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);

    const initialBatch = candidates.slice(0, INITIAL_FETCH).map((c) => c.keyword);
    fetchFactorBatch(initialBatch, platform)
      .then((map) => setResults(map))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [candidates, platform, initialMap]);

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

  const displayed = expanded
    ? sorted.slice(0, DISPLAY_EXPANDED)
    : sorted.slice(0, DISPLAY_COLLAPSED);

  /** CSV 다운로드 — 필요하면 lazy fetch로 최대 100개까지 */
  const handleCsvDownload = async () => {
    // 미조회 후보가 있으면 추가 fetch
    const missing = candidates
      .filter((c) => !results.has(c.keyword))
      .slice(0, MAX_FETCH - results.size);

    let finalResults = results;
    if (missing.length > 0) {
      setCsvLoading(true);
      try {
        const additional = await fetchFactorBatch(
          missing.map((c) => c.keyword),
          platform,
        );
        const merged = new Map(results);
        for (const [k, v] of additional) merged.set(k, v);
        finalResults = merged;
        setResults(merged);
      } catch {
        // 일부만이라도 다운로드
      } finally {
        setCsvLoading(false);
      }
    }

    // 전체 정렬 후 CSV 추출
    const allSorted = candidates
      .map((c) => ({ candidate: c, result: finalResults.get(c.keyword) }))
      .filter((item) => !!item.result)
      .map((item) => ({
        ...item,
        score: overallScore(item.result!),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_FETCH);

    const rows = allSorted.map(({ candidate, result, score }) => {
      const row: Record<string, string | number> = {
        키워드: candidate.keyword,
        출처: candidate.source,
        종합점수: score,
      };
      for (const f of result!.factors) {
        row[f.label] = f.score;
      }
      return row;
    });

    downloadCSV(rows, `${keyword}_최종후보비교`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4 animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
          <p className="text-xs text-center text-gray-400 mt-2">
            추천 키워드 {Math.min(candidates.length, INITIAL_FETCH)}개 종합 비교 중... (약 10~15초)
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

  // 시드 외 후보가 없는 경우(너무 광범위한 카테고리 시드) — 안내
  if (sorted.length === 1) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold text-gray-700">최종 후보 비교</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
            style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}
          >
            AI
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          STEP 3에서 추천된 키워드들을 6개 판매 성공 지표로 종합 비교했어요
        </p>
        <div className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-600 font-medium mb-1">
            비교할 후보 키워드가 부족해요
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            &quot;{keyword}&quot;은(는) 범주가 너무 넓어서 STEP 3의 추천 키워드가 충분히 수집되지
            않았어요.<br />
            STEP 3의 <strong>세부 유형</strong>·<strong>연관 키워드</strong> 카드에서 구체적인
            키워드를 선택해 다시 분석해 보세요.
          </p>
        </div>
      </div>
    );
  }

  const canExpand = sorted.length > DISPLAY_COLLAPSED;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-gray-700">최종 후보 비교</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
          style={{ background: "linear-gradient(135deg, #a855f7, #6366f1)" }}
        >
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
            {displayed.map(({ candidate, result, score }) => (
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

      <div className="mt-3 flex items-center justify-between px-1">
        <p className="text-[10px] text-gray-400">
          종합점수는 6개 Factor(상위 노출·구매전환·시장성장·수익성·진입난이도·크로스플랫폼) 평균
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCsvDownload}
            disabled={csvLoading}
            className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-wait"
          >
            {csvLoading
              ? `CSV 준비중 (${Math.min(candidates.length, MAX_FETCH)}개)...`
              : `CSV (${Math.min(candidates.length, MAX_FETCH)}개)`}
          </button>
          {canExpand && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-bold text-purple-600 hover:text-purple-700"
            >
              {expanded ? "접기 ↑" : `전체보기 (${Math.min(sorted.length, DISPLAY_EXPANDED)}) ↓`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
