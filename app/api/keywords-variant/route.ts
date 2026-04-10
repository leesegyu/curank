import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { classifyKeywordV2, getNodesV2 } from "@/lib/ontology/index";

const cache = new NodeCache({ stdTTL: 3600 });

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });

  const cacheKey = `var:${keyword}`;
  const l1 = cache.get<{ keywords: { keyword: string }[]; category: string | null }>(cacheKey);
  if (l1 && l1.keywords.length > 0) return NextResponse.json(l1);

  // V2 온톨로지 사용 — 슬래시 분리 노드로 품목별 정확한 매칭
  const classified = classifyKeywordV2(keyword, "smartstore");
  if (!classified) return NextResponse.json({ keywords: [], category: null });

  const nodes = getNodesV2(classified.platform);
  const currentNode = nodes.find(n => n.id === classified.path);
  if (!currentNode) return NextResponse.json({ keywords: [], category: null });

  // variantKeywords 수집 (현재 노드 + 자식 노드)
  const variants: string[] = [];
  const seen = new Set<string>();
  for (const vk of currentNode.variantKeywords ?? []) {
    if (vk !== keyword && !seen.has(vk)) { seen.add(vk); variants.push(vk); }
  }
  const children = nodes.filter(n => n.parent === classified.path);
  for (const child of children) {
    for (const vk of child.variantKeywords ?? []) {
      if (vk !== keyword && !seen.has(vk)) { seen.add(vk); variants.push(vk); }
    }
  }

  const results = variants.map(kw => ({ keyword: kw }));
  const response = { keywords: results, category: currentNode.name };
  if (results.length > 0) cache.set(cacheKey, response);
  return NextResponse.json(response);
}
