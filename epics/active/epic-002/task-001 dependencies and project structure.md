# Task-001: Dependencies and Project Structure

**Status:** pending

## Objective

Install js-libp2p and related packages, create the `src/network/` directory structure. Pure infrastructure — no application code, no tests. Verification is that build, test, and lint all pass cleanly with the new dependencies.

## Acceptance Criteria

- [ ] Install production dependencies
  - [ ] `libp2p` — core library
  - [ ] `@libp2p/webrtc` — WebRTC transport
  - [ ] `@libp2p/websockets` — WebSocket transport
  - [ ] `@libp2p/circuit-relay-v2` — Circuit Relay v2 (client + server)
  - [ ] `@chainsafe/libp2p-noise` — Noise encryption
  - [ ] `@chainsafe/libp2p-yamux` — Yamux multiplexer
  - [ ] `@libp2p/crypto` — Ed25519 key operations
  - [ ] `@libp2p/peer-id` — PeerId from keys
  - [ ] `@libp2p/identify` — peer identification protocol
  - [ ] `@libp2p/bootstrap` — bootstrap peer discovery
  - [ ] `@libp2p/ping` — ping service
  - [ ] `@multiformats/multiaddr` — multiaddr parsing
- [ ] Create `src/network/index.ts` (empty barrel file, will grow as tasks add exports)
- [ ] Verify all npm scripts still work
  - [ ] `npm run build` — compiles without errors
  - [ ] `npm run test` — existing tests still pass
  - [ ] `npm run lint` — no lint errors
