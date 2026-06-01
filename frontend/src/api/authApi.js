import axiosClient from "api/axiosClient";

export function registerUser(payload) {
  return axiosClient.post("/api/auth/register", payload);
}

export function loginUser(payload) {
  return axiosClient.post("/api/auth/login", payload);
}
