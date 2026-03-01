import { describe, it, expect, vi } from "vitest";
import { announceRoom } from "./announce.js";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

async function fakeCid(): Promise<CID> {
  const hash = await sha256.digest(new TextEncoder().encode("test-room"));
  return CID.createV1(0x55, hash);
}

function mockNode(provideFn = vi.fn().mockResolvedValue(undefined)) {
  return { contentRouting: { provide: provideFn } } as never;
}

describe("announceRoom", () => {
  it("calls contentRouting.provide with the room CID", async () => {
    const provide = vi.fn().mockResolvedValue(undefined);
    const node = mockNode(provide);
    const cid = await fakeCid();

    await announceRoom(node, cid);

    expect(provide).toHaveBeenCalledOnce();
    expect(provide).toHaveBeenCalledWith(cid);
  });

  it("propagates errors from provide", async () => {
    const provide = vi.fn().mockRejectedValue(new Error("DHT unreachable"));
    const node = mockNode(provide);
    const cid = await fakeCid();

    await expect(announceRoom(node, cid)).rejects.toThrow("DHT unreachable");
  });
});
