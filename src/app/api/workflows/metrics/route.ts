import { NextResponse } from "next/server";
import { getWorkflowMetrics } from "@/lib/db/queries";
import { initDb } from "@/lib/db/connection";

export async function GET() {
  await initDb();
  const metrics = getWorkflowMetrics();
  return NextResponse.json(metrics);
}
