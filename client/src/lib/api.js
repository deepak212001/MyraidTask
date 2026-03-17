// const API_BASE ="http://localhost:7000/api/v1";
const API_BASE = "https://myraid-task-r2yj.vercel.app/api/v1";

export const api = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.message || "Request failed");
    }
    return json;
  },

  get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  },
};
