# Task-001: kad-dht Dependency and Configuration

**Status:** done

## Objective

Wire up Kademlia DHT so the relay runs as a DHT server and browsers connect as DHT clients. After this task, the DHT routing table is populated — browsers can see the relay as a DHT peer. This is pure infrastructure, like epic-002's task-001.

## Acceptance Criteria

- [x] Add `@libp2p/kad-dht` to package.json and install
- [x] Configure relay node (`relay/index.ts`) with kadDHT in server mode
- [x] Configure browser node (`src/network/create-browser-node.ts`) with kadDHT in client mode
- [x] Tests verify DHT service is present on the created node
- [x] All existing tests pass, build and lint clean
