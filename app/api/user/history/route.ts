import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 1차: 영구 이력 테이블 조회
  const { data: permanent } = await supabaseAdmin
    .from("analysis_history")
    .select("keyword, platform, analyzed_at")
    .eq("user_id", session.user.id)
    .order("analyzed_at", { ascending: false })
    .limit(50);

  if (permanent && permanent.length > 0) {
    const history = permanent.map((e) => ({
      keyword: e.keyword,
      ts: e.analyzed_at,
      platform: e.platform,
    }));
    return NextResponse.json({ history });
  }

  // 2차 폴백: 기존 user_events에서 조회 (마이그레이션 전 데이터 호환)
  const { data } = await supabaseAdmin
    .from("user_events")
    .select("keyword, ts")
    .eq("user_id", session.user.id)
    .eq("event_type", "analyze")
    .order("ts", { ascending: false })
    .limit(200);

  if (!data) return NextResponse.json({ history: [] });

  const seen = new Set<string>();
  const history = data
    .filter((e) => {
      if (!e.keyword || seen.has(e.keyword)) return false;
      seen.add(e.keyword);
      return true;
    })
    .slice(0, 30)
    .map((e) => ({ keyword: e.keyword, ts: e.ts }));

  return NextResponse.json({ history });
}
