# Task-002: Message Types and Sign/Verify Wrappers

**Status:** pending

## Objective

Define the `ChatMessage` type and create functions to construct a signed message and verify a received one. Pure functions with no network dependency — composes `sign()` and `verify()` from `src/identity/`.

## Message Format

```
ChatMessage {
  type: "chat"
  senderPublicKey: string     // raw Ed25519 public key, base64
  senderFingerprint: string   // hex SHA-256 fingerprint
  timestamp: number           // Date.now()
  body: string                // message text
  signature: string           // Ed25519 sig over canonical payload, base64
}
```

The signature covers `JSON.stringify({ type, senderPublicKey, senderFingerprint, timestamp, body })` — everything except the signature field.

## Acceptance Criteria

- [ ] New module `src/messaging/` with barrel export `src/messaging/index.ts`
- [ ] Types in `src/messaging/types.ts`: `ChatMessage`, `MessageVerificationResult`
- [ ] `createChatMessage` in `src/messaging/create-chat-message.ts`
- [ ] `verifyChatMessage` in `src/messaging/verify-chat-message.ts`
- [ ] `serializeChatMessage` and `deserializeChatMessage` in `src/messaging/serialize.ts`
- [ ] Tests: valid message creation, fingerprint matches, signature verification, tamper detection (body, signature, key), serialize round-trip, garbage input rejection
- [ ] 85%+ coverage on new code
- [ ] All existing tests pass, build and lint clean
