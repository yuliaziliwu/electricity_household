import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getPemakaian(userId) {
  return axiosClient.get("/api/pemakaian", authHeaders(userId));
}

export function createPemakaianBulk(userId, payload) {
  return axiosClient.post("/api/pemakaian/bulk", payload, authHeaders(userId));
}

export function updatePemakaian(userId, pemakaianId, payload) {
  return axiosClient.put(
    `/api/pemakaian/${pemakaianId}`,
    payload,
    authHeaders(userId)
  );
}

export function deletePemakaian(userId, pemakaianId) {
  return axiosClient.delete(
    `/api/pemakaian/${pemakaianId}`,
    authHeaders(userId)
  );
}
