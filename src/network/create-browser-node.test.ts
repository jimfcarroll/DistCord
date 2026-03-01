import { describe, it, expect, afterEach } from "vitest";
import type { Libp2p } from "@libp2p/interface";
import { generateKeypair } from "../identity/index.js";
import { keypairToPeerId } from "./identity-bridge.js";
import { createBrowserNode } from "./create-browser-node.js";

describe("createBrowserNode", () => {
  let node: Libp2p | undefined;

  afterEach(async () => {
    if (node != null) {
      await node.stop();
      node = undefined;
    }
  });

  it("starts and stops cleanly", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);
    expect(node).toBeDefined();
    await node.stop();
    node = undefined;
  });

  it("PeerId matches identity bridge output", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    const expectedPeerId = await keypairToPeerId(keypair);
    expect(node.peerId.toString()).toBe(expectedPeerId.toString());
  });

  it("registers identify and ping protocols", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    const protocols = node.getProtocols();
    expect(protocols).toContain("/ipfs/id/1.0.0");
    expect(protocols).toContain("/ipfs/ping/1.0.0");
  });

  it("works without bootstrap addresses", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    expect(node.getPeers()).toHaveLength(0);
  });
});
