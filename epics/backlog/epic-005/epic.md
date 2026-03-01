# Epic-005: Authority Log & Rooms

**Status:** backlog

## Overview

Implement the signed append-only hash chain for room permissions — the novel part of the architecture. The creator's keypair is the root of trust. All permission changes are entries in the hash chain, replicated to every peer in the room and validated independently.

This is tamper-evident, not tamper-proof. If anyone alters history, hashes break and peers reject it. No proof-of-work or BFT consensus needed — just signature verification back to the creator's key.

## Key Decisions

- **Static roles first** — OWNER, MOD, MEMBER, BANNED. Capability bitmasks come later.
- **Hash chain** — each entry references the previous entry's hash (`prev_hash`). Tamper-evident.
- **Room addressing** — `room_id = H(creator_pubkey + room_name + nonce)` as specified in the architecture.
- **Log propagation priority** — the authority log must propagate faster than messages to minimize the confusion window on revocations.
- **Actions survive role changes** — if a capability is removed from a role, existing actions taken under that role stand. The owner can explicitly undo individual actions.

## Milestone

Create a room, invite a peer, assign roles, and verify that permission changes propagate correctly. Revoked permissions are enforced by all honest peers.
