import { describe, it, expect } from "vitest";
import { generateKeypair, fingerprint } from "../identity/index.js";
import { createChatMessage } from "./create-chat-message.js";

describe("createChatMessage", () => {
  it("produces a ChatMessage with all required fields", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "hello");

    expect(msg.type).toBe("chat");
    expect(msg.senderPublicKey).toBeTruthy();
    expect(msg.senderFingerprint).toBeTruthy();
    expect(msg.timestamp).toBeGreaterThan(0);
    expect(msg.body).toBe("hello");
    expect(msg.signature).toBeTruthy();
  });

  it("senderFingerprint matches identity module fingerprint", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "test");
    const expected = await fingerprint(keypair.publicKey);

    expect(msg.senderFingerprint).toBe(expected);
  });

  it("signature is a 64-byte Ed25519 signature (base64)", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "test");

    // Ed25519 signatures are 64 bytes. Base64 of 64 bytes = 88 chars.
    const sigBytes = Uint8Array.from(atob(msg.signature), (c) => c.charCodeAt(0));
    expect(sigBytes.length).toBe(64);
  });

  it("timestamp is a recent Date.now() value", async () => {
    const before = Date.now();
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "test");
    const after = Date.now();

    expect(msg.timestamp).toBeGreaterThanOrEqual(before);
    expect(msg.timestamp).toBeLessThanOrEqual(after);
  });

  it("different bodies produce different signatures", async () => {
    const keypair = await generateKeypair();
    const msg1 = await createChatMessage(keypair, "hello");
    const msg2 = await createChatMessage(keypair, "world");

    expect(msg1.signature).not.toBe(msg2.signature);
  });
});
