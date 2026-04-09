/**
 * GET /api/ext/overlay?keyword=X
 *
 * 확장프로그램 In-SERP 오버레이용 경량 데이터.
 * - 로그인 없이도 기본 데이터 반환 (무료 기능)
 * - X-CuRank-Key 헤더 있으면 풍부한 데이터 + 우선 처리
 *
 * 응답: OverlayData (types.ts 참조)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey }              from "@/lib/ext-auth";
import { unifiedSearch, fetchNaverScoreData } from "@/lib/search";
import { analyze }                   from "@/lib/analyzer";
import { getKeywordTrend }           from "@/lib/datalab";

// in-memory 캐시 (30분)
const cache = new Map<string, { data: unknown; at: number }>();
const TTL   = 30 * 60 * 1000;

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword required" }, { status: 400 });
  }

  // API 키 검증 (없어도 허용 — 단, rate limit 적용 예정)
  const rawKey = req.headers.get("X-CuRank-Key") ?? "";
  const _auth  = rawKey ? await verifyApiKey(rawKey) : null;
  // TODO: 미인증 사용자에게 rate limiting 적용

  // 캐시 확인
  const cached = cache.get(keyword);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    // 병렬 fetch — 확장은 가벼운 응답만 필요하므로 trend는 선택적
    const [searchRaw, naverScoreRaw, trendRaw] = await Promise.allSettled([
      unifiedSearch(keyword),
      fetchNaverScoreData(keyword),
      getKeywordTrend(keyword),
    ]);

    const searchData   = searchRaw.status   === "fulfilled" ? searchRaw.value   : null;
    const naverScore   = naverScoreRaw.status === "fulfilled" ? naverScoreRaw.value : null;
    const trend        = trendRaw.status    === "fulfilled" ? trendRaw.value    : null;

    if (!searchData) {
      return NextResponse.json({ error: "analysis failed" }, { status: 500 });
    }

    const result = analyze(searchData, naverScore);

    // 월간 검색량 — DataLab 트렌드 기반 추정 (trend.current × 1000)
    const monthlyVolume = Math.round((trend?.current ?? 0) * 1000);

    const overlayData = {
      keyword,
      competitionScore: result.competitionScore,
      level:            result.competitionLevel,
      monthlyVolume,
      trendDirection:   trend?.direction ?? null,
      coupangScore:     result.coupangPlatformScore?.score ?? null,
      naverScore:       result.naverPlatformScore?.score ?? null,
    };

    cache.set(keyword, { data: overlayData, at: Date.now() });

    return NextResponse.json(overlayData, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    console.error("[ext/overlay]", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

// 확장프로그램 preflight 허용
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Headers": "X-CuRank-Key, Content-Type",
    },
  });
}
