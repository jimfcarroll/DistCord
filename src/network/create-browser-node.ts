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
import { FaultTolerance } from "@libp2p/interface";
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

export type GossipSubErrorCallback = (prefix: string, args: unknown[]) => void;

/**
 * Intercept errors that GossipSub swallows into its debug logger.
 *
 * GossipSub calls this.log.error(...) in 13 places — all inside .catch()
 * or catch blocks. These errors are silently swallowed: no event, no
 * callback, no way for application code to know something failed.
 *
 * This wrapper intercepts pubsub.log.error, extracts the prefix string
 * (first arg), and routes to our callback before passing through to the
 * original logger. The callback can dispatch on the prefix to handle
 * specific error types.
 *
 * IMPORTANT — version coupling:
 * The prefix strings below are from @chainsafe/libp2p-gossipsub v14.x
 * (gossipsub/src/index.ts). On upgrade, verify each prefix still matches
 * the source. If a prefix changes or disappears, update the dispatch table
 * in main.ts accordingly.
 *
 * Known prefixes and their significance:
 *
 * "outbound pipe error" (line 856)
 *   OutboundStream's pipe(pushable, rawStream) rejected. The underlying
 *   stream died — relay TTL expired, peer disconnected, WebRTC data
 *   channel closed. GossipSub keeps the peer in its mesh with a dead
 *   outbound stream. Messages to this peer silently vanish.
 *
 * "outbound inflight queue error" (line 635)
 *   The async queue that processes outbound peer connections rejected.
 *   A peer that should have gotten a GossipSub stream didn't get one.
 *
 * "createOutboundStream error" (line 876)
 *   connection.newStream() failed — couldn't open a meshsub protocol
 *   stream to the peer. Peer is in the mesh but has no outbound channel.
 *
 * "Cannot send rpc to <peerId>" (lines 2344, 2484)
 *   Failed to write an RPC message (GRAFT, PRUNE, IHAVE, IWANT, or
 *   published message) to a peer's outbound stream. The stream exists
 *   but the write failed. Control plane and data plane both affected.
 *
 * "Error tagging peer %s with topic %s" (line 3240)
 * "Error untagging peer %s with topic %s" (line 3249)
 *   Connection manager peer tagging failed. Affects peer scoring and
 *   prioritization but not message delivery.
 *
 * (Error object, no string prefix) (lines 898, 958, 959, 1101)
 *   Stream close failures and inbound read errors. First arg is an
 *   Error object, not a string. These hit the callback with prefix "".
 */
export function wrapGossipSubErrors(
  node: Libp2p,
  onError: GossipSubErrorCallback,
): void {
  const pubsub = node.services.pubsub as unknown as {
    log: { error: (...args: unknown[]) => void };
  };
  const originalLogError = pubsub.log.error.bind(pubsub.log);
  pubsub.log.error = (...args: unknown[]) => {
    try {
      const prefix = typeof args[0] === "string" ? args[0] : "";
      onError(prefix, args);
    } catch {
      // Don't let callback errors break GossipSub's own error handling.
    }
    originalLogError(...args);
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
    transportManager: {
      // Let the node start even if circuit relay reservation times out.
      // The explicit node.dial() after startup retries the connection.
      faultTolerance: FaultTolerance.NO_FATAL,
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
