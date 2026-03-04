# Epic-011: Automated Browser E2E & WAN Testing

**Status:** active

## Overview

Automated end-to-end testing for the P2P chat application. Phase 1 uses Playwright with two browser contexts on the same machine to test the full user flow (create room, join, send/receive messages). Phase 2 extends to distributed WAN testing across physically separate networks using Docker containers and a shell-based orchestration script.

## Context

Manual WAN testing (start services, open browsers, manually create/join rooms, eyeball logs) doesn't scale and misses regressions. The project now has working WebRTC direct connections across NATs (epic-008), but verifying this requires manual multi-machine coordination. Automated e2e tests catch regressions immediately and enable repeatable WAN verification.

## Key Decisions

- **Playwright** over Selenium/Puppeteer — modern, fast, built-in multi-browser support, good TypeScript integration.
- **No GitHub Actions.** A local script SSHes into machines and spins up Docker containers. Keeps the setup simple and under user control.
- **Two phases.** Phase 1 (local e2e) is useful immediately and independent of hardware setup. Phase 2 (WAN) requires physical machines on separate networks.
- **Coordination via well-known URL.** The orchestration script uploads a config file (relay LAN/WAN URLs, room code) to the user's website. Test containers fetch it to know where to connect.
- **Docker network isolation for WAN testing.** Machine B is dual-homed (LAN for SSH + T-Mobile hotspot for WAN). The Docker container is network-locked to the T-Mobile interface, ensuring true WAN-only access.

## Scope boundaries (NOT in epic-011)

- CI/CD integration (GitHub Actions, etc.)
- Performance/load testing
- Mobile browser testing (phone-specific quirks)
- Production deployment of test infrastructure

## Tasks

| # | Task | Status |
|---|------|--------|
| 001 | Local Playwright e2e tests | pending |
| 002 | Docker images for server + client | pending |
| 003 | WAN test orchestration script | pending |

## Milestone

Phase 1: `npm run test:e2e` passes in the devcontainer — two browser contexts create a room, exchange messages, and verify receipt.

Phase 2: `./scripts/wan-test.sh` orchestrates a test across Verizon home LAN and T-Mobile hotspot — browsers on different ISPs establish direct WebRTC connections and exchange messages.
