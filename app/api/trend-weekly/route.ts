import { NextRequest, NextResponse } from "next/server";
import { getKeywordWeeklyTrend } from "@/lib/datalab";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim();
  if (!keyword) return NextResponse.json({ weeklyData: [] });

  const weeklyData = await getKeywordWeeklyTrend(keyword).catch(() => []);
  return NextResponse.json({ weeklyData });
}
