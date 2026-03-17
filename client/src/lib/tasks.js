import { api } from "./api";

export async function getTasks(params = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  if (params.status) searchParams.set("status", params.status);
  if (params.search) searchParams.set("search", params.search);
  const qs = searchParams.toString();
  return api.get(`/tasks${qs ? `?${qs}` : ""}`);
}

export async function createTask(data) {
  return api.post("/tasks", data);
}

export async function updateTask(id, data) {
  return api.patch(`/tasks/${id}`, data);
}

export async function deleteTask(id) {
  return api.delete(`/tasks/${id}`);
}
