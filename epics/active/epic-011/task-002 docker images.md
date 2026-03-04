# Task-002: Docker Images for Server + Client

**Status:** pending

## Objective

Create Docker images for the server (relay + proxy + Vite + Playwright) and client (Playwright only) roles used in distributed WAN testing.

## Changes

### New files

- `docker/server/Dockerfile` — relay + proxy + Vite + Playwright + Chromium
- `docker/client/Dockerfile` — Playwright + Chromium only
- `docker-compose.yml` — local testing of both images
- Network isolation configuration for WAN-locked client container

## Acceptance Criteria

- [ ] Server image builds and runs relay + proxy + Vite + Playwright
- [ ] Client image builds and runs Playwright tests
- [ ] WAN-locked client container cannot reach LAN subnet
- [ ] Both images work in Docker Compose locally
