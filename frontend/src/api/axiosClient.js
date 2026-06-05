const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const AUTH_STORAGE_KEY = "electricity_household_user";

function getAuthHeaders() {
  const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!savedUser) {
    return {};
  }

  try {
    const user = JSON.parse(savedUser);
    if (user?.access_token) {
      return {
        Authorization: `Bearer ${user.access_token}`,
      };
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return {};
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || "Request gagal";
    throw new Error(message);
  }

  return data;
}

const axiosClient = {
  get(path, options) {
    return request(path, {
      method: "GET",
      ...options,
    });
  },
  post(path, body, options) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    });
  },
  put(path, body, options) {
    return request(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    });
  },
  delete(path, options) {
    return request(path, {
      method: "DELETE",
      ...options,
    });
  },
};

export default axiosClient;
