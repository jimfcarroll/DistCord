import { verify } from "../identity/index.js";
import type { ChatMessage, MessageVerificationResult } from "./types.js";
import { canonicalPayload } from "./create-chat-message.js";

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function verifyChatMessage(message: ChatMessage): Promise<MessageVerificationResult> {
  if (message.type !== "chat") {
    return { valid: false, reason: "unknown message type" };
  }

  let publicKey: CryptoKey;
  try {
    const rawBytes = base64ToUint8(message.senderPublicKey);
    publicKey = await crypto.subtle.importKey("raw", rawBytes, "Ed25519", true, ["verify"]);
  } catch {
    return { valid: false, reason: "invalid public key" };
  }

  const payload = canonicalPayload(message);
  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64ToUint8(message.signature);
  } catch {
    return { valid: false, reason: "invalid signature encoding" };
  }

  const valid = await verify(publicKey, signatureBytes, payload);
  if (!valid) {
    return { valid: false, reason: "signature verification failed" };
  }

  return { valid: true };
}
