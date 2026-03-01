import type { IdentityKeypair, SerializedKeypair } from "./types.js";

export async function exportKeypair(keypair: IdentityKeypair): Promise<SerializedKeypair> {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.exportKey("jwk", keypair.publicKey),
    crypto.subtle.exportKey("jwk", keypair.privateKey),
  ]);
  return { publicKey, privateKey };
}

export async function importKeypair(serialized: SerializedKeypair): Promise<IdentityKeypair> {
  const [publicKey, privateKey] = await Promise.all([
    crypto.subtle.importKey("jwk", serialized.publicKey, "Ed25519", true, ["verify"]),
    crypto.subtle.importKey("jwk", serialized.privateKey, "Ed25519", true, ["sign"]),
  ]);
  return { publicKey, privateKey };
}
