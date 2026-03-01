import { describe, it, expect } from "vitest";
import { generateKeypair } from "../identity/index.js";
import { createChatMessage } from "./create-chat-message.js";
import { serializeChatMessage, deserializeChatMessage } from "./serialize.js";

describe("serialize / deserialize", () => {
  it("round-trip produces identical ChatMessage", async () => {
    const keypair = await generateKeypair();
    const original = await createChatMessage(keypair, "round trip test");
    const bytes = serializeChatMessage(original);
    const restored = deserializeChatMessage(bytes);

    expect(restored).toEqual(original);
  });

  it("deserializing garbage bytes throws", () => {
    const garbage = new Uint8Array([0xff, 0xfe, 0xfd]);
    expect(() => deserializeChatMessage(garbage)).toThrow();
  });

  it("deserializing JSON missing required fields throws", () => {
    const incomplete = new TextEncoder().encode(JSON.stringify({ type: "chat", body: "hi" }));
    expect(() => deserializeChatMessage(incomplete)).toThrow("missing field");
  });
});
