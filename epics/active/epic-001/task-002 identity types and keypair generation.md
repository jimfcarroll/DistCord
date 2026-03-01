# Task-002: Identity Types and Keypair Generation

**Status:** pending

## Objective

Define the core identity types used across the identity module and implement Ed25519 keypair generation using the WebCrypto API. This establishes the foundation — every other identity function depends on having a keypair.

## Acceptance Criteria

- [ ] Create src/identity/types.ts
  - [ ] IdentityKeypair — wraps CryptoKey pair (publicKey, privateKey)
  - [ ] SerializedKeypair — JWK format for both keys (used by task-004)
  - [ ] Fingerprint — type alias for hex string (used by task-005)
- [ ] Create src/identity/index.ts (barrel file, will grow as tasks add exports)
- [ ] Write src/identity/generateKeypair.test.ts (tests first)
  - [ ] Generates keypair with algorithm name "Ed25519"
  - [ ] Both keys are extractable (needed for serialization)
  - [ ] Each call produces a unique keypair
  - [ ] Public key has "verify" usage, private key has "sign" usage
- [ ] Create src/identity/generateKeypair.ts — make tests pass
  - [ ] Uses crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])
  - [ ] Returns IdentityKeypair
- [ ] Export generateKeypair from index.ts
- [ ] npm run test — all tests pass
