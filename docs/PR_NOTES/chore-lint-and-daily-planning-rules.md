## Why
`npm run lint` currently enters an interactive Next.js setup prompt, which blocks autonomous daily workflows and CI usage. We also need deterministic rules for daily task picking.

## What changed
- Added flat ESLint config (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals`
- Updated lint command to use ESLint CLI directly (non-interactive)
- Added `docs/AUTONOMOUS_TASK_SELECTION.md` for daily autonomous planning policy

## Risk
Low. This is workflow/tooling + docs only, with no runtime behavior change.

## Test
- `npm run lint`
- `npm run test`

## Rollback
Revert this PR to restore previous lint command and remove planning docs.
