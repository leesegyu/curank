"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const STATUS_MAP: Record<string, { title: string; desc: string; color: string }> = {
  success: {
    title: "인증 완료!",
    desc: "이메일 인증이 완료되었습니다. 이제 로그인하실 수 있습니다.",
    color: "green",
  },
  pending: {
    title: "인증 메일을 확인해주세요",
    desc: "입력하신 이메일로 인증 링크를 보내드렸습니다. 메일함(스팸함 포함)을 확인해주세요.",
    color: "blue",
  },
  expired: {
    title: "인증 링크 만료",
    desc: "인증 링크가 만료되었습니다. 같은 이메일로 다시 회원가입하시면 새 인증 메일이 발송됩니다.",
    color: "amber",
  },
  invalid: {
    title: "유효하지 않은 링크",
    desc: "인증 링크가 올바르지 않습니다. 회원가입을 다시 시도해주세요.",
    color: "red",
  },
  already: {
    title: "이미 인증됨",
    desc: "이미 이메일 인증이 완료되었습니다. 로그인해주세요.",
    color: "blue",
  },
};

const COLOR_CLASSES: Record<string, string> = {
  green: "bg-green-50 border-green-200 text-green-700",
  blue:  "bg-blue-50 border-blue-200 text-blue-700",
  amber: "bg-amber-50 border-amber-200 text-amber-700",
  red:   "bg-red-50 border-red-200 text-red-700",
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") || "pending";
  const info = STATUS_MAP[status] || STATUS_MAP.pending;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
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

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
          <div className={`mb-6 px-4 py-4 rounded-xl border ${COLOR_CLASSES[info.color]}`}>
            <h1 className="text-lg font-bold mb-1">{info.title}</h1>
            <p className="text-sm leading-relaxed">{info.desc}</p>
          </div>

          {(status === "success" || status === "already") && (
            <Link
              href="/login"
              className="inline-block w-full py-3 rounded-xl text-white font-bold text-sm text-center transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              로그인하기
            </Link>
          )}

          {status === "pending" && (
            <p className="text-xs text-gray-400 mt-2">
              메일이 오지 않나요? 스팸함을 확인하거나, 같은 이메일로 다시{" "}
              <Link href="/signup" className="text-blue-500 hover:underline">회원가입</Link>
              하시면 인증 메일이 재발송됩니다.
            </p>
          )}

          {(status === "expired" || status === "invalid") && (
            <Link
              href="/signup"
              className="inline-block w-full py-3 rounded-xl text-white font-bold text-sm text-center transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              회원가입 다시하기
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
