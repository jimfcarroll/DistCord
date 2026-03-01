# Epic-006: Gossip & Persistence

**Status:** backlog

## Overview

Replace the simple relay with a gossip protocol for message propagation among room peers. Add causal ordering via Lamport timestamps so messages display consistently regardless of arrival order. Persist authority logs and message history to IndexedDB so peers rejoining a room can sync from where they left off.

## Key Decisions

- **Gossip protocol** — peers forward messages to connected neighbors, who forward to theirs. Epidemic-style dissemination.
- **Causal ordering** — Lamport timestamps or vector clocks for consistent message ordering across peers.
- **IndexedDB persistence** — wrap IndexedDB (it's async, don't scatter raw calls). Store authority log entries and message history.
- **Sync on rejoin** — peers joining a room request missing history from connected peers, similar to a BitTorrent swarm per-channel.

## Milestone

Messages propagate via gossip without a central relay. Peers who disconnect and reconnect sync missed messages from other peers. Message ordering is consistent across all peers.
