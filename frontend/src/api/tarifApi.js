import axiosClient from "api/axiosClient";

export function getDayaOptions() {
  return axiosClient.get("/admin/tarif/daya-options");
}
