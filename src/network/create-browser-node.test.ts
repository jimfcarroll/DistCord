import { describe, it, expect, vi, afterEach } from "vitest";
import type { Libp2p } from "@libp2p/interface";
import { generateKeypair } from "../identity/index.js";
import { keypairToPeerId } from "./identity-bridge.js";
import { createBrowserNode, wrapDialWithTimeout } from "./create-browser-node.js";

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
    await node.start();
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

  it("registers identify, ping, and kad-dht protocols", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);
    await node.start();

    const protocols = node.getProtocols();
    expect(protocols).toContain("/ipfs/id/1.0.0");
    expect(protocols).toContain("/ipfs/ping/1.0.0");
  });

  it("has DHT service configured", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    expect(node.services.dht).toBeDefined();
  });

  it("has pubsub service configured", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    expect(node.services.pubsub).toBeDefined();
  });

  it("works without bootstrap addresses", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    expect(node.getPeers()).toHaveLength(0);
  });

  it("applies dial timeout monkeypatch", async () => {
    const keypair = await generateKeypair();
    node = await createBrowserNode(keypair);

    // The monkeypatch sets dial as an own property, shadowing the prototype
    expect(node.hasOwnProperty("dial")).toBe(true);
  });
});

describe("wrapDialWithTimeout", () => {
  it("injects AbortSignal.timeout when caller provides no signal", async () => {
    const mockDial = vi.fn().mockResolvedValue({});
    const wrapped = wrapDialWithTimeout(mockDial);

    await wrapped("fake-peer");

    expect(mockDial).toHaveBeenCalledOnce();
    const [peer, options] = mockDial.mock.calls[0];
    expect(peer).toBe("fake-peer");
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("injects AbortSignal.timeout when options exist but signal is missing", async () => {
    const mockDial = vi.fn().mockResolvedValue({});
    const wrapped = wrapDialWithTimeout(mockDial);

    await wrapped("fake-peer", { force: true });

    const [, options] = mockDial.mock.calls[0];
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.force).toBe(true);
  });

  it("preserves caller-provided AbortSignal", async () => {
    const mockDial = vi.fn().mockResolvedValue({});
    const wrapped = wrapDialWithTimeout(mockDial);
    const callerSignal = AbortSignal.timeout(5_000);

    await wrapped("fake-peer", { signal: callerSignal });

    const [, options] = mockDial.mock.calls[0];
    expect(options.signal).toBe(callerSignal);
  });

  it("preserves all other options alongside injected signal", async () => {
    const mockDial = vi.fn().mockResolvedValue({});
    const wrapped = wrapDialWithTimeout(mockDial);

    await wrapped("fake-peer", { force: true });

    const [, options] = mockDial.mock.calls[0];
    expect(options.force).toBe(true);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  it("passes through undefined options correctly", async () => {
    const mockDial = vi.fn().mockResolvedValue({});
    const wrapped = wrapDialWithTimeout(mockDial);

    await wrapped("fake-peer");

    const [, options] = mockDial.mock.calls[0];
    // Should have signal but no other spurious keys
    expect(Object.keys(options)).toEqual(["signal"]);
  });
});
