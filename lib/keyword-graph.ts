/**
 * 키워드 지식 그래프 (D 알고리즘)
 * SEMrush 토픽 네트워크 + GraphEx 논문 방식
 *
 * - Supabase 설정 시: keyword_nodes / keyword_edges 테이블 사용
 * - 미설정 시: 인메모리 Map 폴백
 * - BFS 탐색으로 시드 키워드의 2홉 연관 키워드 발굴
 * - B/C 알고리즘 실행 시 엣지 자동 누적 (cold start 자연 해결)
 */

import { supabase } from "./db";

// ─── 인메모리 폴백 ────────────────────────────────────────────────
// key: source_text, value: Map<target_text, weight>
const memGraph = new Map<string, Map<string, number>>();

// ─── 엣지 타입 ───────────────────────────────────────────────────
type EdgeRelation = "CO_AUTOCOMPLETE" | "CO_TITLE" | "TREND_SIMILAR";

interface EdgeInput {
  source: string;
  target: string;
  relationType: EdgeRelation;
  weight?: number;
}

export interface GraphKeyword {
  keyword: string;
  graphWeight: number;   // 경로 거리 감쇄 반영 가중치
  hops: number;          // 시드에서 몇 홉 거리
}

// ─── 엣지 적재 ───────────────────────────────────────────────────
export async function upsertEdges(edges: EdgeInput[]): Promise<void> {
  if (edges.length === 0) return;

  if (!supabase) {
    // 인메모리 폴백
    for (const e of edges) {
      if (!memGraph.has(e.source)) memGraph.set(e.source, new Map());
      const targets = memGraph.get(e.source)!;
      targets.set(e.target, (targets.get(e.target) ?? 0) + (e.weight ?? 1));
    }
    return;
  }

  // Supabase: upsert_keyword_edge RPC 사용 (가중치 누적)
  await Promise.allSettled(
    edges.map((e) =>
      supabase!.rpc("upsert_keyword_edge", {
        p_source:   e.source,
        p_target:   e.target,
        p_relation: e.relationType,
        p_weight:   e.weight ?? 1.0,
      })
    )
  );
}

// ─── 자동완성 엣지 적재 헬퍼 ────────────────────────────────────
export async function upsertAutocompleteEdges(
  seed: string,
  relatedKeywords: string[]
): Promise<void> {
  const edges: EdgeInput[] = relatedKeywords.map((kw, i) => ({
    source: seed,
    target: kw,
    relationType: "CO_AUTOCOMPLETE",
    weight: 1 / (i + 1), // 자동완성 순위 반영 (1위=1.0, 2위=0.5 ...)
  }));
  await upsertEdges(edges);
}

// ─── BFS 탐색 ────────────────────────────────────────────────────
const BFS_RELATIONS: EdgeRelation[] = ["CO_AUTOCOMPLETE", "CO_TITLE"];

export async function bfsKeywords(
  seedKeyword: string,
  maxHops = 2,
  limitPerHop = 15
): Promise<GraphKeyword[]> {
  const visited = new Set<string>([seedKeyword]);
  const results: GraphKeyword[] = [];
  let frontier = [seedKeyword];

  for (let hop = 0; hop < maxHops && frontier.length > 0; hop++) {
    const hopDecay = Math.pow(0.7, hop); // 홉 거리 감쇄

    if (supabase) {
      // Supabase: 프론티어 전체를 한 번에 조회
      const { data } = await supabase
        .from("keyword_edges")
        .select("source_text, target_text, weight, relation_type")
        .in("source_text", frontier)
        .in("relation_type", BFS_RELATIONS)
        .order("weight", { ascending: false })
        .limit(frontier.length * limitPerHop);

      const nextFrontier: string[] = [];
      for (const edge of data ?? []) {
        if (visited.has(edge.target_text)) continue;
        visited.add(edge.target_text);
        results.push({
          keyword: edge.target_text,
          graphWeight: (edge.weight as number) * hopDecay,
          hops: hop + 1,
        });
        nextFrontier.push(edge.target_text);
      }
      frontier = nextFrontier;
    } else {
      // 인메모리 폴백
      const nextFrontier: string[] = [];
      for (const src of frontier) {
        const neighbors = memGraph.get(src);
        if (!neighbors) continue;
        const sorted = Array.from(neighbors.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limitPerHop);
        for (const [target, weight] of sorted) {
          if (visited.has(target)) continue;
          visited.add(target);
          results.push({ keyword: target, graphWeight: weight * hopDecay, hops: hop + 1 });
          nextFrontier.push(target);
        }
      }
      frontier = nextFrontier;
    }
  }

  return results
    .sort((a, b) => b.graphWeight - a.graphWeight)
    .slice(0, 30);
}

/** 그래프에 데이터가 있는지 확인 (cold start 감지) */
export async function hasGraphData(seedKeyword: string): Promise<boolean> {
  if (!supabase) {
    return memGraph.has(seedKeyword);
  }
  const { count } = await supabase
    .from("keyword_edges")
    .select("id", { count: "exact", head: true })
    .eq("source_text", seedKeyword)
    .limit(1);
  return (count ?? 0) > 0;
}
