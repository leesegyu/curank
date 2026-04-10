"use client";

import { useEffect, useState } from "react";

interface CoupangProduct {
  title: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviewCount: number;
  productUrl: string;
  rocketDelivery: boolean;
}

interface Response {
  keyword: string;
  products: CoupangProduct[];
  fallback: boolean;
  searchUrl: string;
}

export default function CoupangTopProducts({ keyword }: { keyword: string }) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/coupang-products?keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((json: Response) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [keyword]);

  // 데이터 없으면 카드 숨김 (UX 원칙)
  if (!loading && (!data || (data.products.length === 0 && !data.searchUrl))) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">🛒 이 키워드 쿠팡 TOP 5 상품</span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 font-medium">
            경쟁 분석
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          경쟁 상품을 미리 파악하고 차별화 포인트를 찾아보세요. 가격, 리뷰 수, 판매 전략 분석에 활용하세요
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-square bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-3 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-2/3 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {!loading && data && data.products.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {data.products.map((p, idx) => (
              <a
                key={`${idx}-${p.title}`}
                href={p.productUrl}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="group block rounded-xl border border-gray-100 hover:border-orange-300 hover:shadow-sm overflow-hidden transition-all"
              >
                <div className="relative aspect-square bg-gray-50">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      이미지 없음
                    </div>
                  )}
                  {p.rocketDelivery && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">
                      로켓
                    </span>
                  )}
                  {p.discount && p.discount > 0 && (
                    <span className="absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">
                      {p.discount}%
                    </span>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[11px] text-gray-700 line-clamp-2 group-hover:text-orange-600 leading-snug min-h-[28px]">
                    {p.title}
                  </p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-sm font-bold text-gray-900">
                      {p.price.toLocaleString()}원
                    </span>
                  </div>
                  {p.reviewCount > 0 && (
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-400">
                      <span className="text-orange-400">★</span>
                      <span>{p.rating.toFixed(1)}</span>
                      <span>({p.reviewCount.toLocaleString()})</span>
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">
              ※ 쿠팡 파트너스 활동의 일환으로 수수료를 제공받을 수 있음
            </p>
            <a
              href={data.searchUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700"
            >
              쿠팡에서 전체 보기 →
            </a>
          </div>
        </>
      )}

      {!loading && data && data.products.length === 0 && data.fallback && (
        <div className="py-6 text-center">
          <p className="text-xs text-gray-400 mb-3">
            쿠팡 상품 정보를 불러오지 못했어요
          </p>
          <a
            href={data.searchUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="inline-block px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
          >
            쿠팡에서 직접 검색하기
          </a>
        </div>
      )}
    </div>
  );
}
