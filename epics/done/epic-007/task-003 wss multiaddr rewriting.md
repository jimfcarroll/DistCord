# Task-003: WSS Multiaddr Rewriting

**Status:** done

## Objective

Update the relay multiaddr rewriting in `src/main.ts` to produce WSS multiaddrs when connecting through the dev proxy. Localhost dev stays unchanged.

## Acceptance Criteria

- [x] New env var `VITE_RELAY_WSS` (default: `false`) in `.env`
- [x] New env var `VITE_PROXY_PORT` (default: `8443`) in `.env`
- [x] `.env.local` updated: `VITE_RELAY_WSS=true`, `VITE_PROXY_PORT=8443`
- [x] When `VITE_RELAY_WSS=true`:
  - [x] `/ip4/<any-ip>/` → `/dns4/${RELAY_HOST}/` (hostnames need dns4, not ip4)
  - [x] `/tcp/<port>/` → `/tcp/${PROXY_PORT}/`
  - [x] `/ws/` → `/wss/`
- [x] When `VITE_RELAY_WSS=false`: current behavior (ip4, original port, ws)
- [x] `npm run build` — clean
- [x] `npm run test` — all tests pass

## Notes

The relay returns multiaddrs like `/ip4/0.0.0.0/tcp/9001/ws/p2p/<id>`. For LAN+proxy, the browser needs `/dns4/homer-prime/tcp/8443/wss/p2p/<id>`. The `/dns4/` prefix is required because `/ip4/` only accepts numeric IP addresses, not hostnames.
