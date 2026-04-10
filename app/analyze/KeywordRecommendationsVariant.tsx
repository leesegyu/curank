"use client";

import { useEffect, useState } from "react";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";

interface VariantKeyword {
  keyword: string;
  monthlyVolume: number;
  competitionLevel: string;
  score: number;
}

const COMPETITION_STYLE: Record<string, string> = {
  "낮음": "text-green-600",
  "보통": "text-yellow-600",
  "높음": "text-orange-500",
  "매우 높음": "text-red-500",
};

export default function KeywordRecommendationsVariant({
  keyword, platform = "naver", preloadedData,
}: {
  keyword: string;
  platform?: string;
  preloadedData?: { keywords?: VariantKeyword[]; category?: string } | null;
}) {
  const [data, setData] = useState<VariantKeyword[]>(preloadedData?.keywords ?? []);
  const [category, setCategory] = useState<string | null>(preloadedData?.category ?? null);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (preloadedData?.keywords?.length) {
      setData(preloadedData.keywords);
      setCategory(preloadedData.category ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    fetch(`/api/keywords-variant?keyword=${encodeURIComponent(keyword)}`)
      .then(r => r.json())
      .then(json => {
        if (json.keywords) {
          setData(json.keywords);
          setCategory(json.category ?? null);
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  if (!loading && !error && data.length === 0) return null; // 데이터 없으면 카드 숨김

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">
            세부 유형 키워드
          </span>
          {category && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 font-medium">
              {category}
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          이 카테고리의 세부 유형별로 독립 검색되는 키워드예요. 셀러가 놓치기 쉬운 틈새 시장입니다
        </p>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
          ))}
          <p className="text-xs text-center text-gray-400 mt-2">세부 유형 키워드 분석 중...</p>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-gray-400 text-center py-4">추천 데이터를 불러오지 못했습니다.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div className="space-y-2">
            {(expanded ? data.slice(0, 30) : data.slice(0, 5)).map(kw => (
              <AnalyzeKeywordLink
                key={kw.keyword}
                keyword={kw.keyword}
                platform={platform}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50 transition-colors group"
              >
                {/* 키워드명 */}
                <span className="flex-1 text-sm text-gray-800 group-hover:text-violet-700 font-medium truncate">
                  {kw.keyword}
                </span>

                {/* 월간 검색량 */}
                <span className="text-xs text-gray-500 shrink-0">
                  월 {kw.monthlyVolume >= 10000
                    ? `${(kw.monthlyVolume / 10000).toFixed(1)}만`
                    : kw.monthlyVolume.toLocaleString()}회
                </span>

                {/* 경쟁 강도 */}
                <span className={`text-xs font-bold shrink-0 ${COMPETITION_STYLE[kw.competitionLevel] ?? "text-gray-500"}`}>
                  경쟁 {kw.competitionLevel}
                </span>
              </AnalyzeKeywordLink>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              실제 검색량 기반 / 경쟁도 반영 점수순
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCSV(data.map(kw => ({
                  키워드: kw.keyword, 월간검색량: kw.monthlyVolume,
                  경쟁강도: kw.competitionLevel, 점수: kw.score,
                })), `${keyword}_variant`)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                CSV
              </button>
              {data.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-bold text-violet-600 hover:text-violet-700"
                >
                  {expanded ? "접기" : `전체보기 (${Math.min(data.length, 30)})`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
