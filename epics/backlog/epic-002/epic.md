# Epic-002: libp2p Bootstrap & Peer Connectivity

**Status:** backlog

## Overview

Set up js-libp2p in the browser and build the bootstrap infrastructure. This is the transport layer everything else sits on.

Browsers cannot bind to ports or do raw UDP/TCP. The only peer-to-peer transport available is WebRTC, which requires a signaling exchange before any connection. js-libp2p handles this: browser peers connect to a bootstrap/relay node via WebSocket, then establish WebRTC data channels to each other through Circuit Relay v2.

The bootstrap/relay node is the one irreducible centralization point — equivalent to BitTorrent's `router.bittorrent.com`. It introduces peers to each other and relays connections for peers behind symmetric NATs. It authenticates nothing, stores nothing, and can be replaced.

## Key Decisions

- **js-libp2p** — provides WebRTC transport, WebSocket transport, Circuit Relay v2, Noise encryption, Yamux multiplexing. We configure it, not rebuild it.
- **Bootstrap/relay node** — a Node.js process running libp2p with WebSocket listener and circuit relay server. Minimal and stateless.
- **Identity integration** — libp2p uses Ed25519 for PeerId by default. Our epic-001 keypairs integrate with libp2p's identity system so that a peer's network identity and their application identity are the same key.

## Milestone

Two browsers connect through the bootstrap/relay node, discover each other, establish a WebRTC data channel, and exchange raw data peer-to-peer. The relay node is only involved in the introduction — data flows directly between browsers.
