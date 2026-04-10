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

    // 시드 키워드 자체는 제외
    variants.delete(keyword);

    if (variants.size === 0) return NextResponse.json({ keywords: [], category: currentNode.name });

    // Ad API로 검색량 확보 — 2단계 전략
    // 1단계: 시드 키워드의 연관 키워드에서 variant 매칭 (API 1회)
    // 2단계: 미매칭 variant는 개별 hint 조회 (배치)
    const variantList = [...variants];
    const volumeMap = new Map<string, { volume: number; compIdx: string }>();
    const variantSet = new Set(variantList);

    // 1단계: 시드 키워드 연관 결과에서 variant 찾기
    const seedAds = await getNaverAdKeywords(keyword);
    for (const ad of seedAds) {
      if (variantSet.has(ad.relKeyword)) {
        const vol = (Number(ad.monthlyPcQcCnt) || 0) + (Number(ad.monthlyMobileQcCnt) || 0);
        volumeMap.set(ad.relKeyword, { volume: vol, compIdx: ad.compIdx ?? "보통" });
      }
    }

    // 2단계: 시드에서 못 찾은 variant는 개별 hint로 조회
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

    // 결과 구성 — 검색량 있는 것만, 점수순 정렬
    const results = variantList
      .map(kw => {
        const info = volumeMap.get(kw);
        const volume = info?.volume ?? 0;
        const compIdx = info?.compIdx ?? "보통";
        const mult = COMP_MULT[compIdx] ?? 0.5;
        const score = Math.round(volume * mult);
        return { keyword: kw, monthlyVolume: volume, competitionLevel: compIdx, score };
      })
      .filter(k => k.monthlyVolume > 0 || volumeMap.size === 0)
      .sort((a, b) => b.score - a.score);

    const response = { keywords: results, category: currentNode.name };
    cache.set(keyword, response);
    setL2Cache(keyword, CACHE_TYPE, response);
    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "추천 실패" }, { status: 500 });
  }
}
