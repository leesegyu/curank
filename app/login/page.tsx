"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { detectInAppBrowser, openInExternalBrowser, type InAppBrowserInfo } from "@/lib/in-app-browser";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") || "/";
  const signedUp     = searchParams.get("signup") === "1";
  const oauthError   = searchParams.get("error");

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(
    oauthError === "EMAIL_REQUIRED"
      ? "카카오 로그인 시 이메일 동의가 필요합니다. 카카오 설정에서 이메일 제공에 동의해주세요."
      : ""
  );
  const [loading, setLoading]   = useState(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: email.toLowerCase().trim(),
      password,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error.includes("EMAIL_NOT_VERIFIED")) {
        setError("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
      } else {
        setError("이메일 또는 비밀번호가 올바르지 않습니다");
      }
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50">
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
          <h1 className="text-xl font-black text-gray-900 mb-1">로그인</h1>
          <p className="text-sm text-gray-400 mb-6">키워드 분석을 시작해보세요</p>

          {/* 앱 내 브라우저 경고 */}
          {inApp.isInApp && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-bold text-amber-800 mb-1">
                ⚠️ {inApp.name} 인앱 브라우저에서는 Google 로그인이 제한됩니다
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

          {/* 회원가입 완료 안내 */}
          {signedUp && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700 font-medium">
              회원가입 완료! 로그인해주세요
            </div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 소셜 로그인 */}
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={() => {
                if (inApp.isInApp) {
                  setError(`${inApp.name} 인앱 브라우저에서는 Google 로그인이 제한됩니다. 위의 안내대로 ${inApp.isIOS ? "Safari" : "Chrome"}에서 열어주세요.`);
                  return;
                }
                signIn("google", { callbackUrl });
              }}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={inApp.isInApp}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Google로 로그인
            </button>
            {/* 카카오 로그인 — 비활성화 (필요 시 주석 해제) */}
            {/* <button
              type="button"
              onClick={() => signIn("kakao", { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border text-sm font-medium text-gray-800 hover:opacity-90 transition-opacity"
              style={{ borderColor: "#FEE500", backgroundColor: "#FEE500" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 1.5C4.86 1.5 1.5 4.136 1.5 7.4c0 2.1 1.392 3.938 3.488 4.983l-.888 3.314c-.078.292.263.524.512.347L8.82 13.56c.058.004.117.006.18.006 4.14 0 7.5-2.636 7.5-5.9S13.14 1.5 9 1.5Z" fill="#3C1E1E"/>
              </svg>
              카카오로 로그인
            </button> */}
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300">또는</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="비밀번호 입력"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-4">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="text-blue-600 font-bold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
