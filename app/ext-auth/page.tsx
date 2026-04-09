"use client";

/**
 * /ext-auth?requestId=XXX
 *
 * 확장프로그램 로그인 핸드오프 페이지.
 * 1. 로그인 안 된 경우 → /login 리다이렉트 (로그인 후 이 페이지로 돌아옴)
 * 2. 로그인 된 경우   → PUT /api/ext/token 호출 → "연결 완료" 메시지
 */

import { Suspense, useEffect, useState } from "react";
import { useSession }          from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Status = "checking" | "connecting" | "done" | "error" | "no-request-id";

function ExtAuthInner() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const requestId    = searchParams.get("requestId");

  const [status, setStatus]   = useState<Status>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!requestId) {
      setStatus("no-request-id");
      return;
    }
    if (sessionStatus === "loading") return;

    if (sessionStatus === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/ext-auth?requestId=${requestId}`)}`);
      return;
    }

    setStatus("connecting");
    fetch("/api/ext/token", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ requestId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        setStatus("done");
        setMessage(session?.user?.email ?? "");
      })
      .catch((e) => {
        console.error(e);
        setStatus("error");
      });
  }, [sessionStatus, requestId, router, session]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm w-full text-center">
        <p
          className="text-2xl font-black mb-6"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          쿠랭크
        </p>

        {(status === "checking" || status === "connecting") && (
          <>
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-600">
              {status === "checking" ? "로그인 확인 중..." : "확장프로그램 연결 중..."}
            </p>
          </>
        )}

        {status === "done" && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-base font-bold text-gray-900 mb-1">확장프로그램 연결 완료!</p>
            {message && <p className="text-sm text-gray-500 mb-4">{message}</p>}
            <p className="text-xs text-gray-400 mb-6">이 탭을 닫고 확장프로그램으로 돌아가세요.</p>
            <button
              onClick={() => window.close()}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              탭 닫기
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <p className="text-base font-bold text-red-600 mb-2">연결 실패</p>
            <p className="text-sm text-gray-500 mb-4">잠시 후 다시 시도해주세요.</p>
            <Link href="/" className="text-sm text-blue-600 underline">홈으로</Link>
          </>
        )}

        {status === "no-request-id" && (
          <>
            <p className="text-sm text-gray-500 mb-4">확장프로그램에서 로그인 버튼을 통해 접근해주세요.</p>
            <Link href="/" className="text-sm text-blue-600 underline">홈으로</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function ExtAuthPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </main>
    }>
      <ExtAuthInner />
    </Suspense>
  );
}
