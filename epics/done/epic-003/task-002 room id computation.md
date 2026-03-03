# Task-002: Room ID Computation

**Status:** done

## Objective

Implement the room addressing scheme: `room_id = H(creator_pubkey + room_name + nonce)`. This is a pure function — takes a public key, room name, and nonce, returns a CID suitable for DHT content routing.

## Acceptance Criteria

- [x] New module `src/room/` with `computeRoomId(creatorPubKey, roomName, nonce)` function
- [x] Uses SHA-256 via WebCrypto
- [x] Returns a CID (using `multiformats` — added as direct dependency)
- [x] Deterministic: same inputs → same CID
- [x] Different inputs → different CIDs
- [x] Barrel export from `src/room/index.ts`
- [x] Tests cover determinism, uniqueness, and edge cases
- [x] 85%+ coverage on new code (100% on compute-room-id.ts)
- [x] All existing tests pass, build and lint clean
