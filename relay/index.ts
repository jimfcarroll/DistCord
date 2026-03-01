import "./polyfill.js";
import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { generateKeyPair, privateKeyToProtobuf, privateKeyFromProtobuf } from "@libp2p/crypto/keys";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";

const KEY_PATH = new URL("relay-key.bin", import.meta.url);
const PORT = Number(process.env.PORT ?? 9001);
const INFO_PORT = Number(process.env.INFO_PORT ?? 9002);

async function loadOrCreateKey() {
  try {
    const bytes = await readFile(KEY_PATH);
    return privateKeyFromProtobuf(bytes);
  } catch {
    const key = await generateKeyPair("Ed25519");
    await writeFile(KEY_PATH, privateKeyToProtobuf(key));
    return key;
  }
}

async function main() {
  const privateKey = await loadOrCreateKey();

  const node = await createLibp2p({
    privateKey,
    addresses: {
      listen: [`/ip4/0.0.0.0/tcp/${PORT}/ws`],
    },
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
      relay: circuitRelayServer(),
    },
  });

  // Track connected peers for discovery
  const connectedPeers = new Set<string>();
  node.addEventListener("peer:connect", (evt) => {
    const pid = evt.detail.toString();
    connectedPeers.add(pid);
    console.log(`Peer connected: ${pid}`);
  });
  node.addEventListener("peer:disconnect", (evt) => {
    const pid = evt.detail.toString();
    connectedPeers.delete(pid);
    console.log(`Peer disconnected: ${pid}`);
  });

  console.log("Relay node started");
  console.log("PeerId:", node.peerId.toString());
  console.log("Listening on:");
  for (const addr of node.getMultiaddrs()) {
    console.log(" ", addr.toString());
  }

  // HTTP info endpoint — browsers fetch this to discover the relay and peers
  const info = createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        addrs: node.getMultiaddrs().map((a) => a.toString()),
        peers: [...connectedPeers],
      }),
    );
  });
  info.listen(INFO_PORT, () => {
    console.log(`Info endpoint: http://0.0.0.0:${INFO_PORT}/`);
  });

  const shutdown = async () => {
    console.log("\nShutting down...");
    info.close();
    await node.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
