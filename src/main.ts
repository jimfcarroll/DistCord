import { generateKeypair, fingerprint } from "./identity/index.js";
import { createBrowserNode } from "./network/index.js";
import type { Libp2p, PeerId } from "@libp2p/interface";

const RELAY_ADDR = "/ip4/127.0.0.1/tcp/9001/ws";
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

const connectedPeers = new Set<string>();
let selectedPeer: string | null = null;

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

    const isRelay = node
      .getConnections()
      .some(
        (c) => c.remotePeer.toString() === pid && !c.remoteAddr.toString().includes("/webrtc/"),
      );

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

async function main() {
  log("Generating identity...");
  const keypair = await generateKeypair();
  const fp = await fingerprint(keypair.publicKey);
  fingerprintEl.textContent = fp.slice(0, 16) + "...";

  log("Starting libp2p node...");
  const node = await createBrowserNode(keypair, [RELAY_ADDR]);
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
    log(`Connected: ${short(pid)}`);
    relayStatusEl.textContent = "connected";
    updatePeersUI(node);
  });

  node.addEventListener("peer:disconnect", (evt: CustomEvent<PeerId>) => {
    const pid = evt.detail.toString();
    connectedPeers.delete(pid);
    log(`Disconnected: ${short(pid)}`);
    if (connectedPeers.size === 0) {
      relayStatusEl.textContent = "disconnected";
    }
    if (selectedPeer === pid) {
      selectedPeer = null;
      sendBtn.disabled = true;
    }
    updatePeersUI(node);
  });

  // Send message
  sendForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !selectedPeer) return;

    const peerId = node.getPeers().find((p) => p.toString() === selectedPeer);
    if (!peerId) {
      log(`Peer ${short(selectedPeer)} not found`, "log-system");
      return;
    }

    try {
      const stream = await node.dialProtocol(peerId, PROTOCOL);
      stream.send(new TextEncoder().encode(text));
      await stream.close();
      log(`You → ${short(selectedPeer)}: ${text}`, "log-sent");
      messageInput.value = "";
    } catch (err) {
      log(`Send failed: ${err}`, "log-system");
    }
  });

  log("Waiting for peers...");
}

main().catch((err) => log(`Fatal: ${err}`));
