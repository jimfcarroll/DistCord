# Task-003: Browser libp2p Node Factory

**Status:** done

## Objective

Create a factory function that configures and returns a started libp2p node for browser use. This is the browser's networking core — WebRTC for peer-to-peer data, WebSocket for connecting to the bootstrap/relay, Circuit Relay v2 for signaling and NAT fallback.

## Acceptance Criteria

- [x] Write `src/network/create-browser-node.test.ts` (tests first)
  - [x] Node starts and stops cleanly without errors
  - [x] Node's PeerId matches the identity bridge output for the same keypair
  - [x] Node is configured with expected transports (verify via node configuration or protocol list)
  - [x] Calling without bootstrap addresses works (node starts, just has no peers)
- [x] Create `src/network/create-browser-node.ts`
  - [x] `createBrowserNode(keypair: IdentityKeypair, bootstrapAddrs?: string[])` → `Promise<Libp2p>`
  - [x] Transports: `webRTC()`, `webSockets()`, `circuitRelayTransport()` (note: `filters.all` no longer needed — current `@libp2p/websockets` handles both `ws://` and `wss://` natively)
  - [x] Encryption: `noise()`
  - [x] Multiplexer: `yamux()`
  - [x] Listen addresses: `/p2p-circuit`, `/webrtc`
  - [x] Services: `identify()`, `identifyPush()`, `ping()`
  - [x] Bootstrap discovery: `bootstrap({ list: bootstrapAddrs })` when addrs provided
  - [x] Uses task-002's `keypairToLibp2pKey()` for identity
- [x] Export `createBrowserNode` from `src/network/index.ts`
- [x] `npm run test` — all tests pass (28/28)
- [x] `npm run lint` — clean
