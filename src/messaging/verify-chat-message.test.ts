import { describe, it, expect } from "vitest";
import { generateKeypair } from "../identity/index.js";
import { createChatMessage } from "./create-chat-message.js";
import { verifyChatMessage } from "./verify-chat-message.js";

describe("verifyChatMessage", () => {
  it("valid message passes verification", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "hello");
    const result = await verifyChatMessage(msg);

    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("tampered body fails verification", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "hello");
    msg.body = "tampered";
    const result = await verifyChatMessage(msg);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("signature verification failed");
  });

  it("tampered signature fails verification", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "hello");
    // Flip a character in the base64 signature
    const chars = msg.signature.split("");
    chars[0] = chars[0] === "A" ? "B" : "A";
    msg.signature = chars.join("");
    const result = await verifyChatMessage(msg);

    expect(result.valid).toBe(false);
  });

  it("tampered senderPublicKey fails verification", async () => {
    const keypair = await generateKeypair();
    const msg = await createChatMessage(keypair, "hello");

    // Replace with a different key
    const otherKeypair = await generateKeypair();
    const otherRaw = new Uint8Array(await crypto.subtle.exportKey("raw", otherKeypair.publicKey));
    let binary = "";
    for (const b of otherRaw) binary += String.fromCharCode(b);
    msg.senderPublicKey = btoa(binary);

    const result = await verifyChatMessage(msg);
    expect(result.valid).toBe(false);
  });

  it("wrong key (signed by A, public key replaced with B) fails", async () => {
    const keypairA = await generateKeypair();
    const keypairB = await generateKeypair();
    const msg = await createChatMessage(keypairA, "hello");

    // Replace public key with B's key but keep A's signature
    const rawB = new Uint8Array(await crypto.subtle.exportKey("raw", keypairB.publicKey));
    let binary = "";
    for (const b of rawB) binary += String.fromCharCode(b);
    msg.senderPublicKey = btoa(binary);

    const result = await verifyChatMessage(msg);
    expect(result.valid).toBe(false);
  });
});
