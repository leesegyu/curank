"use client";

import { useState } from "react";

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  season: string;
  category: string;
  sort: string;
  categories: CategoryOption[];
  onFilterChange: (key: string, value: string) => void;
  isFree?: boolean;
}

const SEASONS = [
  { value: "", label: "전체" },
  { value: "spring", label: "봄" },
  { value: "summer", label: "여름" },
  { value: "autumn", label: "가을" },
  { value: "winter", label: "겨울" },
];

const SORTS = [
  { value: "upside", label: "잠재력순" },
  { value: "volume", label: "검색량순" },
  { value: "peak_soon", label: "피크 임박순" },
];

function ChipGroup({
  items,
  selected,
  onChange,
  locked,
  onLockedClick,
}: {
  items: { value: string; label: string }[];
  selected: string;
  onChange: (v: string) => void;
  locked?: boolean;
  onLockedClick?: () => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {items.map((item) => {
        const isDefault = item.value === "" || item.value === "upside";
        const isLocked = locked && !isDefault;

        return (
          <button
            key={item.value}
            onClick={() => {
              if (isLocked) {
                onLockedClick?.();
                return;
              }
              onChange(item.value);
            }}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 relative ${
              selected === item.value
                ? "bg-blue-500 text-white"
                : isLocked
                ? "bg-gray-50 text-gray-300 cursor-pointer"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {item.label}
            {isLocked && <span className="ml-0.5 text-[9px]">🔒</span>}
          </button>
        );
      })}
    </div>
  );
}

export default function DiscoverFilterBar({ season, category, sort, categories, onFilterChange, isFree = false }: Props) {
  const [toast, setToast] = useState("");

  function showUpgradeToast() {
    setToast("유료 플랜에서 시즌/카테고리/정렬 필터를 사용할 수 있습니다");
    setTimeout(() => setToast(""), 3000);
  }

  const categoryItems = [
    { value: "", label: "전체" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  return (
    <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-3 flex flex-col gap-2">
      {/* 토스트 */}
      {toast && (
        <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg text-center animate-fade-in">
          {toast}
          <a href="/pricing" target="_blank" className="ml-2 underline">플랜 보기</a>
        </div>
      )}
      {/* 시즌 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-bold shrink-0 w-10">시즌</span>
        <ChipGroup items={SEASONS} selected={season} onChange={(v) => onFilterChange("season", v)} locked={isFree} onLockedClick={showUpgradeToast} />
      </div>
      {/* 카테고리 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-bold shrink-0 w-10">분류</span>
        <ChipGroup items={categoryItems} selected={category} onChange={(v) => onFilterChange("category", v)} locked={isFree} onLockedClick={showUpgradeToast} />
      </div>
      {/* 정렬 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-bold shrink-0 w-10">정렬</span>
        <ChipGroup items={SORTS} selected={sort} onChange={(v) => onFilterChange("sort", v)} locked={isFree} onLockedClick={showUpgradeToast} />
      </div>
    </div>
  );
}
