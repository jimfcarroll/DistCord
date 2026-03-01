# Epic-004: WebRTC Data Channels

**Status:** backlog

## Overview

Establish direct peer-to-peer connections using WebRTC data channels. The signaling server from epic-002 handles the initial SDP/ICE exchange, then peers communicate directly without the relay. Fall back to relay when direct connection fails (symmetric NATs, ~10-20% of connections).

This is where the system becomes truly peer-to-peer. The relay server drops from "message bus" to "signaling-only" for connected peers.

## Key Decisions

- **WebRTC data channels** — not media streams. Text/binary messaging over SCTP.
- **ICE with relay fallback** — attempt direct connection via STUN, fall back to relaying through the signaling server if ICE fails.
- **Transport abstraction** — the messaging layer from epic-003 should work identically whether the underlying transport is WebSocket relay or WebRTC data channel.

## Milestone

Two browsers establish a direct WebRTC data channel, exchange messages peer-to-peer, and gracefully fall back to relay when direct connection isn't possible.
