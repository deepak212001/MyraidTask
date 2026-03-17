import crypto from "crypto";
import fs from "fs";

// Use absolute paths so running from a different cwd can't load the wrong key files.
const publicPath = new URL("./public.pem", import.meta.url);
const privatePath = new URL("./private.pem", import.meta.url);

export const publicKey = fs.readFileSync(publicPath, "utf8");
export const privateKey = fs.readFileSync(privatePath, "utf8");

// Fail fast if the keypair doesn't match (common cause of OAEP decoding errors).
try {
  const derivedPublic = crypto
    .createPublicKey(privateKey)
    .export({type: "spki", format: "pem"})
    .toString();

  const normalize = (s) => s.replace(/\r\n/g, "\n").trim();
  if (normalize(derivedPublic) !== normalize(publicKey)) {
    throw new Error(
      "RSA key mismatch: public.pem does not match private.pem. Regenerate both files together."
    );
  }
} catch (e) {
  // Throwing here prevents the server from starting with a broken keypair.
  throw e;
}
