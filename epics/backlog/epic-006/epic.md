# Epic-006: Persistence & History Sync

**Status:** backlog

## Overview

Persist authority logs and message history to IndexedDB so the app survives page reloads and peers rejoining a room can sync from where they left off. Add causal ordering so messages display consistently regardless of arrival order.

If all peers in a room go offline, history is gone unless at least one peer comes back with their local copy. This is acceptable — any room that cares about persistence will realistically have at least one semi-permanent node.

## Key Decisions

- **IndexedDB wrapper** — IndexedDB is async. Wrap it. Don't scatter raw IDB calls through the codebase.
- **Causal ordering** — Lamport timestamps or vector clocks for consistent message ordering across peers.
- **Sync on rejoin** — peers joining a room request missing history from connected peers, similar to a BitTorrent swarm per-channel where the "pieces" are message ranges.
- **Cached peers** — store known peer addresses between sessions. On next launch, reconnect to cached peers before falling back to bootstrap nodes.

## Milestone

Disconnect and reconnect — missed messages sync from other peers, ordering is consistent. Reload the page — local history is preserved from IndexedDB. Launch the app — cached peers from previous session are tried before bootstrap.
