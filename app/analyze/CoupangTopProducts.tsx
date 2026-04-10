"use client";

import { useEffect, useState } from "react";

interface TopProduct {
  title: string;
  imageUrl: string;
  price: number;
  mallName: string;
  brand: string;
  category: string;
  coupangSearchUrl: string;
  sourceUrl: string;
}

interface Response {
  keyword: string;
  products: TopProduct[];
  coupangKeywordUrl: string;
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

  if (!loading && (!data || data.products.length === 0)) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">🛒 이 키워드 TOP 5 상품</span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 font-medium">
            경쟁 분석
          </span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">
          경쟁 상품의 가격·브랜드·카테고리를 미리 파악하고 차별화 포인트를 찾아보세요. 카드를 클릭하면 쿠팡에서 유사 상품을 볼 수 있어요
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
                href={p.coupangSearchUrl}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="group block rounded-xl border border-gray-100 hover:border-orange-300 hover:shadow-sm overflow-hidden transition-all"
                title={`${p.title} · 쿠팡에서 유사 상품 보기`}
              >
                <div className="relative aspect-square bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {p.brand && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/50 text-white max-w-[70%] truncate">
                      {p.brand}
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
                  {p.mallName && (
                    <p className="mt-0.5 text-[10px] text-gray-400 truncate">
                      {p.mallName}
                    </p>
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
              href={data.coupangKeywordUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="text-[11px] font-bold text-orange-600 hover:text-orange-700"
            >
              쿠팡에서 전체 보기 →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
