"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { CTSResult, ProductCTS } from "@/lib/competitor-threat";

const LEVEL_COLORS: Record<string, string> = {
  "낮음":     "text-green-600 bg-green-50 border-green-200",
  "보통":     "text-yellow-600 bg-yellow-50 border-yellow-200",
  "높음":     "text-orange-600 bg-orange-50 border-orange-200",
  "매우 높음": "text-red-600 bg-red-50 border-red-200",
};

const BAR_COLORS: Record<string, string> = {
  "낮음": "bg-green-500", "보통": "bg-yellow-500", "높음": "bg-orange-500", "매우 높음": "bg-red-500",
};

const PLATFORM_LABEL: Record<string, string> = {
  naver: "스마트스토어",
  coupang: "쿠팡",
};

export default function CompetitorThreatCard({
  keyword,
  platform,
}: {
  keyword: string;
  platform: string;
}) {
  const [data, setData] = useState<CTSResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const p = platform === "coupang" ? "coupang" : "naver";
    fetch(`/api/competitor-threat?keyword=${encodeURIComponent(keyword)}&platform=${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.products) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [keyword, platform]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data || data.products.length === 0) return null;

  // 기본: 상위 5개, 전체보기: 50점 이상 전부
  const filtered50 = data.products.filter((p) => p.cts >= 50);
  const displayList = showAll ? filtered50 : data.products.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
            경쟁 위협도
            <span className={`text-xs px-2 py-0.5 rounded-lg border ${LEVEL_COLORS[getAvgLevel(data.avgCTS)]}`}>
              Top5 평균 {data.avgCTS}점
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            내가 이겨야 할 경쟁 상품들이에요. 이들의 강점과 약점을 파악해서 차별화 전략을 세우세요
          </p>
        </div>
      </div>

      {/* 플랫폼 Factor 설명 */}
      <div className="mt-3 mb-4 px-3 py-2 bg-slate-50 rounded-lg">
        <p className="text-[11px] text-gray-500">
          {data.platform === "coupang"
            ? "쿠팡: 리뷰 수, 로켓배송 여부, 가격, 평점, 검색 순위 등을 반영한 점수입니다"
            : "스마트스토어: 검색 순위, 가격 경쟁력, 할인율 등을 반영한 점수입니다"}
        </p>
      </div>

      {/* 경쟁사 리스트 */}
      <div className="space-y-2">
        {displayList.map((item) => (
          <CompetitorItem
            key={item.product.productId}
            item={item}
            isExpanded={expanded === item.product.productId}
            onToggle={() =>
              setExpanded(expanded === item.product.productId ? null : item.product.productId)
            }
          />
        ))}
      </div>

      {/* 전체보기 / 접기 토글 */}
      {filtered50.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 py-2.5 rounded-xl border border-gray-100 text-xs font-bold text-blue-500 hover:bg-blue-50 transition-colors"
        >
          {showAll ? `접기` : `전체보기 (위협 50점 이상 ${filtered50.length}개)`}
        </button>
      )}
    </div>
  );
}

function CompetitorItem({
  item,
  isExpanded,
  onToggle,
}: {
  item: ProductCTS;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { product, cts, level, rank, factors } = item;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
      {/* 메인 행 */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* 순위 */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
          rank <= 3 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400"
        }`}>
          {rank}
        </div>

        {/* 상품 이미지 */}
        {product.productImage && (
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50">
            <Image
              src={product.productImage}
              alt={product.productName}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
        )}

        {/* 상품명 + 셀러 */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{product.productName}</p>
          <p className="text-[11px] text-gray-400 truncate">
            {product.mallName} · {product.salePrice.toLocaleString()}원
          </p>
        </div>

        {/* CTS 점수 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${LEVEL_COLORS[level]}`}>
            {cts}점
          </span>
          <svg
            className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 펼침: Factor 상세 */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-50">
          <div className="space-y-2">
            {factors.map((f) => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-gray-600 font-medium">
                    {f.label}
                    {!f.measured && (
                      <span className="ml-1 text-[10px] text-amber-500 font-normal">(추정)</span>
                    )}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {f.score}점 <span className="text-gray-300">× {Math.round(f.weight * 100)}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      f.score >= 75 ? "bg-red-400" : f.score >= 50 ? "bg-amber-400" : f.score >= 25 ? "bg-blue-400" : "bg-green-400"
                    }`}
                    style={{ width: `${f.score}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* 상품 링크 */}
          <a
            href={product.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center text-xs text-blue-500 hover:text-blue-700 font-medium"
          >
            상품 페이지 보기 →
          </a>
        </div>
      )}
    </div>
  );
}

function getAvgLevel(avg: number): string {
  if (avg < 25) return "낮음";
  if (avg < 50) return "보통";
  if (avg < 75) return "높음";
  return "매우 높음";
}
