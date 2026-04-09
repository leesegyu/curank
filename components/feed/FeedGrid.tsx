"use client";

/**
 * 개인화 키워드 피드 그리드
 *
 * 피드 업데이트 시점 (YouTube-like):
 *   - 홈 방문할 때마다 (컴포넌트 mount → 항상 새로 fetch)
 *   - 마이페이지 카테고리 변경 후 홈 복귀 시
 *   - 키워드 분석 후 홈 복귀 시
 *   - visibilitychange (탭 전환 후 복귀 시)
 *
 * 카테고리 미설정 시 (OAuth 가입 등):
 *   → CategorySelector 표시 → 선택 후 피드 로드
 */

import { useEffect, useState, useCallback, useRef } from "react";
import FeedRow from "./FeedRow";
import CategorySelector from "./CategorySelector";
import CompetitorRow from "./CompetitorRow";
import type { FeedRow as FeedRowType } from "@/app/api/feed/route";

const ROW_ICONS: Record<string, string> = {
  history: "🔎",
  search:  "🛒",
  target:  "💜",
  star:    "👑",
  bulb:    "💡",
  fire:    "📈",
};

function SkeletonRow() {
  return (
    <div className="mb-10 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-gray-100 rounded-full" />
        <div className="h-5 w-40 bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="aspect-square bg-gray-100" />
            <div className="p-3 space-y-2">
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-8 bg-gray-100 rounded-xl mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeedGrid() {
  const [rows, setRows]                       = useState<FeedRowType[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [needsCategories, setNeedsCategories] = useState(false);
  const [autoAdded, setAutoAdded]             = useState(false);
  const fetchIdRef = useRef(0);

  const loadFeed = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      // cache bust: 매 요청마다 타임스탬프 추가 → 서버 캐시는 유지하되 브라우저 캐시 방지
      const res = await fetch(`/api/feed?_t=${Date.now()}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      if (id !== fetchIdRef.current) return; // 이전 요청 무시
      setRows(data.rows ?? []);
      setNeedsCategories(data.needsCategories ?? false);
      setAutoAdded(data.autoAdded ?? false);
    } catch {
      if (id === fetchIdRef.current) {
        setError("피드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, []);

  // 최초 로드
  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // 탭 복귀 시 피드 갱신 (YouTube-like)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        loadFeed();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadFeed]);

  // 분석 완료 후 피드 갱신
  useEffect(() => {
    function handleFeedRefresh() { loadFeed(); }
    window.addEventListener("feed-refresh", handleFeedRefresh);
    return () => window.removeEventListener("feed-refresh", handleFeedRefresh);
  }, [loadFeed]);

  // 카테고리 선택 완료 → 피드 새로고침
  function handleCategoryComplete() {
    setNeedsCategories(false);
    loadFeed();
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <button
          onClick={loadFeed}
          className="text-xs px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 카테고리 미설정 시 선택 UI */}
      {needsCategories && (
        <CategorySelector onComplete={handleCategoryComplete} />
      )}

      {/* 자동 관심카테고리 추가 알림 */}
      {autoAdded && !loading && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-2">
          <span className="text-blue-500 text-sm">💡</span>
          <p className="text-xs text-blue-700">
            과거 키워드 분석 기록을 기반으로 마이페이지에 관심 카테고리가 자동으로 더 정확히 개선되었습니다.
          </p>
        </div>
      )}

      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : (
        rows.map((row) => {
          // 최근 분석 기반 Row: 기록 없으면 안내 메시지
          if (row.id === "recent_analysis" && row.items.length === 0) {
            return (
              <section key={row.id} className="mb-10">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="text-2xl flex-shrink-0">{ROW_ICONS[row.icon] ?? "📦"}</span>
                  <h3 className="text-lg font-black text-gray-900">{row.title}</h3>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 py-8 text-center">
                  <p className="text-sm text-gray-400">키워드를 분석하면 맞춤 추천이 여기에 나타나요</p>
                  <p className="text-xs text-gray-300 mt-1">상단 검색창에서 키워드를 분석해보세요</p>
                </div>
              </section>
            );
          }
          return (
            <div key={row.id}>
              <FeedRow
                title={row.title}
                subtitle={row.subtitle}
                icon={ROW_ICONS[row.icon] ?? "📦"}
                items={row.items}
                displayType={row.displayType}
              />
              {/* Row1(최근 분석) 바로 다음에 경쟁사 Row 삽입 */}
              {row.id === "recent_analysis" && <CompetitorRow />}
            </div>
          );
        })
      )}
    </div>
  );
}
