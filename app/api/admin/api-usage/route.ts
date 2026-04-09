import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/usage";
import { getApiUsage } from "@/lib/api-monitor";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !isAdmin(session.user.id as string)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(getApiUsage());
}
