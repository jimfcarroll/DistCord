# Task-004: Key Serialization

**Status:** pending

## Objective

Implement export and import of keypairs in JWK (JSON Web Key) format. This is the bridge between in-memory CryptoKey objects and persistent storage (IndexedDB in a future epic). JWK is JSON-native, so it works directly with IndexedDB's structured clone and JSON.stringify.

## Acceptance Criteria

- [ ] Write src/identity/serializeKeys.test.ts (tests first)
  - [ ] exportKeypair produces JWK objects with kty: "OKP" and crv: "Ed25519"
  - [ ] Round-trip: generate → export → import → sign → verify works
  - [ ] Imported public key has "verify" usage
  - [ ] Imported private key has "sign" usage
  - [ ] JSON.stringify → JSON.parse round-trip: export → stringify → parse → import → sign → verify works
- [ ] Create src/identity/serializeKeys.ts — make tests pass
  - [ ] exportKeypair(keypair: IdentityKeypair) → Promise\<SerializedKeypair\>
    - [ ] Exports both keys as JWK using crypto.subtle.exportKey("jwk", ...)
  - [ ] importKeypair(serialized: SerializedKeypair) → Promise\<IdentityKeypair\>
    - [ ] Imports public key with ["verify"] usage
    - [ ] Imports private key with ["sign"] usage
    - [ ] Both imported as extractable: true
- [ ] Export exportKeypair and importKeypair from index.ts
- [ ] npm run test — all tests pass
