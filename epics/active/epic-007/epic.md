# EPIC-007: Dev Proxy & LAN Access

## Objective

Enable secure LAN-accessible development by adding a TLS-terminating reverse proxy and env-based configuration. Browsers require HTTPS (a "secure context") for WebCrypto API. When accessing the app from a LAN machine (not localhost), both the page and the relay WebSocket need TLS.

Rather than managing certs on each service, a single reverse proxy terminates TLS. Vite and the relay stay plain HTTP/WS internally. One proxy, one cert, one browser warning.

## Scope

**In scope:**
- Env-based relay configuration (`.env` / `.env.local`)
- TLS-terminating reverse proxy (`proxy/dev-proxy.ts`)
- WSS multiaddr rewriting for relay connections through the proxy
- Cleanup of temporary Vite SSL plugin and inline proxy config

**Out of scope:**
- Production TLS (real certs, ACME, etc.)
- Changes to the relay or browser node networking code
- GossipSub debugging (separate, ongoing investigation)

## Key Design Decisions

- **Single proxy, single cert** — one self-signed cert auto-generated on first run. No cert management. Browser accepts it once.
- **WebSocket routing by subprotocol** — Vite HMR sends `Sec-WebSocket-Protocol: vite-hmr`. libp2p does not. This cleanly separates two WebSocket streams on the same port.
- **Env-based configuration** — Vite's built-in `.env` / `.env.local` support. Defaults work for localhost (no proxy needed). LAN overrides in gitignored `.env.local`.
- **Localhost still works without proxy** — `npm run relay` + `npm run dev` on localhost is unchanged. The proxy is only needed for LAN access.

## Architecture

```
Browser (HTTPS/WSS)
  │
  ▼
dev-proxy :8443  (TLS termination, auto-generated self-signed cert)
  ├─ /relay-info         → localhost:9002  (relay info, HTTP)
  ├─ WS + vite-hmr       → localhost:5173  (Vite HMR)
  ├─ WS (no subprotocol) → localhost:9001  (relay libp2p)
  └─ HTTP /*             → localhost:5173  (Vite dev server)
```

## Directory Structure

```
proxy/
  dev-proxy.ts          ← TLS reverse proxy
  cert.pem              ← Auto-generated, gitignored
  key.pem               ← Auto-generated, gitignored
.env                    ← Checked in, defaults for localhost
.env.local              ← Gitignored, LAN overrides
```

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | Env-based relay configuration | done |
| 002 | Dev reverse proxy | done |
| 003 | WSS multiaddr rewriting | done |
| 004 | Cleanup Vite config | done |
