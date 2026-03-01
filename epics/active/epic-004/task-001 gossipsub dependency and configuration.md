# Task-001: GossipSub Dependency and Configuration

**Status:** pending

## Objective

Install `@chainsafe/libp2p-gossipsub` and wire it into both the browser node and relay node as a service. Pure infrastructure — nothing uses it yet. The relay participates in the gossip mesh so messages propagate between peers that lack a direct WebRTC connection.

## Acceptance Criteria

- [ ] `@chainsafe/libp2p-gossipsub` added to `package.json` with `"*"` version
- [ ] `npm install` succeeds
- [ ] `src/network/create-browser-node.ts` adds `pubsub: gossipsub(...)` with `globalSignaturePolicy: 'StrictNoSign'`, `emitSelf: false`, custom `msgIdFn` (SHA-256 of data), `allowPublishToZeroTopicPeers: true`
- [ ] `relay/index.ts` adds `pubsub: gossipsub(...)` with matching config
- [ ] Test in `create-browser-node.test.ts` verifies `node.services.pubsub` is defined
- [ ] All existing tests pass, build and lint clean
