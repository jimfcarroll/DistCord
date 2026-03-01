# Task-003: DHT Provider Announce and Discovery

**Status:** done

## Objective

Wrap libp2p's content routing API so a peer can announce itself as a provider for a room_id and discover other providers. These are the building blocks for "create room" and "join room."

## Acceptance Criteria

- [x] `announceRoom(node, roomCid)` — calls `node.contentRouting.provide(roomCid)`
- [x] `discoverRoom(node, roomCid)` — async iterable of peer infos from `node.contentRouting.findProviders(roomCid)`
- [x] Functions live in `src/room/` alongside room ID computation
- [x] Tests verify announce and discovery (unit tests with mocked contentRouting)
- [x] All existing tests pass, build and lint clean
