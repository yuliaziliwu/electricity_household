export const APP_MESSAGES = {
  auth: {
    invalidLogin: "Data login tidak valid. Periksa username dan password.",
    loginRequired: "Silakan login terlebih dahulu untuk mengakses fitur utama.",
    registerSuccess:
      "Akun pengguna berhasil dibuat dengan role end_user. Silakan login.",
  },
  tagihan: {
    createSuccess:
      "Data tagihan berhasil disimpan dan muncul pada riwayat tagihan.",
    updateSuccess: "Data tagihan berhasil diperbarui pada riwayat tagihan.",
    deleteSuccess: "Data tagihan berhasil dihapus dari riwayat tagihan.",
    minRows: "Input tagihan wajib minimal 3 bulan.",
    maxRows: "Input tagihan maksimal 6 bulan.",
    duplicateMonthYear: "Bulan dan tahun tidak boleh sama.",
  },
  alat: {
    createSuccess:
      "Data alat elektronik berhasil disimpan dan tampil pada daftar alat.",
    updateSuccess: "Data alat elektronik berhasil diperbarui pada daftar alat.",
    deleteSuccess: "Data alat elektronik berhasil dihapus dari daftar alat.",
  },
  pemakaian: {
    createSuccess:
      "Data pemakaian harian berhasil disimpan dan konsumsi kWh tampil pada ringkasan harian.",
    updateSuccess:
      "Data pemakaian harian berhasil diperbarui pada ringkasan harian.",
    deleteSuccess:
      "Data pemakaian harian berhasil dihapus dari ringkasan harian.",
    invalidJam:
      "Jam aktual harus berada pada rentang 0 sampai 24 jam.",
  },
  prediksi: {
    createSuccess:
      "Prediksi biaya listrik bulan berikutnya berhasil dibuat dan tersimpan ke riwayat prediksi.",
    exportSuccess: "Laporan prediksi berhasil dibuat dan diunduh.",
  },
  rekomendasi: {
    createSuccess:
      "Rekomendasi penghematan berhasil dibuat berdasarkan aturan DSS.",
    applySuccess: "Status rekomendasi berubah menjadi sudah diterapkan.",
  },
  laporan: {
    exportSuccess: "Laporan penggunaan listrik berhasil dibuat dan diunduh.",
  },
};

export function normalizeErrorMessage(error, fallbackMessage = "Request gagal") {
  const message =
    typeof error === "string" ? error : error?.message || fallbackMessage;
  const normalized = message.toLowerCase();

  if (normalized.includes("username atau password salah")) {
    return APP_MESSAGES.auth.invalidLogin;
  }

  if (normalized.includes("header authorization")) {
    return APP_MESSAGES.auth.loginRequired;
  }

  if (
    normalized.includes("input tagihan wajib") ||
    normalized.includes("minimal 3")
  ) {
    return APP_MESSAGES.tagihan.minRows;
  }

  if (
    normalized.includes("bulan dan tahun tidak boleh duplikat") ||
    normalized.includes("bulan dan tahun tagihan sudah pernah diinput")
  ) {
    return APP_MESSAGES.tagihan.duplicateMonthYear;
  }

  if (normalized.includes("jam aktual harus 0 sampai 24")) {
    return APP_MESSAGES.pemakaian.invalidJam;
  }

  return message;
}
