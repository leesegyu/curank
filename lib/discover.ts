/**
 * 상품발굴 데이터 조합 유틸
 *
 * keyword_seasonal_trend + category_keyword_pool + 온톨로지 V2를 결합하여
 * 현재 상승 초입(rising) 키워드를 카테고리별로 제공.
 * 외부 API 호출 0 — 모두 DB + 로컬 연산.
 */

import { createClient } from "@supabase/supabase-js";
import NodeCache from "node-cache";
import {
  getAllRisingKeywords,
  type SeasonalCandidate,
  type SeasonType,
  type SeasonPhase,
  type MonthlyRatio,
} from "./seasonal-trend";
import { classifyKeywordV2, getNodesV2 } from "./ontology";

// ── 타입 ─────────────────────────────────────────────────────────

export interface DiscoverKeyword {
  keyword: string;
  phase: SeasonPhase;
  seasonType: SeasonType;
  currentPercentOfPeak: number;
  peakMonth: number;
  monthsToPeak: number;
  upsidePercent: number;
  seasonality: number;
  monthlyRatios: MonthlyRatio[];
  monthlyTotal: number | null;
  compIdx: string | null;
  categoryL1: string;
  categoryL2: string;
  nodePath: string;
}

export type DiscoverSort = "upside" | "volume" | "peak_soon";

// ── 캐시 ─────────────────────────────────────────────────────────

const discoverCache = new NodeCache({ stdTTL: 60 * 60, maxKeys: 50 });

// ── L1/L2 이름 매핑 (로컬, 한 번만 빌드) ──────────────────────────

let l1NameMap: Map<string, string> | null = null;
let l2NameMap: Map<string, string> | null = null;

function ensureNameMaps() {
  if (l1NameMap && l2NameMap) return;
  l1NameMap = new Map();
  l2NameMap = new Map();
  for (const node of getNodesV2("smartstore")) {
    if (node.level === 1) l1NameMap.set(node.id, node.name);
    if (node.level === 2) l2NameMap.set(node.id, node.name);
  }
}

function getL1Name(path: string): string {
  ensureNameMaps();
  // path: "ss.food.fruit.watermelon" → L1 id: "ss.food"
  const parts = path.split(".");
  const l1Id = parts.slice(0, 2).join(".");
  return l1NameMap!.get(l1Id) ?? "";
}

function getL2Name(path: string): string {
  ensureNameMaps();
  const parts = path.split(".");
  if (parts.length < 3) return "";
  const l2Id = parts.slice(0, 3).join(".");
  return l2NameMap!.get(l2Id) ?? "";
}

// ── pool 메타 배치 조회 ──────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

interface PoolMeta {
  monthlyTotal: number;
  compIdx: string | null;
}

async function getPoolMetas(keywords: string[]): Promise<Map<string, PoolMeta>> {
  const result = new Map<string, PoolMeta>();
  if (keywords.length === 0) return result;

  const sb = getSupabase();
  if (!sb) return result;

  try {
    for (let i = 0; i < keywords.length; i += 500) {
      const batch = keywords.slice(i, i + 500);
      const { data } = await sb
        .from("category_keyword_pool")
        .select("keyword, monthly_total, comp_idx")
        .in("keyword", batch);
      if (!data) continue;
      for (const row of data) {
        // 같은 키워드가 여러 노드에 있을 수 있으므로 검색량이 큰 걸 유지
        const existing = result.get(row.keyword);
        if (!existing || row.monthly_total > existing.monthlyTotal) {
          result.set(row.keyword, {
            monthlyTotal: row.monthly_total ?? 0,
            compIdx: row.comp_idx ?? null,
          });
        }
      }
    }
  } catch {
    // partial OK
  }
  return result;
}

// ── 메인 함수 ────────────────────────────────────────────────────

export async function getDiscoverKeywords(opts: {
  seasonType?: SeasonType;
  categoryL1?: string;
  sort?: DiscoverSort;
  page?: number;
  pageSize?: number;
}): Promise<{ keywords: DiscoverKeyword[]; total: number }> {
  const {
    seasonType,
    categoryL1,
    sort = "upside",
    page = 1,
    pageSize = 30,
  } = opts;

  const cacheKey = `discover:${seasonType ?? "all"}:${categoryL1 ?? "all"}:${sort}`;
  let all = discoverCache.get<DiscoverKeyword[]>(cacheKey);

  if (!all) {
    // 1) 전체 rising 키워드 가져오기
    const rising = await getAllRisingKeywords({
      seasonType,
      limit: 500,
      includeRisingFast: true,
    });

    if (rising.length === 0) return { keywords: [], total: 0 };

    // 2) 온톨로지 분류 + 카테고리 이름
    const classified = rising.map((c) => {
      const cls = classifyKeywordV2(c.keyword);
      return { ...c, cls };
    });

    // 3) pool 메타 배치 조회
    const poolMetas = await getPoolMetas(rising.map((r) => r.keyword));

    // 4) DiscoverKeyword 조합
    all = classified
      .filter((c) => c.cls !== null)
      .map((c): DiscoverKeyword => {
        const pool = poolMetas.get(c.keyword);
        const path = c.cls!.path;
        return {
          keyword: c.keyword,
          phase: c.analysis.phase,
          seasonType: c.analysis.seasonType,
          currentPercentOfPeak: c.analysis.currentPercentOfPeak,
          peakMonth: c.analysis.peakMonth,
          monthsToPeak: c.analysis.monthsToPeak,
          upsidePercent: c.analysis.upsidePercent,
          seasonality: c.analysis.seasonality,
          monthlyRatios: c.analysis.monthlyRatios,
          monthlyTotal: pool?.monthlyTotal ?? null,
          compIdx: pool?.compIdx ?? null,
          categoryL1: getL1Name(path),
          categoryL2: getL2Name(path),
          nodePath: path,
        };
      });

    // 5) 카테고리 L1 필터
    if (categoryL1) {
      all = all.filter((k) => k.categoryL1 === categoryL1);
    }

    // 6) 정렬
    all = sortDiscoverKeywords(all, sort);

    discoverCache.set(cacheKey, all);
  }

  // 페이지네이션
  const start = (page - 1) * pageSize;
  return {
    keywords: all.slice(start, start + pageSize),
    total: all.length,
  };
}

function sortDiscoverKeywords(arr: DiscoverKeyword[], sort: DiscoverSort): DiscoverKeyword[] {
  const sorted = [...arr];
  switch (sort) {
    case "upside":
      sorted.sort((a, b) => {
        if (a.phase !== b.phase) return a.phase === "rising" ? -1 : 1;
        return b.upsidePercent - a.upsidePercent;
      });
      break;
    case "volume":
      sorted.sort((a, b) => (b.monthlyTotal ?? 0) - (a.monthlyTotal ?? 0));
      break;
    case "peak_soon":
      sorted.sort((a, b) => a.monthsToPeak - b.monthsToPeak);
      break;
  }
  return sorted;
}
