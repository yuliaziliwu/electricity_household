import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getTagihan(userId) {
  return axiosClient.get("/tagihan", authHeaders(userId));
}

export function createTagihanBulk(userId, tagihan) {
  return axiosClient.post("/tagihan/bulk", { tagihan }, authHeaders(userId));
}

export function updateTagihan(userId, tagihanId, payload) {
  return axiosClient.put(
    `/tagihan/${tagihanId}`,
    payload,
    authHeaders(userId)
  );
}

export function deleteTagihan(userId, tagihanId) {
  return axiosClient.delete(`/tagihan/${tagihanId}`, authHeaders(userId));
}
