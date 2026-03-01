import {
  generateKeypair,
  fingerprint,
  sign,
  verify,
  exportKeypair,
  importKeypair,
} from "./identity/index.js";

(async () => {
  const keypair = await generateKeypair();
  const fp = await fingerprint(keypair.publicKey);
  console.log("fingerprint (user ID):", fp);

  const message = new TextEncoder().encode("hello, decentralized world");
  const signature = await sign(keypair.privateKey, message);
  console.log("signature:", signature);

  const valid = await verify(keypair.publicKey, signature, message);
  console.log("signature valid:", valid);

  const serialized = await exportKeypair(keypair);
  const restored = await importKeypair(serialized);
  const stillValid = await verify(restored.publicKey, signature, message);
  console.log("signature valid after round-trip:", stillValid);
})();
