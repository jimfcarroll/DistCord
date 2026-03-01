# Task-003: Sign and Verify

**Status:** done

## Objective

Implement data signing with a private key and signature verification with a public key. These are the core operations for the authority log (signing ACL entries) and message authentication.

## Acceptance Criteria

- [x] Write src/identity/sign.test.ts (tests first)
  - [x] Produces a 64-byte Uint8Array signature
  - [x] Signing is deterministic (same key + same data → same signature)
  - [x] Different data produces different signatures
- [x] Create src/identity/sign.ts — make tests pass
  - [x] sign(privateKey: CryptoKey, data: Uint8Array) → Promise\<Uint8Array\>
  - [x] Uses crypto.subtle.sign("Ed25519", privateKey, data)
- [x] Write src/identity/verify.test.ts (tests first)
  - [x] Returns true for a valid signature
  - [x] Returns false when data has been tampered with
  - [x] Returns false when signature has been tampered with
  - [x] Returns false when verified with the wrong public key
- [x] Create src/identity/verify.ts — make tests pass
  - [x] verify(publicKey: CryptoKey, signature: Uint8Array, data: Uint8Array) → Promise\<boolean\>
  - [x] Uses crypto.subtle.verify("Ed25519", publicKey, signature, data)
- [x] Export sign and verify from index.ts
- [x] npm run test — all tests pass
