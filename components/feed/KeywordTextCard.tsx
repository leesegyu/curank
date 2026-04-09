"use client";

/**
 * 키워드 텍스트 카드 — 추천 키워드(롱테일) 전용
 * 상품 이미지 없이 키워드 텍스트만 표시하는 경량 카드
 */

import { useRouter } from "next/navigation";
import type { FeedItem } from "@/app/api/feed/route";

interface Props {
  item: FeedItem;
}

export default function KeywordTextCard({ item }: Props) {
  const { keyword } = item;
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/?q=${encodeURIComponent(keyword)}&platform=naver`)}
      className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-blue-400 group-hover:text-blue-600 transition-colors">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className="text-sm text-gray-700 group-hover:text-blue-600 font-medium transition-colors whitespace-nowrap">
        {keyword}
      </span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 text-gray-300 group-hover:text-blue-400 transition-colors">
        <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}
