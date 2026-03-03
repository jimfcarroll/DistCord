# Task-004: Cleanup Vite Config

**Status:** done

## Objective

Remove the temporary Vite SSL plugin and inline proxy config that are now handled by the dev proxy.

## Acceptance Criteria

- [x] `@vitejs/plugin-basic-ssl` removed from `vite.config.ts` imports and plugin array
- [x] `@vitejs/plugin-basic-ssl` removed from `package.json` devDependencies
- [ ] `/relay-info` proxy config removed from `vite.config.ts` — **KEPT**: needed for localhost mode
- [x] `VITE_HTTPS` env var removed from `.env` (no longer needed)
- [ ] `vite.config.ts` simplified to plain object — **KEPT function form**: still needs `loadEnv` for proxy target
- [x] Keep `host: true` and `allowedHosts: true` in server config
- [x] `npm run build` — clean
- [x] `npm run test` — all tests pass
- [x] `npm run lint` — clean

## Notes

The `/relay-info` proxy in Vite was needed temporarily for the HTTPS mixed-content workaround. With the dev proxy handling all routing, Vite doesn't need it. For localhost dev (no proxy), `RELAY_INFO_URL = "/relay-info"` still works because Vite serves the page and the browser makes a relative fetch — but we need to keep the Vite proxy for localhost mode OR make the info URL configurable. Decision: keep the Vite `/relay-info` proxy for localhost mode. Only remove `basicSsl`.
