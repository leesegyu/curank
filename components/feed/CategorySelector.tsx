"use client";

/**
 * 관심 카테고리 선택 UI (OAuth 가입 후 온보딩)
 * 피드 상단에 표시, 플랫폼별 L1+L2 선택 가능
 */

import { useState } from "react";
import PlatformCategoryPicker from "@/components/PlatformCategoryPicker";
import type { PlatformCategories } from "@/components/PlatformCategoryPicker";

const PLATFORM_OPTIONS = [
  { value: "coupang",    label: "쿠팡" },
  { value: "smartstore", label: "스마트스토어" },
  { value: "both",       label: "둘 다" },
];

interface Props {
  onComplete: () => void;
}

export default function CategorySelector({ onComplete }: Props) {
  const [platform, setPlatform]     = useState("both");
  const [categories, setCategories] = useState<PlatformCategories>({ smartstore: [], coupang: [] });
  const [saving, setSaving]         = useState(false);

  const totalSelected = categories.smartstore.length + categories.coupang.length;

  async function handleSave() {
    if (totalSelected === 0) return;
    setSaving(true);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_platform: platform,
        main_categories: [...categories.smartstore, ...categories.coupang],
        platform_categories: categories,
      }),
    });
    setSaving(false);
    onComplete();
  }

  return (
    <div className="w-full max-w-xl mx-auto mb-10 bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-1">관심 카테고리를 선택해주세요</h3>
      <p className="text-xs text-gray-400 mb-4">
        맞춤 키워드 피드에 활용됩니다. 마이페이지에서 언제든 변경할 수 있어요.
      </p>

      {/* 플랫폼 선택 */}
      <div className="flex gap-2 mb-4">
        {PLATFORM_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setPlatform(opt.value)}
            className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
              platform === opt.value
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 카테고리 선택 */}
      <PlatformCategoryPicker
        platform={platform}
        initialCategories={categories}
        onChange={setCategories}
      />

      {/* 하단 */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {totalSelected > 0 ? `${totalSelected}개 선택됨` : "1개 이상 선택해주세요"}
        </span>
        <button
          onClick={handleSave}
          disabled={saving || totalSelected === 0}
          className="px-6 py-2.5 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
        >
          {saving ? "저장 중..." : "선택 완료"}
        </button>
      </div>
    </div>
  );
}
