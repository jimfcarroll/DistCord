# Task-004: Bootstrap/Relay Node

**Status:** done

## Objective

Build a minimal Node.js process that runs a libp2p node as a WebSocket listener and Circuit Relay v2 server. This is the bootstrap node — the one irreducible centralization point. Browser peers connect to it via WebSocket, then use it to discover each other and relay signaling for WebRTC connections.

No application logic, no state beyond a persistent identity key file. Equivalent to BitTorrent's `router.bittorrent.com`.

## Acceptance Criteria

- [x] Create `relay/tsconfig.json`
  - [x] Extends or mirrors root tsconfig with Node.js-appropriate settings
  - [x] `module: "NodeNext"`, `moduleResolution: "NodeNext"`
  - [x] Output to `relay/dist/` or similar
- [x] Create `relay/index.ts`
  - [x] Creates a libp2p node with:
    - [x] WebSocket transport, listening on configurable port (default 9001)
    - [x] Circuit Relay v2 server (`circuitRelayServer()`)
    - [x] Noise encryption, Yamux multiplexer
    - [x] Identify service
  - [x] Persistent identity: generates Ed25519 key on first run, saves to `relay/relay-key.bin`. Loads from file on subsequent runs.
  - [x] Prints all multiaddrs to stdout on startup
  - [x] Graceful shutdown on SIGINT/SIGTERM
- [x] Add `npm run relay` script to `package.json`
  - [x] Compiles and runs `relay/index.ts` (via `tsx`)
- [x] Verify: `npm run relay` starts, prints multiaddrs, shuts down cleanly on Ctrl+C
- [x] `npm run build` — still works (relay is separate from browser build)
- [x] `npm run lint` — clean (relay code included in lint scope)
