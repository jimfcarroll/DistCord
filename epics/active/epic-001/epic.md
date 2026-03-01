# EPIC-001: Project Scaffold + Identity Module

## Objective

Set up the TypeScript project infrastructure and build the identity layer — the cryptographic foundation that everything else in the application depends on. Identity (Ed25519 keypairs) is how users prove who they are, how authority logs are signed, and how room addresses are derived.

No UI beyond a console demo. No production dependencies — the identity layer uses only the browser-native WebCrypto API.

## Scope

**In scope:**
- Project scaffolding: TypeScript, Vite, Vitest, ESLint, Prettier
- Ed25519 keypair generation, signing, verification
- Key serialization (JWK format for IndexedDB storage)
- Public key fingerprinting (SHA-256 hash → user ID)

**Out of scope:**
- IndexedDB storage layer (future epic)
- Authority log (future epic)
- Networking / DHT / WebRTC (future epic)
- Any UI beyond console output

## Key Design Decisions

- **Pure functions, no classes** — each identity operation is an independent async function
- **CryptoKey objects in the API** — private keys stay opaque in memory (WebCrypto protection); raw bytes only appear during explicit serialization
- **JWK for serialization** — JSON-native format that works directly with IndexedDB
- **SHA-256 hex fingerprints** — `fingerprint = hex(SHA-256(raw_public_key))`, 64-char string used as user ID
- **Zero production dependencies** — WebCrypto API only

## Directory Structure

```
src/
  main.ts                        ← Console demo
  identity/
    types.ts                     ← IdentityKeypair, SerializedKeypair, Fingerprint
    generateKeypair.ts           ← Ed25519 keypair generation
    generateKeypair.test.ts
    sign.ts                      ← Sign data with private key
    sign.test.ts
    verify.ts                    ← Verify signature with public key
    verify.test.ts
    serializeKeys.ts             ← Export/import keys as JWK
    serializeKeys.test.ts
    fingerprint.ts               ← SHA-256 of public key → hex user ID
    fingerprint.test.ts
    index.ts                     ← Barrel file (public API)
```

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | Project scaffolding | active |
| 002 | Identity types and keypair generation | pending |
| 003 | Sign and verify | pending |
| 004 | Key serialization | pending |
| 005 | Fingerprint and integration demo | pending |
| 006 | Coverage audit | pending |
