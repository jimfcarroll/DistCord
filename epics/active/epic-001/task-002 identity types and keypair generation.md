# Task-002: Identity Types and Keypair Generation

**Status:** done

## Objective

Define the core identity types used across the identity module and implement Ed25519 keypair generation using the WebCrypto API. This establishes the foundation — every other identity function depends on having a keypair.

## Acceptance Criteria

- [x] Create src/identity/types.ts
  - [x] IdentityKeypair — wraps CryptoKey pair (publicKey, privateKey)
  - [x] SerializedKeypair — JWK format for both keys (used by task-004)
  - [x] Fingerprint — type alias for hex string (used by task-005)
- [x] Create src/identity/index.ts (barrel file, will grow as tasks add exports)
- [x] Write src/identity/generateKeypair.test.ts (tests first)
  - [x] Generates keypair with algorithm name "Ed25519"
  - [x] Both keys are extractable (needed for serialization)
  - [x] Each call produces a unique keypair
  - [x] Public key has "verify" usage, private key has "sign" usage
- [x] Create src/identity/generateKeypair.ts — make tests pass
  - [x] Uses crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])
  - [x] Returns IdentityKeypair
- [x] Export generateKeypair from index.ts
- [x] npm run test — all tests pass
