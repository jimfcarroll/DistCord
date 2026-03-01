# Epic-003: Chat Messaging

**Status:** backlog

## Overview

Build a basic chat experience on top of the relay server from epic-002. Define message types, integrate identity signing/verification from epic-001, and create a minimal browser UI.

This is the **first demo milestone**: open two browser tabs, see each other's fingerprints, and exchange signed text messages in real time. Every message is signed by the sender's private key and verified by the receiver — no trust in the relay server.

## Key Decisions

- **Message format** — JSON with sender fingerprint, timestamp, body, and Ed25519 signature. Receiver verifies before displaying.
- **Minimal UI** — a message list and a text input. No framework yet (plain DOM or lightweight). Enough to prove the system works.
- **No rooms yet** — all connected peers see all messages. Room isolation comes in epic-005.

## Milestone

Two browsers connect, identify each other by fingerprint, and have a real-time signed text conversation. Messages are cryptographically verified end-to-end even though they pass through an untrusted relay.
