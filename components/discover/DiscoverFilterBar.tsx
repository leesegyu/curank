"use client";

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
}: {
  items: { value: string; label: string }[];
  selected: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition-colors shrink-0 ${
            selected === item.value
              ? "bg-blue-500 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function DiscoverFilterBar({ season, category, sort, categories, onFilterChange }: Props) {
  const categoryItems = [
    { value: "", label: "전체" },
    ...categories.map((c) => ({ value: c.name, label: c.name })),
  ];

  return (
    <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-3 flex flex-col gap-2">
      {/* 시즌 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-bold shrink-0 w-10">시즌</span>
        <ChipGroup items={SEASONS} selected={season} onChange={(v) => onFilterChange("season", v)} />
      </div>
      {/* 카테고리 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-bold shrink-0 w-10">분류</span>
        <ChipGroup items={categoryItems} selected={category} onChange={(v) => onFilterChange("category", v)} />
      </div>
      {/* 정렬 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-bold shrink-0 w-10">정렬</span>
        <ChipGroup items={SORTS} selected={sort} onChange={(v) => onFilterChange("sort", v)} />
      </div>
    </div>
  );
}
