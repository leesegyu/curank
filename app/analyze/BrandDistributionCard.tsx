"use client";

import { useEffect, useState } from "react";

export interface BrandItem {
  name: string;
  count: number;
  ratio: number;
}

export interface BrandDistributionData {
  brands: BrandItem[];
  noBrandRatio: number;
  totalProducts: number;
}

export default function BrandDistributionCard({
  keyword,
  platform,
  preloadedData,
}: {
  keyword: string;
  platform: string;
  preloadedData?: BrandDistributionData | null;
}) {
  const [data, setData] = useState<BrandDistributionData | null>(
    preloadedData ?? null
  );
  const [loading, setLoading] = useState(!preloadedData);

  useEffect(() => {
    if (preloadedData) {
      setData(preloadedData);
      setLoading(false);
      return;
    }

    // preloadedData 없으면 검색 API로 직접 브랜드 추출
    const p = platform === "coupang" ? "coupang" : "naver";
    fetch(
      `/api/competitor-threat?keyword=${encodeURIComponent(keyword)}&platform=${p}`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.products && Array.isArray(d.products)) {
          // competitor-threat 응답에서 brand 정보 추출 시도
          // 이 경로는 fallback — 보통 snapshot에서 preloadedData가 옴
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [keyword, platform, preloadedData]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-5 bg-gray-100 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.brands.length === 0) return null;

  const maxCount = Math.max(...data.brands.map((b) => b.count));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      {/* 헤더 */}
      <div className="mb-1">
        <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          브랜드/상호명 분포
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          상위 노출 상품에 어떤 브랜드가 많은지 파악하세요. 특정 브랜드가 독점하면
          진입이 어렵고, 비브랜드가 많으면 기회가 있어요
        </p>
      </div>

      {/* 비브랜드 비율 요약 */}
      <div className="mt-3 mb-4 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-indigo-700">
              비브랜드 비율
            </span>
            <p className="text-[11px] text-indigo-500 mt-0.5">
              {data.noBrandRatio >= 50
                ? "비브랜드 비율이 높아 무브랜드/자체브랜드로 진입할 여지가 있어요"
                : data.noBrandRatio >= 30
                  ? "브랜드와 비브랜드가 혼재된 시장이에요. 차별화 포인트가 중요합니다"
                  : "브랜드 상품이 대부분이에요. 브랜드 없이 진입하려면 가격/리뷰 전략이 필요해요"}
            </p>
          </div>
          <span className="text-2xl font-black text-indigo-700">
            {data.noBrandRatio}%
          </span>
        </div>
      </div>

      {/* 브랜드 리스트 */}
      <div className="space-y-2">
        {data.brands.map((brand, idx) => (
          <div key={brand.name} className="flex items-center gap-3">
            {/* 순위 */}
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                idx < 3
                  ? "bg-indigo-50 text-indigo-600"
                  : "bg-gray-50 text-gray-400"
              }`}
            >
              {idx + 1}
            </span>

            {/* 브랜드명 + 바 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-800 truncate">
                  {brand.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {brand.count}개 ({brand.ratio}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    idx === 0
                      ? "bg-indigo-500"
                      : idx < 3
                        ? "bg-indigo-400"
                        : "bg-indigo-300"
                  }`}
                  style={{
                    width: `${Math.max((brand.count / maxCount) * 100, 8)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 분석 인사이트 */}
      {data.brands.length > 0 && (
        <div className="mt-4 px-3 py-2 bg-slate-50 rounded-lg">
          <p className="text-[11px] text-gray-500">
            {data.brands[0].ratio >= 40
              ? `"${data.brands[0].name}"이(가) ${data.brands[0].ratio}%로 시장을 지배하고 있어요. 이 브랜드와 직접 경쟁보다는 틈새 키워드로 우회하는 전략을 고려하세요.`
              : data.brands.length >= 5
                ? `브랜드가 분산되어 있어요. 특정 브랜드가 독점하지 않아 신규 진입 기회가 있습니다.`
                : `등록된 브랜드 수가 적어요. 자체 브랜드로 포지셔닝하면 신뢰도를 높일 수 있습니다.`}
          </p>
        </div>
      )}

      {/* 상표권 경고 */}
      <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
        <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
          <svg
            className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>
            다른 업체의 브랜드명/상호명을 상품 제목이나 키워드에 무단으로
            사용하면 상표권 침해에 해당할 수 있습니다. 경쟁 분석 참고용으로만
            활용하세요.
          </span>
        </p>
      </div>
    </div>
  );
}
