import { generateKeypair, fingerprint } from "./identity/index.js";
import type { IdentityKeypair } from "./identity/index.js";
import { createBrowserNode } from "./network/index.js";
import { rewriteRelayAddr } from "./network/rewrite-relay-addr.js";
import { computeRoomId, announceRoom, discoverRoom } from "./room/index.js";
import { createRoomMessaging } from "./messaging/index.js";
import type { RoomMessaging } from "./messaging/index.js";
import { CID } from "multiformats/cid";
import { multiaddr } from "@multiformats/multiaddr";
import type { Libp2p, PeerId, IdentifyResult } from "@libp2p/interface";

const RELAY_HOST = window.location.hostname;
const RELAY_PORT = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
const RELAY_WSS = window.location.protocol === "https:";
const RELAY_WS_PORT = import.meta.env.VITE_RELAY_WS_PORT ?? "9001";
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
let currentRoomCid: CID | null = null;

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
  const relayAddrs: string[] = (relayInfo.addrs as string[]).map((a) =>
    rewriteRelayAddr(a, RELAY_HOST, RELAY_PORT, RELAY_WSS, RELAY_WS_PORT),
  );
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

    // Upgrade relay-only peers to WebRTC so GossipSub can use them.
    // Must hangUp first — GossipSub won't bind to WebRTC if a relay
    // connection already exists (libp2p identify/registrar issue).
    if (peerId.toString() !== relayPeerId && limited && connType === "relay") {
      const pid = peerId.toString();
      node.hangUp(peerId).then(() => {
        const webrtcAddr = multiaddr(
          `${relayAddrs[0]}/p2p-circuit/webrtc/p2p/${pid}`,
        );
        log(`Upgrading ${short(pid)} to WebRTC...`);
        return node.dial(webrtcAddr);
      })
        .then(() => log(`WebRTC upgrade to ${short(peerId.toString())} succeeded`))
        .catch((err: unknown) => {
          log(`WebRTC upgrade failed: ${err}`);
        });
    }

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

  // Reconnect after device sleep/suspend.
  // When a browser is suspended (phone screen off, tab backgrounded),
  // setInterval callbacks freeze.  If the callback fires much later than
  // expected, the device was asleep and all connections are likely dead.
  async function reconnect() {
    log("Reconnecting...");

    // Re-dial relay (WebSocket + circuit relay reservation)
    for (const addr of relayAddrs) {
      node.dial(multiaddr(addr)).catch((err: unknown) => {
        log(`Relay reconnect failed: ${err}`);
      });
    }

    // If in a room, re-announce and re-discover peers
    if (currentRoomCid) {
      announceRoom(node, currentRoomCid).catch(() => {});
      try {
        for await (const provider of discoverRoom(node, currentRoomCid)) {
          const pid = provider.id.toString();
          if (pid === node.peerId.toString()) continue;

          // hangUp stale connections so WebRTC is the first connection
          // (same GossipSub/relay workaround as join flow)
          if (connectedPeers.has(pid)) {
            await node.hangUp(provider.id);
            connectedPeers.delete(pid);
          }

          const webrtcAddr = multiaddr(
            `${relayAddrs[0]}/p2p-circuit/webrtc/p2p/${pid}`,
          );
          node
            .dial(webrtcAddr)
            .then(() => log(`Reconnected to ${short(pid)}`))
            .catch((err: unknown) => {
              log(`Reconnect dial failed: ${err}`);
            });
        }
      } catch (err) {
        log(`Reconnect discovery failed: ${err}`);
      }
    }
  }

  let lastTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (now - lastTick > 10_000) {
      log("Device resumed from sleep — reconnecting...");
      reconnect();
    }
    lastTick = now;
  }, 5_000);

  // Create Room
  createRoomBtn.addEventListener("click", async () => {
    const name = roomNameInput.value.trim();
    if (!name) return;

    const nonce = crypto.randomUUID();
    const cid = await computeRoomId(keypair.publicKey, name, nonce);
    currentRoomCid = cid;
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

    currentRoomCid = cid;
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

        log(`Found peer via DHT: ${short(pid)}`);

        // Close existing relay connections before dialing WebRTC.
        // If a peer already connected via relay (limited=true), GossipSub
        // won't bind to a subsequent WebRTC connection (libp2p identify/
        // registrar issue). hangUp ensures WebRTC is the first connection.
        const existingConns = node.getConnections(provider.id);
        if (existingConns.length > 0) {
          log(`Closing ${existingConns.length} existing connection(s) to ${short(pid)}`);
          await node.hangUp(provider.id);
        }

        const webrtcAddr = multiaddr(
          `${relayAddrs[0]}/p2p-circuit/webrtc/p2p/${pid}`,
        );
        log(`Dialing WebRTC: ${webrtcAddr.toString()}`);
        node
          .dial(webrtcAddr)
          .then(() => log(`WebRTC dial to ${short(pid)} succeeded`))
          .catch((err: unknown) => {
            log(`WebRTC dial failed: ${err}`);
          });
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
