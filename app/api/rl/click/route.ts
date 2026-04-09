/**
 * POST /api/rl/click
 * 추천 클릭 시 rl_episodes reward 업데이트
 * reward = click(1) + analyzed(3) 합산 → nightly export 시 로컬 DB로 이관
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !supabase) return NextResponse.json({ ok: true });

  try {
    const { queryKeyword, candidateKw, wasAnalyzed } = await req.json();
    if (!queryKeyword || !candidateKw) return NextResponse.json({ ok: true });

    // 가장 최근 미클릭 에피소드 찾아서 업데이트
    const reward = wasAnalyzed ? 4 : 1; // click=1, analyze=+3

    supabase
      .from("rl_episodes")
      .update({
        was_clicked:  true,
        was_analyzed: wasAnalyzed ?? false,
        reward,
        clicked_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id)
      .eq("query_keyword", queryKeyword)
      .eq("candidate_kw", candidateKw)
      .eq("was_clicked", false)
      .order("exposed_at", { ascending: false })
      .limit(1)
      .then(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
