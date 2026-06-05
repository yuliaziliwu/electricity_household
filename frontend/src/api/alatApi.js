import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getAlat(userId) {
  return axiosClient.get("/api/alat", authHeaders(userId));
}

export function createAlatBulk(userId, alat) {
  return axiosClient.post("/api/alat/bulk", { alat }, authHeaders(userId));
}

export function updateAlat(userId, alatId, payload) {
  return axiosClient.put(`/api/alat/${alatId}`, payload, authHeaders(userId));
}

export function deleteAlat(userId, alatId) {
  return axiosClient.delete(`/api/alat/${alatId}`, authHeaders(userId));
}
