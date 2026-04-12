"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  const [isFree, setIsFree] = useState(true);
  const [discoverLimit, setDiscoverLimit] = useState(3);
  const [plan, setPlan] = useState("free");

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
      if (json.isFree !== undefined) setIsFree(json.isFree);
      if (json.discoverLimit !== undefined) setDiscoverLimit(json.discoverLimit);
      if (json.plan) setPlan(json.plan);
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
    if (isFree) return; // 무료는 필터 변경 불가
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
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
      {/* 필터 바 — 무료는 비활성 + 업그레이드 안내 */}
      <div className="relative">
        <DiscoverFilterBar
          season={season}
          category={category}
          sort={sort}
          categories={categories}
          onFilterChange={handleFilterChange}
        />
        {isFree && (
          <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
            <Link
              href="/pricing"
              className="text-xs font-bold text-indigo-600 bg-white px-4 py-2 rounded-full border border-indigo-200 shadow-sm hover:bg-indigo-50 transition-colors"
            >
              유료 플랜에서 시즌/카테고리/정렬 필터 사용 가능
            </Link>
          </div>
        )}
      </div>

      {/* 결과 카운트 */}
      {!loading && (
        <div className="text-xs text-gray-400 mb-4 flex items-center gap-2">
          {total > 0 ? `상승 초입 키워드 ${total}개` : ""}
          {isFree && total > 0 && (
            <span className="text-indigo-500 font-bold">
              (무료 {discoverLimit}개 미리보기)
            </span>
          )}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
              <DiscoverKeywordCard key={kw.keyword} kw={kw} isFree={isFree} />
            ))}
          </div>

          {/* 무료 제한 도달 시 업그레이드 CTA */}
          {isFree && keywords.length >= discoverLimit && (
            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6 text-center">
              <p className="text-sm font-bold text-gray-800 mb-1">
                더 많은 상승 키워드가 있습니다
              </p>
              <p className="text-xs text-gray-500 mb-4">
                유료 플랜에서 최대 전체 키워드 열람 + 12개월 차트 + 검색량/경쟁도 확인
              </p>
              <Link
                href="/pricing"
                className="inline-block px-6 py-2.5 rounded-full text-white font-bold text-sm transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                플랜 업그레이드
              </Link>
            </div>
          )}

          {/* 유료 더보기 */}
          {!isFree && hasMore && (
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
