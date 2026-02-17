import { NextRequest, NextResponse } from "next/server";
import { cleanupWorkflows } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  const rawKeepDays = Number(body?.keepDays ?? 0);
  const rawKeepLatest = Number(body?.keepLatest ?? 0);

  const keepDays = Number.isFinite(rawKeepDays)
    ? Math.max(0, Math.min(3650, Math.floor(rawKeepDays)))
    : 0;
  const keepLatest = Number.isFinite(rawKeepLatest)
    ? Math.max(0, Math.min(10000, Math.floor(rawKeepLatest)))
    : 0;

  if (keepDays === 0 && keepLatest === 0) {
    return NextResponse.json(
      { error: "Provide keepDays or keepLatest greater than 0" },
      { status: 400 },
    );
  }

  const result = cleanupWorkflows({ keepDays, keepLatest });
  return NextResponse.json({ ...result, keepDays, keepLatest });
}
