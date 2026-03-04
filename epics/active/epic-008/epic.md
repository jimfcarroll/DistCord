# Epic-008: WAN Deployment & NAT Traversal

**Status:** active

## Overview

Make the application work across the internet, not just on LAN. Browsers on different networks connect to the relay, discover each other via the DHT, and establish direct WebRTC connections through NAT hole-punching.

The relay, proxy, env-based configuration, and multiaddr rewriting are already WAN-capable (built in epic-007). This epic adds the missing STUN/ICE configuration and verifies the full WAN path.

## Context

Epic-007 gave us LAN access via a TLS proxy and env-based relay addressing. Direct WebRTC connections work on LAN (`webrtc limited=false` confirmed). WAN adds NAT traversal — browsers behind different NATs need STUN servers to discover their public IP:port mappings so ICE hole-punching can succeed.

## Key Decisions

- **Google public STUN servers.** Free, reliable, used by virtually every WebRTC application. No account or API key needed. Two servers for redundancy (`stun.l.google.com:19302`, `stun1.l.google.com:19302`).
- **No TURN server.** TURN relays data through a centralized server, undermining the P2P architecture. Peers behind symmetric NAT that can't hole-punch simply can't connect. Acceptable tradeoff — the decentralized solution is peer-assisted relay via libp2p circuit relay, which we already have.
- **Deployment method is user's choice.** The code works with any method of making the relay publicly reachable (port forwarding, tunnel service, VPS).

## Scope boundaries (NOT in epic-008)

- TURN relay configuration (future, if symmetric NAT support needed)
- Peer-assisted relay for symmetric NAT peers (future)
- Production TLS certificates (Let's Encrypt) — self-signed certs with browser warnings are acceptable for testing
- VPS deployment automation (Docker Compose, systemd, etc.)

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | STUN/ICE server configuration | done |
| 002 | WAN deployment and verification | pending |

## Milestone

Two browsers on different networks (different public IPs) join a room, exchange messages over direct WebRTC connections (`webrtc limited=false`), and messages survive past the relay's 30-minute timeout.
