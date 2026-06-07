import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getPemakaian(userId) {
  return axiosClient.get("/pemakaian", authHeaders(userId));
}

export function createPemakaianBulk(userId, payload) {
  return axiosClient.post("/pemakaian/bulk", payload, authHeaders(userId));
}

export function updatePemakaian(userId, pemakaianId, payload) {
  return axiosClient.put(
    `/pemakaian/${pemakaianId}`,
    payload,
    authHeaders(userId)
  );
}

export function deletePemakaian(userId, pemakaianId) {
  return axiosClient.delete(
    `/pemakaian/${pemakaianId}`,
    authHeaders(userId)
  );
}
