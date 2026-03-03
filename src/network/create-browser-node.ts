import { createLibp2p } from "libp2p";
import { webRTC } from "@libp2p/webrtc";
import { webSockets } from "@libp2p/websockets";
import { circuitRelayTransport } from "@libp2p/circuit-relay-v2";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify, identifyPush } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { kadDHT, passthroughMapper } from "@libp2p/kad-dht";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import type { Libp2p } from "@libp2p/interface";
import type { IdentityKeypair } from "../identity/types.js";
import { keypairToLibp2pKey } from "./identity-bridge.js";

// gossipsub 14.x bundles @libp2p/interface@2.x; libp2p 3.x uses @3.x.
// Runtime compatible, but the types diverge. Cast through unknown.
// runOnLimitedConnection intentionally omitted (defaults to false).
// This forces GossipSub to ignore relay (limited) connections and only
// bind to direct WebRTC connections.  The relay connects first; if
// GossipSub binds to it, the registrar's topology filter blocks the
// later WebRTC notification, so messages would flow through the relay
// instead of the direct data channel.
const pubsub = gossipsub({
  globalSignaturePolicy: "StrictNoSign",
  allowPublishToZeroTopicPeers: true,
}) as unknown as ReturnType<typeof identify>;

// libp2p's dial() has no default timeout — hangs forever on failure.
// Wrap with a default so callers don't need to pass AbortSignal every time.
export function wrapDialWithTimeout(
  rawDial: (...args: any[]) => Promise<any>,
  timeoutMs = 15_000,
) {
  return (peer: any, options?: any) => {
    if (!options?.signal) {
      return rawDial(peer, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    }
    return rawDial(peer, options);
  };
}

export async function createBrowserNode(
  keypair: IdentityKeypair,
  bootstrapAddrs?: string[],
): Promise<Libp2p> {
  // Use specific relay addresses for circuit relay reservations.
  // Generic "/p2p-circuit" triggers relay discovery (DHT random walk),
  // which fails in small networks.  Specific addresses like
  // "<relay_multiaddr>/p2p-circuit" make reservations directly.
  const listenAddrs = [
    ...(bootstrapAddrs?.map((a) => `${a}/p2p-circuit`) ?? ["/p2p-circuit"]),
    "/webrtc",
  ];

  const node = await createLibp2p({
    privateKey: await keypairToLibp2pKey(keypair),
    addresses: {
      listen: listenAddrs,
    },
    transports: [
      webRTC({
        rtcConfiguration: {
          iceServers: [
            {
              urls: [
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
              ],
            },
          ],
        },
      }),
      webSockets(),
      circuitRelayTransport({
        // Default is 2s (DEFAULT_RESERVATION_COMPLETION_TIMEOUT).
        // Too short for cellular networks with 200ms+ RTT.
        reservationCompletionTimeout: 15_000,
      }),
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      // Allow insecure WebSocket (ws://) and private IPs (127.0.0.1) for dev.
      // The browser default blocks both, which prevents connecting to a local relay.
      denyDialMultiaddr: () => false,
    },
    services: {
      identify: identify(),
      identifyPush: identifyPush(),
      ping: ping(),
      dht: kadDHT({
        peerInfoMapper: passthroughMapper,
      }),
      pubsub,
    },
    start: false,
  });

  const rawDial = node.dial.bind(node);
  (node as any).dial = wrapDialWithTimeout(rawDial);

  return node;
}
