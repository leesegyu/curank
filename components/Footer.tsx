import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <span>&copy; 2026 쿠랭크</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-gray-600 transition-colors">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-gray-600 transition-colors">
            개인정보처리방침
          </Link>
        </div>
      </div>
    </footer>
  );
}
