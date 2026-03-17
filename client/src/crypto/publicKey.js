export async function fetchPublicKey() {
  // Avoid browser caching; stale public keys cause RSA-OAEP decoding errors after restarts/rotations.
  // const url = `http://localhost:7000/api/v1/crypto/public-key?t=${Date.now()}`;
  const url = `https://myraid-task-r2yj.vercel.app/api/v1/crypto/public-key?t=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return data.publicKey;
}
