# Task-005: Peer Connectivity Integration

**Status:** pending

## Objective

Prove the epic milestone: two browser peers connect through the bootstrap/relay node, establish a direct WebRTC data channel, and exchange data peer-to-peer. The relay is only involved in the introduction — once WebRTC connects, data flows directly between browsers.

## Acceptance Criteria

- [ ] Integration test or demo proving end-to-end connectivity
  - [ ] Start bootstrap/relay node
  - [ ] Browser peer A connects to relay via WebSocket
  - [ ] Browser peer B connects to relay via WebSocket
  - [ ] Peer A and Peer B discover each other through the relay
  - [ ] Peers establish a direct WebRTC connection (relay used only for signaling)
  - [ ] Peers exchange a test message over the direct connection
- [ ] Update `src/main.ts` or create a demo page
  - [ ] Shows peer's own PeerId and fingerprint
  - [ ] Shows connection status (connected to relay, discovered peer, direct connection)
  - [ ] Demonstrates sending/receiving a raw text message between two tabs
- [ ] All existing tests still pass: `npm run test`
- [ ] `npm run build` — clean
- [ ] `npm run lint` — clean
