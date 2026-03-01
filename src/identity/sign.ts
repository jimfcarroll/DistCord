export async function sign(privateKey: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const signature = await crypto.subtle.sign("Ed25519", privateKey, data);
  return new Uint8Array(signature);
}
