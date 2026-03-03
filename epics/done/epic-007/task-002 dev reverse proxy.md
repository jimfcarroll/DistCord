# Task-002: Dev Reverse Proxy

**Status:** done

## Objective

Create a TLS-terminating reverse proxy that routes all browser traffic through a single HTTPS endpoint. Auto-generates a self-signed cert on first run. No cert management required.

## Acceptance Criteria

- [x] `http-proxy` and `@types/http-proxy` installed as dev dependencies
- [x] `proxy/dev-proxy.ts` created (~60 lines)
- [x] On first run, auto-generates `proxy/cert.pem` + `proxy/key.pem` via `openssl`
- [x] Logs clearly: cert generation, listening address, routing summary
- [x] HTTPS server on port 8443 (configurable via `PROXY_PORT` env)
- [x] HTTP routing: `/relay-info` → `localhost:9002`, everything else → `localhost:5173`
- [x] WS routing: `Sec-WebSocket-Protocol: vite-hmr` → `localhost:5173`, otherwise → `localhost:9001`
- [x] `package.json` has `"proxy"` script
- [x] `proxy/cert.pem` and `proxy/key.pem` in `.gitignore`
- [x] Port 8443 added to `.devcontainer/devcontainer.json` `forwardPorts`
- [x] Graceful shutdown on SIGINT/SIGTERM
- [x] `npm run build` — clean
- [x] `npm run test` — all tests pass

## Implementation Notes

- WebSocket subprotocol detection: Vite HMR sends `Sec-WebSocket-Protocol: vite-hmr` header. libp2p WebSocket does not set any subprotocol. Check `req.headers['sec-websocket-protocol']` on the `upgrade` event.
- Cert generation: `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -keyout key.pem -out cert.pem -days 365 -nodes -subj '/CN=dev-proxy'`
- This is dev infrastructure, not application code. No unit tests needed — verification is manual (LAN browser test).
