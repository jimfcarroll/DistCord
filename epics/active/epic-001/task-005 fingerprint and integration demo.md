# Task-005: Fingerprint and Integration Demo

**Status:** pending

## Objective

Implement public key fingerprinting — deriving a user ID from a public key by hashing it. Then wire up a console demo in main.ts that exercises the entire identity module end-to-end. The fingerprint algorithm (SHA-256 of raw public key, hex-encoded) becomes a protocol-level decision since fingerprints are used in DHT addressing and authority log entries.

## Acceptance Criteria

- [ ] Write src/identity/fingerprint.test.ts (tests first)
  - [ ] Produces a 64-character lowercase hex string
  - [ ] Deterministic (same key → same fingerprint)
  - [ ] Different keys → different fingerprints
  - [ ] Output matches manual computation: hex(SHA-256(crypto.subtle.exportKey("raw", publicKey)))
- [ ] Create src/identity/fingerprint.ts — make tests pass
  - [ ] fingerprint(publicKey: CryptoKey) → Promise\<Fingerprint\>
  - [ ] Exports raw public key bytes, SHA-256 hashes them, hex-encodes the result
- [ ] Export fingerprint from index.ts
- [ ] Update src/main.ts with full identity demo
  - [ ] Generate a keypair
  - [ ] Derive and display the fingerprint (user ID)
  - [ ] Sign a message
  - [ ] Verify the signature
  - [ ] Export the keypair, re-import it, verify signature still works
  - [ ] All output goes to console.log
- [ ] Final verification
  - [ ] npm run dev — browser console shows demo output
  - [ ] npm run build — produces dist/ successfully
  - [ ] npm run test — all tests pass
  - [ ] npm run lint — no errors
