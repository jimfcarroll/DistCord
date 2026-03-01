import { describe, it, expect } from "vitest";
import { generateKeypair } from "./generateKeypair.js";
import { fingerprint } from "./fingerprint.js";

describe("fingerprint", () => {
  it("produces a 64-character lowercase hex string", async () => {
    const keypair = await generateKeypair();
    const fp = await fingerprint(keypair.publicKey);

    expect(fp).toHaveLength(64);
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same key", async () => {
    const keypair = await generateKeypair();

    const fp1 = await fingerprint(keypair.publicKey);
    const fp2 = await fingerprint(keypair.publicKey);

    expect(fp1).toBe(fp2);
  });

  it("produces different fingerprints for different keys", async () => {
    const keypair1 = await generateKeypair();
    const keypair2 = await generateKeypair();

    const fp1 = await fingerprint(keypair1.publicKey);
    const fp2 = await fingerprint(keypair2.publicKey);

    expect(fp1).not.toBe(fp2);
  });

  it("matches manual computation: hex(SHA-256(raw public key))", async () => {
    const keypair = await generateKeypair();

    const raw = await crypto.subtle.exportKey("raw", keypair.publicKey);
    const hash = await crypto.subtle.digest("SHA-256", raw);
    const expected = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    const fp = await fingerprint(keypair.publicKey);

    expect(fp).toBe(expected);
  });
});
