const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

const AUTH_STORAGE_KEY = "electricity_household_user";

function getAuthHeaders(userId) {
  const headers = {};
  const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);

  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      if (user?.access_token) {
        headers.Authorization = `Bearer ${user.access_token}`;
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }

  if (userId) {
    headers["X-User-Id"] = userId;
  }

  return headers;
}

async function downloadPdf(path, filename, userId) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: getAuthHeaders(userId),
  });

  if (!response.ok) {
    let message = response.statusText || "Download PDF gagal";
    try {
      const data = await response.json();
      message = data?.error || data?.message || message;
    } catch {
      // Response PDF/error non-JSON tetap memakai status text.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function downloadBulananPrediksiPdf(userId) {
  return downloadPdf(
    "/laporan/bulanan-prediksi.pdf",
    "laporan-bulanan-prediksi.pdf",
    userId
  );
}

export function downloadPrediksiPdf(userId) {
  return downloadPdf("/laporan/prediksi.pdf", "laporan-prediksi.pdf", userId);
}
