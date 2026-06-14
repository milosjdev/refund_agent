import { NextRequest, NextResponse } from "next/server";
import { listTraces, getTrace } from "@/agent/loop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const t = await getTrace(id);
    if (!t) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(t);
  }
  const traces = await listTraces(100);
  return NextResponse.json({ traces });
}
