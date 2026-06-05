import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getTagihan(userId) {
  return axiosClient.get("/api/tagihan", authHeaders(userId));
}

export function createTagihanBulk(userId, tagihan) {
  return axiosClient.post("/api/tagihan/bulk", { tagihan }, authHeaders(userId));
}

export function updateTagihan(userId, tagihanId, payload) {
  return axiosClient.put(
    `/api/tagihan/${tagihanId}`,
    payload,
    authHeaders(userId)
  );
}

export function deleteTagihan(userId, tagihanId) {
  return axiosClient.delete(`/api/tagihan/${tagihanId}`, authHeaders(userId));
}
