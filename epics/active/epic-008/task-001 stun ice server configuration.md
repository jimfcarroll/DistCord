# Task-001: STUN/ICE Server Configuration

**Status:** pending

## Objective

Configure explicit STUN servers on the WebRTC transport so ICE candidates include server-reflexive (public IP:port) addresses, enabling NAT hole-punching across networks.

## Changes

**File:** `src/network/create-browser-node.ts`

Add `rtcConfiguration` with STUN servers to the `webRTC()` transport:

```typescript
webRTC({
  rtcConfiguration: {
    iceServers: [
      { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    ],
  },
}),
```

No other files change. The relay and proxy are already WAN-ready.

## Acceptance Criteria

- [ ] `webRTC()` configured with explicit STUN servers
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] LAN test: no regression — browsers still show `webrtc limited=false`
