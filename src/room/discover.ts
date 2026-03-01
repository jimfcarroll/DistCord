import type { ContentRouting } from "@libp2p/interface";
import type { Libp2p } from "@libp2p/interface";
import type { CID } from "multiformats/cid";

type Provider = ContentRouting extends {
  findProviders(cid: CID): AsyncIterable<infer P>;
}
  ? P
  : never;

/**
 * Discover peers providing the given room on the DHT.
 * Returns an async iterable of providers (PeerId + multiaddrs).
 */
export async function* discoverRoom(node: Libp2p, roomCid: CID): AsyncGenerator<Provider> {
  yield* node.contentRouting.findProviders(roomCid);
}
