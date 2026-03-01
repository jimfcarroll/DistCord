import type { Fingerprint } from "./types.js";

export async function fingerprint(publicKey: CryptoKey): Promise<Fingerprint> {
  const raw = await crypto.subtle.exportKey("raw", publicKey);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
