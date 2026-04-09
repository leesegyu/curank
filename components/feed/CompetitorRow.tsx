"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import type { ProductCTS } from "@/lib/competitor-threat";

function ArrowLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/**
 * 홈 피드 "내 경쟁사 상품" Row
 * 최근 분석 키워드 -> CTS 상위 경쟁 상품 표시 (carousel)
 */
export default function CompetitorRow() {
  const { data: session } = useSession();
  const [competitors, setCompetitors] = useState<(ProductCTS & { srcKeyword: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading || competitors.length === 0) return;
    // Defer to let the DOM render
    requestAnimationFrame(checkScroll);
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, loading, competitors.length]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth;
    el.scrollBy({
      left: direction === "right" ? containerWidth : -containerWidth,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }

    fetch("/api/user/history")
      .then((r) => r.json())
      .then(async (data) => {
        const items = data?.history ?? data;
        if (!Array.isArray(items) || items.length === 0) { setLoading(false); return; }

        const recentKeywords = items.slice(0, 3).map((h: { keyword: string }) => h.keyword);
        const results = await Promise.allSettled(
          recentKeywords.map((kw: string) =>
            fetch(`/api/competitor-threat?keyword=${encodeURIComponent(kw)}&platform=naver`)
              .then((r) => r.json())
              .then((d) => (d.products || []).slice(0, 3).map((p: ProductCTS) => ({ ...p, srcKeyword: kw })))
          )
        );

        const all = results
          .filter((r): r is PromiseFulfilledResult<(ProductCTS & { srcKeyword: string })[]> => r.status === "fulfilled")
          .flatMap((r) => r.value);

        // CTS 55점 이상만, CTS 높은 순, 중복 셀러 제거, 최대 10개
        const seen = new Set<string>();
        const unique = all
          .filter((item) => item.cts >= 55)
          .sort((a, b) => b.cts - a.cts)
          .filter((item) => {
            if (seen.has(item.product.mallName)) return false;
            seen.add(item.product.mallName);
            return true;
          })
          .slice(0, 10);

        setCompetitors(unique);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <section className="mb-10">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="text-2xl">🎯</span>
          <h3 className="text-lg font-black text-gray-900">내 경쟁사 상품</h3>
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex-shrink-0 w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] lg:w-[calc((100%-48px)/5)] rounded-2xl bg-gray-50 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      </section>
    );
  }

  if (competitors.length === 0) return null;

  const LEVEL_BG: Record<string, string> = {
    "낮음": "bg-green-500", "보통": "bg-yellow-500", "높음": "bg-orange-500", "매우 높음": "bg-red-500",
  };

  return (
    <section className="mb-10">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-black text-gray-900">내 경쟁사 상품</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4 ml-9">
        최근 분석한 키워드에서 가장 위협적인 경쟁 상품들
      </p>

      <div className="relative group/carousel">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="이전"
          >
            <ArrowLeft />
          </button>
        )}

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          <div className="flex gap-3">
            {competitors.map((item, idx) => (
              <div
                key={`${item.product.productId}-${idx}`}
                className="snap-start flex-shrink-0 w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] lg:w-[calc((100%-48px)/5)]"
              >
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all flex flex-col">
                  {/* 상품 이미지 */}
                  {item.product.productImage ? (
                    <div className="relative w-full aspect-square bg-gray-50 overflow-hidden">
                      <Image
                        src={item.product.productImage}
                        alt={item.product.productName}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                        className="object-cover"
                        unoptimized
                      />
                      {/* CTS 배지 */}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-white text-[11px] font-bold ${LEVEL_BG[item.level]}`}>
                        위협 {item.cts}점
                      </div>
                      {/* 순위 배지 */}
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-black/50 text-white text-[10px] font-bold flex items-center justify-center">
                        {item.rank}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-50 flex items-center justify-center">
                      <span className="text-2xl text-gray-200">📦</span>
                    </div>
                  )}

                  {/* 상품 정보 */}
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-1.5">
                      {item.product.productName}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">
                        {item.product.salePrice.toLocaleString()}원
                      </span>
                      <span className="text-[10px] text-gray-400 truncate ml-1">{item.product.mallName}</span>
                    </div>
                    <p className="text-[10px] text-blue-400 mt-1 truncate">
                      &quot;{item.srcKeyword}&quot; 키워드
                    </p>

                    {/* 버튼 2개: 상품 보기 + 키워드 분석 */}
                    <div className="mt-2.5 flex gap-1.5">
                      <a
                        href={item.product.productUrl || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(item.srcKeyword)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center text-[11px] font-bold py-1.5 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
                      >
                        상품 보기
                      </a>
                      <Link
                        href={`/analyze?keyword=${encodeURIComponent(item.srcKeyword)}`}
                        className="flex-1 text-center text-[11px] font-bold py-1.5 rounded-xl text-white transition-opacity hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                      >
                        키워드 분석
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="다음"
          >
            <ArrowRight />
          </button>
        )}
      </div>
    </section>
  );
}
