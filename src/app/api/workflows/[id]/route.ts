import { NextRequest, NextResponse } from "next/server";
import { getWorkflow, getStepsForWorkflow } from "@/lib/db/queries";
import { initDb } from "@/lib/db/connection";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDb();
  const { id } = await params;
  const workflow = getWorkflow(id);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
  }

  const steps = getStepsForWorkflow(id);
  return NextResponse.json({ workflow, steps });
}
