# Known Issues — Third-Party Libraries

Known gotchas with third-party libraries encountered during development. The common thread with js-libp2p packages is **silent failure** — misconfigurations produce no errors, just broken behavior. Start here when debugging connectivity or DHT problems.

## `@libp2p/bootstrap`

**Silent drop of multiaddrs without `/p2p/<PeerId>` suffix.**
If you pass a multiaddr like `/ip4/127.0.0.1/tcp/9001/ws` without the trailing `/p2p/<PeerId>`, the bootstrap module silently ignores it. No error, no warning — the node just never connects to the bootstrap peer.

- **Workaround:** Always include the full multiaddr with PeerId. The relay's HTTP info endpoint serves complete multiaddrs.
- **Discovered:** epic-002, commit `749ad76`

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

### Version mismatch with `@libp2p/interface`

**TypeScript type errors when used with `libp2p@3.x`.**
`@chainsafe/libp2p-gossipsub@14.x` depends on `@libp2p/interface@^2.0.0`, but `libp2p@3.x` depends on `@libp2p/interface@^3.0.0`. GossipSub bundles its own copy of the older interface in its `node_modules`, causing TypeScript to see incompatible `Peer`, `Address`, and `Multiaddr` types between the two copies. The runtime behavior is fine — only the types diverge.

- **Workaround:** Cast the gossipsub factory result through `unknown` to the expected service type: `gossipsub({...}) as unknown as ReturnType<typeof identify>`.
- **Discovered:** epic-004
