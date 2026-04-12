"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DiscoverFilterBar from "./DiscoverFilterBar";
import DiscoverKeywordCard from "./DiscoverKeywordCard";

interface CategoryOption {
  id: string;
  name: string;
}

interface DiscoverKeyword {
  keyword: string;
  phase: string;
  seasonType: string;
  currentPercentOfPeak: number;
  peakMonth: number;
  monthsToPeak: number;
  upsidePercent: number;
  seasonality: number;
  monthlyRatios: { month: number; ratio: number }[];
  monthlyTotal: number | null;
  compIdx: string | null;
  categoryL1: string;
  categoryL2: string;
}

export default function DiscoverClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const season = searchParams.get("season") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "upside";

  const [keywords, setKeywords] = useState<DiscoverKeyword[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchData = useCallback(async (p: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (season) params.set("season", season);
      if (category) params.set("category", category);
      params.set("sort", sort);
      params.set("page", String(p));

      const res = await fetch(`/api/discover?${params.toString()}`);
      const json = await res.json();

      if (append) {
        setKeywords((prev) => [...prev, ...(json.keywords ?? [])]);
      } else {
        setKeywords(json.keywords ?? []);
      }
      setTotal(json.total ?? 0);
      if (json.categories?.length) setCategories(json.categories);
    } catch {
      if (!append) setKeywords([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [season, category, sort]);

  useEffect(() => {
    setPage(1);
    fetchData(1, false);
  }, [fetchData]);

  function handleFilterChange(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // 필터 변경 시 page 리���
    params.delete("page");
    router.push(`/discover?${params.toString()}`, { scroll: false });
  }

  function handleLoadMore() {
    const next = page + 1;
    setPage(next);
    fetchData(next, true);
  }

  const hasMore = keywords.length < total;

  return (
    <>
      <DiscoverFilterBar
        season={season}
        category={category}
        sort={sort}
        categories={categories}
        onFilterChange={handleFilterChange}
      />

      {/* 결과 카운트 */}
      {!loading && (
        <div className="text-xs text-gray-400 mb-4">
          {total > 0 ? `상승 초입 키워드 ${total}개 발견` : ""}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-52 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-5 bg-gray-100 rounded w-32 mb-3" />
              <div className="h-10 bg-gray-50 rounded mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* 카드 그리드 */}
      {!loading && keywords.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {keywords.map((kw) => (
              <DiscoverKeywordCard key={kw.keyword} kw={kw} />
            ))}
          </div>

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-6 mx-auto block px-6 py-2.5 rounded-full bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loadingMore ? "불러오는 중..." : "더 보기"}
            </button>
          )}
        </>
      )}

      {/* 빈 결과 */}
      {!loading && keywords.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-600 mb-1">상승 초입 키워드가 없습니다</p>
          <p className="text-xs text-gray-400">시즌성이 약하거나 이미 피크를 지난 시기입니다.<br />다른 시즌/카테고리를 선택해보세요.</p>
        </div>
      )}
    </>
  );
}
