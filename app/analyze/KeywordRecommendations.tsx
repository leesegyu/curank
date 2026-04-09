"use client";

import { useEffect, useState } from "react";
import { KeywordOpportunity } from "@/lib/keywords";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { trackEventClient } from "@/lib/events";
import { downloadCSV } from "@/lib/csv-export";

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

const TIER_STYLE = {
  최고: "text-white",
  좋음: "text-rose-700",
  보통: "bg-gray-100 text-gray-600",
  낮음: "bg-gray-50 text-gray-400",
};

const COMPETITION_STYLE = {
  낮음: "text-green-600",
  보통: "text-yellow-600",
  높음: "text-orange-500",
  "매우 높음": "text-red-500",
};

export default function KeywordRecommendations({ keyword, platform = "naver", preloadedData }: { keyword: string; platform?: string; preloadedData?: unknown[] | null }) {
  const [data, setData] = useState<KeywordOpportunity[]>((preloadedData as KeywordOpportunity[]) ?? []);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (preloadedData?.length) {
      setData(preloadedData as KeywordOpportunity[]);
      setLoading(false);
      trackExpose(keyword, preloadedData as KeywordOpportunity[], "v1");
      return;
    }
    setLoading(true);
    setError(false);
    fetch(`/api/keywords?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.keywords) {
          setData(json.keywords);
          trackExpose(keyword, json.keywords, "v1");
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">추천 키워드</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold text-amber-700 bg-amber-50 border border-amber-200">
            Blue Ocean
          </span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-green-50 text-green-600 border border-green-100 font-medium">
            {platform === "naver" ? "스마트스토어" : "쿠팡"} 기준
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">경쟁은 적은데 사람들이 찾고 있는 틈새 키워드예요. 여기서 먼저 자리잡으면 적은 광고비로도 매출을 올릴 수 있습니다</p>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 bg-gray-100 rounded-xl animate-pulse" />
          ))}
          <p className="text-xs text-center text-gray-400 mt-2">
            키워드 기회 분석 중... (약 5~10초)
          </p>
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-gray-400 text-center py-4">추천 데이터를 불러오지 못했습니다.</p>
      )}

      {!loading && !error && data.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">추천 키워드가 없습니다.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div className="space-y-2">
            {(expanded ? data.slice(0, 30) : data.slice(0, 5)).map((kw, i) => (
              <AnalyzeKeywordLink
                key={kw.keyword}
                keyword={kw.keyword}
                platform={platform}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50 transition-colors group"
              >
                {/* 기회 티어 배지 */}
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${TIER_STYLE[kw.tier]}`}
                  style={
                    kw.tier === "최고"
                      ? { background: "linear-gradient(135deg, #f59e0b, #f97316)", color: "white" }
                      : kw.tier === "좋음"
                      ? { backgroundColor: "#fef3c7", color: "#b45309" }
                      : {}
                  }
                >
                  {kw.tier}
                </span>

                {/* 키워드명 */}
                <span className="flex-1 text-sm text-gray-800 group-hover:text-amber-700 font-medium truncate">
                  {kw.keyword}
                </span>

                {/* 자동완성 출처 표시 */}
                {kw.fromAutocomplete && (
                  <span className="text-xs text-amber-500 shrink-0">실검색어</span>
                )}

                {/* 경쟁 강도 */}
                <span className={`text-xs font-bold shrink-0 ${COMPETITION_STYLE[kw.competitionLevel]}`}>
                  경쟁 {kw.competitionLevel}
                </span>

                {/* 상품 수 */}
                <span className="text-xs text-gray-400 shrink-0 w-16 text-right">
                  {kw.competition >= 10000
                    ? `${(kw.competition / 10000).toFixed(1)}만개`
                    : `${kw.competition.toLocaleString()}개`}
                </span>
              </AnalyzeKeywordLink>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              <span
                className="font-bold px-1.5 py-0.5 rounded-full text-xs mr-1 text-white"
                style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
              >최고</span>
              Blue Ocean 기회 ·
              <span className="text-blue-600 font-bold ml-1">경쟁 낮음</span> = 상품 1,000개 미만
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCSV(data.map(kw => ({ 키워드: kw.keyword, 점수: kw.score, 등급: kw.tier, 경쟁강도: kw.competitionLevel, 상품수: kw.competition })), `${keyword}_blue_ocean`)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                CSV
              </button>
              {data.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700"
                >
                  {expanded ? "접기 ↑" : `전체보기 (${Math.min(data.length, 30)}) ↓`}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
