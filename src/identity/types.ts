export interface IdentityKeypair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SerializedKeypair {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export type Fingerprint = string;
