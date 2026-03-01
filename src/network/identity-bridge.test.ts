import { describe, it, expect } from "vitest";
import { generateKeypair, exportKeypair, importKeypair, fingerprint } from "../identity/index.js";
import { keypairToLibp2pKey, keypairToPeerId } from "./identity-bridge.js";

describe("identity bridge", () => {
  it("produces the same PeerId for the same keypair (deterministic)", async () => {
    const keypair = await generateKeypair();

    const peerId1 = await keypairToPeerId(keypair);
    const peerId2 = await keypairToPeerId(keypair);

    expect(peerId1.toString()).toBe(peerId2.toString());
  });

  it("fingerprint matches SHA-256 of libp2p public key bytes", async () => {
    const keypair = await generateKeypair();

    const libp2pKey = await keypairToLibp2pKey(keypair);
    const hash = await crypto.subtle.digest("SHA-256", libp2pKey.publicKey.raw);
    const hexFromLibp2p = Array.from(new Uint8Array(hash), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");

    const fp = await fingerprint(keypair.publicKey);

    expect(hexFromLibp2p).toBe(fp);
  });

  it("survives JWK round-trip with same PeerId", async () => {
    const keypair = await generateKeypair();
    const peerIdDirect = await keypairToPeerId(keypair);

    const serialized = await exportKeypair(keypair);
    const reimported = await importKeypair(serialized);
    const peerIdRoundTrip = await keypairToPeerId(reimported);

    expect(peerIdRoundTrip.toString()).toBe(peerIdDirect.toString());
  });

  it("produces different PeerIds for different keypairs", async () => {
    const keypair1 = await generateKeypair();
    const keypair2 = await generateKeypair();

    const peerId1 = await keypairToPeerId(keypair1);
    const peerId2 = await keypairToPeerId(keypair2);

    expect(peerId1.toString()).not.toBe(peerId2.toString());
  });
});
