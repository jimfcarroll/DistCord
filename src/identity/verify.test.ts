import { describe, it, expect } from "vitest";
import { generateKeypair } from "./generateKeypair.js";
import { sign } from "./sign.js";
import { verify } from "./verify.js";

describe("verify", () => {
  it("returns true for a valid signature", async () => {
    const keypair = await generateKeypair();
    const data = new TextEncoder().encode("hello");
    const signature = await sign(keypair.privateKey, data);

    const result = await verify(keypair.publicKey, signature, data);

    expect(result).toBe(true);
  });

  it("returns false when data has been tampered with", async () => {
    const keypair = await generateKeypair();
    const data = new TextEncoder().encode("hello");
    const signature = await sign(keypair.privateKey, data);

    const tampered = new TextEncoder().encode("hell0");
    const result = await verify(keypair.publicKey, signature, tampered);

    expect(result).toBe(false);
  });

  it("returns false when signature has been tampered with", async () => {
    const keypair = await generateKeypair();
    const data = new TextEncoder().encode("hello");
    const signature = await sign(keypair.privateKey, data);

    const tampered = new Uint8Array(signature);
    tampered[0] ^= 0xff;
    const result = await verify(keypair.publicKey, tampered, data);

    expect(result).toBe(false);
  });

  it("returns false when verified with the wrong public key", async () => {
    const keypairA = await generateKeypair();
    const keypairB = await generateKeypair();
    const data = new TextEncoder().encode("hello");
    const signature = await sign(keypairA.privateKey, data);

    const result = await verify(keypairB.publicKey, signature, data);

    expect(result).toBe(false);
  });
});
