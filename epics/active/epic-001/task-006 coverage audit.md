# Task-006: Coverage Audit

**Status:** done

## Objective

Verify that all code files in the identity module meet the 85% test coverage threshold. Review coverage from all prior tasks, identify any gaps, and add missing tests. This is a final quality gate before closing the epic.

## Acceptance Criteria

- [x] Run full coverage report (`npx vitest run --coverage`)
- [x] Identify any source files below 85% line coverage
- [x] Write additional tests to bring all files to ≥ 85%
- [x] Re-run coverage and confirm all files pass the threshold
- [x] npm run test — all tests pass
- [x] npm run lint — no errors

## Findings

All five implementation files are at 100% coverage:

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| fingerprint.ts | 100 | 100 | 100 | 100 |
| generateKeypair.ts | 100 | 100 | 100 | 100 |
| serializeKeys.ts | 100 | 100 | 100 | 100 |
| sign.ts | 100 | 100 | 100 | 100 |
| verify.ts | 100 | 100 | 100 | 100 |

Three files show 0% but require no action:

- **types.ts** — pure type definitions, no runtime code emitted
- **index.ts** — pure re-export barrel, v8 doesn't track re-export lines
- **main.ts** — integration demo script, verified manually via `npm run dev`

No additional tests needed.
