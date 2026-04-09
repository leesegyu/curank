"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { FeedItem } from "@/app/api/feed/route";

function formatPrice(price: number): string {
  if (!price) return "";
  return price.toLocaleString("ko-KR") + "원";
}

interface Props {
  item: FeedItem;
}

export default function KeywordProductCard({ item }: Props) {
  const [imgError, setImgError] = useState(false);
  const router = useRouter();
  const { keyword, category, product } = item;

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col">

      {/* ── 상품 이미지 (클릭 → 판매 페이지) ── */}
      <a
        href={product?.link || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden flex-shrink-0 cursor-pointer"
      >
        {product?.image && !imgError ? (
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-2">
              <rect x="4" y="4" width="32" height="32" rx="8" stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
              <path d="M12 28l6-8 4 5 4-6 6 9" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="26" cy="14" r="3" fill="#cbd5e1"/>
            </svg>
            <span className="text-[10px] text-gray-400">{category || keyword}</span>
          </div>
        )}

        {/* 플랫폼 뱃지 (우상단) */}
        {product && (
          <div className="absolute top-2 right-2">
            {product.isSmartStore ? (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-green-700 border border-green-200">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#03C75A"/>
                </svg>
                스마트스토어
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-gray-600 border border-gray-200">
                {product.mallName}
              </span>
            )}
          </div>
        )}
      </a>

      {/* ── 카드 본문 ── */}
      <div className="p-3 flex flex-col flex-1">

        {/* 키워드 뱃지 */}
        <div className="mb-2">
          <button
            onClick={() => router.push(`/?q=${encodeURIComponent(keyword)}&platform=naver`)}
            className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100 max-w-full"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
              <circle cx="6.5" cy="6.5" r="5" stroke="#3b82f6" strokeWidth="2"/>
              <path d="M10.5 10.5L14 14" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="truncate">{keyword}</span>
          </button>
        </div>

        {/* 상품명 (클릭 → 판매 페이지) */}
        {product?.title ? (
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-700 leading-snug mb-2 line-clamp-2 flex-1 hover:text-blue-600 transition-colors"
          >
            {product.title}
          </a>
        ) : (
          <p className="text-xs text-gray-400 leading-snug mb-2 flex-1 italic">
            상품 정보 준비중
          </p>
        )}

        {/* 가격 */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-50">
          <span className="text-sm font-bold text-gray-900">
            {product?.price ? formatPrice(product.price) : ""}
          </span>
          {category && (
            <span className="text-[10px] text-gray-400 truncate ml-2">
              {category}
            </span>
          )}
        </div>

        {/* 버튼 2개: 상품 보기 + 키워드 분석 */}
        <div className="mt-2.5 flex gap-1.5">
          <a
            href={product?.link || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(keyword)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-xs font-bold py-2 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
          >
            상품 보기
          </a>
          <button
            onClick={() => router.push(`/?q=${encodeURIComponent(keyword)}&platform=naver`)}
            className="flex-1 text-center text-xs font-bold py-2 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            키워드 분석
          </button>
        </div>
      </div>
    </div>
  );
}
