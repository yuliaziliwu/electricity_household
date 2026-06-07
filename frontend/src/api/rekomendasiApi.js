import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getRekomendasi(userId) {
  return axiosClient.get("/rekomendasi", authHeaders(userId));
}

export function getRiwayatRekomendasi(userId) {
  return axiosClient.get("/rekomendasi/riwayat", authHeaders(userId));
}

export function markRekomendasiApplied(userId, rekomendasiId) {
  return axiosClient.put(
    `/rekomendasi/${rekomendasiId}/terapkan`,
    {},
    authHeaders(userId)
  );
}
