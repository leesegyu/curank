"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UsageInfo } from "@/lib/usage";

type AnalysisBlock = {
  id: string;
  keyword: string;
  platform: string;
  status: "running" | "done" | "partial" | "error";
  progress: number;
  step: number;
  totalSteps: number;
  label: string;
  score?: number;
  level?: string;
  trendDirection?: string;
  reuse?: boolean;
  partial?: boolean; // 부분 성공 (일부 데이터 누락)
  timestamp: number;
  usage?: UsageInfo;
};

type HistoryItem = {
  keyword: string;
  ts: string;
};

const LEVEL_COLORS: Record<string, string> = {
  "낮음":     "text-green-600 bg-green-50 border-green-200",
  "보통":     "text-yellow-600 bg-yellow-50 border-yellow-200",
  "높음":     "text-orange-600 bg-orange-50 border-orange-200",
  "매우 높음": "text-red-600 bg-red-50 border-red-200",
};

const TREND_ICON: Record<string, string> = { "상승": "↑", "하락": "↓", "안정": "→" };
const TREND_COLOR: Record<string, string> = { "상승": "text-green-600", "하락": "text-red-500", "안정": "text-gray-400" };

export default function AnalysisBlocksSection() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [blocks, setBlocks] = useState<AnalysisBlock[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PER_PAGE = 5;

  // 사용량 + 히스토리 로드
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/usage").then(r => r.json()).then(setUsage).catch(() => {});
    fetch("/api/user/history").then(r => r.json()).then((data) => {
      const items = data?.history ?? data;
      if (Array.isArray(items)) setHistory(items);
    }).catch(() => {});
  }, [session]);

  // 외부에서 분석 시작 트리거
  const startAnalysis = useCallback((keyword: string, platform: string) => {
    const id = `${Date.now()}`;
    const block: AnalysisBlock = {
      id, keyword, platform,
      status: "running", progress: 0, step: 0, totalSteps: 8,
      label: "분석 준비 중...",
      timestamp: Date.now(),
    };

    setBlocks(prev => [block, ...prev]);

    // SSE 스트리밍 연결
    const evtSource = new EventSource(
      `/api/analyze-run?keyword=${encodeURIComponent(keyword)}&platform=${platform}`
    );

    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data);

      setBlocks(prev => prev.map(b =>
        b.id === id
          ? {
              ...b,
              progress: data.progress ?? b.progress,
              step: data.step ?? b.step,
              totalSteps: data.total ?? b.totalSteps,
              label: data.label ?? b.label,
              score: data.score ?? data.summary?.score ?? b.score,
              level: data.level ?? data.summary?.level ?? b.level,
              trendDirection: data.trendDirection ?? data.summary?.trendDirection ?? b.trendDirection,
              reuse: data.reuse ?? b.reuse,
              partial: data.partial ?? b.partial,
              usage: data.usage ?? b.usage,
              status: data.done ? (data.partial ? "partial" : "done") : data.error ? "error" : "running",
            }
          : b
      ));

      if (data.usage) setUsage(data.usage);
      if (data.done || data.error) {
        evtSource.close();
        // 배지 갱신
        window.dispatchEvent(new Event("usage-updated"));
        // 히스토리 갱신
        if (data.done) {
          fetch("/api/user/history").then(r => r.json()).then((d) => {
            const items = d?.history ?? d;
            if (Array.isArray(items)) setHistory(items);
          }).catch(() => {});
        }
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      setBlocks(prev => prev.map(b =>
        b.id === id ? { ...b, status: "error", label: "분석 실패" } : b
      ));
    };
  }, []);

  // window 이벤트로 외부 컴포넌트에서 분석 트리거
  useEffect(() => {
    function handler(e: Event) {
      const { keyword, platform } = (e as CustomEvent).detail;
      startAnalysis(keyword, platform);
    }
    window.addEventListener("start-analysis", handler);
    return () => window.removeEventListener("start-analysis", handler);
  }, [startAnalysis]);

  // URL ?q= 파라미터로 자동 분석 시작 (추천 키워드 클릭 시)
  const autoStarted = useRef(false);
  useEffect(() => {
    const q = searchParams.get("q");
    const platform = searchParams.get("platform") || "naver";
    if (q && !autoStarted.current) {
      autoStarted.current = true;
      startAnalysis(q, platform);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, startAnalysis, router]);

  if (!session?.user) return null;

  const limitText = usage?.limit === Infinity ? "∞" : (usage?.limit ?? 30);
  const usedCount = usage?.used ?? 0;

  // 히스토리에서 현재 블록에 없는 것만 표시
  const blockKeywords = new Set(blocks.map(b => b.keyword));
  const pastHistory = history.filter(h => !blockKeywords.has(h.keyword));

  return (
    <div className="w-full max-w-6xl mb-8">
      {/* 사용량 헤더 */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-bold text-gray-700">
          월 분석 횟수
        </span>
        <span className="text-sm font-black text-blue-600">
          {usedCount}<span className="text-gray-400 font-medium">/{limitText}</span>
        </span>
        {/* 미니 프로그레스 */}
        {usage && usage.limit !== Infinity && (
          <div className="w-24 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usedCount / usage.limit >= 0.8 ? "bg-red-500" :
                usedCount / usage.limit >= 0.6 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min((usedCount / usage.limit) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 분석 블록 리스트 */}
      <div className="space-y-2">
        {/* 진행 중 / 완료된 블록 */}
        {blocks.map(block => (
          <div
            key={block.id}
            onClick={() => {
              if (block.status === "done" || block.status === "partial") {
                router.push(`/analyze?keyword=${encodeURIComponent(block.keyword)}&platform=${block.platform}`);
              }
            }}
            className={`relative overflow-hidden rounded-xl border bg-white p-4 transition-all ${
              block.status === "done" || block.status === "partial"
                ? "cursor-pointer hover:shadow-md hover:border-blue-300"
                : block.status === "error"
                ? "border-red-200"
                : "border-gray-100"
            }`}
          >
            {/* 진행 바 (배경) */}
            {block.status === "running" && (
              <div
                className="absolute inset-y-0 left-0 bg-blue-50 transition-all duration-700 ease-out"
                style={{ width: `${block.progress}%` }}
              />
            )}

            <div className="relative flex items-center justify-between gap-4">
              {/* 왼쪽: 키워드 + 상태 */}
              <div className="flex items-center gap-3 min-w-0">
                {block.status === "running" && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {block.status === "done" && (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600 text-sm font-bold">
                    ✓
                  </div>
                )}
                {block.status === "partial" && (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 text-sm font-bold">
                    ⚠
                  </div>
                )}
                {block.status === "error" && (
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 text-sm font-bold">
                    !
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">{block.keyword}</p>
                    {block.reuse && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium whitespace-nowrap">
                        재조회 (차감없음)
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${block.status === "running" ? "text-blue-500" : "text-gray-400"}`}>
                    {block.status === "running" && block.step > 0
                      ? `[${block.step}/${block.totalSteps}] ${block.label}`
                      : block.label}
                  </p>
                </div>
              </div>

              {/* 오른쪽: 점수 + 트렌드 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {block.score !== undefined && block.level && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${LEVEL_COLORS[block.level] || "text-gray-600 bg-gray-50 border-gray-200"}`}>
                    경쟁강도 {block.score}점
                  </span>
                )}
                {block.trendDirection && (
                  <span className={`text-xs font-bold ${TREND_COLOR[block.trendDirection] || "text-gray-400"}`}>
                    검색트렌드 {TREND_ICON[block.trendDirection] || "→"} {block.trendDirection}
                  </span>
                )}
                {(block.status === "done" || block.status === "partial") && (
                  <span className="text-xs text-blue-500 font-medium">
                    결과 보기 →
                  </span>
                )}
              </div>
            </div>

            {/* 진행 바 (하단) */}
            {block.status === "running" && (
              <div className="relative mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700 ease-out"
                  style={{ width: `${block.progress}%` }}
                />
              </div>
            )}
          </div>
        ))}

        {/* 과거 히스토리 블록 (페이지네이션) */}
        {pastHistory
          .slice(historyPage * HISTORY_PER_PAGE, (historyPage + 1) * HISTORY_PER_PAGE)
          .map((item, i) => (
            <div
              key={`hist-${historyPage}-${i}`}
              onClick={() => router.push(`/analyze?keyword=${encodeURIComponent(item.keyword)}`)}
              className="rounded-xl border border-gray-100 bg-white p-4 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.keyword}</p>
                    <p className="text-xs text-gray-400">{new Date(item.ts).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <span className="text-xs text-blue-500 font-medium">결과 보기 →</span>
              </div>
            </div>
          ))}
      </div>

      {/* 페이지네이션 */}
      {pastHistory.length > HISTORY_PER_PAGE && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setHistoryPage(Math.max(0, historyPage - 1))}
            disabled={historyPage === 0}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ←
          </button>
          {Array.from({ length: Math.ceil(pastHistory.length / HISTORY_PER_PAGE) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setHistoryPage(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                historyPage === i
                  ? "bg-blue-500 text-white"
                  : "border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setHistoryPage(Math.min(Math.ceil(pastHistory.length / HISTORY_PER_PAGE) - 1, historyPage + 1))}
            disabled={historyPage >= Math.ceil(pastHistory.length / HISTORY_PER_PAGE) - 1}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
          <span className="text-[11px] text-gray-400 ml-2">
            {pastHistory.length}개 중 {historyPage * HISTORY_PER_PAGE + 1}-{Math.min((historyPage + 1) * HISTORY_PER_PAGE, pastHistory.length)}
          </span>
        </div>
      )}

      {usedCount === 0 && blocks.length === 0 && pastHistory.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-300">
          키워드를 검색하면 분석 블록이 여기에 쌓입니다
        </div>
      )}
    </div>
  );
}
