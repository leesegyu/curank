import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsage, getPlanLimits, isAdmin } from "@/lib/usage";
import { getSnapshot } from "@/lib/snapshot";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/report?keyword=...&platform=...
 * 스냅샷 전체 + 결론 데이터를 반환 (기-승-전-결 PDF용)
 */
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = req.nextUrl.searchParams.get("platform") || "naver";

  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id as string;

  if (!isAdmin(userId)) {
    const usage = await getUsage(userId);
    const limits = getPlanLimits(usage.plan);
    if (!limits.pdfDownload) {
      return NextResponse.json({ error: "PDF 다운로드는 Standard 이상 플랜에서 가능합니다.", upgrade: true }, { status: 403 });
    }
  }

  const snap = await getSnapshot(userId, keyword, platform);
  if (!snap) {
    return NextResponse.json({ error: "분석 데이터가 없습니다. 먼저 키워드를 분석해주세요." }, { status: 404 });
  }

  try {
    const result = (snap.snapshot.result ?? {}) as Record<string, unknown>;
    const trend = snap.snapshot.trend as Record<string, unknown> | null;
    const factorScore = snap.snapshot.factorScore as Record<string, unknown> | null;
    const keywordsV2 = snap.snapshot.keywordsV2 as unknown[] | null;
    const keywordsVariant = snap.snapshot.keywordsVariant as unknown[] | null;
    const keywordsSeasonOpp = snap.snapshot.keywordsSeasonOpp as unknown[] | null;
    const factorAggregated = snap.snapshot.factorAggregated as unknown[] | null;
    const competitorThreat = snap.snapshot.competitorThreat as Record<string, unknown> | null;

    // brandDistribution: 객체 { brands: [...] } 또는 배열 호환
    const bdRaw = snap.snapshot.brandDistribution;
    const brandDistribution = bdRaw
      ? (Array.isArray(bdRaw) ? bdRaw : (bdRaw as { brands?: unknown[] }).brands ?? [])
      : [];

    // 결론 데이터
    let conclusion = null;
    try {
      const { data: conclusionRow } = await supabaseAdmin
        .from("analysis_conclusions")
        .select("result, generated_at")
        .eq("user_id", userId)
        .eq("keyword", keyword)
        .eq("platform", platform)
        .single();
      conclusion = (conclusionRow?.result as { combinations?: unknown[] } | null)?.combinations ?? null;
    } catch { /* 결론 없어도 PDF 생성 계속 */ }

    return NextResponse.json({
      keyword,
      platform,
      analyzedAt: snap.created_at,
      competitionScore: result.competitionScore ?? null,
      competitionLevel: result.competitionLevel ?? null,
      totalCount: result.totalCount ?? null,
      priceStats: result.priceStats ?? null,
      trendDirection: trend?.direction ?? null,
      trendData: trend?.data ?? [],
      factorScore,
      competitorThreat,
      brandDistribution,
      keywordsV2: keywordsV2?.slice(0, 5) ?? [],
      keywordsVariant: keywordsVariant?.slice(0, 5) ?? [],
      keywordsSeasonOpp: keywordsSeasonOpp?.slice(0, 3) ?? [],
      factorAggregated: factorAggregated?.slice(0, 5) ?? [],
      advice: result.advice ?? null,
      conclusion,
    });
  } catch (err) {
    console.error("[report] error:", err);
    return NextResponse.json({ error: "보고서 데이터 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
