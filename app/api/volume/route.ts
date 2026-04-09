import { NextRequest, NextResponse } from "next/server";
import NodeCache from "node-cache";
import { getKeywordTrend } from "@/lib/datalab";

const cache = new NodeCache({ stdTTL: 3600 }); // 1시간 인메모리

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) return NextResponse.json({ volume: 0 });

  const cached = cache.get<number>(keyword);
  if (cached !== undefined) return NextResponse.json({ volume: cached });

  // DataLab 트렌드 기반 검색량 추정 (네이버 광고 API 대체)
  // trend.current는 0~100 상대 비율 → ×1000으로 절대량 추정
  const trend = await getKeywordTrend(keyword).catch(() => null);
  const volume = trend ? Math.round(trend.current * 1000) : 0;

  cache.set(keyword, volume);
  return NextResponse.json({ volume });
}
