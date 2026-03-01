import { generateKeyPairFromSeed } from "@libp2p/crypto/keys";
import { peerIdFromPrivateKey } from "@libp2p/peer-id";
import type { Ed25519PrivateKey, Ed25519PeerId } from "@libp2p/interface";
import type { IdentityKeypair } from "../identity/types.js";

function base64urlToBytes(s: string): Uint8Array {
  const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function keypairToLibp2pKey(keypair: IdentityKeypair): Promise<Ed25519PrivateKey> {
  const jwk = await crypto.subtle.exportKey("jwk", keypair.privateKey);
  if (!jwk.d) {
    throw new Error("Private key JWK missing 'd' field");
  }
  const seed = base64urlToBytes(jwk.d);
  return generateKeyPairFromSeed("Ed25519", seed);
}

export async function keypairToPeerId(keypair: IdentityKeypair): Promise<Ed25519PeerId> {
  const key = await keypairToLibp2pKey(keypair);
  return peerIdFromPrivateKey(key);
}
