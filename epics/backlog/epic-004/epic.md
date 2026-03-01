# Epic-004: Chat Messaging

**Status:** backlog

## Overview

First demo milestone: two browsers find each other on the DHT and chat with signed messages. This epic builds the messaging layer on top of the networking (epic-002) and discovery (epic-003) foundations.

Messages are signed with the sender's Ed25519 private key and verified by receivers using epic-001's identity module. No trust in any intermediary — only in the signature chain. GossipSub (libp2p's pub/sub protocol) handles message propagation within rooms.

## Key Decisions

- **Message format** — JSON with sender fingerprint, timestamp, body, and Ed25519 signature.
- **GossipSub** — libp2p's pub/sub protocol for room-scoped message propagation. Each room is a pub/sub topic.
- **Signature verification** — receivers verify every message before displaying. Messages with invalid signatures are dropped.
- **Minimal UI** — a message list and a text input. Plain DOM, no framework. Enough to prove the system works end-to-end.

## Milestone

Two browsers join a room via DHT lookup, exchange signed text messages in real time, and cryptographically verify each message. Messages flow peer-to-peer — not through a central relay.
