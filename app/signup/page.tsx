"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import PlatformCategoryPicker from "@/components/PlatformCategoryPicker";
import type { PlatformCategories } from "@/components/PlatformCategoryPicker";
import { detectInAppBrowser, openInExternalBrowser, type InAppBrowserInfo } from "@/lib/in-app-browser";

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
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner",     label: "초보",   desc: "6개월 미만" },
  { value: "intermediate", label: "중급",   desc: "6개월~2년" },
  { value: "expert",       label: "고수",   desc: "2년 이상" },
];

const PLATFORM_OPTIONS = [
  { value: "coupang",      label: "쿠팡" },
  { value: "smartstore",   label: "스마트스토어" },
  { value: "both",         label: "둘 다" },
  { value: "other",        label: "기타" },
];

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");

  // Step 2 — 셀러 프로필
  const [sellingExperience, setSellingExperience] = useState("");
  const [mainCategories, setMainCategories]       = useState<string[]>([]);
  const [mainPlatform, setMainPlatform]           = useState("");
  const [platformCategories, setPlatformCategories] = useState<PlatformCategories>({ smartstore: [], coupang: [] });

  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [inApp, setInApp] = useState<InAppBrowserInfo>({ isInApp: false, name: "", isIOS: false, isAndroid: false });
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    setInApp(detectInAppBrowser());
  }, []);

  const handleOpenExternal = () => {
    const { copied } = openInExternalBrowser(inApp);
    if (copied) {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 3000);
    }
  };

  function toggleCategory(code: string) {
    setMainCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim())         { setError("이름을 입력해주세요"); return; }
    if (password !== confirm) { setError("비밀번호가 일치하지 않습니다"); return; }
    if (password.length < 8)  { setError("비밀번호는 8자 이상이어야 합니다"); return; }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email, password, name,
        sellingExperience: sellingExperience || null,
        mainCategories,
        mainPlatform: mainPlatform || null,
        platformCategories,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "회원가입에 실패했습니다");
      setStep(1);
    } else {
      // 이메일 인증 안내 페이지로 이동
      router.push("/verify-email?status=pending");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50 py-10">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <Link href="/" className="flex justify-center mb-8">
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
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">

          {/* 단계 표시 */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "text-white" : "bg-gray-100 text-gray-400"}`}
              style={step >= 1 ? { background: "linear-gradient(135deg, #3b82f6, #6366f1)" } : {}}>
              1
            </div>
            <div className={`flex-1 h-0.5 rounded ${step >= 2 ? "bg-blue-400" : "bg-gray-100"}`} />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? "text-white" : "bg-gray-100 text-gray-400"}`}
              style={step >= 2 ? { background: "linear-gradient(135deg, #3b82f6, #6366f1)" } : {}}>
              2
            </div>
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ── Step 1: 계정 정보 ── */}
          {step === 1 && (
            <>
              <h1 className="text-xl font-black text-gray-900 mb-1">계정 만들기</h1>
              <p className="text-sm text-gray-400 mb-6">무료로 시작하세요</p>

              {/* 소셜 로그인 */}
              {/* 앱 내 브라우저 경고 */}
              {inApp.isInApp && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-bold text-amber-800 mb-1">
                    ⚠️ {inApp.name} 인앱 브라우저에서는 Google 회원가입이 제한됩니다
                  </p>
                  <p className="text-[11px] text-amber-700 leading-relaxed mb-3">
                    Google 보안 정책으로 인해 앱 내 브라우저에서 로그인이 차단됩니다.
                    {inApp.isIOS ? " Safari" : " Chrome"}에서 열어주세요.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors"
                  >
                    {urlCopied
                      ? "✅ URL 복사됨! Safari/Chrome에서 붙여넣기"
                      : inApp.isAndroid
                        ? "Chrome에서 열기"
                        : "URL 복사하기"}
                  </button>
                  {inApp.isIOS && (
                    <p className="mt-2 text-[10px] text-amber-600 leading-relaxed">
                      💡 또는 화면 우측 상단 <strong>···</strong> 메뉴 → <strong>&ldquo;Safari에서 열기&rdquo;</strong> 선택
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    if (inApp.isInApp) {
                      setError(`${inApp.name} 인앱 브라우저에서는 Google 회원가입이 제한됩니다. 위의 안내대로 ${inApp.isIOS ? "Safari" : "Chrome"}에서 열어주세요.`);
                      return;
                    }
                    signIn("google", { callbackUrl: "/" });
                  }}
                  disabled={inApp.isInApp}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  Google로 시작하기
                </button>
                {/* 카카오 로그인 — 비활성화 (필요 시 주석 해제) */}
                {/* <button
                  type="button"
                  onClick={() => signIn("kakao", { callbackUrl: "/" })}
                  className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-800 hover:bg-yellow-50 transition-colors"
                  style={{ borderColor: "#FEE500", backgroundColor: "#FEE500" }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 1.5C4.86 1.5 1.5 4.136 1.5 7.4c0 2.1 1.392 3.938 3.488 4.983l-.888 3.314c-.078.292.263.524.512.347L8.82 13.56c.058.004.117.006.18.006 4.14 0 7.5-2.636 7.5-5.9S13.14 1.5 9 1.5Z" fill="#3C1E1E"/>
                  </svg>
                  카카오로 시작하기
                </button> */}
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-300">또는</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">
                    이름 <span className="text-red-400 font-normal">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">비밀번호</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8자 이상"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="비밀번호 재입력"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                >
                  다음 →
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: 셀러 프로필 ── */}
          {step === 2 && (
            <>
              <h1 className="text-xl font-black text-gray-900 mb-1">셀러 프로필</h1>
              <p className="text-sm text-gray-400 mb-6">맞춤 키워드 피드에 활용됩니다</p>

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

                {/* 관심 카테고리 (플랫폼별 L1+L2) */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">
                    관심 카테고리 <span className="text-red-400 font-normal">*</span> <span className="text-gray-300 font-normal">(L1 클릭 후 ▼로 세부 카테고리 선택)</span>
                  </label>
                  <PlatformCategoryPicker
                    platform={mainPlatform || "both"}
                    initialCategories={platformCategories}
                    onChange={(cats) => {
                      setPlatformCategories(cats);
                      // 하위 호환: main_categories에도 L1 코드 저장
                      const allIds = [...cats.smartstore, ...cats.coupang];
                      setMainCategories(allIds);
                    }}
                  />
                </div>

                {platformCategories.smartstore.length === 0 && platformCategories.coupang.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">관심 카테고리를 1개 이상 선택해주세요. 맞춤 키워드 피드에 활용됩니다.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    ← 이전
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (platformCategories.smartstore.length === 0 && platformCategories.coupang.length === 0)}
                    className="flex-2 flex-grow py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
                  >
                    {loading ? "가입 중..." : "가입 완료"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-blue-600 font-bold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
