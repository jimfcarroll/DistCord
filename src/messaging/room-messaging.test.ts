import { describe, it, expect, vi, beforeEach } from "vitest";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import { generateKeypair } from "../identity/index.js";
import { createChatMessage } from "./create-chat-message.js";
import { serializeChatMessage } from "./serialize.js";
import { createRoomMessaging, roomTopicFromCid } from "./room-messaging.js";
import type { ChatMessage } from "./types.js";

async function makeCid(label: string): Promise<CID> {
  const hash = await sha256.digest(new TextEncoder().encode(label));
  return CID.createV1(0x55, hash);
}

function createMockPubsub() {
  type Handler = (evt: CustomEvent<{ topic: string; data: Uint8Array }>) => void;
  const listeners: Handler[] = [];

  return {
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    publish: vi.fn().mockResolvedValue({ recipients: [] }),
    addEventListener: vi.fn((event: string, handler: Handler) => {
      if (event === "message") listeners.push(handler);
    }),
    removeEventListener: vi.fn((_event: string, handler: Handler) => {
      const idx = listeners.indexOf(handler);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
    // Helper to simulate an incoming message
    emit(topic: string, data: Uint8Array) {
      const evt = new CustomEvent("message", { detail: { topic, data } });
      for (const h of listeners) h(evt);
    },
    get listenerCount() {
      return listeners.length;
    },
  };
}

function createMockNode(pubsub: ReturnType<typeof createMockPubsub>) {
  return { services: { pubsub } } as unknown as import("@libp2p/interface").Libp2p;
}

describe("roomTopicFromCid", () => {
  it("returns room:<CID string>", async () => {
    const cid = await makeCid("test-room");
    expect(roomTopicFromCid(cid)).toBe(`room:${cid.toString()}`);
  });
});

describe("createRoomMessaging", () => {
  let pubsub: ReturnType<typeof createMockPubsub>;
  let node: import("@libp2p/interface").Libp2p;

  beforeEach(() => {
    pubsub = createMockPubsub();
    node = createMockNode(pubsub);
  });

  it("subscribe calls pubsub.subscribe with correct topic", async () => {
    const keypair = await generateKeypair();
    const cid = await makeCid("room-a");
    const room = createRoomMessaging(node, cid, keypair);

    room.subscribe(() => {});
    expect(pubsub.subscribe).toHaveBeenCalledWith(room.topic);
  });

  it("publish calls pubsub.publish with correct topic and valid signed bytes", async () => {
    const keypair = await generateKeypair();
    const cid = await makeCid("room-b");
    const room = createRoomMessaging(node, cid, keypair);

    await room.publish("hello world");

    expect(pubsub.publish).toHaveBeenCalledTimes(1);
    const [topic, data] = pubsub.publish.mock.calls[0];
    expect(topic).toBe(room.topic);
    expect(data).toBeInstanceOf(Uint8Array);

    // Deserialize and verify the published message is valid
    const parsed = JSON.parse(new TextDecoder().decode(data)) as ChatMessage;
    expect(parsed.type).toBe("chat");
    expect(parsed.body).toBe("hello world");
  });

  it("delivers valid signed messages to the handler", async () => {
    const keypair = await generateKeypair();
    const cid = await makeCid("room-c");
    const room = createRoomMessaging(node, cid, keypair);

    const received: ChatMessage[] = [];
    room.subscribe((msg) => received.push(msg));

    // Create a valid signed message and simulate delivery
    const validMsg = await createChatMessage(keypair, "verified msg");
    const bytes = serializeChatMessage(validMsg);
    pubsub.emit(room.topic, bytes);

    // verifyChatMessage is async, give it a tick
    await new Promise((r) => setTimeout(r, 10));

    expect(received).toHaveLength(1);
    expect(received[0].body).toBe("verified msg");
  });

  it("drops messages with invalid signatures", async () => {
    const keypair = await generateKeypair();
    const cid = await makeCid("room-d");
    const room = createRoomMessaging(node, cid, keypair);

    const received: ChatMessage[] = [];
    room.subscribe((msg) => received.push(msg));

    // Create a message and tamper with the body
    const msg = await createChatMessage(keypair, "original");
    msg.body = "tampered";
    const bytes = serializeChatMessage(msg);
    pubsub.emit(room.topic, bytes);

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toHaveLength(0);
  });

  it("ignores messages on a different topic", async () => {
    const keypair = await generateKeypair();
    const cid = await makeCid("room-e");
    const room = createRoomMessaging(node, cid, keypair);

    const received: ChatMessage[] = [];
    room.subscribe((msg) => received.push(msg));

    const validMsg = await createChatMessage(keypair, "wrong topic");
    const bytes = serializeChatMessage(validMsg);
    pubsub.emit("room:other-topic", bytes);

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toHaveLength(0);
  });

  it("unsubscribe calls pubsub.unsubscribe and removes listener", async () => {
    const keypair = await generateKeypair();
    const cid = await makeCid("room-f");
    const room = createRoomMessaging(node, cid, keypair);

    room.subscribe(() => {});
    expect(pubsub.listenerCount).toBe(1);

    room.unsubscribe();
    expect(pubsub.unsubscribe).toHaveBeenCalledWith(room.topic);
    expect(pubsub.removeEventListener).toHaveBeenCalled();
    expect(pubsub.listenerCount).toBe(0);
  });
});
