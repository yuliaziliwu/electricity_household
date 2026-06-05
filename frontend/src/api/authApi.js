import axiosClient from "api/axiosClient";

export function registerUser(payload) {
  return axiosClient.post("/api/auth/register", payload);
}

export function loginUser(payload) {
  return axiosClient.post("/api/auth/login", payload);
}

export function refreshToken(refresh_token) {
  return axiosClient.post("/api/auth/refresh", { refresh_token });
}
