"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import KeywordProductCard from "./KeywordProductCard";
import KeywordTextCard from "./KeywordTextCard";
import type { FeedItem, FeedRow as FeedRowType } from "@/app/api/feed/route";

interface Props {
  title: string;
  subtitle: string;
  icon: string;
  items: FeedItem[];
  displayType?: FeedRowType["displayType"];
}

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

export default function FeedRow({ title, subtitle, icon, items, displayType }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  if (items.length === 0) return null;

  const isKeywordOnly = displayType === "keyword_only";

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  /* eslint-disable react-hooks/rules-of-hooks */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isKeywordOnly) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll, isKeywordOnly]);
  /* eslint-enable react-hooks/rules-of-hooks */

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const containerWidth = el.clientWidth;
    el.scrollBy({
      left: direction === "right" ? containerWidth : -containerWidth,
      behavior: "smooth",
    });
  };

  if (isKeywordOnly) {
    return (
      <section className="mb-10">
        <div className="mb-5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1 ml-9">{subtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <KeywordTextCard key={`${item.keyword}-${i}`} item={item} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-10">
      {/* Title */}
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl flex-shrink-0">{icon}</span>
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
        </div>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1 ml-9">{subtitle}</p>
        )}
      </div>

      {/* Carousel */}
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
            {items.map((item, i) => (
              <div
                key={`${item.keyword}-${i}`}
                className="snap-start flex-shrink-0 w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] lg:w-[calc((100%-48px)/5)]"
              >
                <KeywordProductCard item={item} />
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
