import { api } from "./api";

export async function register(name, email, password) {
  const res = await api.post("/users/register", { name, email, password });
  return res;
}

export async function login(email, password) {
  const res = await api.post("/users/login", { email, password });
  return res;
}

export async function logout() {
  return api.post("/users/logout");
}

export async function getMe() {
  const res = await api.get("/users/me");
  return res;
}
