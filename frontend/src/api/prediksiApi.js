import axiosClient from "api/axiosClient";

function authHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function createPrediksi(userId) {
  return axiosClient.post("/prediksi", {}, authHeaders(userId));
}

export function getLatestPrediksi(userId) {
  return axiosClient.get("/prediksi/latest", authHeaders(userId));
}

export function getPrediksiHistory(userId) {
  return axiosClient.get("/prediksi/history", authHeaders(userId));
}
