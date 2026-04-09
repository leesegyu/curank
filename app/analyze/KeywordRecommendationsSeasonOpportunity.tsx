"use client";

/**
 * 시즌 기회 키워드 추천 카드
 * Historical(작년 인기) + V2(시장 데이터) 융합 SOS 점수 기반
 * "작년에 검증된 수요 + 현재 진입 가능한" 키워드 추천
 */

import { useEffect, useState } from "react";
import type { SeasonOpportunityResult } from "@/app/api/keywords-season-opportunity/route";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";

function tierBadge(tier: string) {
  switch (tier) {
    case "최고":
      return { color: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: "★" };
    case "좋음":
      return { color: "text-blue-700 bg-blue-50 border-blue-200", icon: "●" };
    case "보통":
      return { color: "text-amber-700 bg-amber-50 border-amber-200", icon: "○" };
    default:
      return { color: "text-gray-500 bg-gray-50 border-gray-200", icon: "△" };
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 50) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 35) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-gray-500 bg-gray-50 border-gray-200";
}

const FACTOR_LABEL: Record<string, string> = {
  "시즌 검증도": "작년에 인기 검증됨",
  "선점 갭": "지금이 선점 타이밍",
  "진입 용이성": "경쟁이 아직 낮음",
  "구매 전환력": "구매로 이어지는 키워드",
  "시장 규모": "충분한 시장 크기",
};

interface Props {
  keyword: string;
  platform: string;
  preloadedData?: unknown[] | null;
}

export default function KeywordRecommendationsSeasonOpportunity({ keyword, platform, preloadedData }: Props) {
  const [data, setData] = useState<SeasonOpportunityResult[]>((preloadedData as SeasonOpportunityResult[]) ?? []);
  const [loading, setLoading] = useState(!preloadedData);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (preloadedData?.length) {
      setData(preloadedData as SeasonOpportunityResult[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`/api/keywords-season-opportunity?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json) => setData(json.keywords ?? []))
      .catch(() => setError("시즌 기회 데이터를 불러오지 못했습니다"))
      .finally(() => setLoading(false));
  }, [keyword, preloadedData]);

  const display = expanded ? data : data.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
            >
              Season
            </span>
            <span className="text-sm font-bold text-gray-700">시즌 기회 키워드</span>
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
        {error || "시즌 기회 데이터가 없습니다"}
      </div>
    );
  }

  const selected = selectedIdx !== null ? data[selectedIdx] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold text-white px-2.5 py-0.5 rounded-full"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            Season
          </span>
          <span className="text-sm font-bold text-gray-700">시즌 기회 키워드</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold text-orange-700 bg-orange-50 border border-orange-200">
            Historical + AI 융합
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          작년에 검증된 수요 + 현재 진입 가능성을 동시에 평가한 키워드예요. 시즌이 오기 전에 미리 상품을 준비하세요
        </p>
      </div>

      {/* 키워드 리스트 */}
      <div className="space-y-1.5">
        {display.map((kw, idx) => {
          const badge = tierBadge(kw.tier);
          const isSelected = selectedIdx === idx;

          return (
            <div key={kw.keyword}>
              <div
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer group ${
                  isSelected
                    ? "border-orange-300 bg-orange-50/50"
                    : "border-gray-100 hover:border-orange-200 hover:bg-orange-50/30"
                }`}
                onClick={() => setSelectedIdx(isSelected ? null : idx)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-orange-500 w-5 shrink-0">{idx + 1}</span>
                  <div className="min-w-0">
                    <AnalyzeKeywordLink keyword={kw.keyword} platform={platform}>
                      <p className="text-sm font-bold text-gray-800 truncate group-hover:text-orange-700 transition-colors">
                        {kw.keyword}
                      </p>
                    </AnalyzeKeywordLink>
                    <p className="text-[11px] text-gray-400 truncate">
                      {FACTOR_LABEL[kw.topFactor] ?? kw.topFactor}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* 과거 vs 현재 */}
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-gray-400">작년</span>
                      <span className="font-bold text-amber-600">{kw.pastPopularity}</span>
                      <span className="text-gray-300">/</span>
                      <span className="text-gray-400">지금</span>
                      <span className="font-bold text-gray-600">{kw.currentPopularity}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badge.color}`}>
                    {badge.icon} {kw.tier}
                  </span>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg border ${scoreColor(kw.score)}`}>
                    {kw.score}
                  </span>
                </div>
              </div>

              {/* 확장: 상세 subfactor + 조언 */}
              {isSelected && (
                <div className="mx-4 mt-1 mb-2 p-3 bg-orange-50/50 rounded-lg border border-orange-100">
                  {/* 5 Factor 바 */}
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {kw.subfactors.map((sf) => (
                      <div key={sf.key} className="text-center">
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${sf.score}%`,
                              background: sf.score >= 60 ? "#f59e0b" : sf.score >= 40 ? "#fbbf24" : "#d1d5db",
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-500 leading-tight block">{sf.label}</span>
                        <span className="text-[10px] font-bold text-gray-700">{sf.score}</span>
                      </div>
                    ))}
                  </div>
                  {/* 조언 */}
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {kw.advice}
                  </p>
                  {/* 경쟁도 */}
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400">
                    <span>경쟁: <span className="font-bold text-gray-600">{kw.competitionLevel}</span></span>
                    {kw.monthlyVolume > 0 && (
                      <span>월검색량: <span className="font-bold text-gray-600">{kw.monthlyVolume.toLocaleString()}</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 푸터 */}
      {data.length > 5 && (
        <div className="mt-3 flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            <span className="font-bold text-orange-600">SOS</span> = 시즌 검증 + 진입 가능성 융합 점수
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                downloadCSV(
                  data.map((kw) => ({
                    키워드: kw.keyword,
                    SOS점수: kw.score,
                    등급: kw.tier,
                    작년인기: kw.pastPopularity,
                    현재: kw.currentPopularity,
                    갭: kw.gap,
                    경쟁도: kw.competitionLevel,
                    월검색량: kw.monthlyVolume,
                    강점: kw.topFactor,
                  })),
                  `${keyword}_시즌기회`,
                )
              }
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              CSV
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {expanded ? "접기" : `전체보기 (${data.length}개)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
