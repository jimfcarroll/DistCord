# Epic-003: Kademlia DHT & Room Discovery

**Status:** active

## Overview

The DHT is the core of the architecture. Rooms are keys in the DHT, peers are participants — the same model as BitTorrent, where torrent info hashes are keys and downloaders/seeders are peers.

Configure libp2p's Kademlia DHT so browsers can create rooms, announce themselves, and discover other peers in a room. Room addressing follows the scheme from the README: `room_id = H(creator_pubkey + room_name + nonce)`. A room invite link is the equivalent of a magnet link — just a hash that the DHT resolves to a set of peers.

## Context

Epic-002 is complete. Two browsers can discover each other via relay HTTP polling and exchange messages. But this discovery mechanism is a stopgap — the relay tracks connected peers and the browser polls every 3s. The architecture calls for a Kademlia DHT where rooms are keys and peers are providers, like BitTorrent info hashes.

Epic-003 replaces the relay-polling peer discovery with DHT-based room discovery. The milestone: browser A creates a room (computes room_id, announces on DHT), browser B looks up that room_id, discovers A, connects.

Scope boundaries (NOT in epic-003):

GossipSub / pub-sub messaging → epic-004
Authority log / permissions / roles → epic-005
IndexedDB persistence / history sync → epic-006

## Key Decisions

- **DHT client mode in browser** — browsers query and announce but don't store the full routing table. The bootstrap/relay node runs in server mode as a full DHT participant.
- **Room addressing** — `room_id = H(creator_pubkey + room_name + nonce)` as specified in the architecture.
- **Announcement** — when a peer joins a room, it announces itself under the room_id on the DHT. Active rooms have online peers who re-announce periodically. Dead rooms naturally fall out.
- **DHT queries relay through existing connections** — no new WebRTC connection per lookup hop. Queries travel through the existing peer mesh and converge in O(log n) hops.

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | kad-dht dependency and configuration | done |
| 002 | Room ID computation | pending |
| 003 | DHT provider announce and discovery | pending |
| 004 | Room discovery integration demo | pending |

## Milestone

Create a room (computes room_id, announces on DHT). From a second browser, look up that room_id on the DHT, discover the creating peer, and connect to it. The room invite link (containing room_id) is the only information needed to join.
