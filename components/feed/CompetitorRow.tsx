"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import type { ProductCTS } from "@/lib/competitor-threat";

/**
 * 홈 피드 "내 경쟁사 상품" Row
 * 최근 분석 키워드 → CTS 상위 5개 경쟁 상품 표시
 */
export default function CompetitorRow() {
  const { data: session } = useSession();
  const [competitors, setCompetitors] = useState<(ProductCTS & { srcKeyword: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) { setLoading(false); return; }

    // 최근 분석 키워드 가져오기
    fetch("/api/user/history")
      .then((r) => r.json())
      .then(async (data) => {
        const items = data?.history ?? data;
        if (!Array.isArray(items) || items.length === 0) { setLoading(false); return; }

        // 최근 3개 키워드에서 CTS 조회
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

        // 60점 이상만, CTS 높은 순, 중복 셀러 제거, 최대 8개
        const seen = new Set<string>();
        const unique = all
          .filter((item) => item.cts >= 60)
          .sort((a, b) => b.cts - a.cts)
          .filter((item) => {
            if (seen.has(item.product.mallName)) return false;
            seen.add(item.product.mallName);
            return true;
          })
          .slice(0, 8);

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
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-48 h-52 rounded-2xl bg-gray-50 animate-pulse flex-shrink-0" />
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

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {competitors.map((item, idx) => (
          <div
            key={`${item.product.productId}-${idx}`}
            className="flex-shrink-0 w-48 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-blue-200 transition-all"
          >
            {/* 상품 이미지 */}
            {item.product.productImage ? (
              <div className="relative w-full h-32 bg-gray-50">
                <Image
                  src={item.product.productImage}
                  alt={item.product.productName}
                  fill
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
              <div className="w-full h-32 bg-gray-50 flex items-center justify-center">
                <span className="text-2xl text-gray-200">📦</span>
              </div>
            )}

            {/* 상품 정보 */}
            <div className="p-3">
              <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight mb-1.5">
                {item.product.productName}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700">
                  {item.product.salePrice.toLocaleString()}원
                </span>
                <span className="text-[10px] text-gray-400">{item.product.mallName}</span>
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
        ))}
      </div>
    </section>
  );
}
