"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlatformCategoryPicker from "@/components/PlatformCategoryPicker";
import type { PlatformCategories } from "@/components/PlatformCategoryPicker";

const EXPERIENCE_OPTIONS = [
  { value: "beginner",     label: "초보",   desc: "6개월 미만" },
  { value: "intermediate", label: "중급",   desc: "6개월~2년" },
  { value: "expert",       label: "고수",   desc: "2년 이상" },
];

const PLATFORM_OPTIONS = [
  { value: "coupang",    label: "쿠팡" },
  { value: "smartstore", label: "스마트스토어" },
  { value: "both",       label: "둘 다" },
  { value: "other",      label: "기타" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();

  const [sellingExperience, setSellingExperience] = useState("");
  const [mainPlatform, setMainPlatform]           = useState("");
  const [platformCategories, setPlatformCategories] = useState<PlatformCategories>({ smartstore: [], coupang: [] });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const hasCategories = platformCategories.smartstore.length > 0 || platformCategories.coupang.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasCategories) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selling_experience: sellingExperience || null,
        main_platform: mainPlatform || null,
        main_categories: [...platformCategories.smartstore, ...platformCategories.coupang],
        platform_categories: platformCategories,
      }),
    });

    if (!res.ok) {
      setError("저장에 실패했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    // JWT 세션 갱신 (onboardingComplete 반영)
    await update();

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 py-10">
      <div className="w-full max-w-sm">
        <button onClick={() => signOut({ callbackUrl: "/" })} className="flex justify-center mb-8">
          <span
            className="text-3xl font-black"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            쿠랭크
          </span>
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <h1 className="text-xl font-black text-gray-900 mb-1">셀러 프로필 설정</h1>
          <p className="text-sm text-gray-400 mb-6">맞춤 키워드 피드에 활용됩니다</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 판매 경험 */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">판매 경험</label>
              <div className="grid grid-cols-3 gap-2">
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSellingExperience(opt.value === sellingExperience ? "" : opt.value)}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all ${
                      sellingExperience === opt.value
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-bold">{opt.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 주력 플랫폼 */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">주력 판매 플랫폼</label>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMainPlatform(opt.value === mainPlatform ? "" : opt.value)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all ${
                      mainPlatform === opt.value
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 관심 카테고리 */}
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">
                관심 카테고리 <span className="text-red-400 font-normal">*</span>
                <span className="text-gray-300 font-normal"> (L1 클릭 후 ▼로 세부 카테고리 선택)</span>
              </label>
              <PlatformCategoryPicker
                platform={mainPlatform || "both"}
                initialCategories={platformCategories}
                onChange={setPlatformCategories}
              />
            </div>

            {!hasCategories && (
              <p className="text-xs text-red-500 mt-1">
                관심 카테고리를 1개 이상 선택해주세요. 맞춤 키워드 피드에 활용됩니다.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                돌아가기
              </button>
              <button
                type="submit"
                disabled={loading || !hasCategories}
                className="flex-[2] py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
              >
                {loading ? "저장 중..." : "시작하기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
