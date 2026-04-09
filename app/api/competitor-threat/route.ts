import { NextRequest, NextResponse } from "next/server";
import { unifiedSearch } from "@/lib/search";
import { calcCompetitorThreat, type CTSPlatform } from "@/lib/competitor-threat";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 }); // 1시간 캐시

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = (req.nextUrl.searchParams.get("platform") || "naver") as CTSPlatform;

  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  const cacheKey = `cts:${keyword}:${platform}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const searchResult = await unifiedSearch(keyword, platform === "coupang" ? "coupang" : "naver");
    const priceAvg = searchResult.products.length > 0
      ? searchResult.products.reduce((s, p) => s + p.salePrice, 0) / searchResult.products.length
      : 0;

    const result = calcCompetitorThreat(keyword, searchResult.products, platform, priceAvg);
    cache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "분석 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
