import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createClient } from "@supabase/supabase-js";
import { invalidateFeedCache } from "@/lib/feed-cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 프로필 조회
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data } = await supabaseAdmin
    .from("users")
    .select("id, email, name, selling_experience, main_categories, main_platform, platform_categories, oauth_provider, avatar_url, created_at")
    .eq("id", session.user.id)
    .single();

  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ user: data });
}

// PATCH: 프로필 수정
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const allowed = ["name", "selling_experience", "main_categories", "main_platform", "platform_categories"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "수정할 항목이 없습니다" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("users")
    .update(updates)
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

  // 카테고리 변경 시 피드 캐시 즉시 무효화
  if (updates.main_categories || updates.platform_categories) {
    invalidateFeedCache(session.user.id);
  }

  return NextResponse.json({ success: true });
}
