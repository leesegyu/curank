"use client";

/**
 * 크리에이티브 발굴 키워드 추천 카드
 * 크로스 카테고리, 니치 마켓, 창의적 수식어 기반 다양한 키워드
 */

import { useEffect, useState } from "react";
import type { CreativeKeyword } from "@/app/api/keywords-creative/route";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";

function scoreColor(score: number): string {
  if (score >= 75) return "text-purple-600 bg-purple-50 border-purple-200";
  if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
  return "text-teal-600 bg-teal-50 border-teal-200";
}

const FACTOR_PILL: Record<string, { bg: string; text: string; display: string }> = {
  "발견 가치":     { bg: "bg-orange-50", text: "text-orange-600", display: "남들이 모르는 키워드" },
  "니치 마켓":     { bg: "bg-teal-50",   text: "text-teal-600",   display: "경쟁 적은 틈새" },
  "독창적 수식어": { bg: "bg-pink-50",   text: "text-pink-600",   display: "새로운 검색 패턴" },
  "새로운 사용법": { bg: "bg-indigo-50", text: "text-indigo-600", display: "다른 상황에서도 검색됨" },
  "트렌드 상승":   { bg: "bg-green-50",  text: "text-green-600",  display: "검색량 증가 중" },
  "구매 유효성":   { bg: "bg-gray-50",   text: "text-gray-600",   display: "구매로 이어지는 키워드" },
  "대체재 발견":   { bg: "bg-amber-50",  text: "text-amber-600",  display: "비교 검색 시 노출" },
};

const DEFAULT_PILL = { bg: "bg-gray-50", text: "text-gray-600", display: "" };

interface Props {
  keyword: string;
  platform: string;
}

export default function KeywordRecommendationsCreative({ keyword, platform }: Props) {
  const [data, setData] = useState<CreativeKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/keywords-creative?keyword=${encodeURIComponent(keyword)}&platform=${platform}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.keywords ?? []);
      })
      .catch(() => setError("추천 키워드를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, [keyword, platform]);

  const display = expanded ? data : data.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full"
          style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}
        >
          Creative
        </span>
        <h3 className="text-sm font-bold text-gray-800">크리에이티브 발굴</h3>
      </div>
      <p className="text-xs text-gray-400 mb-2">다른 셀러들이 놓치고 있는 키워드예요. 경쟁이 적고 새로운 수요를 먼저 선점할 수 있어요</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
          다른 카테고리 고객도 검색하는 키워드
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
          상황별 · 라이프스타일 키워드
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-100">
          구매 목적 특화 조합
        </span>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <p className="text-sm text-red-500 py-4 text-center">{error}</p>
      )}

      {/* 결과 없음 */}
      {!loading && !error && data.length === 0 && (
        <p className="text-sm text-gray-400 py-4 text-center">
          이 키워드에 대한 크리에이티브 추천이 없습니다
        </p>
      )}

      {/* 결과 */}
      {!loading && !error && data.length > 0 && (
        <>
          <div className="space-y-1.5">
            {display.map((kw, i) => {
              const pill = FACTOR_PILL[kw.topFactor] ?? DEFAULT_PILL;

              return (
                <AnalyzeKeywordLink
                  key={kw.keyword}
                  keyword={kw.keyword}
                  platform={platform}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* CS 점수 */}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${scoreColor(kw.score)}`}>
                      {kw.score}
                    </span>
                    {/* 키워드명 */}
                    <span className="text-sm text-gray-700 font-medium group-hover:text-purple-600 transition-colors truncate">
                      {kw.keyword}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {/* 강점 Factor */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${pill.bg} ${pill.text}`}>
                      {pill.display || kw.topFactor}
                    </span>
                  </div>
                </AnalyzeKeywordLink>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">
              다른 셀러들이 놓치고 있는 창의적 키워드
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadCSV(data.map(kw => ({ 키워드: kw.keyword, 점수: kw.score, 강점: kw.topFactor })), `${keyword}_크리에이티브`)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                CSV
              </button>
              {data.length > 5 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-700"
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
