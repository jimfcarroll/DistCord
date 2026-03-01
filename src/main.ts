import { generateKeypair, fingerprint } from "./identity/index.js";
import type { IdentityKeypair } from "./identity/index.js";
import { createBrowserNode } from "./network/index.js";
import { computeRoomId, announceRoom, discoverRoom } from "./room/index.js";
import { createRoomMessaging } from "./messaging/index.js";
import type { RoomMessaging } from "./messaging/index.js";
import { CID } from "multiformats/cid";
import type { Libp2p, PeerId, IdentifyResult } from "@libp2p/interface";

const RELAY_INFO_URL = "http://localhost:9002/";

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
  const relayAddrs: string[] = relayInfo.addrs;
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

  // Wait for identify to confirm relay supports kadDHT before enabling room controls.
  // The old 2-second setTimeout was a blind guess that broke when GossipSub added
  // extra protocols to negotiate, making the identify exchange slower.
  node.addEventListener("peer:identify", (evt: CustomEvent<IdentifyResult>) => {
    const { peerId, protocols } = evt.detail;
    if (peerId.toString() !== relayPeerId) return;
    if (!protocols.includes("/ipfs/kad/1.0.0")) return;

    // kadDHT topology listener processes identify results asynchronously —
    // give it a moment to update the routing table
    setTimeout(() => {
      createRoomBtn.disabled = false;
      joinRoomBtn.disabled = false;
      log("DHT ready");
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

    try {
      let found = 0;
      for await (const provider of discoverRoom(node, cid)) {
        const pid = provider.id.toString();
        if (pid === node.peerId.toString()) continue;
        found++;
        log(`Found peer: ${short(pid)}`);
        node.dial(provider.id).catch(() => {});
      }
      if (found === 0) {
        log("No peers found — room may be empty or DHT not yet populated");
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
