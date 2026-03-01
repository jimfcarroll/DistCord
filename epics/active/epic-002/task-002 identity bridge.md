# Task-002: Identity Bridge — WebCrypto to libp2p

**Status:** pending

## Objective

Create functions to convert our epic-001 Ed25519 keypairs (WebCrypto `CryptoKey` objects) into libp2p's `PrivateKey` and `PeerId` types. This bridge ensures a peer's network identity and application identity are the same key — same Ed25519 seed, two representations.

The bridge path: export keypair to JWK → extract `d` field (32-byte Ed25519 seed as base64url) → `generateKeyPairFromSeed('Ed25519', seed)` → `peerIdFromPrivateKey()`.

## Acceptance Criteria

- [ ] Write `src/network/identity-bridge.test.ts` (tests first)
  - [ ] Same keypair always produces the same PeerId (deterministic)
  - [ ] Fingerprint derived from PeerId's public key bytes matches our `fingerprint()` output — proves both representations hold the same key
  - [ ] Bridge works after JWK round-trip: `generateKeypair → export → import → bridge` produces same PeerId as `generateKeypair → bridge`
  - [ ] Two different keypairs produce different PeerIds
- [ ] Create `src/network/identity-bridge.ts`
  - [ ] `keypairToLibp2pKey(keypair: IdentityKeypair)` → returns libp2p `PrivateKey`
  - [ ] `keypairToPeerId(keypair: IdentityKeypair)` → returns libp2p `PeerId` (convenience wrapper)
  - [ ] Uses `@libp2p/crypto` `generateKeyPairFromSeed` and `@libp2p/peer-id` `peerIdFromPrivateKey`
- [ ] Export bridge functions from `src/network/index.ts`
- [ ] `npm run test` — all tests pass (new + existing)
- [ ] `npm run lint` — clean
