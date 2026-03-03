/**
 * Rewrite a relay multiaddr from the relay's internal address to one
 * reachable from this browser.
 *
 * WSS mode (via TLS proxy): /dns4|ip4/<host>/tcp/<port>/wss/...
 * Plain mode (localhost):   /ip4/<host>/tcp/<port>/ws/...
 */
export function rewriteRelayAddr(
  raw: string,
  host: string,
  port: string,
  wss: boolean,
  wsPort: string,
): string {
  const hostProto = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? "ip4" : "dns4";

  if (wss) {
    return raw
      .replace(/\/(ip4|dns4)\/[^/]+\//, `/${hostProto}/${host}/`)
      .replace(/\/tcp\/\d+\//, `/tcp/${port}/`)
      .replace(/\/ws\//, "/wss/");
  }
  return raw
    .replace(/\/ip4\/[^/]+\//, `/ip4/${host}/`)
    .replace(/\/tcp\/\d+\//, `/tcp/${wsPort}/`);
}
