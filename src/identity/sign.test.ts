import { describe, it, expect } from "vitest";
import { generateKeypair } from "./generateKeypair.js";
import { sign } from "./sign.js";

describe("sign", () => {
  it("produces a 64-byte Uint8Array signature", async () => {
    const keypair = await generateKeypair();
    const data = new TextEncoder().encode("hello");

    const signature = await sign(keypair.privateKey, data);

    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature.length).toBe(64);
  });

  it("is deterministic for the same key and data", async () => {
    const keypair = await generateKeypair();
    const data = new TextEncoder().encode("hello");

    const sig1 = await sign(keypair.privateKey, data);
    const sig2 = await sign(keypair.privateKey, data);

    expect(sig1).toEqual(sig2);
  });

  it("produces different signatures for different data", async () => {
    const keypair = await generateKeypair();
    const data1 = new TextEncoder().encode("hello");
    const data2 = new TextEncoder().encode("world");

    const sig1 = await sign(keypair.privateKey, data1);
    const sig2 = await sign(keypair.privateKey, data2);

    expect(sig1).not.toEqual(sig2);
  });
});
