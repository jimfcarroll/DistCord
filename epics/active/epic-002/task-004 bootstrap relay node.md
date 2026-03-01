# Task-004: Bootstrap/Relay Node

**Status:** pending

## Objective

Build a minimal Node.js process that runs a libp2p node as a WebSocket listener and Circuit Relay v2 server. This is the bootstrap node — the one irreducible centralization point. Browser peers connect to it via WebSocket, then use it to discover each other and relay signaling for WebRTC connections.

No application logic, no state beyond a persistent identity key file. Equivalent to BitTorrent's `router.bittorrent.com`.

## Acceptance Criteria

- [ ] Create `relay/tsconfig.json`
  - [ ] Extends or mirrors root tsconfig with Node.js-appropriate settings
  - [ ] `module: "NodeNext"`, `moduleResolution: "NodeNext"`
  - [ ] Output to `relay/dist/` or similar
- [ ] Create `relay/index.ts`
  - [ ] Creates a libp2p node with:
    - [ ] WebSocket transport, listening on configurable port (default 9001)
    - [ ] Circuit Relay v2 server (`circuitRelayServer()`)
    - [ ] Noise encryption, Yamux multiplexer
    - [ ] Identify service
  - [ ] Persistent identity: generates Ed25519 key on first run, saves to `relay/relay-key.bin`. Loads from file on subsequent runs.
  - [ ] Prints all multiaddrs to stdout on startup
  - [ ] Graceful shutdown on SIGINT/SIGTERM
- [ ] Add `npm run relay` script to `package.json`
  - [ ] Compiles and runs `relay/index.ts` (via `tsx` or similar)
- [ ] Verify: `npm run relay` starts, prints multiaddrs, shuts down cleanly on Ctrl+C
- [ ] `npm run build` — still works (relay is separate from browser build)
- [ ] `npm run lint` — clean (relay code included in lint scope)
