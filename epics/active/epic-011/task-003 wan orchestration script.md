# Task-003: WAN Test Orchestration Script

**Status:** pending

## Objective

Shell script that SSHes into 2–3 physical machines on different networks, starts Docker containers, coordinates the test run, and reports results.

## Changes

### New files

- `scripts/wan-test.sh` — main orchestration script
- Test script with `TEST_ROLE=host|guest` environment variable switching

## Flow

1. SSH into Machine A (home LAN), start server container
2. Run Playwright as host → create room → capture room code
3. Upload config (relay LAN/WAN URLs + room code) to well-known URL
4. SSH into Machine B (dual-homed, Docker locked to T-Mobile), start client container
5. Client fetches config, joins room via WAN, verifies WebRTC + messages
6. Collect results from both machines

## Acceptance Criteria

- [ ] Script orchestrates test across two machines on different ISPs
- [ ] WebRTC direct connection verified (`limited=false`) across ISPs
- [ ] Messages flow bidirectionally
- [ ] Results reported to terminal
