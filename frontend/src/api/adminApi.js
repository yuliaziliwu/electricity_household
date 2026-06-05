import axiosClient from "api/axiosClient";

function adminHeaders(userId) {
  return {
    headers: {
      "X-User-Id": userId,
    },
  };
}

export function getAdminUsers(userId) {
  return axiosClient.get("/api/admin/users", adminHeaders(userId));
}

export function updateAdminUserRole(userId, targetUserId, role) {
  return axiosClient.put(
    `/api/admin/users/${targetUserId}/role`,
    { role },
    adminHeaders(userId)
  );
}

export function getAdminTarif(userId) {
  return axiosClient.get("/api/admin/tarif", adminHeaders(userId));
}

export function createAdminTarif(userId, payload) {
  return axiosClient.post("/api/admin/tarif", payload, adminHeaders(userId));
}

export function updateAdminTarif(userId, tarifId, payload) {
  return axiosClient.put(
    `/api/admin/tarif/${tarifId}`,
    payload,
    adminHeaders(userId)
  );
}

export function deleteAdminTarif(userId, tarifId) {
  return axiosClient.delete(
    `/api/admin/tarif/${tarifId}`,
    adminHeaders(userId)
  );
}

export function getAdminStatistics(userId) {
  return axiosClient.get("/api/admin/statistics", adminHeaders(userId));
}

export function getAdminDssRules(userId) {
  return axiosClient.get("/api/admin/dss-rules", adminHeaders(userId));
}

export function createAdminDssRule(userId, payload) {
  return axiosClient.post("/api/admin/dss-rules", payload, adminHeaders(userId));
}

export function updateAdminDssRule(userId, ruleId, payload) {
  return axiosClient.put(
    `/api/admin/dss-rules/${ruleId}`,
    payload,
    adminHeaders(userId)
  );
}

export function deleteAdminDssRule(userId, ruleId) {
  return axiosClient.delete(
    `/api/admin/dss-rules/${ruleId}`,
    adminHeaders(userId)
  );
}

export function retrainAdminModel(userId) {
  return axiosClient.post("/api/admin/retrain-model", {}, adminHeaders(userId));
}
