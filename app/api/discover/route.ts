/**
 * 상품발굴 API
 *
 * GET /api/discover?season=summer&category=식품&sort=upside&page=1
 *
 * 플랜별 열람 제한: Free 3개 / Standard 15개 / Business 40개 / Premium+ 전체
 * 무료: 필터 비활성, 상세정보(차트/검색량/경쟁도) 숨김, 분석 연결 비활성
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDiscoverKeywords, type DiscoverSort } from "@/lib/discover";
import { getL1Categories } from "@/lib/ontology";
import { getUsage, getPlanLimits, isAdmin } from "@/lib/usage";
import type { SeasonType } from "@/lib/seasonal-trend";

const VALID_SEASONS: SeasonType[] = ["summer", "winter", "spring", "autumn"];
const VALID_SORTS: DiscoverSort[] = ["upside", "volume", "peak_soon"];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // 인증 + 플랜 확인
  const session = await auth();
  const userId = session?.user?.id as string | undefined;
  let plan = "free";
  if (userId) {
    if (isAdmin(userId)) {
      plan = "membership";
    } else {
      const usage = await getUsage(userId);
      plan = usage?.plan ?? "free";
    }
  }
  const limits = getPlanLimits(plan);
  const discoverLimit = limits.discoverLimit;
  const isFree = plan === "free" || !userId;

  // 무료는 필터 비활성 (시즌/카테고리/정렬 무시)
  const seasonParam = searchParams.get("season");
  const seasonType = !isFree && seasonParam && VALID_SEASONS.includes(seasonParam as SeasonType)
    ? (seasonParam as SeasonType)
    : undefined;

  const categoryL1 = !isFree ? (searchParams.get("category") || undefined) : undefined;

  const sortParam = searchParams.get("sort");
  const sort: DiscoverSort = !isFree && sortParam && VALID_SORTS.includes(sortParam as DiscoverSort)
    ? (sortParam as DiscoverSort)
    : "upside";

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  try {
    const { keywords: allKeywords, total: rawTotal } = await getDiscoverKeywords({
      seasonType,
      categoryL1,
      sort,
      page: 1,
      pageSize: 500, // 전체 가져온 후 제한 적용
    });

    // 플랜별 열람 제한
    const limitedKeywords = allKeywords.slice(0, discoverLimit);
    const total = Math.min(rawTotal, discoverLimit);

    // 무료: 상세정보 숨김 (차트/검색량/경쟁도 제거)
    const responseKeywords = isFree
      ? limitedKeywords.map((kw) => ({
          ...kw,
          monthlyRatios: [],    // 차트 숨김
          monthlyTotal: null,   // 검색량 숨김
          compIdx: null,        // 경쟁도 숨김
          seasonality: 0,       // 시즌성 지수 숨김
        }))
      : limitedKeywords;

    // 페이지네이션 적용
    const pageSize = 30;
    const start = (page - 1) * pageSize;
    const pagedKeywords = responseKeywords.slice(start, start + pageSize);

    const categories = getL1Categories("smartstore");

    return NextResponse.json({
      keywords: pagedKeywords,
      total,
      page,
      pageSize,
      categories,
      plan,
      discoverLimit,
      isFree,
    });
  } catch {
    return NextResponse.json({ keywords: [], total: 0, page: 1, pageSize: 30, categories: [], plan, discoverLimit, isFree }, { status: 500 });
  }
}
