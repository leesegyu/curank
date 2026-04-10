"use client";

import { useMemo, useState } from "react";
import { generateActionPlan, type ActionPhase } from "@/lib/action-plan";
import type { AnalysisResult } from "@/lib/analyzer";
import type { TrendData } from "@/lib/datalab";

/**
 * 진입 실행 가이드 — STEP 1~4 분석 결과 기반 액션 플랜
 *
 * - 시장 진단 한 줄 + 강점/약점
 * - 3 Phase 탭 (준비 / 진입 / 성장)
 * - 각 Phase: 액션 카드 + 체크리스트
 */

interface Props {
  result: AnalysisResult;
  trend: TrendData | null;
  platform?: string;
  keyword: string;
  topKeywordsV2?: unknown[] | null;
}

const PRIORITY_STYLE: Record<string, string> = {
  필수: "bg-red-50 text-red-600 border-red-100",
  권장: "bg-blue-50 text-blue-600 border-blue-100",
  선택: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function ActionPlanCard({ result, trend, keyword, topKeywordsV2 }: Props) {
  const [activePhase, setActivePhase] = useState<"prepare" | "entry" | "growth">("prepare");

  const plan = useMemo(() => {
    const top = Array.isArray(topKeywordsV2)
      ? (topKeywordsV2 as Array<{ keyword: string; monthlyVolume?: number; competitionLevel?: string; scoreChance?: number; scoreIntent?: number; scoreSpecificity?: number }>)
      : [];
    return generateActionPlan(result, trend, top, "naver");
  }, [result, trend, topKeywordsV2]);

  const currentPhase: ActionPhase =
    plan.phases.find((p) => p.id === activePhase) ?? plan.phases[0];

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-black text-gray-800">🎯 진입 실행 가이드</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
          style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
        >
          단계별 액션 플랜
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        &ldquo;{keyword}&rdquo;의 STEP 1~4 분석을 종합한 실행 계획입니다
      </p>

      {/* 시장 진단 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-gray-500">📊 시장 진단</span>
        </div>
        <p className="text-sm font-bold text-gray-800 mb-3">{plan.diagnosis}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-green-500 font-bold mb-0.5">강점</p>
            <p className="text-xs text-green-700 font-medium">{plan.strengthPoint}</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-amber-500 font-bold mb-0.5">약점</p>
            <p className="text-xs text-amber-700 font-medium">{plan.weaknessPoint}</p>
          </div>
        </div>
      </div>

      {/* Phase 탭 */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {plan.phases.map((phase, idx) => {
          const isActive = phase.id === activePhase;
          return (
            <button
              key={phase.id}
              onClick={() => setActivePhase(phase.id)}
              className={`flex-1 min-w-[100px] px-3 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? "bg-white shadow-sm border border-indigo-200"
                  : "bg-white/50 border border-transparent hover:bg-white hover:border-gray-200"
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-xs font-bold text-gray-400">PHASE {idx + 1}</span>
                <span className="text-sm">{phase.emoji}</span>
              </div>
              <div className={`text-sm font-bold ${isActive ? "text-indigo-700" : "text-gray-700"}`}>
                {phase.label}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{phase.duration}</div>
            </button>
          );
        })}
      </div>

      {/* 선택된 Phase 내용 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        {/* Phase 헤더 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{currentPhase.emoji}</span>
            <span className="text-sm font-bold text-gray-800">{currentPhase.label}</span>
            <span className="text-[10px] text-gray-400">· {currentPhase.duration}</span>
          </div>
          <p className="text-xs text-gray-500 mb-2">🎯 목표: {currentPhase.goal}</p>
          <div className="flex flex-wrap gap-1">
            {currentPhase.keyFactors.map((kf) => (
              <span
                key={kf}
                className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100"
              >
                🔑 {kf}
              </span>
            ))}
          </div>
        </div>

        {/* 액션 리스트 */}
        <div className="space-y-2.5">
          {currentPhase.actions.map((action, idx) => (
            <div
              key={`${currentPhase.id}-${idx}`}
              className="border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-start gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                    PRIORITY_STYLE[action.priority] ?? PRIORITY_STYLE.선택
                  }`}
                >
                  {action.priority}
                </span>
                <span className="text-sm font-bold text-gray-800 flex-1">{action.title}</span>
                {action.estimatedTime && (
                  <span className="text-[10px] text-gray-400 shrink-0">⏱️ {action.estimatedTime}</span>
                )}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-1 ml-0">{action.description}</p>
              {action.hint && (
                <div className="mt-2 px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                  <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                    💡 {action.hint}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPI 체크리스트 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-bold text-gray-700">✅ {currentPhase.label} 체크리스트</span>
          <span className="text-[10px] text-gray-400">완료 확인용 KPI</span>
        </div>
        <ul className="space-y-1.5">
          {currentPhase.checklist.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="text-gray-300 shrink-0 mt-0.5">☐</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-3">
        이 계획은 &ldquo;{keyword}&rdquo;의 경쟁 점수·트렌드·추천 키워드를 종합해 자동 생성되었습니다
      </p>
    </div>
  );
}
