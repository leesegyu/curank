"use client";

/**
 * 그래프 기반 상품 추천 카드
 * 카테고리 연관도 기반 유사 상품군 키워드 추천
 */

import { useEffect, useState } from "react";
import { trackEventClient } from "@/lib/events";
import type { GraphKeyword } from "@/app/api/keywords-graph/route";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";

function simColor(sim: number): string {
  if (sim >= 0.8) return "text-green-600 bg-green-50 border-green-200";
  if (sim >= 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
  return "text-gray-600 bg-gray-50 border-gray-200";
}

function simLabel(sim: number): string {
  if (sim >= 0.8) return "매우 유사";
  if (sim >= 0.6) return "유사";
  return "관련";
}

export default function KeywordRecommendationsGraph({ keyword, platform = "naver", preloadedData }: { keyword: string; platform?: string; preloadedData?: unknown[] | null }) {
  const preFiltered = preloadedData ? (preloadedData as GraphKeyword[]).filter(k => k.type === "seed") : null;
  const [data, setData]       = useState<GraphKeyword[]>(preFiltered ?? []);
  const [loading, setLoading] = useState(!preFiltered);
  const [error, setError]     = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (preloadedData?.length) {
      setData((preloadedData as GraphKeyword[]).filter(k => k.type === "seed"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetch(`/api/keywords-graph?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.keywords) {
          setData(json.keywords.filter((k: GraphKeyword) => k.type === "seed"));
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  const display = expanded ? data.slice(0, 30) : data.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">연관 키워드 발견</span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
          >
            Graph
          </span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100 font-medium">
            {platform === "naver" ? "스마트스토어" : "쿠팡"} 기준
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">내가 생각하지 못했던 관련 키워드들이에요. 상품명이나 태그에 추가하면 더 많은 고객에게 노출됩니다</p>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-11 bg-gray-50 rounded-xl" />
          ))}
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <p className="text-sm text-gray-400 text-center py-4">
          키워드 추천을 불러오지 못했어요
        </p>
      )}

      {/* 빈 결과 */}
      {!loading && !error && data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          이 키워드에 대한 그래프 추천이 없습니다
        </p>
      )}

      {/* 결과 */}
      {!loading && !error && data.length > 0 && (
        <>
          <div className="space-y-1.5">
            {display.map((kw, i) => (
              <AnalyzeKeywordLink
                key={kw.keyword}
                keyword={kw.keyword}
                platform={platform}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${simColor(kw.similarity)}`}>
                    {Math.round(kw.similarity * 100)}%
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm text-gray-700 font-medium group-hover:text-indigo-600 transition-colors block truncate">
                      {kw.keyword}
                    </span>
                    <span className="text-[10px] text-gray-400">{kw.category}</span>
                  </div>
                </div>
                <span className="text-[10px] text-gray-300 flex-shrink-0 ml-2">
                  {simLabel(kw.similarity)}
                </span>
              </AnalyzeKeywordLink>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              카테고리 연관도 기반 · 비슷한 상품군 키워드
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCSV(data.map(kw => ({ 키워드: kw.keyword, 유사도: Math.round(kw.similarity * 100), 카테고리: kw.category })), `${keyword}_연관키워드`)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                CSV
              </button>
              {data.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  {expanded ? "접기 ↑" : `전체보기 (${data.length}) ↓`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
