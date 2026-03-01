# Task-001: GossipSub Dependency and Configuration

**Status:** done

## Objective

Install `@chainsafe/libp2p-gossipsub` and wire it into both the browser node and relay node as a service. Pure infrastructure — nothing uses it yet. The relay participates in the gossip mesh so messages propagate between peers that lack a direct WebRTC connection.

## Acceptance Criteria

- [x] `@chainsafe/libp2p-gossipsub` added to `package.json` with `"*"` version
- [x] `npm install` succeeds
- [x] `src/network/create-browser-node.ts` adds `pubsub: gossipsub(...)` with `globalSignaturePolicy: 'StrictNoSign'`, `allowPublishToZeroTopicPeers: true`
- [x] `relay/index.ts` adds `pubsub: gossipsub(...)` with matching config
- [x] Test in `create-browser-node.test.ts` verifies `node.services.pubsub` is defined
- [x] All existing tests pass, build and lint clean

## Notes

- `emitSelf` and custom `msgIdFn` were not needed: GossipSub's `StrictNoSign` mode automatically uses SHA-256 of data bytes as the message ID function (via `msgIdFnStrictNoSign`), and `emitSelf` defaults to `false`.
- `@chainsafe/libp2p-gossipsub@14.x` bundles `@libp2p/interface@2.x` while `libp2p@3.x` uses `@libp2p/interface@3.x`. The types are incompatible but the runtime behavior is fine. Workaround: cast the gossipsub factory through `unknown` to the expected service type. Added to KNOWN_ISSUES.md.
