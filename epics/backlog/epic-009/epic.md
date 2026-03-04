# Epic-009: Relay Reconnection & Resilience

**Status:** backlog

## Overview

When the relay process restarts, existing browser nodes do not automatically reconnect. They continue operating on direct WebRTC connections (which is correct), but they lose DHT presence — new peers joining via the relay cannot discover them through `findProviders`. The only recovery is a manual browser refresh.

This epic adds automatic relay reconnection so browser nodes re-establish their WebSocket connection to the relay, re-register circuit relay reservations, and re-announce to the DHT without user intervention.
