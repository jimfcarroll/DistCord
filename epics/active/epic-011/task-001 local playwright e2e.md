# Task-001: Local Playwright E2E Tests

**Status:** in-progress

## Objective

Add Playwright-based end-to-end tests that run two browser contexts on the same machine, testing the full user flow: create a room, join from a second browser, exchange messages, and verify receipt.

## Changes

### New files

- `playwright.config.ts` — Playwright configuration (base URL, timeouts, headless mode)
- `e2e/room-messaging.spec.ts` — E2E test: create room, join, send/receive messages

### Modified files

- `package.json` — add `@playwright/test` dependency, `test:e2e` script
- `vite.config.ts` — exclude `e2e/` from Vitest
- `.devcontainer/Dockerfile` — add Chromium system dependencies (libatk, libgbm, etc.)

## Implementation Notes

- Two Playwright browser contexts simulate two separate users (separate localStorage, separate libp2p nodes)
- Tests interact with the app through the existing UI (input fields, buttons, displayed messages)
- Playwright `webServer` config auto-starts relay, Vite, and proxy (or reuses if already running)
- Tests run headless in the devcontainer

## Acceptance Criteria

- [x] Playwright installed with Chromium
- [x] `playwright.config.ts` configured for local dev
- [x] E2E test: Browser A creates room, Browser B joins, both exchange messages
- [ ] `npm run test:e2e` passes in devcontainer (blocked: container rebuild needed for Chromium deps)
- [x] Existing unit tests still pass (`npm test`)
