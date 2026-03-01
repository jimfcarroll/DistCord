import "./polyfill.js";
import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { identify } from "@libp2p/identify";
import { circuitRelayServer } from "@libp2p/circuit-relay-v2";
import { generateKeyPair, privateKeyToProtobuf, privateKeyFromProtobuf } from "@libp2p/crypto/keys";
import { readFile, writeFile } from "node:fs/promises";

const KEY_PATH = new URL("relay-key.bin", import.meta.url);
const PORT = Number(process.env.PORT ?? 9001);

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

  console.log("Relay node started");
  console.log("PeerId:", node.peerId.toString());
  console.log("Listening on:");
  for (const addr of node.getMultiaddrs()) {
    console.log(" ", addr.toString());
  }

  const shutdown = async () => {
    console.log("\nShutting down...");
    await node.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
