# Task-002: WAN Deployment and Verification

**Status:** pending

## Objective

Make the relay reachable from the internet and verify two browsers on different networks establish direct WebRTC connections.

## Recommended Test: Router Port Forward + Phone on Cellular

The cleanest true WAN test — two genuinely different networks, no shared LAN shortcuts.

### Setup

1. **Port forward on home router:** forward external port `36443` TCP → host machine's LAN IP, internal port `8443`
   - Docker already forwards host:8443 → devcontainer
   - Path: internet → router:36443 → host:8443 → devcontainer proxy
   - Non-standard external port avoids exposing well-known dev ports

2. **Find your public IP:** `curl -s ifconfig.me` from the host (not the VPN machine)

3. **Start services:** `npm run relay`, `npm run proxy`, `npm run dev`
   - No `.env.local` changes needed — the app derives relay host, port, and WSS from `window.location` automatically

### Test Procedure

1. **Desktop browser (home LAN):** open `https://homer-prime:8443`, create a room, note the room code
2. **Phone browser (cellular — WiFi OFF):** open `https://<your-public-ip>:36443`, accept self-signed cert warning, join the same room code
3. **Check logs on both:** look for `Identify: <peer> webrtc limited=false`
4. **Exchange messages** between desktop and phone
5. **Wait 30+ minutes** — messages should still flow (confirming relay is not in data path)

### Interpreting Results

- **`webrtc limited=false` on both + messages flow** — NAT traversal working. Done.
- **`limited=true`** — hole-punching failed. Carrier likely uses symmetric NAT (common on 4G/5G). Messages still work but route through the relay, so they'll stop after 30 minutes.
- **Phone can't reach the URL** — port forward misconfigured, or carrier blocks the port. Try forwarding port 443 instead (rarely blocked).
- **Phone rejects SSL cert** — some mobile browsers don't allow self-signed cert bypass. Use Chrome on Android (it allows it).

## Alternative Test: VPN (if port forwarding is impractical)

1. **Machine A:** normal LAN connection, browser at `https://homer-prime:8443`
2. **Machine B:** PIA VPN active (full tunnel), browser at `https://<your-public-ip>:36443`

**Caveat:** Both machines are physically on the same LAN. WebRTC ICE gathers candidates from ALL network interfaces, including LAN. It may find a direct LAN path (host candidate) and connect without STUN — making the test invalid for NAT traversal. To verify STUN was actually used, check that the remote address in the identify log shows a public IP, not a `192.168.x.x` address.

The phone test is more reliable because there is no shared LAN.

## Acceptance Criteria

- [ ] Relay reachable from external network (browser on different public IP can connect)
- [ ] DHT discovery works across networks (peer found via `findProviders`)
- [ ] Direct WebRTC connection established (`webrtc limited=false` in logs)
- [ ] Messages flow between browsers on different networks
- [ ] Messages survive past relay's 30-minute timeout (confirming relay is not in data path)
