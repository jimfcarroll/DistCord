# Known Issues — Third-Party Libraries

Terse technical reference of confirmed gotchas with third-party libraries. Each entry documents a specific failure mode, its root cause, and the fix or workaround. For deeper explanations with full context and debugging narratives, see `KNOWLEDGE_BASE.md`.

The common thread with js-libp2p packages is **silent failure** — misconfigurations produce no errors, just broken behavior. Start here when debugging connectivity or DHT problems.

## `@libp2p/bootstrap`

### Silent drop of multiaddrs without `/p2p/<PeerId>` suffix

**Node never connects to bootstrap peer — no error.**
If you pass a multiaddr like `/ip4/127.0.0.1/tcp/9001/ws` without the trailing `/p2p/<PeerId>`, the bootstrap module silently ignores it. No error, no warning — the node just never connects to the bootstrap peer.

- **Workaround:** Always include the full multiaddr with PeerId. The relay's HTTP info endpoint serves complete multiaddrs.
- **Discovered:** epic-002, commit `749ad76`

### Race condition: bootstrap connects before service topologies register

**DHT routing table stays empty forever — `provide()` and `findProviders()` hang or time out.**
The `bootstrap` peer discovery module dials peers during `createLibp2p()` startup, while services are still initializing. The identify protocol can complete before kadDHT registers its topology listener with the registrar. The registrar's `_onPeerIdentify` handler only notifies topologies that are **already registered** — there is no catch-up mechanism for peers identified before a topology is added. Result: kadDHT never learns about the bootstrap peer's `/ipfs/kad/1.0.0` support, the routing table stays at size 0, and all DHT operations fail.

This race was latent in epic-003 (with fewer services, kadDHT usually registered in time). Adding GossipSub in epic-004 made startup slower and the race reliably triggers.

- **Workaround:** Don't use the `bootstrap` module. Instead, call `node.dial(multiaddr(addr))` manually after `createLibp2p()` returns. At that point all services and topologies are registered, so `peer:identify` events are processed correctly.
- **Discovered:** epic-004

## `@libp2p/websockets` (browser connection gater)

**Default browser gater silently blocks `ws://` and private IPs.**
The browser build of libp2p (`connection-gater.browser.js`) ships a default connection gater that rejects insecure WebSocket (`ws://`) and RFC-1918 private addresses (`127.0.0.1`, `192.168.x.x`, etc.). In local dev, both apply. You get a `DialDeniedError` but only if you're already looking for it — otherwise the connection just never happens.

- **Workaround:** Override with `denyDialMultiaddr: () => false` in `createBrowserNode`. Production would use `wss://` with public addresses.
- **Discovered:** epic-002, commit `fd025f6`

## `@libp2p/circuit-relay-v2`

**Circuit Relay v2 is a dumb pipe — no peer discovery.**
The relay transports bytes between peers but does not perform peer discovery, protocol negotiation, or any application-level logic on behalf of connected peers. If you connect two browsers to the same relay, they will not automatically discover each other. A separate discovery mechanism is required (DHT, pubsub, or an external endpoint).

- **Workaround:** Use DHT content routing (`provide` / `findProviders`) for peer discovery. The relay is only for signaling and NAT traversal.
- **Discovered:** epic-002, commit `fd025f6`

### Default connection limits silently kill relayed streams after 2 minutes

**Messages flow for ~2 minutes then silently stop. No disconnect event, no error.**
`circuitRelayServer()` with no config applies default per-connection limits: `defaultDurationLimit` = 120,000 ms (2 min), `defaultDataLimit` = 131,072 bytes (128 KB). When either limit is hit, the relay resets the underlying STOP stream. This is a **stream-level** closure, not a connection-level one — libp2p does not fire `peer:disconnect`. GossipSub continues trying to send on a dead stream and messages silently vanish.

The defaults are buried in `@libp2p/circuit-relay-v2/dist/src/constants.js` and not mentioned in the README or API docs. The 2-minute default is designed for short-lived relay-assisted signaling (establish WebRTC, then disconnect from relay), not for sustained communication.

- **Fix:** Configure explicit limits: `circuitRelayServer({ reservations: { defaultDurationLimit: 30 * 60 * 1000, defaultDataLimit: BigInt(1 << 27) } })`. Do not set to 0 (unlimited) on a public relay — bad actors could park connections forever.
- **Discovered:** epic-004 debugging

## libp2p dial behavior

### `dial(peerId)` prefers relay over WebRTC — must dial `/webrtc` multiaddr explicitly

**Peers connect via relay (`limited=true`) even though WebRTC transport is configured.**
When `dial(peerId)` is called, libp2p resolves the peer's addresses and tries them in order. The plain `/p2p-circuit` address (relay) connects faster than `/p2p-circuit/webrtc` (requires SDP/ICE exchange). Once the relay connection succeeds, the peer is "connected" and the WebRTC dial is skipped.

The `/webrtc` multiaddr path does the right thing: uses the relay *only* for signaling (SDP/ICE exchange via `/webrtc-signaling/0.0.1`), then establishes a direct WebRTC data channel. The relay is not in the data path. But you must dial the `/webrtc` address explicitly — libp2p will not automatically upgrade a relay connection to WebRTC.

- **Fix:** Filter provider multiaddrs from `findProviders()` for `/webrtc` addresses and dial those directly. Fall back to `dial(peerId)` only if no `/webrtc` address is available or the WebRTC dial fails.
- **Discovered:** epic-004 debugging

## `@libp2p/kad-dht`

### `clientMode` defaults to `true`, docs say `false`

**Silent failure — server node runs as client, all DHT queries time out.**
Line 139 of `kad-dht.js` reads `this.clientMode = init.clientMode ?? true`, contradicting the JSDoc `@default false`. When the relay starts with the default, it never registers the `/ipfs/kad/1.0.0` protocol handler. The browser's topology listener never detects a DHT-capable peer, the routing table stays empty, and `provide()` / `findProviders()` time out with `TimeoutError: signal timed out` — no indication of the root cause.

- **Workaround:** Explicitly set `clientMode: false` on any node that should act as a DHT server.
- **Discovered:** epic-003

### DHT routing table population is async with no event

**Queries fail immediately after connection because routing table is empty.**
After a browser connects to a DHT server peer, the topology listener needs time to detect the server's `/ipfs/kad/1.0.0` protocol support and add it to the routing table. There is no "DHT ready" event or callback. If you call `provide()` or `findProviders()` immediately after the `peer:connect` event, the routing table is empty and queries time out.

A blind `setTimeout` is unreliable — the required delay depends on how many protocols are registered (each adds to the identify exchange). Adding GossipSub in epic-004 broke a 2-second timer that was working in epic-003.

- **Workaround:** Listen for the `peer:identify` event, verify the peer's protocols include `/ipfs/kad/1.0.0`, then allow a short delay (500ms) for the topology listener to update the routing table. This is event-driven instead of time-based.
- **Discovered:** epic-003, updated epic-004

### `provide()` and `findProviders()` have no default timeout

**Operations hang forever if the routing table is empty.**
`contentRouting.provide()` internally calls `findClosestPeers()`. With an empty routing table, the DHT query waits indefinitely for responses from non-existent peers. No timeout, no error — just a permanent hang. Similarly, `findProviders()` can hang if the routing table has no entries.

- **Workaround:** Always pass `{ signal: AbortSignal.timeout(30_000) }` to `provide()` and `findProviders()`.
- **Discovered:** epic-004

## `@chainsafe/libp2p-gossipsub`

### `libp2p@3.x` stream interface breaks outbound streams — messages never flow

**GossipSub connects to peers, but no messages are exchanged. `streamsOutbound` map stays empty. No error is visible.**

`@chainsafe/libp2p-gossipsub@14.x` depends on `@libp2p/interface@^2.x`. `libp2p@3.x` uses `@libp2p/interface@^3.x`, which completely changed the stream interface:

- **v2 streams** (`@libp2p/utils` v6, `AbstractStream`): have `.sink` (async function consuming an iterable) and `.source` (async iterable). GossipSub's `OutboundStream` constructor uses `it-pipe` to call `pipe(pushable, rawStream)`, which calls `rawStream.sink(pushable)`.
- **v3 streams** (`@libp2p/utils` v7, `AbstractMessageStream`): removed `.sink` and `.source` entirely. Replaced with `Symbol.asyncIterator` and event-based `.send()` API.

When GossipSub receives a v3 stream from `connection.newStream()`:
1. `OutboundStream` constructor calls `pipe(this.pushable, this.rawStream)`
2. `it-pipe` checks `isDuplex(rawStream)` → `false` (no `.sink` property)
3. `rawPipe` tries to call `rawStream(pushable)` as a function → **TypeError**
4. `createOutboundStream` catches it internally: `catch (e) { this.log.error('createOutboundStream error', e) }` — **silently swallowed**
5. `streamsOutbound.set()` never executes → outbound stream count stays 0
6. No subscription exchange → no mesh formation → no message delivery

Key source locations:
- `@chainsafe/libp2p-gossipsub/dist/src/index.js:482-484` — `new OutboundStream(await connection.newStream(...))`
- `@chainsafe/libp2p-gossipsub/dist/src/stream.js:20` — `pipe(this.pushable, this.rawStream).catch(errCallback)`
- `it-pipe/dist/src/index.js:47-51` — `isDuplex` check: `obj.sink != null && obj.source != null`
- `@libp2p/utils/dist/src/abstract-message-stream.js` — v3 stream, no `.sink`/`.source`
- `@libp2p/pubsub/node_modules/@libp2p/utils/dist/src/abstract-stream.js` — v2 stream, HAS `.sink`/`.source`

**Debugging was difficult because:**
- `connection.newStream()` succeeds — the stream IS created at the transport level
- GossipSub's `createOutboundStream` doesn't re-throw — it catches and logs internally
- The only evidence is `streamsOutbound.size === 0` after `createOutboundStream` returns
- Diagnostic monkey-patching `connection.newStream` shows success because the stream creation itself works; the failure is in the `OutboundStream` wrapper constructor that runs after `newStream` returns
- GossipSub's debug logger (`this.log.error`) is not connected to the browser console by default

**What we tried before finding the root cause:**
1. Checked GossipSub's three early returns (`!isStarted()`, `!peers.has(id)`, `streamsOutbound.has(id)`) — none triggered
2. Checked stream limits in `findOutgoingStreamLimit` — not the issue (defaults to 64)
3. Checked `runOnLimitedConnection` configuration — set correctly
4. Added diagnostic monkey-patch intercepting `connection.newStream` errors — showed success, which was misleading because the error is in the `OutboundStream` constructor, not in `newStream`
5. Waited 4+ minutes with timing tests — not a timing issue
6. Checked GossipSub topology registration for `/meshsub/1.1.0` and `/meshsub/1.0.0` — fires correctly
7. Noted 4 parallel `createOutboundStream` calls per peer (one per protocol topology) — all fail identically

- **Fix:** Pin all libp2p packages to their latest `@libp2p/interface@^2.x`-compatible versions. Replace `"*"` wildcards. Compatible versions: `libp2p@~2.10`, `@chainsafe/libp2p-noise@~16.1`, `@chainsafe/libp2p-yamux@~7.0`, `@libp2p/bootstrap@~11.0`, `@libp2p/circuit-relay-v2@~3.2`, `@libp2p/crypto@~5.1`, `@libp2p/identify@~3.0`, `@libp2p/kad-dht@~15.1`, `@libp2p/ping@~2.0`, `@libp2p/webrtc@~5.2`, `@libp2p/websockets@~9.2`.
- **Discovered:** epic-004 debugging, root-caused across multiple sessions

### TypeScript type mismatch with `libp2p@3.x`

**TypeScript type errors when used with `libp2p@3.x`.**
`@chainsafe/libp2p-gossipsub@14.x` depends on `@libp2p/interface@^2.0.0`, but `libp2p@3.x` depends on `@libp2p/interface@^3.0.0`. GossipSub bundles its own copy of the older interface, causing TypeScript to see incompatible types. This is a symptom of the version mismatch above — fix the versions and both the types and the runtime break go away.

- **Workaround (if staying on v3):** Cast through `unknown`: `gossipsub({...}) as unknown as ReturnType<typeof identify>`. Note: this hides the runtime incompatibility described above.
- **Discovered:** epic-004
