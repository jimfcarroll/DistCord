import { sign, fingerprint } from "../identity/index.js";
import type { IdentityKeypair } from "../identity/types.js";
import type { ChatMessage } from "./types.js";

function canonicalPayload(msg: Omit<ChatMessage, "signature">): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({
      type: msg.type,
      senderPublicKey: msg.senderPublicKey,
      senderFingerprint: msg.senderFingerprint,
      timestamp: msg.timestamp,
      body: msg.body,
    }),
  );
}

export { canonicalPayload };

export async function createChatMessage(
  keypair: IdentityKeypair,
  body: string,
): Promise<ChatMessage> {
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", keypair.publicKey));
  const senderPublicKey = uint8ToBase64(rawKey);
  const senderFingerprint = await fingerprint(keypair.publicKey);

  const partial = {
    type: "chat" as const,
    senderPublicKey,
    senderFingerprint,
    timestamp: Date.now(),
    body,
  };

  const payload = canonicalPayload(partial);
  const sig = await sign(keypair.privateKey, payload);

  return {
    ...partial,
    signature: uint8ToBase64(sig),
  };
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}
