import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getAlat(userId) {
  return axiosClient.get("/alat", authHeaders(userId));
}

export function createAlatBulk(userId, alat) {
  return axiosClient.post("/alat/bulk", { alat }, authHeaders(userId));
}

export function updateAlat(userId, alatId, payload) {
  return axiosClient.put(`/alat/${alatId}`, payload, authHeaders(userId));
}

export function deleteAlat(userId, alatId) {
  return axiosClient.delete(`/alat/${alatId}`, authHeaders(userId));
}
