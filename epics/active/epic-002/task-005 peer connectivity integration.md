# Task-005: Peer Connectivity Integration

**Status:** done

## Objective

Prove the epic milestone: two browser peers connect through the bootstrap/relay node, establish a direct WebRTC data channel, and exchange data peer-to-peer. The relay is only involved in the introduction — once WebRTC connects, data flows directly between browsers.

## Acceptance Criteria

- [x] Integration test or demo proving end-to-end connectivity
  - [x] Start bootstrap/relay node
  - [x] Browser peer A connects to relay via WebSocket
  - [x] Browser peer B connects to relay via WebSocket
  - [x] Peer A and Peer B discover each other through the relay
  - [x] Peers establish a direct WebRTC connection (relay used only for signaling)
  - [x] Peers exchange a test message over the direct connection
- [x] Update `src/main.ts` or create a demo page
  - [x] Shows peer's own PeerId and fingerprint
  - [x] Shows connection status (connected to relay, discovered peer, direct connection)
  - [x] Demonstrates sending/receiving a raw text message between two tabs
- [x] All existing tests still pass: `npm run test`
- [x] `npm run build` — clean
- [x] `npm run lint` — clean
