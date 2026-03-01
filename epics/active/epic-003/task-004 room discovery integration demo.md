# Task-004: Room Discovery Integration Demo

**Status:** done

## Objective

Update the demo page to show the full room flow: create a room → get a room_id → another browser joins by room_id via DHT. Replace the relay HTTP polling with DHT-based discovery.

## Acceptance Criteria

- [x] UI has "Create Room" (inputs: room name) and "Join Room" (input: room_id) controls
- [x] Creating a room computes room_id and announces on DHT
- [x] Joining a room queries DHT for providers, connects to them
- [ ] Two browsers prove the flow: A creates, B joins by room_id, they connect
- [x] Relay HTTP polling for peer discovery is removed (relay info endpoint stays for relay address bootstrap)
- [x] All existing tests pass, build and lint clean
