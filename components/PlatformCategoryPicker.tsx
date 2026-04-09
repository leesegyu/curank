"use client";

/**
 * 플랫폼별 관심 카테고리 선택기 (L1 + L2)
 *
 * 사용처: 회원가입(Step 2), 마이페이지 편집, OAuth 온보딩(CategorySelector)
 *
 * 흐름:
 *   1. 판매 플랫폼 선택 (스마트스토어 / 쿠팡 / 둘다)
 *   2. 선택한 플랫폼별로 L1 카테고리 표시
 *   3. L1 클릭 → L2 하위 카테고리 펼침
 *   4. L1 또는 L2 복수 선택 가능
 *
 * 저장 형식: { smartstore: ["ss.food", "ss.food.fruit", ...], coupang: ["cp.digital.audio", ...] }
 */

import { useState, useEffect } from "react";
import type { OntologyNode } from "@/lib/ontology/types";
import type { Platform } from "@/lib/ontology/types";
import { SMARTSTORE_NODES } from "@/lib/ontology/smartstore";
import { COUPANG_NODES } from "@/lib/ontology/coupang";

function getNodes(platform: Platform): OntologyNode[] {
  return platform === "smartstore" ? SMARTSTORE_NODES : COUPANG_NODES;
}

export interface PlatformCategories {
  smartstore: string[];
  coupang: string[];
}

interface Props {
  platform: string; // "coupang" | "smartstore" | "both"
  initialCategories?: PlatformCategories;
  onChange: (categories: PlatformCategories) => void;
}

// 온톨로지에서 L1, L2 노드만 추출
function getL1L2(platform: Platform): { l1: OntologyNode[]; l2Map: Map<string, OntologyNode[]> } {
  const nodes = getNodes(platform);
  const l1 = nodes.filter((n) => n.level === 1);
  const l2Map = new Map<string, OntologyNode[]>();
  for (const node of nodes) {
    if (node.level === 2 && node.parent) {
      if (!l2Map.has(node.parent)) l2Map.set(node.parent, []);
      l2Map.get(node.parent)!.push(node);
    }
  }
  return { l1, l2Map };
}

function PlatformSection({
  platform,
  label,
  selected,
  onToggle,
}: {
  platform: Platform;
  label: string;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const { l1, l2Map } = getL1L2(platform);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(l1Id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(l1Id)) next.delete(l1Id);
      else next.add(l1Id);
      return next;
    });
  }

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
        {platform === "smartstore" ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#03C75A"/></svg>
        ) : (
          <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />
        )}
        {label}
      </p>
      <div className="space-y-1">
        {l1.map((l1Node) => {
          const l2s = l2Map.get(l1Node.id) ?? [];
          const isExpanded = expanded.has(l1Node.id);
          const l1Selected = selected.includes(l1Node.id);
          const selectedL2Count = l2s.filter((l2) => selected.includes(l2.id)).length;

          return (
            <div key={l1Node.id}>
              {/* L1 행 */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(l1Node.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs text-left flex items-center gap-2 transition-all ${
                    l1Selected
                      ? "border-blue-400 bg-blue-50 text-blue-700 font-bold"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span>{l1Node.name}</span>
                  {selectedL2Count > 0 && !l1Selected && (
                    <span className="text-[10px] text-blue-500 ml-auto">{selectedL2Count}개</span>
                  )}
                </button>
                {l2s.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleExpand(l1Node.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 text-xs flex-shrink-0"
                  >
                    {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {/* L2 하위 (펼침) */}
              {isExpanded && l2s.length > 0 && (
                <div className="ml-4 mt-1 mb-1 grid grid-cols-2 gap-1">
                  {l2s.map((l2Node) => {
                    const l2Selected = selected.includes(l2Node.id);
                    return (
                      <button
                        key={l2Node.id}
                        type="button"
                        onClick={() => onToggle(l2Node.id)}
                        className={`py-1.5 px-2.5 rounded-lg border text-[11px] text-left transition-all ${
                          l2Selected
                            ? "border-blue-300 bg-blue-50 text-blue-600 font-bold"
                            : "border-gray-100 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        {l2Node.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlatformCategoryPicker({ platform, initialCategories, onChange }: Props) {
  const [selected, setSelected] = useState<PlatformCategories>(
    initialCategories ?? { smartstore: [], coupang: [] }
  );

  useEffect(() => {
    if (initialCategories) setSelected(initialCategories);
  }, [initialCategories]);

  function toggle(p: Platform, id: string) {
    const list = selected[p];
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    const updated = { ...selected, [p]: next };
    setSelected(updated);
    onChange(updated);
  }

  const showSS = platform === "smartstore" || platform === "both";
  const showCP = platform === "coupang" || platform === "both";

  return (
    <div className="space-y-4">
      {showSS && (
        <PlatformSection
          platform="smartstore"
          label="스마트스토어 관심 카테고리"
          selected={selected.smartstore}
          onToggle={(id) => toggle("smartstore", id)}
        />
      )}
      {showCP && (
        <PlatformSection
          platform="coupang"
          label="쿠팡 관심 카테고리"
          selected={selected.coupang}
          onToggle={(id) => toggle("coupang", id)}
        />
      )}
      {!showSS && !showCP && (
        <p className="text-xs text-gray-400 text-center py-2">판매 플랫폼을 먼저 선택해주세요</p>
      )}
    </div>
  );
}
