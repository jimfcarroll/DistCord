import { createLibp2p } from "libp2p";
import { webRTC } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify, identifyPush } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { bootstrap } from "@libp2p/bootstrap";
import type { Libp2p } from "@libp2p/interface";
import type { IdentityKeypair } from "../identity/types.js";
import { keypairToLibp2pKey } from "./identity-bridge.js";

export async function createBrowserNode(
  keypair: IdentityKeypair,
  bootstrapAddrs?: string[],
): Promise<Libp2p> {
  return createLibp2p({
    privateKey: await keypairToLibp2pKey(keypair),
    addresses: {
      listen: ["/p2p-circuit", "/webrtc"],
    },
    transports: [webRTC(), webSockets(), circuitRelayTransport()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: bootstrapAddrs?.length ? [bootstrap({ list: bootstrapAddrs })] : [],
    connectionGater: {
      // Allow insecure WebSocket (ws://) and private IPs (127.0.0.1) for dev.
      // The browser default blocks both, which prevents connecting to a local relay.
      denyDialMultiaddr: () => false,
    },
    services: {
      identify: identify(),
      identifyPush: identifyPush(),
      ping: ping(),
    },
  });
}
