/**
 * 개인화 키워드 피드 API — Phase 1
 *
 * 4개 Row:
 *   Row 1: 최근 분석 기반 추천 — 분석 키워드 + 체류시간 기반 유사 상품
 *   Row 2: 관심 카테고리 추천 — main_categories 계층적 추천 (L4→L3→L2→L1 폴백)
 *   Row 3: 추천 키워드 — 롱테일/구매전환 (keyword_only)
 *   Row 4: 지금 급상승 — 급상승 인기
 *
 * (광고 배너는 Row 2와 Row 3 사이에 프론트엔드에서 삽입)
 *
 * 피드 업데이트 시점:
 *   - 홈 방문할 때마다 (FeedGrid mount → cache bust)
 *   - 마이페이지 카테고리 변경 직후 (invalidateFeedCache)
 *   - 키워드 분석 후 홈 복귀 시 (cache bust)
 *
 * GET /api/feed
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { searchNaver } from "@/lib/naver";
import {
  classifyKeyword,
  getSimilarSeedKeywords,
  generateFeedKeywords,
  generateBatchLongtails,
  TRENDING_SEED_KEYWORDS,
  getAllNodes,
  getNodes,
  learnMapping,
  wuPalmerSim,
} from "@/lib/ontology";
import type { CategoryWeights } from "@/lib/ontology";
import { feedCache, productCache } from "@/lib/feed-cache";

// ── 타입 ─────────────────────────────────────────────────────────
export interface FeedProduct {
  title: string; image: string; price: number;
  link: string; mallName: string; isSmartStore: boolean;
}
export interface FeedItem {
  keyword: string; category: string; product: FeedProduct | null;
}
export interface FeedRow {
  id: string; title: string; subtitle: string; icon: string;
  items: FeedItem[];
  /** "keyword_only" = 상품카드가 아닌 키워드 텍스트 카드로 렌더링 */
  displayType?: "product" | "keyword_only";
}

// ── 네이버 쇼핑 조회 ──────────────────────────────────────────────
async function fetchProduct(keyword: string): Promise<FeedProduct | null> {
  const ck = `p:${keyword}`;
  const cached = productCache.get<FeedProduct>(ck);
  // null 캐시는 무시 (이전 실패를 영구 캐시하지 않기 위해)
  if (cached && cached.image) return cached;
  try {
    const data = await searchNaver(keyword, 10);
    if (!data.items?.length) return null; // 결과 없으면 캐시하지 않음 → 다음에 재시도

    // 이미지 있는 상품 우선, 그 중 스마트스토어 우선
    const withImage = data.items.filter((i) => i.image);
    const pool = withImage.length > 0 ? withImage : data.items;
    const ss = pool.filter((i) => i.productType === "2");
    const item = ss.length > 0 ? ss[0] : pool[0];

    if (!item.image) return null; // 이미지 없으면 캐시하지 않음

    const prod: FeedProduct = {
      title: item.title.slice(0, 60), image: item.image,
      price: parseInt(item.lprice) || 0, link: item.link,
      mallName: item.mallName || "스마트스토어",
      isSmartStore: item.productType === "2" || !!item.mallName?.includes("스마트스토어"),
    };
    productCache.set(ck, prod);
    return prod;
  } catch {
    return null; // 에러 시 캐시하지 않음 → 다음 요청에서 재시도
  }
}

async function buildItems(keywords: string[]): Promise<FeedItem[]> {
  const results = await Promise.allSettled(keywords.map(fetchProduct));
  const allNodes = getAllNodes();
  return keywords.map((kw, i) => {
    const classified = classifyKeyword(kw);
    const node = classified ? allNodes.find((n) => n.id === classified.path) : null;
    return {
      keyword: kw, category: node?.name ?? "",
      product: results[i].status === "fulfilled" ? results[i].value : null,
    };
  });
}

// ── 비율 기반 Row 1/Row 2 구성 ────────────────────────────────────
/**
 * 과거 분석 기록의 카테고리 비율대로 Row 1, Row 2 키워드 배분
 *
 * 1. 분석 이벤트를 L2 카테고리별로 카운트
 * 2. 비율에 따라 각 카테고리에 카드 개수 할당 (최소 1개 보장)
 * 3. Row 1: 각 카테고리에서 유사도 최상위 키워드
 * 4. Row 2: Row 1에서 안 뽑힌 그 다음 유사도 키워드
 */
function buildProportionalRows(
  allEvents: Array<{ keyword: string; event_type: string }>,
  recentPaths: string[],
  rowSize: number
): { row1Keywords: string[]; row2Keywords: string[] } {
  if (recentPaths.length === 0) return { row1Keywords: [], row2Keywords: [] };

  // ── 1. L2 카테고리별 분석 횟수 카운트 ─────────────────────────
  const l2Count = new Map<string, number>();
  const l2Paths = new Map<string, string[]>(); // L2 → 관련 recentPaths

  for (const e of allEvents) {
    if (e.event_type === "analyze_dwell" || !e.keyword) continue;
    const c = classifyKeyword(e.keyword, "smartstore");
    if (!c) continue;
    const l2 = c.path.split(".").slice(0, 3).join(".");
    l2Count.set(l2, (l2Count.get(l2) ?? 0) + 1);
  }

  // recentPaths를 L2별로 그룹핑
  for (const p of recentPaths) {
    const l2 = p.split(".").slice(0, 3).join(".");
    if (!l2Paths.has(l2)) l2Paths.set(l2, []);
    if (!l2Paths.get(l2)!.includes(p)) l2Paths.get(l2)!.push(p);
    // l2Count에 없으면 1로 등록 (경로는 있지만 이벤트가 직접 안 잡힌 경우)
    if (!l2Count.has(l2)) l2Count.set(l2, 1);
  }

  // ── 2. 비율 기반 카드 개수 할당 ───────────────────────────────
  const totalCount = [...l2Count.values()].reduce((s, v) => s + v, 0);
  const categories = [...l2Count.entries()].sort((a, b) => b[1] - a[1]);

  // 각 카테고리에 최소 1개 보장 + 비율 배분
  const allocation = new Map<string, number>();
  let remaining = rowSize;

  // 먼저 각 카테고리 최소 1개
  for (const [l2] of categories) {
    allocation.set(l2, 1);
    remaining--;
    if (remaining <= 0) break;
  }

  // 남은 자리를 비율대로 배분
  if (remaining > 0) {
    for (const [l2, count] of categories) {
      const extra = Math.round((count / totalCount) * remaining);
      if (extra > 0) {
        allocation.set(l2, (allocation.get(l2) ?? 0) + extra);
      }
    }
  }

  // ── 3. 각 카테고리에서 유사도순으로 키워드 추출 ─────────────────
  const allNodes = getNodes("smartstore");
  const row1: string[] = [];
  const row2: string[] = [];
  const usedKeywords = new Set<string>();

  for (const [l2, slots] of allocation) {
    const paths = l2Paths.get(l2) ?? [l2]; // 해당 L2의 세부 경로들

    // 이 L2에 속하는 노드들을 유사도순으로 수집
    const scored: Array<{ keyword: string; sim: number }> = [];
    for (const node of allNodes) {
      if (node.seedKeywords.length === 0) continue;
      if (!node.id.startsWith(l2)) continue; // 이 L2 카테고리에 속하는 노드만

      let bestSim = 0;
      for (const p of paths) {
        const sim = wuPalmerSim(node.id, p);
        if (sim > bestSim) bestSim = sim;
      }
      if (bestSim < 0.4) continue;

      for (const kw of node.seedKeywords) {
        if (!usedKeywords.has(kw)) {
          scored.push({ keyword: kw, sim: bestSim });
        }
      }
    }

    scored.sort((a, b) => b.sim - a.sim);

    // Row 1: 상위 slots개
    let picked = 0;
    for (const { keyword } of scored) {
      if (picked >= slots) break;
      if (usedKeywords.has(keyword)) continue;
      row1.push(keyword);
      usedKeywords.add(keyword);
      picked++;
    }

    // Row 2: 그 다음 slots개
    picked = 0;
    for (const { keyword } of scored) {
      if (picked >= slots) break;
      if (usedKeywords.has(keyword)) continue;
      row2.push(keyword);
      usedKeywords.add(keyword);
      picked++;
    }
  }

  return { row1Keywords: row1, row2Keywords: row2 };
}

// ── 롱테일 생성 ──────────────────────────────────────────────────
const LONGTAIL_SUFFIXES = [
  "추천", "가성비", "인기", "입문", "가벼운", "소형", "대용량",
  "세트", "선물", "순위", "후기좋은", "국내산", "프리미엄",
];
function generateLongtails(bases: string[], limit: number): string[] {
  if (bases.length === 0) return [];
  const suffixSet = new Set(LONGTAIL_SUFFIXES);
  // 핵심 키워드 추출: 수식어와 겹치는 단어 제거, 중복 제거
  const cores = [...new Set(
    bases.map((b) => b.split(" ").filter((w) => !suffixSet.has(w)).slice(0, 2).join(" ")).filter(Boolean)
  )];
  // 라운드 로빈: 모든 키워드에 골고루 수식어 부착
  const result: string[] = [];
  const seen = new Set<string>();
  for (let round = 0; round < LONGTAIL_SUFFIXES.length && result.length < limit; round++) {
    for (const core of cores) {
      const kw = `${core} ${LONGTAIL_SUFFIXES[round]}`;
      if (!seen.has(kw)) {
        seen.add(kw);
        result.push(kw);
      }
      if (result.length >= limit) break;
    }
  }
  return result;
}

// ── 관심 카테고리 계층적 추천 (L4→L3→L2→L1 폴백) ──────────────
function getHierarchicalKeywords(userSSL1s: string[], limit: number): string[] {
  const nodes = getNodes("smartstore");
  const keywords: string[] = [];

  for (const l1Id of userSSL1s) {
    // L4 노드가 있으면 L4+L3 시드
    const l4Nodes = nodes.filter((n) => n.level === 4 && n.id.startsWith(l1Id + ".") && n.seedKeywords.length > 0);
    if (l4Nodes.length > 0) {
      // L4 시드 + 형제 L3 시드
      for (const n of l4Nodes) keywords.push(...n.seedKeywords.slice(0, 2));
      const l3Ids = [...new Set(l4Nodes.map((n) => n.parent!))];
      for (const l3Id of l3Ids) {
        const l3 = nodes.find((n) => n.id === l3Id);
        if (l3?.seedKeywords.length) keywords.push(...l3.seedKeywords.slice(0, 2));
      }
      continue;
    }

    // L3 노드만 있으면 L3+L2 시드
    const l3Nodes = nodes.filter((n) => n.level === 3 && n.id.startsWith(l1Id + ".") && n.seedKeywords.length > 0);
    if (l3Nodes.length > 0) {
      for (const n of shuffle(l3Nodes).slice(0, 4)) keywords.push(...n.seedKeywords.slice(0, 2));
      continue;
    }

    // L2만 있으면 L2+L1
    const l2Nodes = nodes.filter((n) => n.level === 2 && n.id.startsWith(l1Id + ".") && n.seedKeywords.length > 0);
    for (const n of l2Nodes) keywords.push(...n.seedKeywords.slice(0, 2));
  }

  return shuffle([...new Set(keywords)]).slice(0, limit);
}

// ── L1 코드 → 온톨로지 L1 ID ────────────────────────────────────
const L1_TO_SS: Record<string, string> = {
  "50000000": "ss.fashion",   "50000001": "ss.accessory",
  "50000002": "ss.beauty",    "50000003": "ss.digital",
  "50000004": "ss.furniture", "50000005": "ss.baby",
  "50000006": "ss.food",      "50000007": "ss.sports",
  "50000008": "ss.health",    "50000009": "ss.leisure",
};

// ── 메인 핸들러 ──────────────────────────────────────────────────
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // 실시간 피드: 캐시 사용 안 함 (매 요청마다 최신 데이터로 생성)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [profileRes, historyRes] = await Promise.all([
    supabaseAdmin.from("users")
      .select("main_categories, category_weights, platform_categories, main_platform")
      .eq("id", userId).single(),
    supabaseAdmin.from("user_events")
      .select("keyword, event_type, metadata")
      .eq("user_id", userId)
      .in("event_type", ["analyze", "search", "analyze_dwell"])
      .order("ts", { ascending: false })
      .limit(50),
  ]);

  const userCategories: string[] = profileRes.data?.main_categories ?? [];
  const platformCats: { smartstore: string[]; coupang: string[] } =
    profileRes.data?.platform_categories ?? { smartstore: [], coupang: [] };
  const categoryWeights: CategoryWeights = profileRes.data?.category_weights ?? {
    smartstore: {}, coupang: {}, updated_at: "",
  };
  // platform_categories가 있으면 그걸 기준, 없으면 main_categories 체크
  const hasPlatformCats = (platformCats.smartstore?.length ?? 0) + (platformCats.coupang?.length ?? 0) > 0;
  const needsCategories = !hasPlatformCats && userCategories.length === 0;

  // 최근 키워드 (중복 제거)
  const allEvents = historyRes.data ?? [];
  const recentKeywords = [...new Set(
    allEvents.filter((e: { event_type: string }) => e.event_type !== "analyze_dwell")
      .map((e: { keyword: string }) => e.keyword).filter(Boolean)
  )].slice(0, 15);

  // 체류시간 높은 키워드 (analyze_dwell 이벤트의 dwell_ms 기반)
  const dwellKeywords = allEvents
    .filter((e: { event_type: string; metadata: Record<string, unknown> | null }) =>
      e.event_type === "analyze_dwell" && e.metadata)
    .sort((a: { metadata: Record<string, unknown> | null }, b: { metadata: Record<string, unknown> | null }) =>
      ((b.metadata?.dwell_ms as number) ?? 0) - ((a.metadata?.dwell_ms as number) ?? 0))
    .map((e: { keyword: string }) => e.keyword)
    .filter(Boolean)
    .slice(0, 10);

  // 온톨로지 경로 매핑 (분류 실패 시 네이버 쇼핑 역추적 + 자동 학습)
  const NAVER_CAT_TO_L1: Record<string, string> = {
    "패션의류": "ss.fashion", "패션잡화": "ss.accessory",
    "화장품/미용": "ss.beauty", "디지털/가전": "ss.digital",
    "가구/인테리어": "ss.furniture", "출산/육아": "ss.baby",
    "식품": "ss.food", "스포츠/레저": "ss.sports",
    "생활/건강": "ss.health", "여가/생활편의": "ss.leisure",
  };

  const recentPaths: string[] = [];
  const unclassified: string[] = [];

  for (const kw of [...new Set([...recentKeywords, ...dwellKeywords])]) {
    const c = classifyKeyword(kw, "smartstore");
    if (c) {
      if (!recentPaths.includes(c.path)) recentPaths.push(c.path);
    } else {
      unclassified.push(kw);
    }
  }

  // 미분류 키워드 → 네이버 쇼핑 역추적 (최대 3개, 속도 위해 제한)
  for (const kw of unclassified.slice(0, 3)) {
    try {
      const data = await searchNaver(kw, 3);
      const cat1 = data.items?.[0]?.category1;
      const l1Id = cat1 ? NAVER_CAT_TO_L1[cat1] : null;
      if (l1Id) {
        learnMapping(kw, l1Id, "smartstore", "naver_shopping");
        if (!recentPaths.includes(l1Id)) recentPaths.push(l1Id);
      }
    } catch { /* 역추적 실패 무시 */ }
  }

  // ── 자동 관심카테고리 추가 (30% 이상 비율 카테고리) ─────────────
  // 분석 기록의 L2를 카운트해서, 현재 관심카테고리에 없고 30% 이상이면 자동 추가
  let autoAdded = false;
  const allAnalyzeEvents = allEvents.filter(
    (e: { event_type: string; keyword: string }) => e.event_type !== "analyze_dwell" && e.keyword
  );
  if (allAnalyzeEvents.length >= 3) { // 최소 3건 이상일 때만
    const l2EventCount = new Map<string, number>();
    for (const e of allAnalyzeEvents) {
      const c = classifyKeyword(e.keyword, "smartstore");
      if (!c) continue;
      const l2 = c.path.split(".").slice(0, 3).join(".");
      if (l2.split(".").length >= 3) { // 실제 L2인지 확인
        l2EventCount.set(l2, (l2EventCount.get(l2) ?? 0) + 1);
      }
    }

    const totalAnalyze = allAnalyzeEvents.length;
    const currentSS = new Set(platformCats.smartstore ?? []);
    const newCats: string[] = [];

    for (const [l2, count] of l2EventCount) {
      const ratio = count / totalAnalyze;
      if (ratio >= 0.3 && !currentSS.has(l2)) {
        // L1도 추가
        const l1 = l2.split(".").slice(0, 2).join(".");
        if (!currentSS.has(l1)) newCats.push(l1);
        newCats.push(l2);
      }
    }

    if (newCats.length > 0) {
      const updatedSS = [...(platformCats.smartstore ?? []), ...newCats];
      platformCats.smartstore = [...new Set(updatedSS)];
      autoAdded = true;
      // DB에 저장 (비동기, 응답 블록 안 함)
      supabaseAdmin
        .from("users")
        .update({
          platform_categories: platformCats,
          main_categories: [...new Set([...userCategories, ...newCats])],
        })
        .eq("id", userId)
        .then(() => {});
    }
  }

  // platform_categories 있으면 온톨로지 경로 직접 사용, 없으면 기존 L1 매핑
  const userSSPaths: string[] = platformCats.smartstore?.length > 0
    ? platformCats.smartstore
    : userCategories.map((c) => L1_TO_SS[c]).filter(Boolean);
  const userSSL1s = [...new Set(userSSPaths.map((p) => p.split(".").slice(0, 2).join(".")))];
  const userSSL2s = userSSPaths.filter((p) => p.split(".").length >= 3);

  // ══════════════════════════════════════════════════════════════
  // 4개 Row 키워드 선정
  // ══════════════════════════════════════════════════════════════

  // ── Row 1 & Row 2: 과거 분석 비율 기반 배분 ─────────────────────
  // 조건1: 모든 분석된 카테고리가 빠짐없이 표시
  // 조건2: 분석 횟수 비율대로 카드 개수 배분
  // Row 1: 각 카테고리 내 유사도 최상위 상품
  // Row 2: 각 카테고리 내 유사도 그 다음 (인기 상품)
  const { row1Keywords, row2Keywords } = buildProportionalRows(
    allEvents, recentPaths, 8
  );

  // Row 3: 관심 카테고리 — L2 경로가 있으면 그 경로 기반 유사도, 없으면 L1 계층적
  const usedKws = new Set([...row1Keywords, ...row2Keywords]);
  const row3Keywords = userSSL2s.length > 0
    ? getSimilarSeedKeywords(userSSL2s, "smartstore", 0.5, 16).filter((k) => !usedKws.has(k)).slice(0, 8)
    : userSSL1s.length > 0
      ? getHierarchicalKeywords(userSSL1s, 8).filter((k) => !usedKws.has(k))
      : Object.keys(categoryWeights.smartstore ?? {}).length > 0
        ? generateFeedKeywords(categoryWeights, "smartstore", 8)
        : getSimilarSeedKeywords([], "smartstore", 0.3, 8);

  // Row 4: 추천 키워드 (온톨로지 Facet 기반 롱테일, 텍스트 전용)
  // 실제 분석 키워드의 온톨로지 형제/자식 노드 matchKeywords를 교차 조합
  // 예: "삼겹살" → "숙성 삼겹살", "캠핑용 삼겹살 국내산", "양념 대패 삼겹살"
  const row4Keywords = recentKeywords.length > 0
    ? generateBatchLongtails(recentKeywords.slice(0, 6), "smartstore", 8)
    : [];

  // Row 5: 급상승
  const row5Keywords = shuffle(TRENDING_SEED_KEYWORDS).slice(0, 8);

  // 롱테일(Row 4)은 상품 조회 필요 없음 — 키워드만 전달
  const row4Items: FeedItem[] = row4Keywords.map((kw) => ({ keyword: kw, category: "", product: null }));

  const [i1, i3, i5] = await Promise.all([
    buildItems(row1Keywords),
    buildItems(row3Keywords), buildItems(row5Keywords),
  ]);

  const rows: FeedRow[] = [
    { id: "recent_analysis", title: "최근 분석 기반 추천", subtitle: "내가 최근 분석한 키워드와 비슷한 상품들이에요", icon: "history", items: i1 },
    { id: "interest_category", title: "관심 카테고리 추천", subtitle: "내가 설정한 카테고리에서 지금 잘 팔리는 상품들", icon: "target", items: i3 },
    { id: "longtail", title: "추천 키워드", subtitle: "검색량은 적지만 구매로 이어질 확률이 높은 키워드", icon: "bulb", items: row4Items, displayType: "keyword_only" },
    { id: "trending", title: "지금 급상승", subtitle: "최근 검색량이 빠르게 늘고 있는 키워드", icon: "fire", items: i5 },
  ];

  return NextResponse.json({ rows, needsCategories, autoAdded });
}

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
