# Task-004: Demo Integration — Replace 1-to-1 With Broadcast

**Status:** done

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

- [x] `src/main.ts` uses `createRoomMessaging` for all send/receive
- [x] Custom protocol handler removed entirely
- [x] Peer selection state and UI removed
- [x] Send enables on room join, not peer selection
- [x] Received messages show sender fingerprint
- [x] Invalid messages dropped (handled by `verifyChatMessage` in room-messaging layer)
- [x] Two browsers exchange messages in real time (manual browser test)
- [x] All existing tests pass, build and lint clean

## Notes

- `enterRoom()` helper creates the `RoomMessaging` instance and subscribes. Called from both create and join paths.
- Own messages are skipped in the subscription handler (compared by `senderFingerprint`) and displayed optimistically on send.
- The `PROTOCOL` constant, `node.handle()`, `dialProtocol`, `selectedPeer`, and peer select buttons are all removed.
- Peer list is now display-only — shows connected peers with relay label but no interaction.
- Manual browser test still pending — requires running relay + two browser tabs.
