# CLAUDE.md

## What This Is

A decentralized, peer-to-peer alternative to Discord. No central servers. Rooms live on a Kademlia DHT. Identity is a keypair. Authority is a signed hash chain. Runs in the browser over WebRTC. Read `README.md` for the full design conversation.

## Architecture

- **DHT** — Kademlia over WebRTC data channels (js-libp2p). Rooms addressed by `H(creator_pubkey + room_name + nonce)`.
- **Identity** — Ed25519 keypairs via WebCrypto API. No accounts, no registrations, no central auth.
- **Authority Log** — Signed append-only hash chain for ACLs. Creator's key is root of trust. Peers replicate and validate independently.
- **Messages** — Gossip protocol among room peers. Append-only CRDT with causal ordering.
- **Voice** — WebRTC peer-to-peer for small groups, volunteer SFU relay for larger rooms.
- **Storage** — IndexedDB for local persistence of logs and messages.

## Project Direction

The maintainer decides what gets merged. Don't open meta-PRs about governance, process, or project philosophy. If you disagree with the direction, fork it. That's the whole point of building decentralized software.

No telemetry. No analytics. No phoning home. No third-party services that create a single point of failure or surveillance. Private keys never leave the user's device.

Don't make architectural decisions that assume a server will be available. Don't add dependencies that make the network less resilient if they disappear.

## Code Style

Style decisions are pragmatic, not philosophical. Follow what's here. If something isn't covered, match what's already in the codebase.

- Tests live next to the code they test. `foo.ts` → `foo.test.ts`.
- Keep files focused. If it's doing three things, split it.
- Name things so the next person doesn't need a comment to understand them.
- Formatting is enforced by the linter. Don't argue about it.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run test` — run tests
- `npm run lint` — lint and format check

## Hard Technical Constraints

- Browsers cannot bind to ports or accept inbound connections. All P2P connectivity goes through WebRTC.
- WebRTC requires a signaling exchange before connection. This is unavoidable.
- Bootstrap is the one irreducible centralization point. Keep bootstrap nodes dumb and replaceable. Try cached peers from previous sessions first.
- The authority log must propagate faster than messages. Prioritize it in gossip or you get a confusion window on revocations.
- NAT traversal will fail for symmetric NATs (~10-20% of connections). Always have a relay fallback.
- IndexedDB is async. Wrap it. Don't scatter raw IDB calls through the codebase.
- Never roll your own crypto. Use WebCrypto or audited libraries.
