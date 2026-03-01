# Epic-005: Authority Log & Rooms

**Status:** backlog

## Overview

Implement the signed append-only hash chain for room permissions — the novel part of the architecture. Room creation derives an address from the creator's public key. The creator's keypair is the root of trust; all permission changes are entries in the hash chain, validated by every peer independently.

This epic introduces the concept of rooms (isolated chat spaces) and the permission model that governs them.

## Key Decisions

- **Static roles first** — OWNER, MOD, MEMBER, BANNED. Capability bitmasks come later.
- **Hash chain** — each entry references the previous entry's hash. Tamper-evident, not tamper-proof.
- **Room addressing** — `room_id = H(creator_pubkey + room_name + nonce)` as specified in the architecture.
- **Log propagation priority** — the authority log must propagate faster than messages to minimize the confusion window on revocations.

## Milestone

Create a room, invite a peer, assign roles, and verify that permission changes propagate correctly. Revoked permissions are enforced by all honest peers.
