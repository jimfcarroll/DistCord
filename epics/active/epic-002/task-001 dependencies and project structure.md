# Task-001: Dependencies and Project Structure

**Status:** done

## Objective

Install js-libp2p and related packages, create the `src/network/` directory structure. Pure infrastructure — no application code, no tests. Verification is that build, test, and lint all pass cleanly with the new dependencies.

## Acceptance Criteria

- [x] Install production dependencies
  - [x] `libp2p` — core library
  - [x] `@libp2p/webrtc` — WebRTC transport
  - [x] `@libp2p/websockets` — WebSocket transport
  - [x] `@libp2p/circuit-relay-v2` — Circuit Relay v2 (client + server)
  - [x] `@chainsafe/libp2p-noise` — Noise encryption
  - [x] `@chainsafe/libp2p-yamux` — Yamux multiplexer
  - [x] `@libp2p/crypto` — Ed25519 key operations
  - [x] `@libp2p/peer-id` — PeerId from keys
  - [x] `@libp2p/identify` — peer identification protocol
  - [x] `@libp2p/bootstrap` — bootstrap peer discovery
  - [x] `@libp2p/ping` — ping service
  - [x] `@multiformats/multiaddr` — multiaddr parsing
- [x] Create `src/network/index.ts` (empty barrel file, will grow as tasks add exports)
- [x] Verify all npm scripts still work
  - [x] `npm run build` — compiles without errors
  - [x] `npm run test` — existing tests still pass (20/20)
  - [x] `npm run lint` — no lint errors
