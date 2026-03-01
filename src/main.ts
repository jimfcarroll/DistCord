import { generateKeypair, fingerprint } from "./identity/index.js";
import { createBrowserNode } from "./network/index.js";
import { computeRoomId, announceRoom, discoverRoom } from "./room/index.js";
import { CID } from "multiformats/cid";
import type { Libp2p, PeerId } from "@libp2p/interface";

const RELAY_INFO_URL = "http://localhost:9002/";
const PROTOCOL = "/decentralized-discord/chat/1.0.0";

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
let selectedPeer: string | null = null;
let relayPeerId: string | null = null;

function log(msg: string, cls: "log-system" | "log-sent" | "log-received" = "log-system") {
  const div = document.createElement("div");
  div.className = cls;
  div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function short(peerId: string): string {
  return peerId.slice(-8);
}

function updatePeersUI(node: Libp2p) {
  if (connectedPeers.size === 0) {
    peersEl.innerHTML = '<span class="label">No peers yet</span>';
    sendBtn.disabled = true;
    selectedPeer = null;
    return;
  }

  peersEl.innerHTML = "";
  for (const pid of connectedPeers) {
    const div = document.createElement("div");
    div.className = "peer";

    const isRelay = pid === relayPeerId;
    const label = isRelay ? `${short(pid)} (relay)` : short(pid);
    div.textContent = label;

    if (!isRelay) {
      const btn = document.createElement("button");
      btn.textContent = selectedPeer === pid ? "selected" : "select";
      btn.addEventListener("click", () => {
        selectedPeer = pid;
        sendBtn.disabled = false;
        updatePeersUI(node);
      });
      div.appendChild(btn);
    }

    peersEl.appendChild(div);
  }
}

function showRoomId(cid: CID) {
  roomIdEl.textContent = cid.toString();
  roomInfoEl.style.display = "block";
  roomControlsEl.style.display = "none";
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

  // Register chat protocol handler for incoming messages
  await node.handle(PROTOCOL, (stream, connection) => {
    const sender = connection.remotePeer.toString();
    (async () => {
      for await (const chunk of stream) {
        const bytes = chunk instanceof Uint8Array ? chunk : chunk.subarray();
        const msg = new TextDecoder().decode(bytes);
        log(`${short(sender)}: ${msg}`, "log-received");
      }
    })();
  });

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
    updatePeersUI(node);
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
    if (selectedPeer === pid) {
      selectedPeer = null;
      sendBtn.disabled = true;
    }
    updatePeersUI(node);
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
    if (!text || !selectedPeer) return;

    const peerId = node.getPeers().find((p) => p.toString() === selectedPeer);
    if (!peerId) {
      log(`Peer ${short(selectedPeer)} not found`);
      return;
    }

    try {
      const stream = await node.dialProtocol(peerId, PROTOCOL);
      stream.send(new TextEncoder().encode(text));
      await stream.close();
      log(`You → ${short(selectedPeer)}: ${text}`, "log-sent");
      messageInput.value = "";
    } catch (err) {
      log(`Send failed: ${err}`);
    }
  });
}

main().catch((err) => log(`Fatal: ${err}`));
