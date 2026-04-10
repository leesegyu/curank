"use client";

import { useMemo, useState } from "react";
import AnalyzeKeywordLink from "./AnalyzeKeywordLink";
import { downloadCSV } from "@/lib/csv-export";
import { isPureGenericModifier, dedupeByTokens } from "@/lib/keyword-shape";

/**
 * 수식어 추천 키워드 카드
 *
 * 여러 소스(V2, Creative, Graph, SeasonOpportunity)에서 "시드+수식어" 구조 키워드만
 * 모아서 어순 무관 중복 제거 후 종합 점수 순 정렬하여 표시.
 *
 * 데이터 소스는 클라이언트가 이미 보유한 스냅샷/preloadedData를 그대로 사용 —
 * 추가 API 호출 없음.
 */

interface ModifierItem {
  keyword: string;
  score: number;          // 0~100 정규화 점수
  source: string;         // "v2" | "creative" | "graph" | "sos"
  volume?: number;        // 월 검색량 (있는 경우)
  competitionLevel?: string;
}

interface Props {
  keyword: string;
  platform?: string;
  sources: {
    v2?: unknown[] | null;
    creative?: unknown[] | null;
    graph?: unknown[] | null;
    sos?: unknown[] | null;
  };
}

/** 소스별 점수 정규화 (0~100 범위로 맞춤) */
function normalizeScore(raw: number, max: number): number {
  if (!max) return 0;
  return Math.min(100, Math.max(0, Math.round((raw / max) * 100)));
}

function extractModifiers(props: Props): ModifierItem[] {
  const { keyword, sources } = props;
  const out: ModifierItem[] = [];

  // V2: { keyword, score: 0~1000, monthlyVolume, competitionLevel }
  if (Array.isArray(sources.v2)) {
    for (const raw of sources.v2) {
      const kw = raw as { keyword?: string; score?: number; monthlyVolume?: number; competitionLevel?: string };
      if (!kw?.keyword) continue;
      if (!isPureGenericModifier(kw.keyword, keyword)) continue;
      out.push({
        keyword: kw.keyword,
        score: normalizeScore(kw.score ?? 0, 1000),
        source: "v2",
        volume: kw.monthlyVolume,
        competitionLevel: kw.competitionLevel,
      });
    }
  }

  // Creative: { keyword, score: 0~100 }
  if (Array.isArray(sources.creative)) {
    for (const raw of sources.creative) {
      const kw = raw as { keyword?: string; score?: number };
      if (!kw?.keyword) continue;
      if (!isPureGenericModifier(kw.keyword, keyword)) continue;
      out.push({
        keyword: kw.keyword,
        score: Math.round(kw.score ?? 0),
        source: "creative",
      });
    }
  }

  // Graph: { keyword, similarity: 0~1, type }
  if (Array.isArray(sources.graph)) {
    for (const raw of sources.graph) {
      const kw = raw as { keyword?: string; similarity?: number; type?: string };
      if (!kw?.keyword) continue;
      if (!isPureGenericModifier(kw.keyword, keyword)) continue;
      out.push({
        keyword: kw.keyword,
        score: Math.round((kw.similarity ?? 0) * 100),
        source: "graph",
      });
    }
  }

  // SOS: { keyword, sosScore: 0~100 }
  if (Array.isArray(sources.sos)) {
    for (const raw of sources.sos) {
      const kw = raw as { keyword?: string; sosScore?: number };
      if (!kw?.keyword) continue;
      if (!isPureGenericModifier(kw.keyword, keyword)) continue;
      out.push({
        keyword: kw.keyword,
        score: Math.round(kw.sosScore ?? 0),
        source: "sos",
      });
    }
  }

  return out;
}

const COMP_COLOR: Record<string, string> = {
  "낮음": "text-green-600",
  "보통": "text-yellow-600",
  "높음": "text-orange-500",
  "매우 높음": "text-red-500",
};

const SOURCE_LABEL: Record<string, string> = {
  v2: "기회",
  creative: "창의",
  graph: "연관",
  sos: "시즌",
};

export default function KeywordRecommendationsModifiers(props: Props) {
  const { keyword, platform = "naver" } = props;
  const [expanded, setExpanded] = useState(false);

  const data = useMemo(() => {
    const extracted = extractModifiers(props);
    // 어순 무관 중복 제거 (점수 높은 쪽 우선)
    extracted.sort((a, b) => b.score - a.score);
    const deduped = dedupeByTokens(extracted);
    return deduped.slice(0, 30);
  }, [props]);

  if (data.length === 0) return null;

  const displayed = expanded ? data : data.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-gray-700">수식어 추천 키워드</span>
        <span className="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 font-medium">
          시드+수식어
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        &ldquo;{keyword}&rdquo;에 수식어를 붙인 롱테일 키워드예요. 경쟁 강도가 낮고 구매 의도가 뚜렷합니다
      </p>

      <div className="space-y-1.5">
        {displayed.map((item) => (
          <AnalyzeKeywordLink
            key={item.keyword}
            keyword={item.keyword}
            platform={platform}
            className="flex items-center gap-3 px-3 py-2 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors group"
          >
            {/* 키워드 */}
            <span className="flex-1 text-sm text-gray-800 group-hover:text-blue-700 font-medium truncate">
              {item.keyword}
            </span>

            {/* 검색량 */}
            {item.volume !== undefined && item.volume > 0 && (
              <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
                월 {item.volume >= 10000 ? `${(item.volume / 10000).toFixed(1)}만` : item.volume.toLocaleString()}회
              </span>
            )}

            {/* 경쟁 강도 */}
            {item.competitionLevel && (
              <span className={`text-[10px] font-bold shrink-0 ${COMP_COLOR[item.competitionLevel] ?? "text-gray-400"}`}>
                경쟁 {item.competitionLevel}
              </span>
            )}

            {/* 출처 배지 */}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">
              {SOURCE_LABEL[item.source] ?? item.source}
            </span>

            {/* 종합 점수 */}
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums"
              style={{
                background: item.score >= 70 ? "linear-gradient(135deg, #3b82f6, #6366f1)" : undefined,
                backgroundColor: item.score >= 70 ? undefined : item.score >= 40 ? "#dbeafe" : "#f3f4f6",
                color: item.score >= 70 ? "white" : item.score >= 40 ? "#2563eb" : "#9ca3af",
                minWidth: 36,
                textAlign: "center",
                display: "inline-block",
              }}
            >
              {item.score}
            </span>
          </AnalyzeKeywordLink>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <p className="text-[10px] text-gray-400">
          여러 추천 소스에서 수식어 조합만 모아 중복 제거
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              downloadCSV(
                data.map((d) => ({
                  키워드: d.keyword,
                  종합점수: d.score,
                  출처: SOURCE_LABEL[d.source] ?? d.source,
                  검색량: d.volume ?? "",
                  경쟁강도: d.competitionLevel ?? "",
                })),
                `${keyword}_수식어추천`,
              )
            }
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            CSV
          </button>
          {data.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              {expanded ? "접기 ↑" : `전체보기 (${data.length}) ↓`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
