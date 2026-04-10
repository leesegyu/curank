import { Suspense } from "react";
import { auth, signOut } from "@/auth";
import { trackEvent } from "@/lib/events";
import { redirect } from "next/navigation";
import Link from "next/link";
import HomeLogoLink from "@/components/HomeLogoLink";
import FeedGrid from "@/components/feed/FeedGrid";
import SearchFormClient from "@/components/SearchFormClient";
import UsageBadge from "@/components/UsageBadge";
import AnalysisBlocksSection from "@/components/AnalysisBlocksSection";

export default async function Home() {
  const session = await auth();

  async function search(formData: FormData) {
    "use server";
    const keyword = formData.get("keyword")?.toString().trim();
    if (!keyword) return;
    const platform = formData.get("platform")?.toString() || "naver";
    const s = await auth();
    if (s?.user?.id) trackEvent(s.user.id, "search", keyword, { source: "home", platform });
    redirect(`/analyze?keyword=${encodeURIComponent(keyword)}&platform=${platform}`);
  }

  const isLoggedIn = !!session;
  const onboardingComplete = !!(session?.user as Record<string, unknown> | undefined)?.onboardingComplete;

  return (
    <main className="flex flex-col flex-1 items-center px-4 py-8">

      {/* ── 상단 네비게이션 ── */}
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

      {/* ── 검색 영역 ── */}
      <div className="w-full max-w-xl text-center mb-8">
        {!isLoggedIn && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              키워드 <span style={{ color: "#3b82f6" }}>분석</span>부터&nbsp;
              <span style={{ color: "#f59e0b" }}>추천</span>까지
            </h2>
            <p className="text-gray-400 text-sm mb-5">
              쿠팡 셀러를 위한 무료 키워드 경쟁 분석 도구
            </p>
          </>
        )}

        <SearchFormClient variant="home" action={search} clientMode={isLoggedIn} />
      </div>

      {/* ── 로그인 + 온보딩 완료: 분석 블록 + 개인화 피드 ── */}
      {isLoggedIn && onboardingComplete && (
        <>
          <Suspense><AnalysisBlocksSection /></Suspense>
          <div className="w-full max-w-6xl">
            <FeedGrid />
          </div>
        </>
      )}

      {/* ── 로그인 + 온보딩 미완료: 프로필 설정 안내 ── */}
      {isLoggedIn && !onboardingComplete && (
        <div className="flex flex-col items-center justify-center flex-1 py-20">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-700 mb-2">
            셀러 프로필을 설정해주세요
          </p>
          <p className="text-sm text-gray-400 mb-6">
            관심 카테고리를 선택하면 맞춤 키워드 피드가 시작됩니다
          </p>
          <Link
            href="/onboarding"
            className="px-6 py-2.5 rounded-full text-white font-bold text-sm hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}
          >
            프로필 설정하기
          </Link>
        </div>
      )}

      {/* ── 비로그인 시: 빈 화면 + CTA ── */}
      {!isLoggedIn && (
        <div className="flex flex-col items-center justify-center flex-1 py-20">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-6">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 4C10.268 4 4 10.268 4 18s6.268 14 14 14 14-6.268 14-14S25.732 4 18 4z" stroke="#93c5fd" strokeWidth="2" fill="none"/>
              <path d="M14 15c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10 26c1-4 4-6 8-6s7 2 8 6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-lg font-bold text-gray-700 mb-2">
            로그인하시면 개인 맞춤 상품과 키워드가 나타납니다.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            관심 카테고리 기반으로 지금 팔면 좋은 키워드를 추천해드려요
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full text-white font-bold text-sm hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="px-6 py-2.5 rounded-full border border-gray-200 text-gray-600 font-bold text-sm hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              회원가입
            </Link>
          </div>
        </div>
      )}

    </main>
  );
}
