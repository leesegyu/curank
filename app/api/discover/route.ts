/**
 * 상품발굴 API
 *
 * GET /api/discover?season=summer&category=식품&sort=upside&page=1
 *
 * 모든 데이터는 DB + 로컬 연산 → 외부 API 호출 0
 */

import { NextRequest, NextResponse } from "next/server";
import { getDiscoverKeywords, type DiscoverSort } from "@/lib/discover";
import { getL1Categories } from "@/lib/ontology";
import type { SeasonType } from "@/lib/seasonal-trend";

const VALID_SEASONS: SeasonType[] = ["summer", "winter", "spring", "autumn"];
const VALID_SORTS: DiscoverSort[] = ["upside", "volume", "peak_soon"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const seasonParam = searchParams.get("season");
  const seasonType = seasonParam && VALID_SEASONS.includes(seasonParam as SeasonType)
    ? (seasonParam as SeasonType)
    : undefined;

  const categoryL1 = searchParams.get("category") || undefined;

  const sortParam = searchParams.get("sort");
  const sort: DiscoverSort = sortParam && VALID_SORTS.includes(sortParam as DiscoverSort)
    ? (sortParam as DiscoverSort)
    : "upside";

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  try {
    const { keywords, total } = await getDiscoverKeywords({
      seasonType,
      categoryL1,
      sort,
      page,
      pageSize: 30,
    });

    const categories = getL1Categories("smartstore");

    return NextResponse.json({
      keywords,
      total,
      page,
      pageSize: 30,
      categories,
    });
  } catch {
    return NextResponse.json({ keywords: [], total: 0, page: 1, pageSize: 30, categories: [] }, { status: 500 });
  }
}
