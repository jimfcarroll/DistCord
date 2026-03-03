# Decentralized Discord

A peer-to-peer, distributed alternative to Discord built around a DHT and public-key cryptography. No central servers — just a mesh of browser-based peers that self-organize into communities.

## Core Architecture

### Identity

Public key pairs **are** identity. Your "account" is a keypair. Display names, avatars, and profile metadata are signed and self-published. Authentication is proving you hold the private key — no central auth server. Similar to [Nostr](https://nostr.com/)'s model.

### Room Addressing

A room (analogous to a Discord "server") is a point on the DHT, identified by a key derived from the creator's public key:

```
room_id = H(creator_pubkey + room_name + nonce)
```

The DHT maps:
- `room_id` → set of bootstrap peers currently online for that room
- `user_id` → routing hints (IP:port, relay nodes)

### Message Transport & Persistence

Messages propagate within a room via **gossip protocol** among connected peers. Channel history is a log-structured CRDT (append-only, causally ordered via vector clocks or Lamport timestamps). Peers joining late sync missing history from peers who have it — essentially a BitTorrent swarm per-channel where the "pieces" are message ranges.

### Voice & Streaming

- **Small groups:** WebRTC peer-to-peer directly.
- **Larger channels:** Volunteer peers act as a Selective Forwarding Unit (SFU) — a lightweight media relay. Peers with good bandwidth self-nominate or get elected.

## Permissions & Moderation

### The Authority Log

Permissions are managed via a **signed append-only authority log** — a hash-chained sequence of entries replicated to every peer in the room. The room creator's keypair is the root of trust.

```
Entry: {
  seq:        u64,
  action:     GRANT | REVOKE | BAN | UNBAN | SET_POLICY | DEFINE_ROLE,
  target:     pubkey,
  role:       OWNER | MOD | MEMBER | BANNED,
  signed_by:  pubkey,
  sig:        bytes,
  prev_hash:  H(previous entry)   // hash chain for tamper evidence
}
```

Every peer independently replays the log to derive the current ACL state and validates that each entry's signer had authority at that point in the chain. The hash chain makes it tamper-evident — silently dropping entries breaks the hashes.

### Trust Model

This is **tamper-evident**, not tamper-proof. The distinction:

- **Tamper-proof** (blockchain): consensus among untrusted parties prevents forks. Expensive.
- **Tamper-evident** (this system): if anyone alters history, hashes break and peers reject it. Cheap.

It works because the creator's key is the single root of trust. No proof-of-work or BFT consensus needed — just signature verification back to that root. There's no fork problem because only one entity (the creator) can sign structural changes.

### Roles & Capabilities

**Static roles:** A fixed set (`OWNER | MOD | MEMBER | BANNED`) covers most use cases and keeps validation simple.

**Capability bitmasks:** For finer control, user-defined roles with granular permissions (`CAN_BAN | CAN_DELETE | CAN_INVITE | CAN_PIN`, etc.). Role definitions are additional `DEFINE_ROLE` entries in the authority log:

```
Entry: {
  action:       DEFINE_ROLE,
  role_name:    "helper",
  capabilities: CAN_DELETE | CAN_MUTE,
  signed_by:    owner_pubkey
}
```

Static roles become pre-defined capability bundles — the log structure doesn't change.

**Policy on retroactivity:** Actions taken under a valid role definition survive role changes. If `CAN_BAN` is removed from a role, existing bans stand. The owner can explicitly `UNBAN` if needed. This keeps log evaluation a simple forward scan.

### Revocation

Promoting is easy. Demoting is hard — the revoked node can just ignore it and keep signing.

**Defense:** Peers enforce locally. Once `REVOKE_MOD(X)` appears in the authority log, all honest peers reject subsequent mod actions from X. The revoked mod can sign whatever they want, but nobody relays or stores it. The authority log should be prioritized in gossip propagation over regular messages to minimize the confusion window.

### Conflict Resolution

If two mods issue conflicting actions simultaneously, **Lamport timestamps + deterministic tiebreak** (e.g., lower pubkey wins) is the simplest approach. Alternatively, the creator can act as a sequencer — ACL changes only take effect when countersigned with a sequence number. If the creator is offline for >N minutes, mods act unilaterally and the creator reconciles on return.

## Discovery

### Invite Links (Primary)

A room's DHT key is shared out-of-band — URL, QR code, posted on a website. This is how most communities actually grow. It works natively with the DHT: receive key → look up on DHT → find peers → connect → sync.

Functionally identical to a BitTorrent magnet link: `magnet:?xt=urn:btih:<info_hash>` → client looks up hash on DHT → finds peers → connects.

### Decentralized Tag Search

Rooms opt into discovery by publishing metadata under DHT keyword hashes:

```
H("tag:gaming")      → [room_key_1, room_key_2, ...]
H("tag:gaming:fps")  → [room_key_3, ...]
```

Hierarchical taxonomy, all on the DHT. Spam mitigation options:
- **Proof-of-work per listing** — hashcash-style token required to publish. Makes bulk spam expensive.
- **Peer voting** — entries include signed upvote/downvote tallies. Gaming requires many keypairs + PoW per vote.
- **Age weighting** — longer-lived listings with consistent peer activity rank higher.
- **Natural expiry** — DHT entries expire; active rooms have online peers who re-publish automatically. Dead rooms fall out.

This is crude compared to full-text search, but "browse by tag + sort by activity" matches how most Discord discovery works anyway.

### Third-Party Indexers (Ecosystem Layer)

Nothing stops someone from building a search website that crawls DHT tags. Centralized individually but replaceable and redundant — like torrent search sites. Not part of the protocol; a service built on top.

## Networking

### Browser-Based Operation

The app runs entirely in the browser. Core capabilities:
- **Crypto:** WebCrypto API for keypair generation, signing, verification
- **P2P messaging:** WebRTC data channels for gossip
- **Local storage:** IndexedDB for authority logs and message history

### NAT Traversal

WebRTC's ICE handles most connectivity automatically. Peers already connected to a mutual peer can help each other — peer C tells A how B looks from the outside, functioning as an application-layer STUN. Hole punching works for most NAT types; symmetric NATs (common on mobile) fall back to relaying through a connected peer (similar to libp2p circuit relay).

**Hard limitation:** Browsers cannot bind to ports or accept inbound connections. Raw UDP/TCP is not available. All P2P connectivity goes through WebRTC, which requires an initial signaling exchange.

### Bootstrapping

This is the one irreducible point of (thin) centralization. To join the DHT, you must contact at least one existing node. Same as BitTorrent — every client ships with hardcoded bootstrap addresses (`router.bittorrent.com`, etc.). Nobody considers BitTorrent centralized because of this.

**Layered bootstrap strategy:**

1. **Cached peers** — on subsequent launches, reconnect to peers from previous sessions. No bootstrap needed.
2. **App's own bootstrap nodes** — a small hardcoded list, run by different people in different jurisdictions.
3. **DNS-based fallback** — TXT records pointing to peer addresses across multiple domains.
4. **BitTorrent DHT as nuclear fallback** — join the mainline BT DHT, look up a well-known hash (e.g., `H("myapp-bootstrap-peers")`), get your app's actual DHT nodes, join your own DHT, disconnect. Hard to attack because you'd need to take down the entire BT DHT. Requires a WebSocket-to-UDP bridge for browser clients.

Once in the DHT, the client is a full participant — routing queries, storing records, staying connected. The more users, the healthier the network.

### DHT Implementation

Run a custom Kademlia DHT over WebRTC data channels (not piggybacking on BitTorrent's UDP-based DHT). [js-libp2p](https://github.com/libp2p/js-libp2p) provides a Kademlia DHT over WebRTC transports as a starting point.

## Persistence

If all peers in a room go offline, history is gone. Realistic options:

- **Archiver nodes** — at least one semi-permanent node (Raspberry Pi, VPS, etc.) stays online. Not purely decentralized but practical. This is how Matrix works in practice.
- **DHT-stored snapshots** — periodically publish authority log state to the DHT. Peers joining later can bootstrap even with no current members online. Entries expire, and you trust DHT storage nodes.
- **Accept ephemerality** — small rooms just die. Fine for many use cases.

Any room that cares about persistence will realistically have at least one always-on node.

## Related Projects

| Project | Model | Notes |
|---------|-------|-------|
| [Matrix/Element](https://matrix.org/) | Federated | Closest in scope; servers replicate room state |
| [Jami (GNU Ring)](https://jami.net/) | P2P | Voice/video/chat using OpenDHT |
| [Session](https://getsession.org/) | Decentralized | Built on Lokinet onion routing + service nodes |
| [Tox](https://tox.chat/) | P2P | Encrypted messaging with DHT peer discovery |
| [Briar](https://briarproject.org/) | P2P | Messaging over Tor, very privacy-focused |

## Technology

- [js-libp2p](https://github.com/libp2p/js-libp2p) — Kademlia DHT + WebRTC transport + GossipSub messaging
- [WebCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — Ed25519 identity and signing
- WebRTC data channels — direct peer-to-peer communication
- IndexedDB — local persistence of authority logs and message history
