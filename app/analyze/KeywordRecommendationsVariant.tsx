"use client";

import { useEffect, useState } from "react";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";

interface VariantKeyword { keyword: string; volume?: number }
type VariantSource = "ontology" | "api-fallback";

export default function KeywordRecommendationsVariant({
  keyword, platform = "naver", preloadedData,
}: {
  keyword: string;
  platform?: string;
  preloadedData?: { keywords?: VariantKeyword[]; category?: string; source?: VariantSource } | null;
}) {
  const [data, setData] = useState<VariantKeyword[]>(preloadedData?.keywords ?? []);
  const [category, setCategory] = useState<string | null>(preloadedData?.category ?? null);
  const [source, setSource] = useState<VariantSource | null>(preloadedData?.source ?? null);
  const [loading, setLoading] = useState(!preloadedData?.keywords?.length);

  useEffect(() => {
    if (preloadedData?.keywords?.length) {
      setData(preloadedData.keywords);
      setCategory(preloadedData.category ?? null);
      setSource(preloadedData.source ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/keywords-variant?keyword=${encodeURIComponent(keyword)}`)
      .then(r => r.json())
      .then(json => {
        if (json.keywords) {
          setData(json.keywords);
          setCategory(json.category ?? null);
          setSource((json.source as VariantSource) ?? null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  if (!loading && data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-700">세부 유형 키워드</span>
          {category && (
            <span className="text-xs px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 border border-violet-100 font-medium">
              {category}
            </span>
          )}
          {source === "api-fallback" && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium"
              title="온톨로지 미정의 카테고리 — 네이버 검색광고 API 실검색량 상위 변형 키워드"
            >
              실검색 변형
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
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.map(kw => (
            <AnalyzeKeywordLink
              key={kw.keyword}
              keyword={kw.keyword}
              platform={platform}
              className="px-3 py-1.5 rounded-lg border border-violet-100 hover:border-violet-300 hover:bg-violet-50 transition-colors text-sm text-gray-700 hover:text-violet-700 font-medium"
            >
              {kw.keyword}
            </AnalyzeKeywordLink>
          ))}
        </div>
      )}
    </div>
  );
}
