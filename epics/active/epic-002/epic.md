# EPIC-002: libp2p Bootstrap & Peer Connectivity

## Objective

Set up js-libp2p in the browser and build the bootstrap infrastructure — the transport layer everything else sits on. Browsers cannot bind to ports or do raw UDP/TCP, so all peer-to-peer connectivity goes through WebRTC. js-libp2p handles WebRTC transport, signaling (via Circuit Relay v2), encryption (Noise), and multiplexing (Yamux).

The bootstrap/relay node is the one irreducible centralization point — equivalent to BitTorrent's `router.bittorrent.com`. It introduces peers and relays connections for peers behind symmetric NATs. It authenticates nothing, stores nothing, and can be replaced.

## Scope

**In scope:**
- js-libp2p dependencies and configuration
- Identity bridge: epic-001 Ed25519 keypairs ↔ libp2p PrivateKey/PeerId
- Browser libp2p node factory (WebRTC, WebSocket, Circuit Relay v2, Noise, Yamux)
- Bootstrap/relay node (Node.js, WebSocket listener, Circuit Relay v2 server)
- Peer connectivity proof: two browsers connect and exchange data

**Out of scope:**
- Kademlia DHT configuration (epic-003)
- GossipSub / message propagation (epic-004)
- Authority log (epic-005)
- IndexedDB persistence (epic-006)
- Production deployment of the relay node

## Key Design Decisions

- **Identity bridge, not replacement** — epic-001 WebCrypto keys are bridged to libp2p via the JWK `d` field (32-byte Ed25519 seed). Same key material, two representations. App-level signing stays with WebCrypto; network identity uses libp2p.
- **Circuit Relay v2 as signaling** — no separate signaling server. WebRTC SDP exchange happens over a relayed connection through the bootstrap node. Once the direct WebRTC connection is established, the relay drops out.
- **Bootstrap node is minimal** — WebSocket listener, Circuit Relay v2 server, identify service. No application logic, no state.
- **`filters.all` for dev** — `@libp2p/websockets` defaults to `wss://` only. Dev environment uses `ws://` over localhost.

## Directory Structure

```
src/
  network/
    identity-bridge.ts           ← WebCrypto ↔ libp2p key bridge
    identity-bridge.test.ts
    create-browser-node.ts       ← Browser libp2p node factory
    create-browser-node.test.ts
    index.ts                     ← Barrel file
relay/
  index.ts                       ← Bootstrap/relay node entry point
  tsconfig.json                  ← Node.js-specific TS config
```

## Milestone

Two browsers connect through the bootstrap/relay node, discover each other, establish a WebRTC data channel, and exchange raw data peer-to-peer. The relay node is only involved in the introduction — data flows directly between browsers.

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | Dependencies and project structure | done |
| 002 | Identity bridge — WebCrypto to libp2p | done |
| 003 | Browser libp2p node factory | done |
| 004 | Bootstrap/relay node | done |
| 005 | Peer connectivity integration | pending |
