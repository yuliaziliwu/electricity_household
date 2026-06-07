import axiosClient from "api/axiosClient";

export function registerUser(payload) {
  return axiosClient.post("/auth/register", payload);
}

export function loginUser(payload) {
  return axiosClient.post("/auth/login", payload);
}

export function refreshToken(refresh_token) {
  return axiosClient.post("/auth/refresh", { refresh_token });
}
