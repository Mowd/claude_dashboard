import { NextRequest, NextResponse } from "next/server";
import { countWorkflows, listWorkflows } from "@/lib/db/queries";
import type { WorkflowStatus } from "@/lib/workflow/types";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawLimit = parseInt(searchParams.get("limit") || "50", 10);
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;

  const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);
  const offset = Number.isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

  const filters = {
    ...(status ? { status: status as WorkflowStatus } : {}),
    ...(q ? { q } : {}),
  };

  const workflows = listWorkflows(limit, offset, filters);
  const total = countWorkflows(filters);
  return NextResponse.json({ workflows, total, limit, offset });
}
