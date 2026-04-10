"use client";

import Link from "next/link";

export default function BackToHomeLink() {
  return (
    <Link href="/" className="cursor-pointer">
      <span
        className="text-2xl font-black"
        style={{
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        쿠랭크
      </span>
    </Link>
  );
}
