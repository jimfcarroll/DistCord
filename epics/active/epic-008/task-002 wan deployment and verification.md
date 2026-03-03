# Task-002: WAN Deployment and Verification

**Status:** pending

## Objective

Make the relay reachable from the internet and verify two browsers on different networks establish direct WebRTC connections.

## Deployment Options

Choose one method to expose the relay:

1. **Port forward** — router forwards port 8443 → host → Docker container. Simplest if router access is available.
2. **Cloudflare Tunnel / ngrok** — exposes local port with real TLS. No router config needed.
3. **VPS** — deploy relay + proxy to a cloud server with a public IP.

## Configuration

Set `.env.local` (gitignored) with the public-facing address:

```
VITE_RELAY_HOST=<public-hostname-or-ip>
VITE_RELAY_WSS=true
VITE_PROXY_PORT=8443
```

## Acceptance Criteria

- [ ] Relay reachable from external network (browser on different public IP can connect)
- [ ] DHT discovery works across networks (peer found via `findProviders`)
- [ ] Direct WebRTC connection established (`webrtc limited=false` in logs)
- [ ] Messages flow between browsers on different networks
- [ ] Messages survive past relay's 30-minute timeout (confirming relay is not in data path)

## Notes

- Self-signed TLS cert requires clicking through browser warning on first visit — acceptable for testing
- If hole-punching fails (symmetric NAT), connection falls back to relay (`limited=true`) — this is expected for ~10-20% of network configurations
