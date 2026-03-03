# Knowledge Base

Reference material for AI agents and the human developer. When the human asks how something works, why something broke, or how the protocols interact, use this file as the basis for your explanation. The human is a senior developer (Java/C/C++/Python) learning the JavaScript/libp2p ecosystem — explain in those terms.

This file serves two purposes:
1. **For AI agents** — context for answering technical questions, explaining failures, and avoiding past mistakes
2. **For the human** — a single place to revisit how things work and why decisions were made

Covers the full protocol stack from transport to application, architectural decisions, the intended message flow, every failure mode encountered during development (with root causes, dead ends, and fixes), and the JavaScript ecosystem pitfalls that made debugging harder.

For terse fix/workaround reference (not explanations), see `KNOWN_ISSUES.md`.

---

## Part 1: Why Browser P2P Is Hard

If you were building this in C, you'd open a socket, bind to a port, accept connections, and send bytes. Peer-to-peer is straightforward: each node has an IP, a port, and a protocol. You're in control of the full network stack.

Browsers give you none of that.

**What browsers cannot do:**

- Bind to a port (no `listen()`, no `accept()`)
- Accept inbound TCP or UDP connections
- Send raw packets of any kind
- Access the local network interface

**What browsers can do:**

- Make outbound HTTP/HTTPS requests (fetch, XMLHttpRequest)
- Open WebSocket connections (persistent TCP, but still outbound-only)
- Use WebRTC (the only real P2P capability)

WebRTC was designed for video calls. It creates encrypted UDP channels between two browsers, handles NAT traversal, and can carry arbitrary data (not just audio/video). It's the only way to build true peer-to-peer communication in a browser.

But WebRTC has a hard prerequisite: **signaling**. Before two browsers can talk directly, they must exchange connection metadata (SDP offers, ICE candidates) through some out-of-band channel. They need a mutual friend to introduce them. This is the one irreducible centralization point — you need at least one server to bootstrap the first connection.

Our architecture: a lightweight relay server that browsers connect to via WebSocket. The relay introduces peers, helps with NAT traversal, and can forward bytes when direct connections fail. After the introduction, browsers talk directly over WebRTC. The relay is dumb and replaceable — if it disappears, peers who already know each other continue working.

### Why Not Electron?

An Electron app would simplify networking enormously — raw UDP/TCP, stock Kademlia, no signaling needed. But the browser-only approach:

- Removes all barriers to entry (click a link and you're in)
- js-libp2p handles the WebRTC complexity for us
- If it works in the browser, adding native transports later is trivial (libp2p supports multiple transports simultaneously)

### Architectural Pivot: Relay-Centric → DHT-Centric

The project initially planned a central WebSocket relay server that would handle all message routing between browsers, to be gradually replaced with peer-to-peer connections. Reviewing the README and GENESIS design documents revealed this was architecturally wrong — the system is modeled on BitTorrent's DHT, not a central relay. The relay should only bootstrap connections and assist with signaling, not sit in the data path. This realization moved DHT implementation from a late-stage goal to the core of the architecture.

### Key Decisions

1. **Browser-only** — the app runs entirely in the browser. No Electron.
2. **js-libp2p** — handles WebRTC transport, Kademlia DHT, circuit relay, GossipSub pub/sub. We focus on the novel parts (authority log, rooms, messaging).
3. **DHT is central** — it's the backbone of discovery, not an afterthought.
4. **No central relay** — peers communicate directly over WebRTC. The only server is a bootstrap/relay node (equivalent to `router.bittorrent.com`).
5. **Ed25519 identity integrates with libp2p** — libp2p uses Ed25519 by default for PeerId, aligning with our identity system.

---

## Part 2: The Protocol Stack

Think of this like the OSI model or the TCP/IP stack. Each layer provides a service to the layer above it. We'll go bottom-up.

### Layer 1: Transport — Getting Bytes From A to B

**WebSocket** — A persistent TCP connection from browser to server. The browser initiates the connection (outbound), then both sides can send messages. We use this for the browser-to-relay connection. Think of it as a TCP socket that browsers are allowed to open.

**WebRTC Data Channel** — A UDP-based channel between two browsers. Encrypted, ordered (optionally), and bidirectional. This is the actual peer-to-peer link. The browser negotiates it through a signaling exchange (via the relay), then data flows directly between browsers without the relay in the middle. Think of it as a UDP socket with built-in DTLS encryption and ICE NAT traversal.

**Circuit Relay v2** — A fallback for when direct WebRTC fails. If Browser A and Browser B both connect to the relay via WebSocket, the relay can forward bytes between them. It's a dumb pipe — it doesn't understand the content, doesn't do discovery, doesn't do protocol negotiation. It just copies bytes from one WebSocket to another. This is necessary because NAT traversal fails for about 10-20% of connections (symmetric NATs, carrier-grade NAT).

**Multiaddrs** — libp2p's way of describing network addresses. Instead of `192.168.1.5:9001`, you write `/ip4/192.168.1.5/tcp/9001/ws/p2p/QmRelay123`. Each segment adds a layer: IP address, TCP port, WebSocket transport, peer identity. Think of it as a structured URL for network endpoints. The `/p2p/QmRelay123` suffix is the peer's cryptographic identity — it's not optional, and silently dropping it causes the connection to fail without any error (this burned us twice).

### Layer 2: Encryption — Noise Protocol

Once two peers have a transport connection (WebSocket or WebRTC), they need to encrypt it. libp2p uses the **Noise Protocol Framework** — the same cryptographic handshake that Signal, WireGuard, and Lightning Network use.

The handshake works like Diffie-Hellman key exchange: both peers contribute randomness, agree on a shared secret, and derive symmetric encryption keys. After the handshake, all data is encrypted with ChaCha20-Poly1305 (or AES-GCM). Neither side can read the other's data without the shared secret. A man-in-the-middle cannot forge the handshake because it's bound to each peer's long-term identity key.

This runs automatically on every new connection. You don't interact with it directly.

### Layer 3: Multiplexing — Yamux

A single encrypted connection between two peers needs to carry multiple independent conversations: identity negotiation, DHT queries, ping probes, GossipSub messages. Without multiplexing, you'd need a separate connection for each protocol.

**Yamux** (Yet Another Multiplexer) splits one connection into many logical streams. Think of it like HTTP/2 multiplexing over a single TCP connection, or like multiple SSH channels over one SSH connection. Each stream has an ID, and data from different streams is interleaved on the wire.

When one layer opens a new "stream," Yamux assigns it an ID and handles framing. The remote side sees a new stream appear and routes it to the right protocol handler based on what was negotiated.

### Layer 4: Service Negotiation — Identify

When two peers first connect, they need to discover what each other supports. Does this peer speak the DHT protocol? Does it support GossipSub? What version?

The **Identify** protocol handles this. It's the first thing that runs on a new connection. Each peer sends:

- Its PeerId (cryptographic identity)
- Its list of supported protocols (e.g., `/ipfs/kad/1.0.0`, `/meshsub/1.1.0`, `/ipfs/ping/1.0.0`)
- Its observed address of the remote peer (useful for NAT detection)

Other services register **topology listeners** that react to identify events. When the Identify protocol reports "this peer supports `/ipfs/kad/1.0.0`," the DHT topology listener fires and adds the peer to its routing table. When it reports `/meshsub/1.1.0`, GossipSub's topology listener fires and considers the peer for mesh formation.

This is an event-driven system. Services don't actively poll for peers — they wait for the registrar to notify them that a relevant peer has been identified.

### Layer 5: Discovery — Kademlia DHT

**The problem:** You've created a room. How does someone else find you?

**Kademlia** is a distributed hash table (DHT) — the same algorithm that BitTorrent uses for trackerless torrents. Every peer has a random 256-bit node ID. The "distance" between two IDs is their XOR — this is a mathematical metric, not a geographic one. Peers maintain a routing table of other peers, organized by XOR distance.

**Nodes vs keys:** "Nodes" are the participating machines (BitTorrent clients, or in our case, browsers). "Keys" are the lookup values (torrent info hashes, or room IDs). Every node in the DHT is responsible for storing peer lists for keys that are numerically close to its own random node ID.

**Key operations:**

- `provide(key)` — "I am serving this content." Announces to the DHT that your peer ID is associated with a key (in our case, a room ID). The DHT stores this association on the peers whose node IDs are closest to the key.

- `findProviders(key)` — "Who is serving this content?" Queries the DHT for peers associated with a key. The query is routed hop-by-hop through peers whose IDs are progressively closer to the key, until it reaches the peers storing the provider records.

**Iterative lookup:** To find peers for a key K, you ask the nodes you know that are closest to K. They point you to nodes even closer. You repeat until you find the nodes responsible for K. Completes in O(log n) hops — about 23 hops in a network of 10 million nodes.

**Magnet links — the analogy:** A BitTorrent magnet link contains only an info hash — a DHT key. Your client (already in the DHT from startup) does a lookup, finds peers, connects, and downloads. No tracker, no .torrent file. The DHT is the entire discovery mechanism. Our room IDs work identically: share the room ID out-of-band (URL, QR code), the browser looks it up on the DHT, finds peers, connects.

**In our system:** A room ID is `H(creator_pubkey + room_name + nonce)` — a deterministic hash. The creator calls `provide(roomId)` to announce. A joiner calls `findProviders(roomId)` to discover peers in that room, then dials them directly.

**Server mode vs. client mode:** The relay runs in DHT server mode — it stores provider records and answers queries from other peers. Browsers run in client mode — they make queries but don't store records for others. This is necessary because browsers can't accept inbound connections, so they'd be unreliable DHT servers.

**Routing table population:** After a connection is established and Identify completes, the DHT topology listener tries to add the peer to its routing table. This is not instant — it involves a verification ping and internal bookkeeping. There is no "DHT ready" event. You have to poll the routing table size or use a heuristic to know when it's safe to issue queries.

**DHT queries over WebRTC — the cost concern:** In BitTorrent, contacting a new DHT node is cheap (fire a UDP packet). In WebRTC, every new connection requires signaling. Does the DHT become impractically expensive? No — DHT queries are **relayed through existing connections**, not by establishing new WebRTC connections per hop. When you ask peer A about key K, A forwards your query to peer B (who A is already connected to), B responds back through A. The lookup still converges in O(log n) hops, but queries travel through the existing peer mesh. You only establish new direct connections for long-term relationships (joining a room).

**Decentralization comparison with BitTorrent:**

| Aspect          | BitTorrent            | This project (WebRTC)                   |
| --------------- | --------------------- | --------------------------------------- |
| Bootstrap       | Hardcoded node list   | Hardcoded node list                     |
| Discovery       | DHT over UDP          | DHT over WebRTC                         |
| New connections | Direct TCP to IP:port | SDP/ICE exchange through existing peers |
| Relay fallback  | N/A                   | Peer-based relay for symmetric NATs     |
| After bootstrap | Fully P2P             | Fully P2P                               |

WebRTC does not add centralization beyond the same bootstrap that BitTorrent needs. The signaling server is the exact equivalent of BitTorrent's bootstrap nodes.

### Layer 6: Messaging — GossipSub

**The problem:** You've found each other via the DHT. Now how do you broadcast a message to everyone in the room?

You could send the message directly to each peer you know about (unicast). But that's O(n) per send, and you only know about peers you've directly discovered — not peers who joined through someone else.

**GossipSub** is a gossip protocol for broadcast messaging. It works like a rumor spreading through a social network:

1. **Topics** — Each room has a topic string (e.g., `room:bafkrei...`). Peers subscribe to topics they're interested in.

2. **Mesh** — For each topic, GossipSub maintains a mesh overlay of ~6 connected peers (configurable). When you publish a message, you send it to your mesh peers. They forward it to their mesh peers. The message reaches everyone in a few hops, like a gossip chain.

3. **IHAVE/IWANT** — Periodically, peers tell their non-mesh neighbors: "I have messages with these IDs" (IHAVE). If a neighbor missed one, it replies "I want that one" (IWANT). This is the "gossip" — it's how messages eventually reach peers even if the mesh didn't directly deliver to them.

4. **Heartbeat** — Every second, GossipSub checks its mesh health. If it has too few peers, it adds some (GRAFT). If too many, it removes some (PRUNE). If peers are misbehaving, it scores them down and eventually drops them.

5. **Peer Scoring** — GossipSub tracks per-peer metrics: message delivery rate, invalid messages, flood behavior, IP colocation (sybil detection). Peers with negative scores get pruned from the mesh. This is designed for adversarial environments like Ethereum consensus.

**What we use:** Almost none of the advanced features. We subscribe, publish, and receive. The mesh formation and gossip run automatically in the background. We configured three options:

- `globalSignaturePolicy: "StrictNoSign"` — We handle our own message signing at the application layer.
- `allowPublishToZeroTopicPeers: true` — Let us publish even if no one has subscribed yet (the message gets stored and delivered when peers join).
- `runOnLimitedConnection: true` — Don't refuse to work on relay-mediated connections.

### Layer 7: Application — Room Messaging

On top of GossipSub, we built a thin application layer:

- **Room ID computation** — `H(creator_pubkey + room_name + nonce)`. The nonce prevents collisions when the same person creates rooms with the same name.
- **Message signing** — Each chat message is signed with the sender's Ed25519 key. Recipients verify the signature before displaying. This is independent of GossipSub's internal message authentication.
- **Message serialization** — Messages are encoded as bytes (not JSON) for efficiency over the wire.
- **PubSubService interface** — An abstraction that decouples our messaging code from GossipSub specifically. If we ever replace GossipSub, only this interface boundary needs to change.

---

## Part 3: How a Message Actually Flows

User A is in a room. User B is in the same room. They're both connected to the relay. User A types "hello" and hits Send.

**Step 1 — Application layer creates the message**
```
Input: "hello"
Output: { body: "hello", timestamp: 1709510400, senderPublicKey: <bytes>, signature: <bytes> }
```
The message is signed with User A's Ed25519 private key. Serialized to bytes.

**Step 2 — GossipSub publishes to the topic**
```
Topic: "room:bafkrei7..."
Data: <serialized signed message bytes>
```
GossipSub looks up its mesh for this topic. It finds User B is a mesh peer (they both subscribed when they joined the room).

**Step 3 — GossipSub sends an RPC to User B**
GossipSub wraps the message in a protobuf-encoded RPC (Remote Procedure Call). The RPC can batch multiple messages and control commands (subscriptions, IHAVE, IWANT, GRAFT, PRUNE) into one frame. It's length-prefixed (4-byte length header, then payload).

**Step 4 — The RPC travels through the outbound stream**
GossipSub has an `OutboundStream` object for User B. It pushes the encoded RPC into a pushable queue. The `it-pipe` library pipes this queue into the raw stream. The raw stream is a Yamux logical stream, which frames it and sends it over the encrypted Noise connection.

**Step 5 — The encrypted bytes travel through the relay**
User A is connected to the relay via WebSocket. User B is also connected via WebSocket. The relay sees bytes arrive on User A's circuit-relay STOP stream and copies them to User B's STOP stream. It doesn't decode or inspect them — it's just copying bytes.

**Step 6 — User B's side reverses the process**
Yamux deframes the logical stream. Noise decrypts. GossipSub's `InboundStream` length-prefix-decodes the RPC. The protobuf is deserialized. The message is extracted.

**Step 7 — Application layer receives and verifies**
GossipSub dispatches a `message` event to our subscriber. Our code deserializes the signed message, verifies the Ed25519 signature against the sender's public key, and displays: `[User A]: hello`.

**Total layers traversed:**
```
Application → GossipSub → Protobuf/RPC → Length-prefix → it-pipe →
Yamux stream → Noise encryption → WebSocket frame → TCP →
Network → Relay (byte copy) → Network → TCP → WebSocket frame →
Noise decryption → Yamux deframe → Length-prefix decode →
Protobuf/RPC decode → GossipSub → Application
```

That's roughly 16 transformations for a single "hello." Every layer can fail, and most fail silently.

---

## Part 4: Everything That Went Wrong

### Issue 1: Bootstrap Addresses Without Peer ID — Silent Ignore

**What we saw:** The browser started, said "connecting to relay," and then... nothing. No peers, no errors, no timeout. Just silence.

**What we thought:** The relay isn't running. Or there's a firewall. Or the port is wrong.

**What was actually wrong:** The multiaddr was missing the `/p2p/<PeerId>` suffix. We had:
```
/ip4/127.0.0.1/tcp/9001/ws
```
We needed:
```
/ip4/127.0.0.1/tcp/9001/ws/p2p/12D3KooW...
```

The `@libp2p/bootstrap` module silently ignores multiaddrs that don't end with a peer ID. No error, no warning, no log message. It just skips the address and moves on.

**Why it was hard to find:** There's no validation error. The bootstrap module's code has a filter that requires a PeerId component, and addresses without one simply don't pass the filter. In a Java/C++ world, you'd expect an `IllegalArgumentException` or at least a warning log. Here, invalid input is silently discarded.

**The fix:** Always include the full multiaddr. Our relay's HTTP info endpoint (`/relay-info`) serves complete multiaddrs with the PeerId already appended, so the browser never has to construct them manually.

---

### Issue 2: Bootstrap Race Condition — DHT Topology Never Fires

**What we saw:** The browser connected to the relay (we could see `peer:connect` and `peer:identify` events). The relay was correctly running as a DHT server. But `dht.routingTable.size` was always 0, and all DHT queries (`provide`, `findProviders`) hung forever.

**What we thought:** The DHT isn't configured correctly. Maybe client mode is wrong. Maybe the routing table needs time.

**What was actually wrong:** A race condition in libp2p's startup sequence.

The `@libp2p/bootstrap` module dials peers during `createLibp2p()` — that is, while the node is still being constructed and services are still initializing. Here's the sequence:

```
1. createLibp2p() starts
2. Bootstrap module fires: dials relay
3. Connection established
4. Identify protocol runs: relay says "I support /ipfs/kad/1.0.0"
5. Registrar fires _onPeerIdentify: notifies all registered topologies
6. BUT — kadDHT hasn't registered its topology yet (still initializing)
7. kadDHT registers topology... but the identify event already fired
8. There is no catch-up mechanism. The event is gone.
9. kadDHT never learns the relay supports DHT
10. Routing table stays empty forever
```

This is a classic initialization-order bug. In Java, you might use `@PostConstruct` or explicit lifecycle management to ensure services are fully initialized before accepting events. In libp2p, there's no such guarantee — services register their topologies asynchronously during startup, and the bootstrap module doesn't wait for them.

**Why it got worse over time:** With fewer services (just identify + DHT + ping), kadDHT usually initialized fast enough. When we added GossipSub (which also needs to register topologies), startup got slower and the race became reliable.

**The fix:** Don't use the bootstrap module. Instead, start the node with `start: false`, register all event handlers, then call `node.start()`, and finally dial the relay manually with `node.dial(multiaddr(addr))`. At that point all services are fully initialized and topology listeners are registered.

---

### Issue 3: Browser Connection Gater — Silent Block of Local Dev

**What we saw:** `DialDeniedError` when trying to connect to the relay on `localhost`.

**What was actually wrong:** The browser build of libp2p ships a default connection gater that rejects `ws://` (insecure WebSocket) and private IP addresses (`127.0.0.1`, `192.168.x.x`). In local dev, both conditions apply.

This is a security measure for production: browsers shouldn't connect to insecure WebSockets or probe local network devices. But in development, it blocks everything.

**The fix:**
```typescript
connectionGater: {
  denyDialMultiaddr: () => false  // Allow all connections in dev
}
```

In production, you'd use `wss://` (secure WebSocket) with public IP addresses, and the default gater would allow it.

---

### Issue 4: DHT `clientMode` Default — Documentation Lies

**What we saw:** Browser connects to relay, identify succeeds, but the relay's protocol list doesn't include `/ipfs/kad/1.0.0`. Without that protocol, the DHT topology listener never fires, and the routing table stays empty.

**What we thought:** Maybe DHT isn't starting. Maybe it needs explicit activation.

**What was actually wrong:** The relay was configured with default settings for kadDHT. The documentation says `clientMode` defaults to `false` (server mode). The actual code says:

```javascript
this.clientMode = init.clientMode ?? true  // Default is TRUE, not false!
```

The relay was running as a DHT client — which means it doesn't register the `/ipfs/kad/1.0.0` protocol handler, doesn't store provider records, and doesn't answer DHT queries. It's a passive participant, not a server.

**Why it was hard to find:** The JSDoc comment says `@default false`. The actual default is `true`. You have to read the implementation, not the documentation. In a typed language with explicit defaults, this contradiction would be caught by a test or a reviewer. In JavaScript, the JSDoc is just a comment — the runtime doesn't enforce it.

**The fix:**
```typescript
dht: kadDHT({
  clientMode: false,  // MUST be explicit — docs lie about the default
})
```

---

### Issue 5: DHT Has No "Ready" Event

**What we saw:** DHT was configured correctly (server mode, routing table eventually populates). But if we issued a `provide()` call immediately after connecting, it hung forever.

**What was actually wrong:** After the Identify protocol reports a peer supports `/ipfs/kad/1.0.0`, the DHT topology listener needs to:

1. Receive the notification from the registrar
2. Ping the peer to verify it's alive
3. Add the peer to the routing table

This takes a few hundred milliseconds. There is no event that says "the routing table now has entries." If you call `provide()` with an empty routing table, the DHT starts a query, looks up the routing table for the closest peers, finds nothing, and waits forever for responses that will never come.

**What we tried first:** `setTimeout(2000)` — wait 2 seconds after connecting, then issue DHT queries. This worked until we added GossipSub (more services = slower startup = the 2-second timer wasn't enough).

**The actual fix:** An event-driven approach:

1. Listen for `peer:identify` events
2. Check if the identified peer supports `/ipfs/kad/1.0.0`
3. Poll `dht.routingTable.size` every 500ms
4. If it's still 0 after 3 seconds, manually seed the routing table by calling `dht.routingTable.add(peerId)`
5. Only enable room creation/joining after the routing table is populated

---

### Issue 6: DHT Queries Have No Default Timeout

**What we saw:** The UI freezes. No error. `provide()` or `findProviders()` never returns.

**What was actually wrong:** These functions have no built-in timeout. With an empty routing table, they wait indefinitely for DHT responses that will never come. In Java, you'd expect a `TimeoutException` after some reasonable default. Here, it's infinite.

**The fix:** Always pass an abort signal:
```typescript
await node.contentRouting.provide(roomCid, {
  signal: AbortSignal.timeout(30_000)  // 30-second max
});
```

`AbortSignal` is the JavaScript equivalent of a cancellation token. `AbortSignal.timeout(ms)` creates one that automatically triggers after the specified duration.

---

### Issue 7: GossipSub Stream Interface Incompatibility — The 2-Day Bug

This is the big one. It took two days to diagnose and involved tracing through five npm packages.

**What we saw:** Two browsers connected to the same room. They could see each other in the peer list. The DHT was working — peers discovered each other. But messages never arrived. User A types "hello," the UI shows it was sent, but User B never receives it.

**What we expected to find:** A configuration error, a topic mismatch, a serialization bug.

**What we actually found:** A fundamental incompatibility between two major library versions that fails completely silently.

**The investigation:**

We added diagnostic logging to the send handler. The output:

```
GS peers=[relay, browserB]           ← GossipSub knows about both peers
GS subscribers=[browserB]            ← BrowserB is subscribed to the topic
GS mesh=[]                           ← Mesh is EMPTY — no one to send to
GS outbound streams: 0               ← No outbound streams exist at all
```

GossipSub knew about the peers and their subscriptions, but had zero outbound streams. Without outbound streams, it can't send anything.

We then added a monkey-patch to intercept `connection.newStream()` — the function that creates a new logical stream over an existing connection. The patch showed:

```
newStream OK: protocol=/meshsub/1.2.0  ← Stream creation SUCCEEDS
GS createOutbound DONE: outbound=0     ← But outbound count stays at 0
```

The stream was being created at the transport level, but GossipSub wasn't storing it. Something between "stream created" and "outbound registered" was failing silently.

**Tracing the code:**

GossipSub's `createOutboundStream` (in `@chainsafe/libp2p-gossipsub/dist/src/index.js`) does:

```javascript
// Step 1: Create the raw stream (this succeeds)
const stream = await connection.newStream(protocols);

// Step 2: Wrap it in an OutboundStream (THIS FAILS SILENTLY)
const outbound = new OutboundStream(stream, errCallback, opts);

// Step 3: Store it (never reached)
this.streamsOutbound.set(peerId, outbound);
```

The `OutboundStream` constructor (in `stream.js`) does:

```javascript
constructor(rawStream, errCallback, opts) {
  this.pushable = pushable();           // Create a queue for outgoing messages
  pipe(this.pushable, this.rawStream)   // Pipe the queue into the stream
    .catch(errCallback);                // Catch errors (but log, don't re-throw)
}
```

The `pipe()` function (from the `it-pipe` library) checks if the second argument is a "duplex" object:

```javascript
const isDuplex = (obj) => {
  return obj.sink != null && obj.source != null;
};
```

A "duplex" in the `it-pipe` sense is an object with:
- `.sink` — an async function that consumes an iterable (like a writable stream)
- `.source` — an async iterable that produces data (like a readable stream)

If the object is duplex, `pipe()` feeds data into `.sink`. If it's not duplex, `pipe()` tries to call the object as a function. This is where the crash happens.

**The version incompatibility:**

Our `package.json` used `"*"` (latest version) for all dependencies. npm resolved `libp2p@3.1.4`, which uses `@libp2p/interface@^3.x`.

The stream interface changed completely between v2 and v3:

**v2 streams (`@libp2p/interface@2.x`):**
```
AbstractStream {
  .sink: async function(source) { ... }    // Writable end
  .source: AsyncIterable                    // Readable end
}
```

**v3 streams (`@libp2p/interface@3.x`):**
```
AbstractMessageStream {
  [Symbol.asyncIterator]()                  // Readable (new API)
  .send(data)                               // Writable (new API)
  // NO .sink property
  // NO .source property
}
```

v3 completely removed `.sink` and `.source` and replaced them with a different API. But GossipSub v14 was written for v2. It hasn't been updated.

**The silent failure chain:**

```
1. connection.newStream() returns a v3 stream (no .sink, no .source)     ✓ succeeds
2. OutboundStream constructor: pipe(pushable, v3_stream)
3. it-pipe: isDuplex(v3_stream) → false (no .sink property)
4. it-pipe: rawPipe tries v3_stream(pushable) — calling stream as function
5. TypeError: v3_stream is not a function                                 ✗ CRASH
6. pipe().catch(errCallback) catches the TypeError
7. errCallback = this.log.error('...') — logged to internal debug logger
8. Internal debug logger is NOT connected to browser console
9. OutboundStream constructor throws → caught by createOutboundStream
10. createOutboundStream: catch(e) { this.log.error('createOutboundStream error', e) }
11. Error logged to internal logger (again, not visible)
12. streamsOutbound.set() never executes
13. Outbound stream count: 0
14. No mesh forms, no messages flow
15. Zero indication of failure visible to the developer
```

**Why it was extraordinarily hard to debug:**

1. `connection.newStream()` succeeds — so intercepting it shows success
2. The error is in the `OutboundStream` wrapper constructor, not in `newStream`
3. GossipSub catches the error internally and doesn't re-throw
4. GossipSub's logging uses the `debug` npm package, which is disabled by default in browsers
5. The `it-pipe` library's `isDuplex` check is a property presence test — it doesn't throw a useful error
6. The only symptom is `streamsOutbound.size === 0`, which you'd only check if you already suspected this exact failure

**What we tried before finding the root cause:**

1. Checked GossipSub's early returns in `createOutboundStream` (is it started? does it know the peer? does it already have a stream?) — none were triggering
2. Checked stream limits — not the issue (default limit is 64)
3. Checked `runOnLimitedConnection` — set correctly
4. Added a monkey-patch intercepting `connection.newStream` — showed success (misleading, because the failure is in the constructor that runs after `newStream` returns)
5. Waited 4+ minutes to rule out timing — not a timing issue
6. Checked GossipSub's topology registration — firing correctly
7. Only when we read the actual source code of `OutboundStream`, `it-pipe`, and compared the v2/v3 stream interfaces did we find the root cause

**The fix:** Pin all libp2p packages to versions that use `@libp2p/interface@^2.x`:

```json
{
  "libp2p": "~2.10",
  "@chainsafe/libp2p-gossipsub": "~14.1",
  "@chainsafe/libp2p-noise": "~16.1",
  "@chainsafe/libp2p-yamux": "~7.0",
  "@libp2p/circuit-relay-v2": "~3.2",
  "@libp2p/identify": "~3.0",
  "@libp2p/kad-dht": "~15.1",
  "@libp2p/webrtc": "~5.2",
  "@libp2p/websockets": "~9.2"
}
```

Never use `"*"` for libp2p dependencies. A major version bump can silently break the entire stack.

---

### Issue 8: Circuit Relay 2-Minute Silent Death

**What we saw:** After fixing Issue 7, messages worked. Two browsers exchanged messages successfully. Then, after about 2 minutes, messages silently stopped. No disconnect event, no error. The peers still appeared connected in the UI.

**What we thought:** GossipSub is broken again. Mesh is degrading. Peer scoring is pruning peers.

**What was actually wrong:** The circuit relay server has default per-connection limits:

| Limit | Default Value | Meaning |
|-------|--------------|---------|
| `defaultDurationLimit` | 120,000 ms (2 minutes) | Relay kills the relayed stream after 2 minutes |
| `defaultDataLimit` | 131,072 bytes (128 KB) | Relay kills the relayed stream after 128 KB transferred |

These defaults exist because circuit relay v2 was designed for **short-lived signaling** — help two peers exchange WebRTC connection metadata, then get out of the way. It was not designed for sustained data transfer. The 2-minute limit is intentional: it's supposed to be a temporary bridge while peers establish a direct connection.

In our case, the browsers were not upgrading to direct WebRTC connections (both connections showed `limited=true`, meaning all traffic went through the relay). So when the 2-minute limit expired, the relay silently reset the underlying STOP stream.

**Why no disconnect event:** The relay closes the specific relayed stream, not the WebSocket connection to the peer. From libp2p's perspective, the connection object still exists — only one logical stream died. There is no event for "one of your multiplexed streams was reset by the relay." GossipSub's outbound stream becomes a dead pipe that accepts writes but delivers nothing.

**The fix:** Increase the relay's limits:

```typescript
relay: circuitRelayServer({
  reservations: {
    defaultDurationLimit: 30 * 60 * 1000,  // 30 minutes
    defaultDataLimit: BigInt(1 << 27),      // 128 MB
  },
}),
```

Don't set to 0 (unlimited) on a public relay — bad actors could park connections forever and exhaust relay resources.

---

## Part 5: The JavaScript Ecosystem Problems

If you're coming from Java, C++, or Python, the JavaScript ecosystem has some properties that make debugging harder.

### npm Version Resolution and `*` Wildcards

npm is the package manager. `package.json` lists dependencies with version ranges:

- `"~2.10"` — any version `>= 2.10.0` and `< 2.11.0` (patch updates only)
- `"^2.10"` — any version `>= 2.10.0` and `< 3.0.0` (minor updates)
- `"*"` — any version at all, including major version bumps

We used `"*"` for all dependencies. When `libp2p@3.x` was published, npm pulled it automatically on the next install. This broke the stream interface that GossipSub depends on. In Maven or pip, `"*"` equivalents exist but are discouraged. In npm, they're common but dangerous.

The `~` (tilde) range is the safe choice for libraries with unstable APIs: you get bug fixes but not breaking changes.

### Transitive Dependencies and Interface Versions

`@chainsafe/libp2p-gossipsub@14.x` declares a dependency on `@libp2p/interface@^2.x`. But `libp2p@3.x` depends on `@libp2p/interface@^3.x`. npm installs both versions — GossipSub gets its own copy of v2 for type checking, but at runtime, the streams that `libp2p@3.x` creates are v3 objects. The type system says one thing; the runtime does another.

In Java, this is roughly equivalent to having two JARs with different versions of the same interface on the classpath. Except in Java, the ClassLoader would typically throw a `LinkageError` or `ClassCastException`. In JavaScript, the mismatch is invisible until a property access returns `undefined`.

### Silent Error Swallowing

JavaScript's `try/catch` with no re-throw is the norm in many libraries:

```javascript
try {
  const outbound = new OutboundStream(stream);
  this.streamsOutbound.set(peerId, outbound);
} catch (e) {
  this.log.error('createOutboundStream error', e);
  // Error is logged and discarded. Caller has no idea it failed.
}
```

In Java, this would be considered a code smell — catching `Exception` and logging it without re-throwing or returning an error indicator. In the JavaScript ecosystem, it's common because many operations are "best effort" and failures are expected to be non-fatal.

The `this.log.error()` call uses the `debug` npm package, which writes to `console.error` only if the `DEBUG` environment variable (or `localStorage.debug` in browsers) is set to a matching pattern. By default, nothing appears in the browser console.

**To enable GossipSub logging in the browser:**
```javascript
localStorage.setItem('debug', 'libp2p:gossipsub*')
```

Then reload the page. All internal GossipSub logging, including the caught TypeError, will appear in DevTools.

### No Strong Typing at Runtime

TypeScript (which we use) adds static types to JavaScript. But types are erased at compile time — they don't exist at runtime. When GossipSub's TypeScript types say a stream has `.sink` and `.source`, that's a compile-time assertion. If the actual runtime object doesn't have those properties, there's no `ClassCastException` — the property access just returns `undefined`, and the code continues with garbage values until something eventually breaks in an unrelated place.

The cast `as unknown as ReturnType<typeof identify>` in our code explicitly opts out of type checking. We did this because the v2/v3 type mismatch caused compile errors, and we (incorrectly) assumed the runtime behavior was compatible.

---

## Part 6: The Logging Problem

libp2p and its ecosystem use the `debug` npm package for logging. This is a lightweight logger that:

1. Is completely silent by default
2. Only outputs when explicitly enabled via environment variable or localStorage
3. Uses namespace-based filtering (e.g., `libp2p:gossipsub*` shows only GossipSub logs)

**In Node.js (relay server):** Set the `DEBUG` environment variable:
```bash
DEBUG=libp2p:* npm run relay     # All libp2p logs
DEBUG=libp2p:gossipsub* npm run relay   # Just GossipSub
```

**In the browser:** Set localStorage before loading the page:
```javascript
localStorage.setItem('debug', 'libp2p:gossipsub*')
// Then reload the page
```

**Useful debug namespaces:**
- `libp2p:gossipsub*` — GossipSub mesh formation, message routing, errors
- `libp2p:kad-dht*` — DHT queries, routing table changes
- `libp2p:circuit-relay*` — Relay reservations, connection limits
- `libp2p:connection*` — Connection lifecycle
- `libp2p:*` — Everything (very noisy)

If we had known to enable `libp2p:gossipsub*` from the start, Issue 7 would have been visible immediately — the caught TypeError would have appeared in the console. Instead, we spent two days adding our own diagnostic monkey-patches to surface what the library was already logging internally but not showing us.

---

## Part 7: NAT Traversal — Why WebRTC (Usually) Works and When It Doesn't

### The Problem Browsers Face

Browsers can't bind to ports or accept inbound connections. Every connection is outbound. Two browsers both behind NATs can't directly reach each other — both are waiting for the other to connect first, but neither can.

### How STUN Solves It (Cone NAT)

STUN (Session Traversal Utilities for NAT) is a protocol where a browser asks a public server: "What do I look like from the outside?" The server replies with the browser's external IP and port — the mapping that the NAT created for this outbound connection.

With **cone NAT** (also called endpoint-independent mapping, which is what most home routers use), the NAT creates a single external mapping per internal socket, regardless of destination:

```
Browser A (192.168.1.5:4000) → NAT → external 73.1.2.3:50000

This mapping 73.1.2.3:50000 is the SAME whether A talks to:
  - STUN server (to discover the mapping)
  - Browser B (to exchange data)
  - Any other host
```

So the trick works: A asks STUN "what's my external address?", gets `73.1.2.3:50000`, sends this to B (via the relay's signaling channel), and B sends packets to `73.1.2.3:50000`. The NAT sees incoming packets on `:50000`, recognizes the mapping, and forwards them to `192.168.1.5:4000`. Connection established.

There are subtypes of cone NAT with varying restrictions:
- **Full cone:** Any external host can send to the mapped port. Easiest.
- **Restricted cone:** Only hosts that A has previously sent to can reply. B must send first AND A must have sent to B's IP. Both sides do this simultaneously via ICE — that's the "hole punch."
- **Port-restricted cone:** Like restricted, but also checks the source port. Still works because both sides know each other's port from STUN.

All three work because the external mapping is **the same regardless of destination**.

### Why Symmetric NAT Breaks Everything

**Symmetric NAT** (also called endpoint-dependent mapping) creates a different external mapping for every distinct destination:

```
Browser A (192.168.1.5:4000) sends to:
  STUN server (5.5.5.5:3478)  → NAT assigns external 73.1.2.3:50000
  Browser B   (84.2.3.4:60000) → NAT assigns external 73.1.2.3:50001  ← DIFFERENT PORT
  Browser C   (91.5.6.7:45000) → NAT assigns external 73.1.2.3:50002  ← DIFFERENT AGAIN
```

STUN tells A: "you look like `73.1.2.3:50000`." A tells B (via signaling): "send packets to `73.1.2.3:50000`." But when A actually tries to send to B, the NAT creates a **new** mapping `:50001` for that specific destination. B's packets arrive at `:50000` — but that mapping is bound to the STUN server's address, not B's. The NAT drops them.

The mapping B needs (`:50001`) doesn't exist yet when the signaling happens. It only gets created when A sends to B. And B doesn't know it's `:50001` — nobody does until it's created. Chicken-and-egg: you need to know the port to connect, but the port is only assigned when you connect.

**Port prediction** (guessing the next port the NAT will assign) sometimes works if the NAT increments sequentially, but modern symmetric NATs randomize port assignment specifically to prevent this.

### Where Symmetric NAT Appears

- **Carrier-grade NAT (CGNAT):** ISPs that don't have enough IPv4 addresses put customers behind a shared NAT. Common on mobile networks (4G/5G) and some budget ISPs. Often symmetric.
- **Enterprise firewalls:** Corporate networks frequently use symmetric NAT for security — it prevents unsolicited inbound connections, which is exactly the property that defeats hole punching.
- **Some consumer routers:** Rare, but some routers default to symmetric NAT behavior.

Roughly 10-20% of real-world connections fail to hole-punch due to symmetric NAT (one or both sides). The exact percentage depends on your user base — mobile-heavy audiences see more failures.

### The TURN Fallback (and Why We Don't Use It Yet)

When hole punching fails, the standard fallback is **TURN** (Traversal Using Relays around NAT) — a relay server that both peers can reach, which forwards packets between them. WebRTC includes TURN support natively.

**Why we skip it for now:** TURN is a relay in the data path. Our architecture's whole point is that the relay handles signaling only, not data. Adding TURN would mean some peers' messages flow through a centralized server — undermining the direct P2P model. The current behavior is: if you're behind symmetric NAT and can't hole-punch, you can't join. That's an acceptable tradeoff while the user base is small and mostly on home networks.

**The decentralized solution for later:** Instead of a centralized TURN server, peers with good connectivity (public IP, cone NAT) can volunteer as relays. libp2p's circuit relay already does this — it's the mechanism we use for signaling today. For symmetric NAT peers, the circuit relay connection would stay active as a data path (instead of being replaced by WebRTC). No new infrastructure required — just a policy change: keep the relay stream alive when WebRTC negotiation fails, instead of treating it as signaling-only.

### Mobile Browser Suspend/Resume

When a mobile device locks the screen or the browser moves to background, the OS suspends the browser process. All timers, network I/O, and JavaScript execution freeze. Effects on libp2p:

1. **WebRTC data channels die.** SCTP heartbeats stop. Remote peers detect the failure after 30-60 seconds and fire `peer:disconnect`. The suspended peer doesn't know its connections are dead until it wakes up.
2. **WebSocket to relay dies.** The TCP keepalive timer expires or the relay's idle timeout closes the connection. The circuit relay reservation is lost — the peer is no longer reachable through the relay.
3. **DHT presence is lost.** Other peers can no longer discover this peer via `findProviders()`. The peer's provider records remain in the DHT until they expire naturally, but new `findProviders` queries won't find a peer that can't be dialed.

**Detection:** Use a `setInterval` watchdog. Schedule a 5-second interval; if the callback fires with a gap of 10+ seconds, the device was asleep. This is more reliable than the Page Visibility API (`visibilitychange`), which fires on tab switches but not always on screen lock.

**Recovery (implemented in `main.ts`):** On wake detection, re-dial the relay to restore the WebSocket connection and circuit relay reservation. If in a room, re-announce on DHT and re-discover + re-dial peers via `/webrtc`. The `wrapDialWithTimeout` monkeypatch ensures all reconnect dials have a 15-second timeout.

**Discovered:** epic-008, phone-on-cellular test.

### What Happens in Our System Today

1. Browser connects to relay via WebSocket (`wss://`)
2. Browser discovers peers via DHT (`findProviders`)
3. Browser dials peer's `/webrtc` multiaddr — this uses the relay for SDP/ICE signaling only
4. ICE negotiation runs: STUN discovers external addresses, both sides attempt hole punching
5. **If cone NAT (common case):** Direct WebRTC data channel established. Relay is out of the data path. Connection shows `limited=false`.
6. **If symmetric NAT:** ICE fails. No TURN configured. Connection attempt fails. The relay-mediated stream (used for signaling) stays alive as a fallback data path until its duration limit expires (30 minutes with our current config).

The `Identify: ... webrtc limited=false` log line confirms a direct connection. `limited=true` means traffic is still going through the relay.

---

## Summary

The protocol stack is sound. It mirrors BitTorrent's architecture, which is proven at massive scale. The problems we encountered were all **library implementation issues**: silent error handling, documentation lies, race conditions in startup, undocumented defaults, and version incompatibilities between packages in the same ecosystem.

The common thread: **silent failure**. Every single issue manifested as "nothing happens" rather than "an error occurs." In a language with exceptions and stack traces, these would have been caught quickly. In the JavaScript/libp2p ecosystem, the default behavior is to swallow errors and continue running in a degraded state.

The defenses:
1. Pin dependency versions explicitly (`~X.Y`, never `*`)
2. Enable debug logging (`localStorage.debug`) when anything is unclear
3. Add abort signal timeouts to all DHT operations
4. Don't use the bootstrap module — dial manually after startup
5. Configure relay limits explicitly — never trust defaults
6. Test sustained communication, not just initial connection
