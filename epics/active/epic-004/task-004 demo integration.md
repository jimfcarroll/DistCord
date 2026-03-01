# Task-004: Demo Integration — Replace 1-to-1 With Broadcast

**Status:** pending

## Objective

Update `src/main.ts` and `index.html` to use GossipSub room messaging instead of the custom protocol handler. Messages broadcast to all room peers with sender fingerprint display.

## UI Changes

- Remove "select" buttons from peer list (keep as display-only)
- Send button enables after room create/join (not peer selection)
- Messages show `[fingerprint-short]: body` format
- Invalid-signature messages never displayed
- Own messages displayed optimistically on send
- Title updated to "Chat Demo"
- Custom protocol handler and `dialProtocol` send path removed

## Acceptance Criteria

- [ ] `src/main.ts` uses `createRoomMessaging` for all send/receive
- [ ] Custom protocol handler removed entirely
- [ ] Peer selection state and UI removed
- [ ] Send enables on room join, not peer selection
- [ ] Received messages show sender fingerprint
- [ ] Invalid messages dropped
- [ ] Two browsers exchange messages in real time (manual browser test)
- [ ] All existing tests pass, build and lint clean
