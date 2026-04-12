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
    const kwV2Raw = snap.snapshot.keywordsV2;
    const keywordsV2 = Array.isArray(kwV2Raw) ? kwV2Raw : null;
    const kwVarRaw = snap.snapshot.keywordsVariant;
    const keywordsVariant = Array.isArray(kwVarRaw) ? kwVarRaw : (kwVarRaw as { keywords?: unknown[] } | null)?.keywords ?? null;
    const kwSosRaw = snap.snapshot.keywordsSeasonOpp;
    const keywordsSeasonOpp = Array.isArray(kwSosRaw) ? kwSosRaw : null;
    const kwAggRaw = snap.snapshot.factorAggregated;
    const factorAggregated = Array.isArray(kwAggRaw) ? kwAggRaw : null;
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
      keywordsV2: keywordsV2?.slice(0, 10) ?? [],
      keywordsVariant: keywordsVariant?.slice(0, 10) ?? [],
      keywordsSeasonOpp: keywordsSeasonOpp?.slice(0, 10) ?? [],
      keywordsGraph: Array.isArray(snap.snapshot.keywordsGraph) ? (snap.snapshot.keywordsGraph as unknown[]).slice(0, 10) : [],
      keywordsCreative: Array.isArray(snap.snapshot.keywordsCreative) ? (snap.snapshot.keywordsCreative as unknown[]).slice(0, 10) : [],
      factorAggregated: factorAggregated?.slice(0, 20) ?? [],
      advice: result.advice ?? null,
      conclusion,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[report] error:", msg, err);
    return NextResponse.json({ error: `보고서 오류: ${msg}` }, { status: 500 });
  }
}
