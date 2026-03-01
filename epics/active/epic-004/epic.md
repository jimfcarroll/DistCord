# Epic-004: Chat Messaging

**Status:** active

## Overview

First demo milestone: two browsers find each other on the DHT and chat with signed messages. This epic builds the messaging layer on top of the networking (epic-002) and discovery (epic-003) foundations.

Messages are signed with the sender's Ed25519 private key and verified by receivers using epic-001's identity module. No trust in any intermediary — only in the signature chain. GossipSub (libp2p's pub/sub protocol) handles message propagation within rooms.

## Context

Epic-003 is done. Two browsers can join a room via DHT lookup and exchange messages, but messaging uses a custom protocol handler with direct 1-to-1 streams — no broadcast, no signatures, no structured format. Epic-004 replaces this with GossipSub pub/sub and signed messages.

The milestone: two browsers join a room via DHT lookup, exchange signed text messages in real time, and cryptographically verify each message. Messages flow peer-to-peer via GossipSub — not through a central relay (though the relay participates in the gossip mesh to help propagation between peers that lack a direct WebRTC connection).

Scope boundaries (NOT in epic-004):

Authority log / permissions / roles → epic-005
IndexedDB persistence / history sync / causal ordering → epic-006

## Key Decisions

- **StrictNoSign at the libp2p layer**. We sign at the application layer using our identity module, not libp2p's built-in message signing. Messages are self-contained and verifiable without libp2p internals. Requires a custom msgIdFn (SHA-256 hash of data bytes) since the default uses from + seqno which are absent under StrictNoSign.
- **Public key embedded in message body**. Each message includes the sender's raw public key bytes (base64). Receivers verify using our verify() function directly — no need to recover a CryptoKey from a PeerId through libp2p's protobuf encoding.
- **Topic naming: room:<CID string>**. The room: prefix namespaces our topics to avoid collisions with other protocols.
- **Relay gets GossipSub too**. It participates in the gossip mesh so messages propagate between peers that aren't directly connected via WebRTC.

- **Message format** — JSON with sender fingerprint, timestamp, body, and Ed25519 signature.
- **GossipSub** — libp2p's pub/sub protocol for room-scoped message propagation. Each room is a pub/sub topic.
- **Signature verification** — receivers verify every message before displaying. Messages with invalid signatures are dropped.
- **Minimal UI** — a message list and a text input. Plain DOM, no framework. Enough to prove the system works end-to-end.

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | GossipSub dependency and configuration | done |
| 002 | Message types and sign/verify wrappers | done |
| 003 | Room messaging abstraction | done |
| 004 | Demo integration | done |

## Milestone

Two browsers join a room via DHT lookup, exchange signed text messages in real time, and cryptographically verify each message. Messages flow peer-to-peer — not through a central relay.
