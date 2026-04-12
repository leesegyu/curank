"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "홈" },
  { href: "/discover", label: "상품발굴" },
] as const;

export default function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full max-w-6xl flex gap-2 mb-6">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              active
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
