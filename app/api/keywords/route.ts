import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getKeywordRecommendations } from "@/lib/keywords";
import { getL2Cache, setL2Cache } from "@/lib/cache-db";

const CACHE_TYPE = "keywords";
const cache = new NodeCache({ stdTTL: 3600 }); // L1: 1시간 인메모리

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword 파라미터 필요" }, { status: 400 });
  }

  // L1 캐시 (인메모리)
  const l1 = cache.get<Awaited<ReturnType<typeof getKeywordRecommendations>>>(keyword);
  if (l1) return NextResponse.json({ keywords: l1, cached: true });

  // L2 캐시 (Supabase, 24시간)
  const l2 = await getL2Cache<Awaited<ReturnType<typeof getKeywordRecommendations>>>(keyword, CACHE_TYPE);
  if (l2) {
    cache.set(keyword, l2);
    return NextResponse.json({ keywords: l2, cached: true });
  }

  try {
    const keywords = await getKeywordRecommendations(keyword);
    cache.set(keyword, keywords);
    setL2Cache(keyword, CACHE_TYPE, keywords); // 비동기 L2 저장
    return NextResponse.json({ keywords });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "추천 실패" },
      { status: 500 }
    );
  }
}
