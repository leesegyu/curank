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
 * 스냅샷 + 결론 데이터를 반환 (GPT 미사용, 비용 $0)
 * 클라이언트에서 고정 템플릿으로 PDF 렌더링
 */
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  const platform = req.nextUrl.searchParams.get("platform") || "naver";

  if (!keyword) return NextResponse.json({ error: "keyword required" }, { status: 400 });

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id as string;

  // 플랜 확인 — PDF는 Standard+
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

  const result = snap.snapshot.result as Record<string, unknown>;
  const trend = snap.snapshot.trend as Record<string, unknown> | null;
  const demo = snap.snapshot.demographics as Record<string, unknown> | null;

  // 결론 데이터 (DB에서 조회, API 호출 0)
  const { data: conclusionRow } = await supabaseAdmin
    .from("analysis_conclusions")
    .select("result, generated_at")
    .eq("user_id", userId)
    .eq("keyword", keyword)
    .eq("platform", platform)
    .single();

  const conclusion = conclusionRow?.result as {
    combinations?: {
      strategy: string;
      title: string;
      tags: string[];
      reasoning: string;
      highlightFactor: string;
    }[];
  } | null;

  return NextResponse.json({
    keyword,
    platform,
    analyzedAt: snap.created_at,
    competitionScore: result.competitionScore,
    competitionLevel: result.competitionLevel,
    totalCount: result.totalCount,
    priceStats: result.priceStats,
    advice: result.advice,
    trendDirection: trend?.direction ?? null,
    trendData: trend?.data ?? [],
    demographics: demo ? {
      maleRatio: demo.maleRatio,
      femaleRatio: demo.femaleRatio,
      hasGenderData: demo.hasGenderData,
      ageGroups: demo.ageGroups,
      hasAgeData: demo.hasAgeData,
    } : null,
    // 결론 (추천 제목+태그 조합)
    conclusion: conclusion?.combinations ?? null,
  });
}
