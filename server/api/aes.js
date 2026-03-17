import crypto from "crypto";
import {privateKey} from "../key.js";

function toBufferAuto(input) {
  if (typeof input !== "string") {
    throw new Error("Invalid payload: expected string");
  }

  const s = input.trim();

  // hex?
  if (/^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0) {
    return Buffer.from(s, "hex");
  }

  // base64url -> base64
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return Buffer.from(b64, "base64");
}

function hybridDecrypt(payload) {
  const {encryptedData, encryptedAESKey, iv, authTag: authTagB64} = payload;

  const aesKey = decryptAesKey(encryptedAESKey);

  // 2️⃣ Get ciphertext + authTag
  // Preferred: authTag appended to `encryptedData` (ciphertext || authTag)
  // Legacy (supported): `authTag` provided separately, and `encryptedData` is ciphertext only
  const encryptedBuffer = toBufferAuto(encryptedData);
  let authTag;
  let actualData;
  if (authTagB64) {
    authTag = toBufferAuto(authTagB64);
    actualData = encryptedBuffer;
  } else {
    if (encryptedBuffer.length < 16) {
      throw new Error("Invalid encryptedData: missing authTag");
    }
    authTag = encryptedBuffer.slice(encryptedBuffer.length - 16);
    actualData = encryptedBuffer.slice(0, encryptedBuffer.length - 16);
  }

  // 3️⃣ AES decrypt
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    aesKey,
    toBufferAuto(iv)
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(actualData, null, "utf8");
  decrypted += decipher.final("utf8");
  console.log("decrypted: ", decrypted);
  return JSON.parse(decrypted);
}

function decryptAesKey(encryptedAESKey) {
  // 1️⃣ RSA decrypt AES key
  const encryptedKeyBuf = toBufferAuto(encryptedAESKey);
  const rsaAttempts = [
    {padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256"},
    {padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha1"},
  ];

  let aesKey;
  let lastErr;
  for (const opts of rsaAttempts) {
    try {
      aesKey = crypto.privateDecrypt(
        {key: privateKey, ...opts},
        encryptedKeyBuf
      );
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!aesKey) {
    const err = new Error(
      "RSA decrypt failed (encryptedAESKey). Ensure client is using the latest public key and matching padding/hash."
    );
    err.cause = lastErr;
    err.code = lastErr?.code;
    throw err;
  }

  return aesKey;
}

function encryptJsonWithAesKey(responseData, aesKey, ivInput) {
  const ivBytes = ivInput
    ? typeof ivInput === "string"
      ? toBufferAuto(ivInput)
      : Buffer.from(ivInput)
    : crypto.randomBytes(12); // recommended for GCM

  if (ivBytes.length !== 12) {
    throw new Error(
      `Invalid iv length for AES-GCM: expected 12 bytes, got ${ivBytes.length}`
    );
  }

  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, ivBytes);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(responseData), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedData: Buffer.concat([ciphertext, authTag]).toString("base64"),
    // echo the same iv format if a string was provided
    iv: typeof ivInput === "string" ? ivInput : ivBytes.toString("base64"),
  };
}

function hybridDecryptWithKey(payload) {
  const aesKey = decryptAesKey(payload?.encryptedAESKey);
  const data = hybridDecrypt(payload);
  return {data, aesKey};
}

function normalizePem(pem) {
  if (typeof pem !== "string") return "";
  // Support keys sent as JSON strings with escaped newlines
  let s = pem.replace(/\\n/g, "\n").trim();

  // If client sends PEM via HTTP header, it often arrives as a single line:
  // "-----BEGIN PUBLIC KEY-----MIIB...IDAQAB-----END PUBLIC KEY-----"
  // Re-wrap it into a valid PEM with newlines + 64-char base64 lines.
  const m = s.match(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/i);
  if (m) {
    const type = m[1].toUpperCase();
    const b64 = (m[2] || "").replace(/[\r\n\s]/g, "");
    if (!b64) return "";
    const wrapped = b64.match(/.{1,64}/g)?.join("\n") || b64;
    s = `-----BEGIN ${type}-----\n${wrapped}\n-----END ${type}-----\n`;
  }

  return s.trim();
}

/**
 * Hybrid-encrypt a JSON-serializable response for the client:
 * - generate random AES-256 key
 * - AES-256-GCM encrypt response JSON
 * - RSA-OAEP(SHA-256) encrypt AES key with client's public key
 */
function hybridEncryptForClient(responseData, clientPublicKey) {
  console.log("clientPublicKey: ", clientPublicKey);
  const pub = normalizePem(clientPublicKey);
  console.log("pub: ", pub);
  if (!pub) {
    throw new Error("Missing client public key");
  }

  // Validate/normalize to a KeyObject early (gives clearer errors than publicEncrypt).
  const publicKeyObj = crypto.createPublicKey(pub);
  console.log("publicKeyObj: ", publicKeyObj);
  console.log("publicKeyObj: type ", typeof publicKeyObj);
  const aesKey = crypto.randomBytes(32); // AES-256
  const iv = crypto.randomBytes(12); // recommended for GCM

  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(responseData), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const encryptedAESKey = crypto.publicEncrypt(
    {
      key: publicKeyObj,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    aesKey
  );

  return {
    encryptedData: Buffer.concat([ciphertext, authTag]).toString("base64"),
    iv: iv.toString("base64"),
    encryptedAESKey: encryptedAESKey.toString("base64"),
  };
}

export {
  hybridDecrypt,
  hybridDecryptWithKey,
  decryptAesKey,
  encryptJsonWithAesKey,
  hybridEncryptForClient,
};
