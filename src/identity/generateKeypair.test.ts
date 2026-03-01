import { describe, it, expect } from "vitest";
import { generateKeypair } from "./generateKeypair.js";

describe("generateKeypair", () => {
  it("generates keypair with algorithm Ed25519", async () => {
    const keypair = await generateKeypair();
    expect(keypair.publicKey.algorithm.name).toBe("Ed25519");
    expect(keypair.privateKey.algorithm.name).toBe("Ed25519");
  });

  it("generates extractable keys", async () => {
    const keypair = await generateKeypair();
    expect(keypair.publicKey.extractable).toBe(true);
    expect(keypair.privateKey.extractable).toBe(true);
  });

  it("produces unique keypairs on each call", async () => {
    const keypair1 = await generateKeypair();
    const keypair2 = await generateKeypair();

    const raw1 = await crypto.subtle.exportKey("raw", keypair1.publicKey);
    const raw2 = await crypto.subtle.exportKey("raw", keypair2.publicKey);

    const bytes1 = new Uint8Array(raw1);
    const bytes2 = new Uint8Array(raw2);

    expect(bytes1).not.toEqual(bytes2);
  });

  it("assigns correct key usages", async () => {
    const keypair = await generateKeypair();
    expect(keypair.publicKey.usages).toEqual(["verify"]);
    expect(keypair.privateKey.usages).toEqual(["sign"]);
  });
});
