"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function HomeLogoLink() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Link
      href="/"
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          router.refresh();
        }
      }}
    >
      <span
        className="text-2xl font-black tracking-tight"
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
