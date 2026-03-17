import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY or JWT_SECRET must be set for encryption");
  }
  return crypto.scryptSync(secret, "salt", KEY_LENGTH);
}

export function encrypt(text) {
  if (!text) return "";
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    const tag = cipher.getAuthTag();
    return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
  } catch (err) {
    console.error("Encryption error:", err.message);
    return text;
  }
}

export function decrypt(encryptedText) {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText;
    const key = getKey();
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
  } catch (err) {
    console.error("Decryption error:", err.message);
    return encryptedText;
  }
}
