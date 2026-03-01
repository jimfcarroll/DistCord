import { describe, it, expect } from "vitest";
import { discoverRoom } from "./discover.js";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

async function fakeCid(): Promise<CID> {
  const hash = await sha256.digest(new TextEncoder().encode("test-room"));
  return CID.createV1(0x55, hash);
}

describe("discoverRoom", () => {
  it("yields providers from contentRouting.findProviders", async () => {
    const fakeProviders = [
      { id: "peer-1", multiaddrs: [], routing: "KadDHT" },
      { id: "peer-2", multiaddrs: [], routing: "KadDHT" },
    ];

    async function* fakeFindProviders() {
      for (const p of fakeProviders) yield p;
    }

    const node = {
      contentRouting: { findProviders: () => fakeFindProviders() },
    } as never;

    const cid = await fakeCid();
    const results = [];
    for await (const provider of discoverRoom(node, cid)) {
      results.push(provider);
    }

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("peer-1");
    expect(results[1].id).toBe("peer-2");
  });

  it("yields nothing when no providers exist", async () => {
    async function* emptyProviders() {
      // no yields
    }

    const node = {
      contentRouting: { findProviders: () => emptyProviders() },
    } as never;

    const cid = await fakeCid();
    const results = [];
    for await (const provider of discoverRoom(node, cid)) {
      results.push(provider);
    }

    expect(results).toHaveLength(0);
  });
});
