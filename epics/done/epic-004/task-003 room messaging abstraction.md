# Task-003: Room Messaging Abstraction

**Status:** done

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

- [x] `src/messaging/room-messaging.ts` with `createRoomMessaging()` and `roomTopicFromCid()`
- [x] Tests (mocked pubsub): subscribe, publish, valid message delivery, invalid signature dropped, wrong-topic ignored, unsubscribe cleanup
- [x] Barrel export updated
- [x] 85%+ coverage on new code
- [x] All existing tests pass, build and lint clean

## Notes

- Coverage: 95.91% statements/lines on `room-messaging.ts`
- Defined a `PubSubService` interface to type the pubsub service access without depending on gossipsub's bundled `@libp2p/interface@2.x` types. The node's pubsub service is cast through `unknown` to this interface, same pattern as task-001.
- 7 tests total: topic format, subscribe wiring, publish with valid signed bytes, valid message delivery, invalid signature drop, wrong-topic ignore, unsubscribe cleanup.
