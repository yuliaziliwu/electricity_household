import axiosClient from "api/axiosClient";

export function getDayaOptions() {
  return axiosClient.get("/api/admin/tarif/daya-options");
}
