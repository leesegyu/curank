import { NextRequest, NextResponse } from "next/server";
import { getCategoryKeywords } from "@/lib/shopping";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.trim();
  const name = req.nextUrl.searchParams.get("name")?.trim() ?? "";

  if (!code) {
    return NextResponse.json({ error: "code 파라미터 필요" }, { status: 400 });
  }

  try {
    const result = await getCategoryKeywords(code, name);
    return NextResponse.json(
      { category: result.category, keywords: result.keywords },
      { headers: { "Cache-Control": "public, max-age=3600" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "조회 실패" },
      { status: 500 }
    );
  }
}
