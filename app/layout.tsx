import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "쿠랭크 - 쿠팡 키워드 분석 & 추천",
  description:
    "쿠팡 셀러를 위한 무료 키워드 분석 & 추천 도구. 경쟁 강도, 검색 트렌드, 성별/연령 분포, Blue Ocean 키워드 추천까지 한번에.",
  keywords: "쿠팡 키워드 분석, 쿠팡 키워드 추천, 쿠팡 셀러 도구, 쿠팡 경쟁 분석, 쿠랭크",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 text-gray-900">
        <Providers>{children}</Providers>
        <Footer />
      </body>
    </html>
  );
}
