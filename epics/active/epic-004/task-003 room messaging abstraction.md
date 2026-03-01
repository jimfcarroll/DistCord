# Task-003: Room Messaging Abstraction

**Status:** pending

## Objective

Create a `RoomMessaging` wrapper that bridges GossipSub and the messaging module. Subscribes to a GossipSub topic derived from the room CID, publishes signed messages, verifies incoming messages, and delivers valid ones to a callback.

## API

```
createRoomMessaging(node, roomCid, keypair) → RoomMessaging

RoomMessaging {
  subscribe(handler: (msg: ChatMessage) => void): void
  publish(body: string): Promise<void>
  unsubscribe(): void
  readonly topic: string
}
```

`roomTopicFromCid(cid)` helper returns `room:<CID string>`.

## Acceptance Criteria

- [ ] `src/messaging/room-messaging.ts` with `createRoomMessaging()` and `roomTopicFromCid()`
- [ ] Tests (mocked pubsub): subscribe, publish, valid message delivery, invalid signature dropped, wrong-topic ignored, unsubscribe cleanup
- [ ] Barrel export updated
- [ ] 85%+ coverage on new code
- [ ] All existing tests pass, build and lint clean
