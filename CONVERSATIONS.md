# Conversations

Summaries of significant architectural discussions that shaped the project direction.

---

## 2026-03-01: Architecture Clarification — DHT, WebRTC, and the Relay Server Mistake

### What prompted this

After completing epic-001 (Identity Foundation), the initial epic roadmap (002–006) was built around a centralized WebSocket relay server that we'd gradually replace with peer-to-peer connections. Epic-002 was "Signaling & Relay Server" — a Node.js WebSocket server that would relay all messages between browsers.

Reviewing the README and GENESIS documents revealed this was architecturally wrong. The system is designed around a Kademlia DHT (like BitTorrent), not a central relay.

### How the BitTorrent DHT actually works

The project's architecture is modeled on BitTorrent's DHT, so understanding the DHT was essential.

**Nodes vs keys:** "Nodes" in a DHT are the participating machines (BitTorrent clients, or in our case, browsers). "Keys" are the lookup values (torrent info hashes, or in our case, room IDs). Every running BitTorrent client is a DHT node, responsible for storing peer lists for keys that are numerically close to its own random node ID.

**Iterative lookup:** To find peers for a key K, you ask the nodes you know that are closest to K. They point you to nodes even closer. You repeat until you find the nodes responsible for K. Completes in O(log n) hops — about 23 hops in a network of 10 million nodes.

**Magnet links:** A magnet link contains only an info hash — a DHT key. Your client (already in the DHT from startup) does a lookup, finds peers, connects, and downloads everything. No tracker, no .torrent file. The DHT is the entire discovery mechanism.

**Bootstrap:** The one irreducible centralization. To join the DHT, you must contact at least one existing node. BitTorrent hardcodes addresses like `router.bittorrent.com`. After joining, you never need them again. Cached peers from previous sessions let you skip bootstrap entirely on subsequent launches.

### Why browser-only requires WebRTC

Browsers cannot bind to ports or do raw UDP/TCP. The only peer-to-peer transport available is WebRTC. This means:

- The DHT runs over WebRTC data channels (not raw UDP like BitTorrent)
- Every new peer connection requires an SDP/ICE signaling exchange before data can flow
- A signaling server (or mutual peer) must broker that exchange

This was proposed in the original GENESIS conversation when the project moved to browser-only. It doesn't compromise decentralization — it just changes the transport.

### How WebRTC connections work

**Signaling:** WebRTC has no built-in peer discovery. To connect A to B, they must exchange SDP offers/answers through some external channel (a WebSocket server, or an already-connected mutual peer). This is the "signaling" step.

**ICE candidates:** Each peer gathers a list of candidate addresses it might be reachable at — local IP (host), STUN-discovered public IP (server reflexive), TURN relay address. Both peers exchange candidate lists through the signaling channel.

**NAT traversal (hole punching):** Both peers simultaneously send UDP packets to each other's public addresses. Each NAT sees outbound traffic and allows the "reply" through. Works for most NAT types. Fails for symmetric NATs (~10-20%), which fall back to relay.

**Peer-as-relay:** When direct connection fails, an already-connected mutual peer can relay traffic. No dedicated TURN server needed. This is libp2p's "circuit relay."

### How DHT queries work over WebRTC

The key concern: in BitTorrent, contacting a new DHT node is cheap (fire a UDP packet). In WebRTC, every new connection requires signaling. Does the DHT become impractically expensive?

No — DHT queries are **relayed through existing connections**, not by establishing new WebRTC connections per hop. When you ask peer A about key K, A forwards your query to peer B (who A is already connected to), B responds back through A. The lookup still converges in O(log n) hops, but queries travel through the existing peer mesh. You only establish new direct connections for long-term relationships (joining a room).

### Decentralization comparison

| Aspect          | BitTorrent            | This project (WebRTC)                   |
| --------------- | --------------------- | --------------------------------------- |
| Bootstrap       | Hardcoded node list   | Hardcoded node list                     |
| Discovery       | DHT over UDP          | DHT over WebRTC                         |
| New connections | Direct TCP to IP:port | SDP/ICE exchange through existing peers |
| Relay fallback  | N/A                   | Peer-based relay for symmetric NATs     |
| After bootstrap | Fully P2P             | Fully P2P                               |

WebRTC does not add centralization beyond the same bootstrap that BitTorrent needs. The signaling server is the exact equivalent of BitTorrent's bootstrap nodes.

### Electron was considered and rejected

An Electron app would simplify networking (raw UDP/TCP, stock Kademlia, no signaling). But the browser-only approach:

- Removes all barriers to entry (click a link and you're in)
- js-libp2p handles the WebRTC complexity for us
- If it works in the browser, adding native transports later is trivial (libp2p supports multiple transports)

### Decisions

1. **Browser-only** — the app runs entirely in the browser. No Electron.
2. **js-libp2p** — handles WebRTC transport, Kademlia DHT, circuit relay, GossipSub pub/sub. We focus on the novel parts (authority log, rooms, messaging).
3. **DHT is central** — moved from epic-005 to epic-003. It's the backbone of discovery, not an afterthought.
4. **No central relay** — the relay server approach was scrapped. Peers communicate directly over WebRTC. The only server is a bootstrap/relay node (equivalent to `router.bittorrent.com`).
5. **Ed25519 identity integrates with libp2p** — libp2p uses Ed25519 by default for PeerId, aligning with our epic-001 identity system.
