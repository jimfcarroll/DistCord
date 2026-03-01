import type { ChatMessage } from "./types.js";

const REQUIRED_FIELDS = [
  "type",
  "senderPublicKey",
  "senderFingerprint",
  "timestamp",
  "body",
  "signature",
] as const;

export function serializeChatMessage(message: ChatMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(message));
}

export function deserializeChatMessage(bytes: Uint8Array): ChatMessage {
  const text = new TextDecoder().decode(bytes);
  const parsed: unknown = JSON.parse(text);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("invalid message: not an object");
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed)) {
      throw new Error(`invalid message: missing field '${field}'`);
    }
  }

  return parsed as ChatMessage;
}
