import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { classifyKeyword, getNodes } from "@/lib/ontology/index";
import { getNaverAdKeywords, getNaverAdKeywordsForHints } from "@/lib/naver-ad";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";

const CACHE_TYPE = "keywords_variant";
const cache = new NodeCache({ stdTTL: 3600 });

const COMP_MULT: Record<string, number> = {
  "낮음": 1.0, "보통": 0.5, "높음": 0.18, "매우 높음": 0.08,
};

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });

  // L1 캐시
  const l1 = cache.get(keyword);
  if (l1) return NextResponse.json(l1);

  // L2 캐시
  const l2 = await getL2Cache(keyword, CACHE_TYPE);
  if (l2) { cache.set(keyword, l2); return NextResponse.json(l2); }

  try {
    const classified = classifyKeyword(keyword, "smartstore");
    if (!classified) return NextResponse.json({ keywords: [], category: null });

    const nodes = getNodes(classified.platform);
    const currentNode = nodes.find(n => n.id === classified.path);
    if (!currentNode) return NextResponse.json({ keywords: [], category: null });

    // variantKeywords 수집 (현재 노드 + 자식 노드)
    const variants = new Set<string>(currentNode.variantKeywords ?? []);
    const children = nodes.filter(n => n.parent === classified.path);
    for (const child of children) {
      if (child.variantKeywords) child.variantKeywords.forEach(v => variants.add(v));
    }
    variants.delete(keyword);

    if (variants.size === 0) return NextResponse.json({ keywords: [], category: currentNode.name });

    const variantList = [...variants];
    const volumeMap = new Map<string, { volume: number; compIdx: string }>();
    const variantSet = new Set(variantList);

    // 검색량 확보 시도 — best-effort (Ad API 실패해도 카드는 표시)
    try {
      // 1단계: 시드 키워드 연관 결과에서 variant 매칭
      const seedAds = await getNaverAdKeywords(keyword);
      for (const ad of seedAds) {
        if (variantSet.has(ad.relKeyword)) {
          const vol = (Number(ad.monthlyPcQcCnt) || 0) + (Number(ad.monthlyMobileQcCnt) || 0);
          volumeMap.set(ad.relKeyword, { volume: vol, compIdx: ad.compIdx ?? "보통" });
        }
      }

      // 2단계: 미매칭 variant는 개별 hint 조회
      const missing = variantList.filter(v => !volumeMap.has(v));
      if (missing.length > 0) {
        const batches: string[][] = [];
        for (let i = 0; i < missing.length; i += 5) {
          batches.push(missing.slice(i, i + 5));
        }
        const batchResults = await Promise.allSettled(
          batches.map(b => getNaverAdKeywordsForHints(b))
        );
        for (const r of batchResults) {
          if (r.status !== "fulfilled") continue;
          for (const ad of r.value) {
            if (variantSet.has(ad.relKeyword) && !volumeMap.has(ad.relKeyword)) {
              const vol = (Number(ad.monthlyPcQcCnt) || 0) + (Number(ad.monthlyMobileQcCnt) || 0);
              volumeMap.set(ad.relKeyword, { volume: vol, compIdx: ad.compIdx ?? "보통" });
            }
          }
        }
      }
    } catch { /* Ad API 실패해도 variant 목록은 그대로 표시 */ }

    // 결과: 검색량 있는 것 우선, 없는 것도 포함 (온톨로지 보장 데이터)
    const results = variantList
      .map(kw => {
        const info = volumeMap.get(kw);
        const volume = info?.volume ?? -1; // -1 = 미확인
        const compIdx = info?.compIdx ?? "";
        const mult = COMP_MULT[compIdx] ?? 0.5;
        const score = volume > 0 ? Math.round(volume * mult) : 0;
        return { keyword: kw, monthlyVolume: volume, competitionLevel: compIdx, score };
      })
      .sort((a, b) => b.score - a.score);

    const response = { keywords: results, category: currentNode.name };
    cache.set(keyword, response);
    setL2Cache(keyword, CACHE_TYPE, response);
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "추천 실패" }, { status: 500 });
  }
}
