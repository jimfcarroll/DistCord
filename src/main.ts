import { generateKeypair, fingerprint } from "./identity/index.js";
import type { IdentityKeypair } from "./identity/index.js";
import { createBrowserNode } from "./network/index.js";
import { computeRoomId, announceRoom, discoverRoom } from "./room/index.js";
import { createRoomMessaging } from "./messaging/index.js";
import type { RoomMessaging } from "./messaging/index.js";
import { CID } from "multiformats/cid";
import { multiaddr } from "@multiformats/multiaddr";
import type { Libp2p, PeerId, IdentifyResult } from "@libp2p/interface";

const RELAY_HOST = import.meta.env.VITE_RELAY_HOST ?? "localhost";
const RELAY_WS_PORT = import.meta.env.VITE_RELAY_WS_PORT ?? "9001";
const RELAY_WSS = import.meta.env.VITE_RELAY_WSS === "true";
const PROXY_PORT = import.meta.env.VITE_PROXY_PORT ?? "8443";
// Relative path — works through both Vite dev proxy and the TLS reverse proxy
const RELAY_INFO_URL = "/relay-info";

// DOM elements
const peerIdEl = document.getElementById("peer-id")!;
const fingerprintEl = document.getElementById("fingerprint")!;
const relayStatusEl = document.getElementById("relay-status")!;
const peersEl = document.getElementById("peers")!;
const logEl = document.getElementById("log")!;
const sendForm = document.getElementById("send-form") as HTMLFormElement;
const messageInput = document.getElementById("message-input") as HTMLInputElement;
const sendBtn = document.getElementById("send-btn") as HTMLButtonElement;
const roomNameInput = document.getElementById("room-name") as HTMLInputElement;
const createRoomBtn = document.getElementById("create-room-btn") as HTMLButtonElement;
const roomIdInput = document.getElementById("room-id-input") as HTMLInputElement;
const joinRoomBtn = document.getElementById("join-room-btn") as HTMLButtonElement;
const roomControlsEl = document.getElementById("room-controls")!;
const roomInfoEl = document.getElementById("room-info")!;
const roomIdEl = document.getElementById("room-id")!;

const connectedPeers = new Set<string>();
let relayPeerId: string | null = null;
let room: RoomMessaging | null = null;

function log(msg: string, cls: "log-system" | "log-sent" | "log-received" = "log-system") {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function short(s: string): string {
  return s.slice(-8);
}

function updatePeersUI() {
  if (connectedPeers.size === 0) {
    peersEl.innerHTML = '<span class="label">No peers yet</span>';
    return;
  }

  peersEl.innerHTML = "";
  for (const pid of connectedPeers) {
    const div = document.createElement("div");
    div.className = "peer";
    const isRelay = pid === relayPeerId;
    div.textContent = isRelay ? `${short(pid)} (relay)` : short(pid);
    peersEl.appendChild(div);
  }
}

function showRoomId(cid: CID) {
  roomIdEl.textContent = cid.toString();
  roomInfoEl.style.display = "block";
  roomControlsEl.style.display = "none";
}

function enterRoom(node: Libp2p, keypair: IdentityKeypair, cid: CID, myFingerprint: string) {
  room = createRoomMessaging(node, cid, keypair);
  room.subscribe((msg) => {
    // Skip own messages (displayed optimistically on send)
    if (msg.senderFingerprint === myFingerprint) return;
    log(`[${msg.senderFingerprint.slice(0, 8)}]: ${msg.body}`, "log-received");
  });
  sendBtn.disabled = false;
}

async function main() {
  log("Generating identity...");
  const keypair = await generateKeypair();
  const fp = await fingerprint(keypair.publicKey);
  fingerprintEl.textContent = fp.slice(0, 16) + "...";

  log("Fetching relay address...");
  const relayInfo = await fetch(RELAY_INFO_URL).then((r) => r.json());
  // Rewrite relay addrs to match configured host/port so it works across machines.
  // WSS mode (via dev proxy): /dns4/<host>/tcp/<proxy-port>/wss/...
  // Plain mode (localhost):   /ip4/<host>/tcp/<relay-port>/ws/...
  const relayAddrs: string[] = (relayInfo.addrs as string[]).map((a) => {
    if (RELAY_WSS) {
      return a
        .replace(/\/ip4\/[^/]+\//, `/dns4/${RELAY_HOST}/`)
        .replace(/\/tcp\/\d+\//, `/tcp/${PROXY_PORT}/`)
        .replace(/\/ws\//, "/wss/");
    }
    return a
      .replace(/\/ip4\/[^/]+\//, `/ip4/${RELAY_HOST}/`)
      .replace(/\/tcp\/\d+\//, `/tcp/${RELAY_WS_PORT}/`);
  });
  log(`Relay: ${relayAddrs[0]}`);

  // Extract relay PeerId from multiaddr (last /p2p/<id> segment)
  const p2pMatch = relayAddrs[0].match(/\/p2p\/([^/]+)$/);
  relayPeerId = p2pMatch ? p2pMatch[1] : null;

  log("Starting libp2p node...");
  const node = await createBrowserNode(keypair, relayAddrs);
  peerIdEl.textContent = short(node.peerId.toString());
  peerIdEl.title = node.peerId.toString();
  log(`PeerId: ${node.peerId.toString()}`);

  // Disable room controls until relay is connected and DHT routing table populates
  createRoomBtn.disabled = true;
  joinRoomBtn.disabled = true;

  // Peer events
  node.addEventListener("peer:connect", (evt: CustomEvent<PeerId>) => {
    const pid = evt.detail.toString();
    connectedPeers.add(pid);
    if (pid === relayPeerId) {
      log("Connected to relay");
      relayStatusEl.textContent = "connected";
    } else {
      log(`Peer connected: ${short(pid)}`);
    }
    updatePeersUI();
  });

  // Wait for identify to confirm relay supports kadDHT, then poll until the
  // routing table is populated.  The topology listener should add the relay
  // automatically, but due to race conditions in libp2p's registrar (topology
  // registered after identify fires, or ping verification delay), it can fail.
  // Fallback: seed the routing table directly after 3 seconds.
  node.addEventListener("peer:identify", (evt: CustomEvent<IdentifyResult>) => {
    const { peerId, protocols } = evt.detail;
    const detail = evt.detail as unknown as {
      connection?: { limits?: unknown; remoteAddr?: { toString(): string } };
    };
    const limited = detail.connection?.limits != null;
    const remoteAddr = detail.connection?.remoteAddr?.toString() ?? "";
    const connType = remoteAddr.includes("/webrtc")
      ? "webrtc"
      : remoteAddr.includes("/p2p-circuit")
      ? "relay"
      : "other";
    log(`Identify: ${short(peerId.toString())} ${connType} limited=${limited}`);

    if (peerId.toString() !== relayPeerId) return;
    if (!protocols.includes("/ipfs/kad/1.0.0")) return;

    const dht = node.services.dht as unknown as {
      routingTable: { size: number; add(peerId: unknown, opts?: unknown): Promise<void> };
      getMode(): string;
    };

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;

      if (dht.routingTable.size > 0) {
        clearInterval(poll);
        log(`DHT mode=${dht.getMode()} routing_table=${dht.routingTable.size}`);
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
        log("DHT ready");
        return;
      }

      // After 3 s the topology system hasn't populated the table — seed it
      // manually by calling routingTable.add() which pings then inserts.
      if (attempts >= 6) {
        clearInterval(poll);
        log("Topology listener did not populate routing table — seeding manually");
        try {
          await dht.routingTable.add(peerId);
          log(`DHT mode=${dht.getMode()} routing_table=${dht.routingTable.size}`);
          createRoomBtn.disabled = false;
          joinRoomBtn.disabled = false;
          log("DHT ready (manual seed)");
        } catch (err) {
          log(`Failed to seed routing table: ${err}`);
        }
      }
    }, 500);
  });

  node.addEventListener("peer:disconnect", (evt: CustomEvent<PeerId>) => {
    const pid = evt.detail.toString();
    connectedPeers.delete(pid);
    if (pid === relayPeerId) {
      log("Relay disconnected");
      relayStatusEl.textContent = "disconnected";
    } else {
      log(`Peer disconnected: ${short(pid)}`);
    }
    updatePeersUI();
  });

  // Start the node AFTER handlers are registered.  createBrowserNode uses
  // start:false so we don't miss peer:connect / peer:identify events fired
  // when the circuit relay transport connects during startup.
  await node.start();
  log("libp2p started");

  // Dial relay explicitly to trigger identify and DHT topology registration.
  for (const addr of relayAddrs) {
    node.dial(multiaddr(addr)).catch((err: unknown) => {
      log(`Relay dial failed: ${err}`);
    });
  }

  // Create Room
  createRoomBtn.addEventListener("click", async () => {
    const name = roomNameInput.value.trim();
    if (!name) return;

    const nonce = crypto.randomUUID();
    const cid = await computeRoomId(keypair.publicKey, name, nonce);
    showRoomId(cid);
    log(`Created room "${name}"`);
    log(`Room ID: ${cid.toString()}`);

    enterRoom(node, keypair, cid, fp);

    try {
      const dht = node.services.dht as unknown as { routingTable: { size: number } };
      log(`DHT provide — routing_table=${dht.routingTable.size}`);
      await announceRoom(node, cid);
      log("Announced on DHT — waiting for peers to join");
    } catch (err) {
      log(`DHT announce failed: ${err}`);
    }
  });

  // Join Room
  joinRoomBtn.addEventListener("click", async () => {
    const cidStr = roomIdInput.value.trim();
    if (!cidStr) return;

    let cid: CID;
    try {
      cid = CID.parse(cidStr);
    } catch {
      log("Invalid room ID");
      return;
    }

    showRoomId(cid);
    log(`Joining room ${cid.toString().slice(-8)}...`);

    enterRoom(node, keypair, cid, fp);

    // Also announce ourselves so future peers can find us
    announceRoom(node, cid).catch(() => {});

    // DHT discovery — find peers who announced this room
    try {
      for await (const provider of discoverRoom(node, cid)) {
        const pid = provider.id.toString();
        if (pid === node.peerId.toString()) continue;

        // Prefer /webrtc multiaddrs for direct P2P connection.
        // dial(peerId) tries /p2p-circuit first → limited relay connection.
        // dial(webrtcAddr) triggers WebRTC signaling → direct data channel.
        const webrtcAddrs = (provider.multiaddrs ?? []).filter((ma) =>
          ma.toString().includes("/webrtc"),
        );
        log(`Found peer via DHT: ${short(pid)} (${webrtcAddrs.length} webrtc addrs)`);

        if (webrtcAddrs.length > 0) {
          node.dial(webrtcAddrs[0]).catch((err: unknown) => {
            log(`WebRTC dial failed, trying relay: ${err}`);
            node.dial(provider.id).catch((err2: unknown) => {
              log(`Relay dial ${short(pid)} also failed: ${err2}`);
            });
          });
        } else {
          node.dial(provider.id).catch((err: unknown) => {
            log(`Dial ${short(pid)} failed: ${err}`);
          });
        }
      }
    } catch (err) {
      log(`DHT discovery failed: ${err}`);
    }
  });

  // Send message
  sendForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !room) return;

    try {
      await room.publish(text);
      log(`[${fp.slice(0, 8)}]: ${text}`, "log-sent");
      messageInput.value = "";
    } catch (err) {
      log(`Send failed: ${err}`);
    }
  });
}

main().catch((err) => log(`Fatal: ${err}`));
