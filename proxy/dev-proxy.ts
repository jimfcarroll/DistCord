import { createServer } from "node:https";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import httpProxy from "http-proxy";

const DIR = dirname(fileURLToPath(import.meta.url));
const CERT_PATH = join(DIR, "cert.pem");
const KEY_PATH = join(DIR, "key.pem");

const PROXY_PORT = Number(process.env.PROXY_PORT ?? 8443);
const VITE_PORT = Number(process.env.VITE_PORT ?? 5173);
const RELAY_WS_PORT = Number(process.env.RELAY_WS_PORT ?? 9001);
const RELAY_INFO_PORT = Number(process.env.RELAY_INFO_PORT ?? 9002);

// Auto-generate self-signed cert if missing
if (!existsSync(CERT_PATH) || !existsSync(KEY_PATH)) {
  console.log("Generating self-signed certificate...");
  execSync(
    `openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 ` +
      `-keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes ` +
      `-subj "/CN=dev-proxy"`,
  );
  console.log("Certificate generated (valid 365 days)");
}

const ssl = {
  key: readFileSync(KEY_PATH),
  cert: readFileSync(CERT_PATH),
};

const viteProxy = httpProxy.createProxyServer({ target: `http://localhost:${VITE_PORT}` });
const relayWsProxy = httpProxy.createProxyServer({
  target: `http://localhost:${RELAY_WS_PORT}`,
  ws: true,
});
const relayInfoProxy = httpProxy.createProxyServer({
  target: `http://localhost:${RELAY_INFO_PORT}`,
});

// Suppress connection errors when backends aren't up yet
for (const p of [viteProxy, relayWsProxy, relayInfoProxy]) {
  p.on("error", (err, _req, res) => {
    console.error(`Proxy error: ${err.message}`);
    if (res && "writeHead" in res) {
      (res as import("node:http").ServerResponse).writeHead(502, { "Content-Type": "text/plain" });
      (res as import("node:http").ServerResponse).end("Bad Gateway — is the backend running?");
    }
  });
}

const server = createServer(ssl, (req, res) => {
  if (req.url?.startsWith("/relay-info")) {
    req.url = req.url.replace(/^\/relay-info/, "/") || "/";
    relayInfoProxy.web(req, res);
  } else {
    viteProxy.web(req, res);
  }
});

// WebSocket routing: vite-hmr → Vite, everything else → relay
server.on("upgrade", (req, socket, head) => {
  const protocol = req.headers["sec-websocket-protocol"] ?? "";
  if (protocol.includes("vite-hmr")) {
    viteProxy.ws(req, socket, head);
  } else {
    relayWsProxy.ws(req, socket, head);
  }
});

server.listen(PROXY_PORT, "0.0.0.0", () => {
  console.log(`\nDev proxy listening on https://0.0.0.0:${PROXY_PORT}`);
  console.log(`  HTTP        → http://localhost:${VITE_PORT} (Vite)`);
  console.log(`  /relay-info → http://localhost:${RELAY_INFO_PORT} (relay info)`);
  console.log(`  WS hmr      → ws://localhost:${VITE_PORT} (Vite HMR)`);
  console.log(`  WS other    → ws://localhost:${RELAY_WS_PORT} (relay libp2p)`);
  console.log();
});

const shutdown = () => {
  console.log("\nShutting down proxy...");
  server.close();
  viteProxy.close();
  relayWsProxy.close();
  relayInfoProxy.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
