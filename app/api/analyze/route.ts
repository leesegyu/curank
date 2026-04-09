import { NextRequest, NextResponse } from "next/server";
import { unifiedSearch } from "@/lib/search";
import { analyze } from "@/lib/analyzer";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 3600 });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();

  if (!keyword || keyword.length < 1 || keyword.length > 50) {
    return NextResponse.json(
      { error: "키워드는 1~50자 사이여야 합니다." },
      { status: 400 }
    );
  }

  const cacheKey = `analyze:${keyword}`;
  const cached = cache.get(cacheKey);
  if (cached) return NextResponse.json({ ...cached as object, fromCache: true });

  try {
    const searchResult = await unifiedSearch(keyword);
    const result = analyze(searchResult);
    cache.set(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
