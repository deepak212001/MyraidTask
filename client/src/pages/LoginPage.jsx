import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../lib/auth";
import { fetchPublicKey } from "../crypto/publicKey.js";
import { hybridDecryptResponse, hybridEncrypt } from "../crypto/aes.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverPublicKey, setServerPublicKey] = useState("");
  const [decryptedResponse, setDecryptedResponse] = useState(null);
  const { user, loading: authLoading, setUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadKey() {
      const key = await fetchPublicKey();
      setServerPublicKey(key);
    }
    loadKey();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (user) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = {
      email: email,
      password: password,
    };
    const encryptedPayload = await hybridEncrypt(formData, serverPublicKey);
    console.log("encryptedRequest", encryptedPayload);

    try {
      const res = await login({
        encryptedData: encryptedPayload.encryptedData,
        encryptedAESKey: encryptedPayload.encryptedAESKey,
        iv: encryptedPayload.iv,
      });
      console.log("res", res);
      let payload = res;
      // If backend returns encrypted response, decrypt it using the same AES key we generated for the request.
      if (
        payload?.encrypted === true &&
        payload?.encryptedData &&
        payload?.iv
      ) {
        try {
          if (
            payload?.encryptedAESKey &&
            payload.encryptedAESKey !== encryptedPayload.encryptedAESKey
          ) {
            throw new Error(
              "Encrypted response does not match this request (encryptedAESKey mismatch)",
            );
          }
          if (payload?.iv && payload.iv !== encryptedPayload.iv) {
            throw new Error(
              "Encrypted response does not match this request (iv mismatch)",
            );
          }
          payload = await hybridDecryptResponse(
            payload,
            encryptedPayload.aesKey,
          );
        } catch (err) {
          console.error("Failed to decrypt login response:", err);
          payload = {
            decryptError: err?.message || String(err),
            rawEncryptedResponse: response.data,
          };
        }
      }
      console.log("payload", payload);
      setDecryptedResponse(payload);
      setUser(payload.user);
      console.log("response: ", payload);
      // setUser(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--card)] rounded-2xl p-8 shadow-xl border border-zinc-800">
          <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
          <p className="text-zinc-400 text-center mb-8">
            Sign in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-zinc-400 text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-indigo-400 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
