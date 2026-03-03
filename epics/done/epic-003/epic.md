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
| 002 | Room ID computation | done |
| 003 | DHT provider announce and discovery | done |
| 004 | Room discovery integration demo | done |

## Notes

### kadDHT `clientMode` default is `true`, not `false`

The `@libp2p/kad-dht` source (line 139 of `kad-dht.js`) reads `this.clientMode = init.clientMode ?? true`, contradicting its JSDoc which says `@default false`. This meant both the relay and browser started in client mode. Client mode does not register the `/ipfs/kad/1.0.0` protocol handler, so the browser's topology listener never detected a DHT-capable peer, routing tables stayed empty, and all `provide()` / `findProviders()` calls timed out with `TimeoutError: signal timed out` — no indication of the root cause.

**Fix:** Explicitly set `clientMode: false` on the relay's kadDHT config. The browser correctly stays in client mode (the default happens to be correct for browsers, just wrong for servers).

### DHT routing table needs time after connection

After the browser connects to the relay via WebSocket, the DHT topology listener needs time to detect the relay's `/ipfs/kad/1.0.0` protocol and add it to the routing table. There is no "DHT ready" event. If you call `provide()` or `findProviders()` immediately after connecting, the routing table is empty and queries time out.

**Fix:** Disable room create/join buttons until the relay connects, then wait 2 seconds for the routing table to populate before enabling them.

## Milestone

Create a room (computes room_id, announces on DHT). From a second browser, look up that room_id on the DHT, discover the creating peer, and connect to it. The room invite link (containing room_id) is the only information needed to join.
