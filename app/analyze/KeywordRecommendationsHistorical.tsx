"use client";

/**
 * 작년 이맘때 인기 키워드 추천 카드
 * 1년 전 DataLab 트렌드 기반 시즌 선점 키워드
 */

import { useEffect, useState } from "react";
import type { HistoricalKeyword } from "@/app/api/keywords-historical/route";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";

function gapBadge(gap: number) {
  if (gap > 30) return { text: "대폭 감소", color: "text-red-600 bg-red-50 border-red-200" };
  if (gap > 15) return { text: "감소", color: "text-orange-600 bg-orange-50 border-orange-200" };
  if (gap > 0) return { text: "소폭 감소", color: "text-yellow-600 bg-yellow-50 border-yellow-200" };
  return { text: "유지/상승", color: "text-green-600 bg-green-50 border-green-200" };
}

interface Props {
  keyword: string;
  platform: string;
  preloadedData?: unknown[] | null;
}

export default function KeywordRecommendationsHistorical({ keyword, platform, preloadedData }: Props) {
  const [data, setData] = useState<HistoricalKeyword[]>((preloadedData as HistoricalKeyword[]) ?? []);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (preloadedData?.length) {
      setData(preloadedData as HistoricalKeyword[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/keywords-historical?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => setData(json.keywords ?? []))
      .catch(() => setError("과거 키워드 데이터를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  const display = expanded ? data : data.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">작년 이맘때 인기 키워드</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold text-amber-700 bg-amber-50 border border-amber-200">시즌 선점</span>
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

  if (error || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-gray-400 text-sm">
        {error || "1년 전 트렌드 데이터가 없습니다"}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">작년 이맘때 인기 키워드</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold text-amber-700 bg-amber-50 border border-amber-200">시즌 선점</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          1년 전 이맘때 검색량이 높았던 키워드예요. 올해 시즌이 오기 전에 미리 상품을 준비하면 경쟁자보다 앞서갈 수 있습니다
        </p>
      </div>

      <div className="space-y-2">
        {display.map((kw, idx) => {
          const badge = gapBadge(kw.gap);
          return (
            <AnalyzeKeywordLink key={kw.keyword} keyword={kw.keyword} platform={platform}>
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all cursor-pointer group">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-amber-500 w-5 shrink-0">{idx + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate group-hover:text-amber-700 transition-colors">
                      {kw.keyword}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate">{kw.seasonHint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 과거 vs 현재 비교 */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-400">작년</span>
                      <span className="font-bold text-amber-600">{kw.pastPopularity}</span>
                      <span className="text-gray-300">→</span>
                      <span className="text-gray-400">지금</span>
                      <span className="font-bold text-gray-600">{kw.currentPopularity}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                    {badge.text}
                  </span>
                  <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    {kw.score}점
                  </span>
                </div>
              </div>
            </AnalyzeKeywordLink>
          );
        })}
      </div>

      {data.length > 5 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            <span className="font-bold text-amber-600">작년 인기</span> = 1년 전 검색량이 높았던 키워드
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCSV(data.map(kw => ({ 키워드: kw.keyword, 점수: kw.score, 작년검색량: kw.pastPopularity, 현재검색량: kw.currentPopularity, 갭: kw.gap })), `${keyword}_historical`)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              CSV
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
            >
              {expanded ? "접기" : `전체보기 (${data.length}개)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
