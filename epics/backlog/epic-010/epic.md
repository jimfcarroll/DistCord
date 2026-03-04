# Epic-010: Mobile Session Resilience

**Status:** backlog

## Overview

Mobile browsers aggressively evict backgrounded tabs (iOS Safari after ~30s, Android Chrome under memory pressure). When this happens, the page reloads from scratch and all in-memory state is lost — including the room CID, GossipSub subscriptions, and peer connections. The user returns to a blank "Create/Join" screen with no indication they were in a room.

Even when the tab survives (screen lock, brief backgrounding), the reconnect logic has gaps: relay re-dial is fire-and-forget with no retry, and if it fails, DHT discovery never runs. The user is silently stranded in a room with no peers.

This epic adds minimal session persistence so the app survives tab eviction and more robust reconnect logic for the tab-alive case.

**Key areas:**
- Persist room CID to localStorage/sessionStorage on join — restore on page load
- Auto-rejoin room after page reload (wait for relay + DHT ready, then rejoin)
- Retry relay dial in reconnect() with backoff instead of fire-and-forget
- Sequence reconnect: wait for relay connection before attempting DHT discovery
- Clear persisted state explicitly (leave room, create new room)
- UI indication of reconnect state ("Reconnecting to room...")

**Relationship to other epics:**
- epic-006 (Persistence & History Sync) covers full message history in IndexedDB — this epic is a lighter prerequisite focused only on session state
- epic-009 (Relay Reconnection & Resilience) covers relay process restarts — overlaps with the reconnect retry logic here
