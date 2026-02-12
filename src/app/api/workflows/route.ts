import { NextRequest, NextResponse } from "next/server";
import { listWorkflows } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);

  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);
  const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

  const workflows = listWorkflows(limit, offset);
  return NextResponse.json({ workflows });
}
