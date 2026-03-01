# Task-003: Sign and Verify

**Status:** pending

## Objective

Implement data signing with a private key and signature verification with a public key. These are the core operations for the authority log (signing ACL entries) and message authentication.

## Acceptance Criteria

- [ ] Write src/identity/sign.test.ts (tests first)
  - [ ] Produces a 64-byte Uint8Array signature
  - [ ] Signing is deterministic (same key + same data → same signature)
  - [ ] Different data produces different signatures
- [ ] Create src/identity/sign.ts — make tests pass
  - [ ] sign(privateKey: CryptoKey, data: Uint8Array) → Promise\<Uint8Array\>
  - [ ] Uses crypto.subtle.sign("Ed25519", privateKey, data)
- [ ] Write src/identity/verify.test.ts (tests first)
  - [ ] Returns true for a valid signature
  - [ ] Returns false when data has been tampered with
  - [ ] Returns false when signature has been tampered with
  - [ ] Returns false when verified with the wrong public key
- [ ] Create src/identity/verify.ts — make tests pass
  - [ ] verify(publicKey: CryptoKey, signature: Uint8Array, data: Uint8Array) → Promise\<boolean\>
  - [ ] Uses crypto.subtle.verify("Ed25519", publicKey, signature, data)
- [ ] Export sign and verify from index.ts
- [ ] npm run test — all tests pass
