# Task-004: Key Serialization

**Status:** done

## Objective

Implement export and import of keypairs in JWK (JSON Web Key) format. This is the bridge between in-memory CryptoKey objects and persistent storage (IndexedDB in a future epic). JWK is JSON-native, so it works directly with IndexedDB's structured clone and JSON.stringify.

## Acceptance Criteria

- [x] Write src/identity/serializeKeys.test.ts (tests first)
  - [x] exportKeypair produces JWK objects with kty: "OKP" and crv: "Ed25519"
  - [x] Round-trip: generate → export → import → sign → verify works
  - [x] Imported public key has "verify" usage
  - [x] Imported private key has "sign" usage
  - [x] JSON.stringify → JSON.parse round-trip: export → stringify → parse → import → sign → verify works
- [x] Create src/identity/serializeKeys.ts — make tests pass
  - [x] exportKeypair(keypair: IdentityKeypair) → Promise\<SerializedKeypair\>
    - [x] Exports both keys as JWK using crypto.subtle.exportKey("jwk", ...)
  - [x] importKeypair(serialized: SerializedKeypair) → Promise\<IdentityKeypair\>
    - [x] Imports public key with ["verify"] usage
    - [x] Imports private key with ["sign"] usage
    - [x] Both imported as extractable: true
- [x] Export exportKeypair and importKeypair from index.ts
- [x] npm run test — all tests pass
