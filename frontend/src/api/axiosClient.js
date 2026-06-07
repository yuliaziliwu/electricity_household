const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

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

function parseRequestBody(body) {
  if (!body) {
    return null;
  }

  if (typeof body !== "string") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const { headers: optionHeaders = {}, ...fetchOptions } = options;
  const method = fetchOptions.method || "GET";
  const requestBody = parseRequestBody(fetchOptions.body);

  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...optionHeaders,
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      data?.error || data?.message || response.statusText || "Request gagal";
    const error = new Error(message);
    error.status = response.status;
    error.url = url;
    error.method = method;
    error.requestBody = requestBody;
    error.responseData = data;

    if (process.env.NODE_ENV === "development") {
      console.error("API request failed", {
        status: response.status,
        url,
        method,
        requestBody,
        responseData: data,
      });
    }

    throw error;
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
