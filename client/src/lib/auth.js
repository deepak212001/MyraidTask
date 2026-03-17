import { api } from "./api";

export async function register(data) {
  const res = await api.post("/users/register", data);
  return res;
}

export async function login(data) {
  const res = await api.post("/users/login", data);
  return res;
}

export async function logout() {
  return api.post("/users/logout");
}

export async function getMe() {
  const res = await api.get("/users/me");
  return res;
}
