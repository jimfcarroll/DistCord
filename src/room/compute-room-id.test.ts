import { describe, it, expect } from "vitest";
import { computeRoomId } from "./compute-room-id.js";
import { generateKeypair } from "../identity/index.js";

describe("computeRoomId", () => {
  it("returns a CID", async () => {
    const keypair = await generateKeypair();
    const cid = await computeRoomId(keypair.publicKey, "general", "abc123");
    expect(cid).toBeDefined();
    expect(cid.toString()).toMatch(/^b/); // CIDv1 base32 starts with 'b'
  });

  it("is deterministic — same inputs produce the same CID", async () => {
    const keypair = await generateKeypair();
    const cid1 = await computeRoomId(keypair.publicKey, "general", "nonce1");
    const cid2 = await computeRoomId(keypair.publicKey, "general", "nonce1");
    expect(cid1.equals(cid2)).toBe(true);
  });

  it("different room names produce different CIDs", async () => {
    const keypair = await generateKeypair();
    const cid1 = await computeRoomId(keypair.publicKey, "general", "nonce1");
    const cid2 = await computeRoomId(keypair.publicKey, "random", "nonce1");
    expect(cid1.equals(cid2)).toBe(false);
  });

  it("different nonces produce different CIDs", async () => {
    const keypair = await generateKeypair();
    const cid1 = await computeRoomId(keypair.publicKey, "general", "nonce1");
    const cid2 = await computeRoomId(keypair.publicKey, "general", "nonce2");
    expect(cid1.equals(cid2)).toBe(false);
  });

  it("different creators produce different CIDs", async () => {
    const kp1 = await generateKeypair();
    const kp2 = await generateKeypair();
    const cid1 = await computeRoomId(kp1.publicKey, "general", "nonce1");
    const cid2 = await computeRoomId(kp2.publicKey, "general", "nonce1");
    expect(cid1.equals(cid2)).toBe(false);
  });

  it("CID uses SHA-256 hash (multihash code 0x12)", async () => {
    const keypair = await generateKeypair();
    const cid = await computeRoomId(keypair.publicKey, "general", "nonce1");
    expect(cid.multihash.code).toBe(0x12);
  });

  it("CID uses raw codec (0x55)", async () => {
    const keypair = await generateKeypair();
    const cid = await computeRoomId(keypair.publicKey, "general", "nonce1");
    expect(cid.code).toBe(0x55);
  });

  it("CID is version 1", async () => {
    const keypair = await generateKeypair();
    const cid = await computeRoomId(keypair.publicKey, "general", "nonce1");
    expect(cid.version).toBe(1);
  });
});
