"use client";

import { useState } from "react";
import PlatformSelector, { type SearchPlatform } from "./PlatformSelector";

interface SearchFormClientProps {
  defaultKeyword?: string;
  defaultPlatform?: SearchPlatform;
  variant: "home" | "header";
  action: (fd: FormData) => void;
  /** true면 서버 action 대신 window 이벤트로 분석 시작 */
  clientMode?: boolean;
}

export default function SearchFormClient({
  defaultKeyword = "",
  defaultPlatform = "naver",
  variant,
  action,
  clientMode = false,
}: SearchFormClientProps) {
  const [platform, setPlatform] = useState<SearchPlatform>(defaultPlatform);

  function handleClientSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!clientMode) return; // 서버 action 사용
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const keyword = fd.get("keyword")?.toString().trim();
    if (!keyword) return;
    window.dispatchEvent(
      new CustomEvent("start-analysis", { detail: { keyword, platform } })
    );
    // 입력 필드 초기화
    const input = e.currentTarget.querySelector("input[name=keyword]") as HTMLInputElement;
    if (input) input.value = "";
  }

  if (variant === "header") {
    return (
      <div className="flex flex-col items-end gap-2">
        <PlatformSelector value={platform} onChange={setPlatform} size="sm" />
        <form action={action}>
          <input type="hidden" name="platform" value={platform} />
          <div className="flex gap-2">
            <input
              type="text"
              name="keyword"
              defaultValue={defaultKeyword}
              placeholder="다른 키워드 분석"
              className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none w-44"
            />
            <button
              type="submit"
              className="px-4 py-2 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
            >
              분석
            </button>
          </div>
        </form>
      </div>
    );
  }

  // variant === "home"
  return (
    <div className="flex flex-col items-center gap-3">
      <PlatformSelector value={platform} onChange={setPlatform} size="md" />
      <form action={clientMode ? undefined : action} onSubmit={handleClientSubmit} className="w-full">
        <input type="hidden" name="platform" value={platform} />
        <div className="flex rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white">
          <input
            type="text"
            name="keyword"
            placeholder="분석할 키워드 입력 (예: 에어팟, 무선청소기)"
            className="flex-1 px-5 py-4 text-base outline-none bg-transparent text-gray-800 placeholder-gray-300"
            autoFocus
            required
          />
          <button
            type="submit"
            className="px-7 py-4 text-white font-bold text-sm transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
          >
            분석하기
          </button>
        </div>
      </form>
    </div>
  );
}
