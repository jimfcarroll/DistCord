import type { Libp2p } from "@libp2p/interface";
import type { CID } from "multiformats/cid";

/**
 * Announce this peer as a provider for the given room on the DHT.
 * The DHT will automatically re-provide periodically.
 *
 * Uses a 30-second timeout because provide() has no default timeout —
 * with an empty routing table it hangs forever waiting for DHT responses.
 */
export async function announceRoom(node: Libp2p, roomCid: CID): Promise<void> {
  await node.contentRouting.provide(roomCid, {
    signal: AbortSignal.timeout(30_000),
  });
}
