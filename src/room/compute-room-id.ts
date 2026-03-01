import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";

/**
 * Compute a room ID from the creator's public key, room name, and nonce.
 *
 * room_id = H(creator_pubkey + room_name + nonce)
 *
 * Returns a CIDv1 (raw codec, SHA-256) suitable for DHT content routing.
 */
export async function computeRoomId(
  creatorPubKey: CryptoKey,
  roomName: string,
  nonce: string,
): Promise<CID> {
  const pubKeyBytes = new Uint8Array(await crypto.subtle.exportKey("raw", creatorPubKey));
  const nameBytes = new TextEncoder().encode(roomName);
  const nonceBytes = new TextEncoder().encode(nonce);

  const input = new Uint8Array(pubKeyBytes.length + nameBytes.length + nonceBytes.length);
  input.set(pubKeyBytes, 0);
  input.set(nameBytes, pubKeyBytes.length);
  input.set(nonceBytes, pubKeyBytes.length + nameBytes.length);

  const hash = await sha256.digest(input);
  return CID.createV1(0x55, hash); // 0x55 = raw codec
}
