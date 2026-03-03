# Task-001: Env-based Relay Configuration

**Status:** done

## Objective

Replace hardcoded relay URLs with env-based configuration using Vite's built-in `.env` support. Defaults work for localhost; LAN overrides go in `.env.local` (gitignored).

## Acceptance Criteria

- [x] `.env` exists with defaults: `VITE_RELAY_HOST=localhost`, `VITE_RELAY_WS_PORT=9001`, `VITE_RELAY_INFO_PORT=9002`
- [x] `.env.local` is gitignored
- [x] `tsconfig.json` includes `vite/client` types (for `import.meta.env` type checking)
- [x] `src/main.ts` reads `VITE_RELAY_HOST`, `VITE_RELAY_WS_PORT` from `import.meta.env`
- [x] `RELAY_INFO_URL` is relative (`/relay-info`) — works through both Vite proxy and dev proxy
- [x] `vite.config.ts` uses `loadEnv()` to read env for proxy target config
- [x] `vite.config.ts` has `/relay-info` proxy pointing at relay info endpoint (temporary, removed in task-004)
- [x] Relay multiaddr is rewritten using env vars (host + port replacement)
- [x] `npm run build` — clean
- [x] `npm run test` — all tests pass
- [x] `npm run lint` — clean

## Notes

Much of this was started during the debugging session. This task formalizes and cleans it up.
