import { Suspense } from "react";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";
import UsageBadge from "@/components/UsageBadge";
import TabNav from "@/components/TabNav";
import DiscoverClient from "@/components/discover/DiscoverClient";

export const metadata = {
  title: "상품발굴 - 쿠랭크",
  description: "지금 상승 초입인 시즌 키워드를 카테고리별로 탐색하세요",
};

export default async function DiscoverPage() {
  const session = await auth();

  return (
    <main className="flex flex-col flex-1 items-center px-4 py-8">
      {/* 상단 네비게이션 */}
      <div className="w-full max-w-6xl flex items-center justify-between mb-6">
        <HomeLogoLink />
        {session ? (
          <div className="flex items-center gap-3">
            <UsageBadge />
            <span className="text-xs text-gray-400">
              {session.user?.name || session.user?.email}님
            </span>
            <Link href="/pricing" className="text-xs text-indigo-500 font-bold hover:text-indigo-700 transition-colors">
              요금제
            </Link>
            <Link href="/mypage" className="text-xs text-blue-600 font-bold hover:text-blue-700 transition-colors">
              마이페이지
            </Link>
            <form action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}>
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                로그아웃
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-xs text-indigo-500 font-bold hover:text-indigo-700 transition-colors">
              요금제
            </Link>
            <Link href="/login" className="text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium">
              로그인
            </Link>
            <Link
              href="/signup"
              className="text-xs px-3 py-1.5 rounded-full text-white font-bold transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              회원가입
            </Link>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <TabNav />

      {/* 타이틀 */}
      <div className="w-full max-w-6xl mb-4">
        <h1 className="text-lg font-bold text-gray-800">
          상품발굴 — <span className="text-emerald-600">지금 뜨는</span> 시즌 키워드
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          작년 12개월 검색 패턴 기반, 현재 상승 초입인 키워드만 모았습니다
        </p>
      </div>

      {/* 클라이언트 영역 (필터 + 카드) */}
      <div className="w-full max-w-6xl">
        <Suspense fallback={<DiscoverSkeleton />}>
          <DiscoverClient />
        </Suspense>
      </div>
    </main>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-52 animate-pulse">
          <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
          <div className="h-5 bg-gray-100 rounded w-32 mb-3" />
          <div className="h-10 bg-gray-50 rounded mb-3" />
          <div className="h-3 bg-gray-100 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
