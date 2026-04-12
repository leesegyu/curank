"use client";

import { useEffect, useState } from "react";
import type { TitleTagCombo } from "@/lib/conclusion-generator";

interface Props {
  keyword: string;
  platform: string;
}

const FACTOR_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ranking:       { bg: "bg-green-50",  text: "text-green-700",  label: "상위 노출" },
  conversion:    { bg: "bg-blue-50",   text: "text-blue-700",   label: "구매전환" },
  growth:        { bg: "bg-purple-50", text: "text-purple-700", label: "기회 분석" },
  profitability: { bg: "bg-amber-50",  text: "text-amber-700",  label: "수익성" },
  entryBarrier:  { bg: "bg-red-50",    text: "text-red-700",    label: "낮은 진입장벽" },
  crossPlatform: { bg: "bg-indigo-50", text: "text-indigo-700", label: "플랫폼 강세" },
};

const STRATEGY_COLORS = [
  "border-blue-200 bg-blue-50/30",
  "border-green-200 bg-green-50/30",
  "border-amber-200 bg-amber-50/30",
  "border-purple-200 bg-purple-50/30",
  "border-pink-200 bg-pink-50/30",
  "border-indigo-200 bg-indigo-50/30",
];

const STRATEGY_BADGE_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all shrink-0"
    >
      {copied ? "복사됨!" : label}
    </button>
  );
}

interface RegenInfo {
  used: number;
  limit: number;
  plan: string;
}

export default function ConclusionCard({ keyword, platform }: Props) {
  const [combinations, setCombinations] = useState<TitleTagCombo[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenComboIdx, setRegenComboIdx] = useState<number | null>(null);
  const [comboRegenCounts, setComboRegenCounts] = useState<Record<number, number>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [regen, setRegen] = useState<RegenInfo | null>(null);

  // 마운트 시 저장된 결론 조회
  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch(
          `/api/conclusion?keyword=${encodeURIComponent(keyword)}&platform=${platform}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.cached && data.combinations) {
            setCombinations(data.combinations);
            setGeneratedAt(data.generatedAt);
          }
          if (data.regeneration) setRegen(data.regeneration);
        }
      } catch {
        // 조회 실패는 무시 — 생성 버튼 표시
      } finally {
        setInitialLoading(false);
      }
    }
    loadSaved();
  }, [keyword, platform]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/conclusion?keyword=${encodeURIComponent(keyword)}&platform=${platform}&generate=true`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "결론 생성 실패");
      }
      const data = await res.json();
      setCombinations(data.combinations);
      setGeneratedAt(data.generatedAt);
      if (data.regeneration) setRegen(data.regeneration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "결론 생성 실패");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateCombo(comboIdx: number) {
    setRegenComboIdx(comboIdx);
    try {
      const res = await fetch(
        `/api/conclusion?keyword=${encodeURIComponent(keyword)}&platform=${platform}&regenerateCombo=${comboIdx}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "개별 재생성 실패");
      if (data.combinations) setCombinations(data.combinations);
      if (data.generatedAt) setGeneratedAt(data.generatedAt);
      if (data.regeneration) setRegen(data.regeneration);
      setComboRegenCounts((prev) => ({ ...prev, [comboIdx]: (prev[comboIdx] ?? 0) + 1 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "개별 재생성 실패");
    } finally {
      setRegenComboIdx(null);
    }
  }

  const COMBO_REGEN_LIMIT = 10;

  // 초기 로딩 (저장된 결론 확인 중)
  if (initialLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <p className="text-xs text-gray-400">이전 결론 확인 중...</p>
      </div>
    );
  }

  // 저장된 결론 없고, 아직 생성하지 않은 상태
  if (!combinations && !loading && !error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <p className="text-sm text-gray-500 mb-1">
          6 Factor 분석과 추천 키워드를 종합하여
        </p>
        <p className="text-base font-bold text-gray-800 mb-4">
          {platform === "naver" ? "스마트스토어" : "쿠팡"}에 바로 쓸 수 있는 상품 제목과 태그를 만들어드립니다
        </p>
        <button
          onClick={generate}
          className="px-6 py-3 rounded-xl text-white font-bold text-sm transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}
        >
          결론 생성하기
        </button>
      </div>
    );
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-gray-700">AI가 최적 조합을 분석 중...</span>
        </div>
        <p className="text-xs text-gray-400">6 Factor 점수와 추천 키워드를 종합하고 있습니다</p>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-100 p-6 shadow-sm text-center">
        <p className="text-sm text-red-600 mb-3">{error}</p>
        <button
          onClick={generate}
          className="px-5 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 결과 표시
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {platform === "naver" ? "스마트스토어" : "쿠팡"} 규격에 맞춰 생성된 조합입니다. 복사하여 바로 사용하세요.
          {generatedAt && (
            <span className="ml-1">
              ({new Date(generatedAt).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })} 생성)
            </span>
          )}
        </p>
        <div className="shrink-0" />
      </div>

      {combinations!.map((combo, idx) => {
        const factorStyle = FACTOR_STYLE[combo.highlightFactor] ?? FACTOR_STYLE.ranking;
        const cardColor = STRATEGY_COLORS[idx % STRATEGY_COLORS.length];
        const badgeColor = STRATEGY_BADGE_COLORS[idx % STRATEGY_BADGE_COLORS.length];

        return (
          <div key={idx} className={`rounded-2xl border p-5 relative ${cardColor}`}>
            {/* 개별 재생성 버튼 — 우측 상단 */}
            <button
              onClick={() => regenerateCombo(idx)}
              disabled={regenComboIdx !== null || (comboRegenCounts[idx] ?? 0) >= COMBO_REGEN_LIMIT}
              className="absolute top-3 right-3 text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {regenComboIdx === idx ? (
                <span className="w-2.5 h-2.5 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{COMBO_REGEN_LIMIT - (comboRegenCounts[idx] ?? 0)}/{COMBO_REGEN_LIMIT} 재생성</>
              )}
            </button>

            {/* 전략 헤더 */}
            <div className="flex items-center gap-2 mb-3 pr-24">
              <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-md ${badgeColor}`}>
                {String.fromCharCode(65 + idx)}안
              </span>
              <span className="text-sm font-bold text-gray-800">{combo.strategy}</span>
              {combo.strategy.includes("크리에이티브") ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-50 text-purple-700">
                  시장선점
                </span>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${factorStyle.bg} ${factorStyle.text}`}>
                  {factorStyle.label}
                </span>
              )}
            </div>

            {/* 상품 제목 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-500">상품 제목</span>
                <CopyButton text={combo.title} label="제목 복사" />
              </div>
              <p className="text-sm font-medium text-gray-900 bg-white rounded-xl px-4 py-3 border border-gray-100">
                {combo.title}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 text-right">
                {combo.title.length}자
                {platform === "naver" && combo.title.length > 50 && (
                  <span className="text-red-400 ml-1">(50자 초과)</span>
                )}
                {platform === "coupang" && combo.title.length > 100 && (
                  <span className="text-red-400 ml-1">(100자 초과)</span>
                )}
              </p>
            </div>

            {/* 태그 */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-gray-500">태그 ({combo.tags.length}개)</span>
                <CopyButton text={combo.tags.join(", ")} label="태그 복사" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {combo.tags.map((tag, ti) => (
                  <span
                    key={ti}
                    className="text-xs px-2.5 py-1 rounded-full bg-white border border-gray-150 text-gray-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 한줄 해석 */}
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className={`font-bold ${factorStyle.text}`}>{factorStyle.label}</span>
              {" — "}
              {combo.reasoning}
            </p>
          </div>
        );
      })}
    </div>
  );
}
