# Daily Autonomous Development SOP

## Goal
Ship small, reviewable improvements every day while keeping `main` stable.

## Non-negotiable rule
Every fix/feature/refactor MUST be done in a **new branch**.  
`main` is protected and only updated after human review + explicit merge decision.

## Daily loop
1. Triage backlog (issues with priority, type, size, DoD)
2. Select 1-3 small independent tasks
3. Create branch per task:
   - `fix/<short-topic>`
   - `feat/<short-topic>`
   - `chore/<short-topic>`
4. Implement + test + self-review
5. Open PR with template (Why / What / Risk / Test / Rollback)
6. Wait for human merge decision

## Task selection rules
- Prefer P0/P1 bugs first
- Prefer S/M size tasks for daily throughput
- Avoid batching unrelated changes in one PR
- Defer risky schema/API breaking changes unless explicitly approved

## Quality gates
Before PR is ready:
- tests pass (`npm run test`)
- no new warnings/errors introduced
- docs updated when behavior changes
- rollback path documented

## Suggested labels
- Priority: `P0`, `P1`, `P2`, `P3`
- Type: `bug`, `feature`, `chore`
- Size: `S`, `M`, `L`

## Human approval points
Must request approval before:
- breaking API changes
- data migrations/schema changes
- deletions with broad impact
- deployment/runtime config changes
