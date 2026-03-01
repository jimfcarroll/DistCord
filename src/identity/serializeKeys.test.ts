import { describe, it, expect } from "vitest";
import { generateKeypair } from "./generateKeypair.js";
import { sign } from "./sign.js";
import { verify } from "./verify.js";
import { exportKeypair, importKeypair } from "./serializeKeys.js";

describe("serializeKeys", () => {
  it("exportKeypair produces JWK objects with kty OKP and crv Ed25519", async () => {
    const keypair = await generateKeypair();
    const serialized = await exportKeypair(keypair);

    expect(serialized.publicKey.kty).toBe("OKP");
    expect(serialized.publicKey.crv).toBe("Ed25519");
    expect(serialized.privateKey.kty).toBe("OKP");
    expect(serialized.privateKey.crv).toBe("Ed25519");
  });

  it("round-trip: generate → export → import → sign → verify", async () => {
    const original = await generateKeypair();
    const serialized = await exportKeypair(original);
    const imported = await importKeypair(serialized);

    const data = new TextEncoder().encode("round-trip test");
    const signature = await sign(imported.privateKey, data);
    const valid = await verify(imported.publicKey, signature, data);

    expect(valid).toBe(true);
  });

  it("imported public key has verify usage", async () => {
    const keypair = await generateKeypair();
    const serialized = await exportKeypair(keypair);
    const imported = await importKeypair(serialized);

    expect(imported.publicKey.usages).toEqual(["verify"]);
  });

  it("imported private key has sign usage", async () => {
    const keypair = await generateKeypair();
    const serialized = await exportKeypair(keypair);
    const imported = await importKeypair(serialized);

    expect(imported.privateKey.usages).toEqual(["sign"]);
  });

  it("JSON.stringify → JSON.parse round-trip: export → stringify → parse → import → sign → verify", async () => {
    const original = await generateKeypair();
    const serialized = await exportKeypair(original);

    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);
    const imported = await importKeypair(parsed);

    const data = new TextEncoder().encode("json round-trip test");
    const signature = await sign(imported.privateKey, data);
    const valid = await verify(imported.publicKey, signature, data);

    expect(valid).toBe(true);
  });
});
