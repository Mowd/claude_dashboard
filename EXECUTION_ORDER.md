# Claude Dashboard — Execution Order (SQLite retained)

This project will **keep SQLite** as the persistence layer.

## Ordered implementation plan

1. **DB usage inventory (read/write map)**
   - Confirm all current SQLite touchpoints (engine writes, API reads, history UI dependencies).
   - Output: clear map of what must remain stable.
   - Current map:
     - Write path: `WorkflowEngine` -> `createWorkflow`, `updateWorkflowStatus`, `updateStepStatus`
     - Read path (API): `GET /api/workflows` -> `listWorkflows`; `GET /api/workflows/[id]` -> `getWorkflow` + `getStepsForWorkflow`
     - Read path (UI): `/history` page -> `HistoryTable` -> `/api/workflows`
     - Server boot dependency: `server.ts` calls `initDb()` before workflow operations

2. **Stabilize persistence contract**
   - Define and lock the minimum DB contract used by workflow engine + APIs.
   - Add/adjust tests for create/update/list/get workflow and step records.

3. **History UX baseline (make DB value visible)**
   - Add clear navigation entry to History page from main UI.
   - Ensure history list can be reached in one click from dashboard.

4. **Workflow detail view (from history row)** ✅
   - Click a workflow row to open detail page/panel.
   - Show step outputs, status timeline, duration, token usage.

5. **History query improvements** ✅
   - Add pagination controls, status filter, text search (title/prompt).
   - Keep API query params bounded and validated.

6. **Reliability hardening for SQLite writes** ✅
   - Audit transaction boundaries and error handling.
   - Ensure graceful handling of interrupted runs and partial failures.

7. **Data retention controls** ✅
   - Add optional cleanup policy (e.g., keep last N days / N workflows).
   - Provide safe manual cleanup command/action.

8. **Feature wave 1 (high-value additions)** ✅
   - Prompt templates/presets.
   - Run artifact summary (changed files / outputs summary).

9. **Feature wave 2 (operator efficiency)** ✅
   - Partial retry UX (retry failed agent step only).
   - Cost/performance dashboard from persisted workflow stats.

10. **Final polish + release checklist** ✅
    - Regression pass (test + lint + manual smoke).
    - Update minimal docs only where strictly necessary.

---

## Working rules

- Every task is implemented in a **new branch**.
- No direct development on `main`.
- Keep changes minimal and reviewable.
