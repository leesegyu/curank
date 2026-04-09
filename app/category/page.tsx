"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const CATEGORIES = [
  { name: "패션의류",      code: "50000000", emoji: "👗" },
  { name: "패션잡화",      code: "50000001", emoji: "👜" },
  { name: "화장품/미용",   code: "50000002", emoji: "💄" },
  { name: "디지털/가전",   code: "50000003", emoji: "💻" },
  { name: "가구/인테리어", code: "50000004", emoji: "🛋️" },
  { name: "출산/육아",     code: "50000005", emoji: "👶" },
  { name: "식품",          code: "50000006", emoji: "🍎" },
  { name: "스포츠/레저",   code: "50000007", emoji: "⚽" },
  { name: "생활/건강",     code: "50000008", emoji: "🏥" },
  { name: "여가/생활편의", code: "50000009", emoji: "🎭" },
  { name: "면세점",        code: "50000010", emoji: "🛍️" },
  { name: "도서",          code: "50005542", emoji: "📚" },
];

interface KeywordItem {
  rank: number;
  keyword: string;
}

function CategoryContent() {
  const searchParams = useSearchParams();

  const catCode = searchParams.get("cat") ?? CATEGORIES[0].code;
  const selectedCat = CATEGORIES.find((c) => c.code === catCode) ?? CATEGORIES[0];

  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchKeywords = useCallback(async (code: string, name: string) => {
    setLoading(true);
    setShowAll(false);
    try {
      const res = await fetch(`/api/category?code=${code}&name=${encodeURIComponent(name)}`);
      const json = await res.json();
      setKeywords(json.keywords ?? []);
    } catch {
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeywords(selectedCat.code, selectedCat.name);
  }, [selectedCat.code, selectedCat.name, fetchKeywords]);

  const visible = showAll ? keywords : keywords.slice(0, 30);

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-2xl font-black text-blue-600">쿠랭크</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-blue-600 transition-colors">← 홈</Link>
      </div>

      <h1 className="text-xl font-black text-gray-900 mb-1">카테고리별 인기 키워드</h1>
      <p className="text-sm text-gray-400 mb-5">키워드를 클릭하면 경쟁 강도를 분석합니다</p>

      {/* 카테고리 탭 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.code}
            href={`/category?cat=${cat.code}`}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
              mounted && selectedCat.code === cat.code
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>

      {/* 키워드 목록 */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {visible.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">데이터 없음</p>
            ) : (
              visible.map((kw) => (
                <div
                  key={kw.rank}
                  className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-blue-50 transition-colors group"
                >
                  {/* 순위 */}
                  <span
                    className={`text-sm font-black w-7 shrink-0 text-center ${
                      kw.rank === 1
                        ? "text-yellow-500"
                        : kw.rank === 2
                        ? "text-gray-400"
                        : kw.rank === 3
                        ? "text-amber-600"
                        : kw.rank <= 10
                        ? "text-blue-400"
                        : "text-gray-300"
                    }`}
                  >
                    {kw.rank}
                  </span>

                  {/* 키워드 */}
                  <span className="flex-1 text-sm font-medium text-gray-800 group-hover:text-blue-700">
                    {kw.keyword}
                  </span>

                  {/* 분석 버튼 */}
                  <Link
                    href={`/analyze?keyword=${encodeURIComponent(kw.keyword)}`}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    분석하기 →
                  </Link>
                </div>
              ))
            )}
          </div>

          {/* 더보기 */}
          {!showAll && keywords.length > 30 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-3 w-full py-3 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              더보기 ({keywords.length - 30}개) →
            </button>
          )}

          <p className="mt-3 text-xs text-center text-gray-400">
            총 {keywords.length}개 키워드 · {selectedCat.name} 카테고리
          </p>
        </>
      )}
    </main>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>}>
      <CategoryContent />
    </Suspense>
  );
}
