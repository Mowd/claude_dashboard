import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { initDb, closeDb } from "@/lib/db/connection";
import {
  createWorkflow,
  getWorkflow,
  listWorkflows,
  updateWorkflowStatus,
  getStepsForWorkflow,
  updateStepStatus,
} from "@/lib/db/queries";

describe("SQLite persistence contract", () => {
  const originalCwd = process.cwd();
  let tempDir = "";

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cdb-db-contract-"));
    process.chdir(tempDir);
    await initDb();
  });

  afterEach(() => {
    closeDb();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("creates workflow and five default agent steps", () => {
    const wf = createWorkflow("wf-1", "Test workflow", "Do task", "/tmp/project");

    expect(wf.id).toBe("wf-1");
    expect(wf.status).toBe("pending");

    const steps = getStepsForWorkflow("wf-1");
    expect(steps.length).toBe(5);
    expect(steps.map((s) => String(s.role).toLowerCase())).toEqual([
      "pm",
      "rd",
      "ui",
      "test",
      "sec",
    ]);
    expect(steps.every((s) => s.status === "pending")).toBe(true);
  });

  it("updates workflow status and current step index", () => {
    createWorkflow("wf-2", "Status workflow", "Do task", "/tmp/project");

    updateWorkflowStatus("wf-2", "running", 2);
    const running = getWorkflow("wf-2");
    expect(running?.status).toBe("running");
    expect(running?.currentStepIndex).toBe(2);

    updateWorkflowStatus("wf-2", "completed", 4);
    const done = getWorkflow("wf-2");
    expect(done?.status).toBe("completed");
    expect(done?.completedAt).not.toBeNull();
  });

  it("lists workflows newest-first with limit/offset", () => {
    createWorkflow("wf-a", "A", "Prompt A", "/tmp/project");
    createWorkflow("wf-b", "B", "Prompt B", "/tmp/project");
    createWorkflow("wf-c", "C", "Prompt C", "/tmp/project");

    const firstTwo = listWorkflows(2, 0);
    expect(firstTwo.length).toBe(2);

    const nextOne = listWorkflows(1, 1);
    expect(nextOne.length).toBe(1);
    expect(firstTwo[1].id).toBe(nextOne[0].id);
  });

  it("updates step fields and persists token/duration data", () => {
    createWorkflow("wf-3", "Step workflow", "Do task", "/tmp/project");
    const step = getStepsForWorkflow("wf-3")[0];

    updateStepStatus(step.id, {
      status: "completed",
      output: "step output",
      durationMs: 1234,
      tokensIn: 111,
      tokensOut: 222,
      completedAt: new Date().toISOString(),
    });

    const updated = getStepsForWorkflow("wf-3").find((s) => s.id === step.id);
    expect(updated?.status).toBe("completed");
    expect(updated?.output).toBe("step output");
    expect(updated?.durationMs).toBe(1234);
    expect(updated?.tokensIn).toBe(111);
    expect(updated?.tokensOut).toBe(222);
  });
});
