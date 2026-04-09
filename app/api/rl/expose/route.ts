/**
 * POST /api/rl/expose
 * 추천 키워드가 화면에 노출됐을 때 rl_episodes에 기록
 * 나중에 클릭 여부로 reward 업데이트됨
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !supabase) return NextResponse.json({ ok: true });

  try {
    const { queryKeyword, candidates, modelVersion } = await req.json();
    if (!queryKeyword || !Array.isArray(candidates)) return NextResponse.json({ ok: true });

    const now = new Date().toISOString();
    const hour = new Date().getHours();
    const day  = new Date().getDay(); // 0=일 → 6=토, 우리는 0=월 규칙으로 저장

    // candidates: [{ keyword, rank }]
    const rows = (candidates as { keyword: string; rank: number }[]).map((c) => ({
      user_id:         session.user!.id,
      query_keyword:   queryKeyword,
      candidate_kw:    c.keyword,
      rank_shown:      c.rank,
      model_version:   modelVersion ?? "v1",
      hour_of_day:     hour,
      day_of_week:     day,
      exposed_at:      now,
    }));

    // Supabase에 배치 insert (fire-and-forget)
    supabase.from("rl_episodes").insert(rows).then(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
