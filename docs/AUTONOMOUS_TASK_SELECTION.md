# Autonomous Task Selection Rules

Use this to keep daily autonomous work predictable and review-friendly.

## Daily budget
- Max 2 PRs/day
- Max 1 medium task/day
- At least 1 task must be low-risk

## Priority order
1. P0 bugs
2. P1 bugs
3. P1 features
4. Chores/refactors that reduce risk or maintenance cost

## Selection constraints
A task is eligible only if all are true:
- clear acceptance criteria exists
- can be completed in one branch
- rollback is straightforward
- does not require schema/API breaking changes unless pre-approved

## Scoring (for ties)
Score = Impact + Urgency + Confidence - Risk - Size

- Impact: 1-5
- Urgency: 1-5
- Confidence: 1-5
- Risk: 1-5
- Size: 1-3

Pick highest score first.

## Mandatory branch policy
Every selected task gets its own branch:
- `fix/<topic>`
- `feat/<topic>`
- `chore/<topic>`

No direct commits to `main`.

## PR readiness checklist
- tests pass
- lint passes
- linked issue present
- PR template filled (Why/What/Risk/Test/Rollback)
