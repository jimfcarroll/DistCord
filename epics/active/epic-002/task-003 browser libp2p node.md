# Task-003: Browser libp2p Node Factory

**Status:** pending

## Objective

Create a factory function that configures and returns a started libp2p node for browser use. This is the browser's networking core — WebRTC for peer-to-peer data, WebSocket for connecting to the bootstrap/relay, Circuit Relay v2 for signaling and NAT fallback.

## Acceptance Criteria

- [ ] Write `src/network/create-browser-node.test.ts` (tests first)
  - [ ] Node starts and stops cleanly without errors
  - [ ] Node's PeerId matches the identity bridge output for the same keypair
  - [ ] Node is configured with expected transports (verify via node configuration or protocol list)
  - [ ] Calling without bootstrap addresses works (node starts, just has no peers)
- [ ] Create `src/network/create-browser-node.ts`
  - [ ] `createBrowserNode(keypair: IdentityKeypair, bootstrapAddrs?: string[])` → `Promise<Libp2p>`
  - [ ] Transports: `webRTC()`, `webSockets({ filter: filters.all })`, `circuitRelayTransport()`
  - [ ] Encryption: `noise()`
  - [ ] Multiplexer: `yamux()`
  - [ ] Listen addresses: `/p2p-circuit`, `/webrtc`
  - [ ] Services: `identify()`, `identifyPush()`, `ping()`
  - [ ] Bootstrap discovery: `bootstrap({ list: bootstrapAddrs })` when addrs provided
  - [ ] Uses task-002's `keypairToLibp2pKey()` for identity
- [ ] Export `createBrowserNode` from `src/network/index.ts`
- [ ] `npm run test` — all tests pass
- [ ] `npm run lint` — clean
