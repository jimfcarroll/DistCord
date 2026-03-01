# Epic-002: Signaling & Relay Server

**Status:** backlog

## Overview

Build a minimal Node.js WebSocket server (`ws` package) that lets browser peers discover each other and relay messages. This is the bootstrap infrastructure — the one irreducible centralization point acknowledged in the architecture.

The server is intentionally dumb: it authenticates nothing, stores nothing, and can be replaced. It knows which peers are connected and forwards messages between them. When WebRTC is added in epic-004, this server becomes the signaling channel for SDP/ICE exchange, and message relay becomes a fallback.

## Key Decisions

- **Node.js + `ws`** — same runtime as the toolchain, battle-tested WebSocket library, zero magic.
- **Server is stateless** — no database, no persistence. Peer list lives in memory. Server restarts mean everyone reconnects.
- **Protocol is JSON over WebSocket** — simple, debuggable, replaceable.
- **Identity integration** — peers announce themselves with their public key fingerprint. The server doesn't verify signatures (it's dumb), but peers can verify each other.

## Milestone

Two browser tabs connect to the relay server, see each other's fingerprints in the peer list, and can send a message through the relay that arrives at the other tab.
