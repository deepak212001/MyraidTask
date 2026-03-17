
function pemToArrayBuffer(pem) {
  const base64 = pem
      .replace(/-----BEGIN [^-]+-----/g, "")
      .replace(/-----END [^-]+-----/g, "")
      .replace(/\s+/g, "");

  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
  }

  return buffer;
}

function concatBytes(...arrays) {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
      out.set(a, offset);
      offset += a.length;
  }
  return out;
}

function derEncodeLength(len) {
  if (len < 128) return Uint8Array.of(len);
  const bytes = [];
  let n = len;
  while (n > 0) {
      bytes.unshift(n & 0xff);
      n >>= 8;
  }
  return Uint8Array.of(0x80 | bytes.length, ...bytes);
}

function derWrap(tag, content) {
  return concatBytes(Uint8Array.of(tag), derEncodeLength(content.length), content);
}

// Convert PKCS#1 RSA public key DER to SPKI DER so WebCrypto can import it as "spki".
function pkcs1ToSpki(pkcs1DerBytes) {
  // rsaEncryption OID: 1.2.840.113549.1.1.1
  const rsaEncryptionOid = Uint8Array.of(
      0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01
  );
  const derNull = Uint8Array.of(0x05, 0x00);

  const algorithmIdentifier = derWrap(0x30, concatBytes(rsaEncryptionOid, derNull));
  const subjectPublicKey = derWrap(0x03, concatBytes(Uint8Array.of(0x00), pkcs1DerBytes));

  return derWrap(0x30, concatBytes(algorithmIdentifier, subjectPublicKey)).buffer;
}

async function importRsaPublicKey(pem) {
  const isPkcs1 = /BEGIN RSA PUBLIC KEY/.test(pem);
  let der = pemToArrayBuffer(pem);
  if (isPkcs1) {
      der = pkcs1ToSpki(new Uint8Array(der));
  }

  try {
      return await window.crypto.subtle.importKey(
          "spki",
          der,
          {
              name: "RSA-OAEP",
              hash: "SHA-256",
          },
          false,
          ["encrypt"]
      );
  } catch (e) {
      // Some backends return a PKCS#1 key but label it as "PUBLIC KEY".
      // If SPKI import fails, retry by wrapping the DER as PKCS#1 → SPKI.
      if (!isPkcs1) {
          const wrappedDer = pkcs1ToSpki(new Uint8Array(pemToArrayBuffer(pem)));
          return await window.crypto.subtle.importKey(
              "spki",
              wrappedDer,
              {
                  name: "RSA-OAEP",
                  hash: "SHA-256",
              },
              false,
              ["encrypt"]
          );
      }
      throw e;
  }
}
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function padBase64(b64) {
  const s = String(b64).trim();
  const padLen = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(padLen);
}

function base64ToBytes(b64) {
  // Support base64url variants coming from some backends
  const normalized = padBase64(String(b64).trim().replace(/-/g, "+").replace(/_/g, "/"));
  const binary = atob(normalized);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function hexToBytes(hex) {
  const s = String(hex).trim();
  if (s.length % 2 !== 0) throw new Error("Invalid hex string length");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function decodeToBytes(value) {
  const s = String(value).trim();
  const isHex = /^[0-9a-fA-F]+$/.test(s) && s.length % 2 === 0;
  return isHex ? hexToBytes(s) : base64ToBytes(s);
}

function parseIvToBytes(iv) {
  return decodeToBytes(iv);
}

function arrayBufferToPem(buffer, label) {
  const b64 = bufferToBase64(buffer);
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

export async function generateClientRsaKeyPair() {
  return await window.crypto.subtle.generateKey(
      {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
  );
}

export async function exportRsaPublicKeyToPem(publicKey) {
  const spki = await window.crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToPem(spki, "PUBLIC KEY");
}

export async function rsaOaepDecryptBase64(base64Ciphertext, privateKey) {
  const cipherBytes = base64ToBytes(base64Ciphertext);
  return await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, cipherBytes);
}

async function decryptAesGcmPayload({ encryptedData, iv, authTag }, aesKey) {
  const ivBytes = parseIvToBytes(iv);
  const cipherBytesGuess = decodeToBytes(encryptedData);
  const tagBytesGuess = authTag != null ? decodeToBytes(authTag) : null;

  const attempts = [];
  // Attempt 1: encryptedData is ciphertext only, authTag is separate.
  if (cipherBytesGuess.length && tagBytesGuess?.length) {
      const combined = new Uint8Array(cipherBytesGuess.length + tagBytesGuess.length);
      combined.set(cipherBytesGuess, 0);
      combined.set(tagBytesGuess, cipherBytesGuess.length);
      attempts.push({ label: "ciphertext+authTag", data: combined });
  }
  // Attempt 2: encryptedData already has the tag appended.
  if (cipherBytesGuess.length > 16) {
      attempts.push({ label: "encryptedDataAlreadyHasTag", data: cipherBytesGuess });
  }

  let lastErr;
  for (const a of attempts) {
      try {
          return await window.crypto.subtle.decrypt(
              { name: "AES-GCM", iv: ivBytes, tagLength: 128 },
              aesKey,
              a.data
          );
      } catch (e) {
          lastErr = e;
      }
  }
  throw lastErr || new Error("AES-GCM decrypt failed");
}

export async function hybridEncrypt(data, serverPublicKeyPem) {
  // 1️⃣ Generate AES key (256-bit)
  const aesKey = await window.crypto.subtle.generateKey(
      {
          name: "AES-GCM",
          length: 256,
      },
      true,
      ["encrypt", "decrypt"]
  );
  console.log("aesKey:", aesKey);
  // 2️⃣ Generate IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3️⃣ Encrypt data using AES
  const encodedData = new TextEncoder().encode(JSON.stringify(data));

  const encryptedData = await window.crypto.subtle.encrypt(
      {
          name: "AES-GCM",
          iv: iv,
      },
      aesKey,
      encodedData
  );

  // 4️⃣ Export raw AES key
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

  // 5️⃣ Import RSA public key
  const rsaPublicKey = await importRsaPublicKey(serverPublicKeyPem);

  // 6️⃣ Encrypt AES key using RSA
  const encryptedAesKey = await window.crypto.subtle.encrypt(
      {
          name: "RSA-OAEP",
      },
      rsaPublicKey,
      rawAesKey
  );

  return {
      encryptedData: bufferToBase64(encryptedData),
      encryptedAESKey: bufferToBase64(encryptedAesKey),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join(""),
      aesKey // store temporarily to decrypt response later
  };
}

export async function hybridDecryptResponse(encryptedResponse, aesKey) {
  const { encryptedData, iv, authTag } = encryptedResponse || {};
  if (!encryptedData || !iv) {
      throw new Error("Missing encryptedData/iv in encrypted response");
  }
  if (!aesKey) {
      throw new Error("Missing aesKey for response decryption");
  }

  const plaintextBuf = await decryptAesGcmPayload({ encryptedData, iv, authTag }, aesKey);
  const plaintext = new TextDecoder().decode(plaintextBuf);
  try {
      return JSON.parse(plaintext);
  } catch {
      return plaintext;
  }
}

export async function hybridDecryptResponseWithRsa(encryptedResponse, clientPrivateKey) {
  const { encryptedData, iv, authTag, encryptedAESKey } = encryptedResponse || {};
  if (!encryptedData || !iv || !encryptedAESKey) {
      throw new Error("Missing encryptedData/iv/encryptedAESKey in encrypted response");
  }
  if (!clientPrivateKey) {
      throw new Error("Missing clientPrivateKey for response decryption");
  }

  // 1) RSA decrypt the AES key (raw bytes)
  const rawAesKey = await rsaOaepDecryptBase64(encryptedAESKey, clientPrivateKey);

  // 2) Import AES key for AES-GCM decrypt
  const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
  );

  // 3) Decrypt AES-GCM payload
  const plaintextBuf = await decryptAesGcmPayload({ encryptedData, iv, authTag }, aesKey);
  const plaintext = new TextDecoder().decode(plaintextBuf);
  try {
      return JSON.parse(plaintext);
  } catch {
      return plaintext;
  }
}