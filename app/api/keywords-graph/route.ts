/**
 * 그래프 기반 키워드 추천 API
 * GET /api/keywords-graph?keyword=삼겹살
 *
 * 알고리즘:
 *   1. 입력 키워드 → 온톨로지 경로 분류
 *      - 1차: matchKeywords 매칭 (classifyKeyword)
 *      - 2차 폴백: 네이버 쇼핑 카테고리로 온톨로지 역추적
 *   2. 전체 노드와 유사도 계산 → 시드 키워드 + 롱테일 반환
 */

import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import {
  classifyKeyword,
  wuPalmerSim,
  getNodes,
  generateOntologyLongtails,
  learnMapping,
} from "@/lib/ontology";
import type { OntologyNode } from "@/lib/ontology";
import { searchNaver } from "@/lib/naver";

const cache = new NodeCache({ stdTTL: 3600 });

export interface GraphKeyword {
  keyword:    string;
  similarity: number;
  category:   string;
  path:       string;
  type:       "seed" | "longtail";
}

// ── 네이버 쇼핑 카테고리 → 온톨로지 L1 매핑 ─────────────────────
// 네이버 쇼핑 API category1 값 → 스마트스토어 온톨로지 L1 id
const NAVER_CAT_TO_L1: Record<string, string> = {
  "패션의류":      "ss.fashion",
  "패션잡화":      "ss.accessory",
  "화장품/미용":   "ss.beauty",
  "디지털/가전":   "ss.digital",
  "가구/인테리어": "ss.furniture",
  "출산/육아":     "ss.baby",
  "식품":          "ss.food",
  "스포츠/레저":   "ss.sports",
  "생활/건강":     "ss.health",
  "여가/생활편의": "ss.leisure",
};

/**
 * 폴백 분류: 네이버 쇼핑 검색 → category1~4로 온톨로지 경로 역추적
 * 온톨로지 matchKeywords에 없는 키워드도 분류 가능
 */
async function classifyViaNaverShopping(
  keyword: string
): Promise<{ path: string; categoryName: string } | null> {
  try {
    const data = await searchNaver(keyword, 5);
    if (!data.items?.length) return null;

    // 가장 빈번한 category1 찾기
    const catCount = new Map<string, number>();
    for (const item of data.items) {
      const cat = item.category1;
      if (cat) catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
    }
    if (catCount.size === 0) return null;

    const topCat = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const l1Id = NAVER_CAT_TO_L1[topCat];
    if (!l1Id) return null;

    // category2~4로 더 구체적인 노드 찾기
    const item = data.items.find((i) => i.category1 === topCat)!;
    const subCats = [item.category4, item.category3, item.category2].filter(Boolean);

    const nodes = getNodes("smartstore");
    // 하위 카테고리명으로 온톨로지 노드 매칭 시도
    for (const subCat of subCats) {
      const sc = subCat!.toLowerCase();
      const match = nodes.find(
        (n) => n.id.startsWith(l1Id) && n.name.toLowerCase().includes(sc)
      );
      if (match) return { path: match.id, categoryName: match.name };
    }

    // L1만이라도 반환
    const l1Node = nodes.find((n) => n.id === l1Id);
    return l1Node ? { path: l1Id, categoryName: l1Node.name } : null;
  } catch {
    return null;
  }
}

// ── 메인 핸들러 ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword 필요" }, { status: 400 });
  }

  const cacheKey = `graph:${keyword}`;
  const cached = cache.get<GraphKeyword[]>(cacheKey);
  if (cached) return NextResponse.json({ keywords: cached, source: keyword });

  // 1차: matchKeywords + 2차: 학습 캐시 (classifyKeyword 내부)
  let currentPath: string | null = null;
  const classified = classifyKeyword(keyword, "smartstore");
  if (classified) {
    currentPath = classified.path;
  } else {
    // 3차 폴백: 네이버 쇼핑 카테고리로 역추적 + 학습 저장
    const fallback = await classifyViaNaverShopping(keyword);
    if (fallback) {
      currentPath = fallback.path;
      // 영구 학습: 다음부터 classifyKeyword에서 바로 찾음
      learnMapping(keyword, fallback.path, "smartstore", "naver_shopping");
    }
  }

  if (!currentPath) {
    // 어떤 방법으로도 분류 불가 → 빈 결과
    cache.set(cacheKey, []);
    return NextResponse.json({ keywords: [], source: keyword });
  }

  const nodes = getNodes("smartstore");

  // 2. 유사도 계산
  const scored: Array<{ node: OntologyNode; sim: number }> = [];
  for (const node of nodes) {
    if (node.seedKeywords.length === 0) continue;
    if (node.id === currentPath) continue;
    const sim = wuPalmerSim(currentPath, node.id);
    if (sim >= 0.4) scored.push({ node, sim });
  }
  scored.sort((a, b) => b.sim - a.sim);

  // 3. 시드 키워드 추출
  const results: GraphKeyword[] = [];
  const seen = new Set<string>();

  // 현재 노드의 시드 키워드도 포함 (자기 자신)
  const selfNode = nodes.find((n) => n.id === currentPath);
  if (selfNode) {
    for (const kw of selfNode.seedKeywords) {
      if (seen.has(kw)) continue;
      seen.add(kw);
      results.push({
        keyword: kw, similarity: 1.0,
        category: selfNode.name, path: selfNode.id, type: "seed",
      });
    }
  }

  for (const { node, sim } of scored) {
    for (const kw of node.seedKeywords) {
      if (seen.has(kw)) continue;
      seen.add(kw);
      results.push({
        keyword: kw, similarity: Math.round(sim * 100) / 100,
        category: node.name, path: node.id, type: "seed",
      });
    }
  }

  // 4. 온톨로지 롱테일
  const longtails = generateOntologyLongtails(keyword, "smartstore", 10);
  for (const lt of longtails) {
    if (seen.has(lt)) continue;
    seen.add(lt);
    results.push({
      keyword: lt, similarity: 0.9,
      category: "롱테일", path: currentPath, type: "longtail",
    });
  }

  const final = results.slice(0, 30);
  cache.set(cacheKey, final);

  return NextResponse.json({ keywords: final, source: keyword, sourcePath: currentPath });
}
