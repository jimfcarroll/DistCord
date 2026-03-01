import type { CID } from "multiformats/cid";
import type { Libp2p } from "@libp2p/interface";
import type { IdentityKeypair } from "../identity/types.js";
import type { ChatMessage } from "./types.js";
import { createChatMessage } from "./create-chat-message.js";
import { verifyChatMessage } from "./verify-chat-message.js";
import { serializeChatMessage, deserializeChatMessage } from "./serialize.js";

export function roomTopicFromCid(cid: CID): string {
  return `room:${cid.toString()}`;
}

export interface RoomMessageHandler {
  (message: ChatMessage): void;
}

export interface RoomMessaging {
  subscribe(handler: RoomMessageHandler): void;
  publish(body: string): Promise<void>;
  unsubscribe(): void;
  readonly topic: string;
}

interface PubSubService {
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  publish(topic: string, data: Uint8Array): Promise<unknown>;
  addEventListener(
    event: string,
    handler: (evt: CustomEvent<{ topic: string; data: Uint8Array }>) => void,
  ): void;
  removeEventListener(
    event: string,
    handler: (evt: CustomEvent<{ topic: string; data: Uint8Array }>) => void,
  ): void;
}

export function createRoomMessaging(
  node: Libp2p,
  roomCid: CID,
  keypair: IdentityKeypair,
): RoomMessaging {
  const topic = roomTopicFromCid(roomCid);
  const pubsub = node.services.pubsub as unknown as PubSubService;
  let listener: ((evt: CustomEvent<{ topic: string; data: Uint8Array }>) => void) | null = null;

  return {
    topic,

    subscribe(handler: RoomMessageHandler): void {
      pubsub.subscribe(topic);

      listener = (evt: CustomEvent<{ topic: string; data: Uint8Array }>) => {
        const msg = evt.detail;
        if (msg.topic !== topic) return;

        let chatMessage: ChatMessage;
        try {
          chatMessage = deserializeChatMessage(msg.data);
        } catch {
          return; // malformed message, drop silently
        }

        verifyChatMessage(chatMessage).then((result) => {
          if (result.valid) {
            handler(chatMessage);
          }
        });
      };

      pubsub.addEventListener("message", listener);
    },

    async publish(body: string): Promise<void> {
      const message = await createChatMessage(keypair, body);
      const bytes = serializeChatMessage(message);
      await pubsub.publish(topic, bytes);
    },

    unsubscribe(): void {
      if (listener) {
        pubsub.removeEventListener("message", listener);
        listener = null;
      }
      pubsub.unsubscribe(topic);
    },
  };
}
