# Task-005: Fingerprint and Integration Demo

**Status:** done

## Objective

Implement public key fingerprinting — deriving a user ID from a public key by hashing it. Then wire up a console demo in main.ts that exercises the entire identity module end-to-end. The fingerprint algorithm (SHA-256 of raw public key, hex-encoded) becomes a protocol-level decision since fingerprints are used in DHT addressing and authority log entries.

## Acceptance Criteria

- [x] Write src/identity/fingerprint.test.ts (tests first)
  - [x] Produces a 64-character lowercase hex string
  - [x] Deterministic (same key → same fingerprint)
  - [x] Different keys → different fingerprints
  - [x] Output matches manual computation: hex(SHA-256(crypto.subtle.exportKey("raw", publicKey)))
- [x] Create src/identity/fingerprint.ts — make tests pass
  - [x] fingerprint(publicKey: CryptoKey) → Promise\<Fingerprint\>
  - [x] Exports raw public key bytes, SHA-256 hashes them, hex-encodes the result
- [x] Export fingerprint from index.ts
- [x] Update src/main.ts with full identity demo
  - [x] Generate a keypair
  - [x] Derive and display the fingerprint (user ID)
  - [x] Sign a message
  - [x] Verify the signature
  - [x] Export the keypair, re-import it, verify signature still works
  - [x] All output goes to console.log
- [x] Final verification
  - [x] npm run dev — browser console shows demo output
  - [x] npm run build — produces dist/ successfully
  - [x] npm run test — all tests pass
  - [x] npm run lint — no errors
