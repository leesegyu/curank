import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUsage, getPlanLimits, isAdmin } from "@/lib/usage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const usage = await getUsage(userId);
  const limits = isAdmin(userId)
    ? { analysis: Infinity, comparison: Infinity, regeneration: Infinity, historyMax: 50, snapshotDays: Infinity, pdfDownload: true }
    : getPlanLimits(usage.plan);

  return NextResponse.json({ ...usage, limits });
}
