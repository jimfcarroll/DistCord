import type { IdentityKeypair } from "./types.js";

export async function generateKeypair(): Promise<IdentityKeypair> {
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}
