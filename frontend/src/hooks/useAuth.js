import { useCallback, useMemo, useState } from "react";

import { loginUser, registerUser } from "api/authApi";

const AUTH_STORAGE_KEY = "electricity_household_user";

export function getStoredUser() {
  const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

function getUserFromResponse(response) {
  const user = response?.user || {
    user_id: response?.user_id,
    username: response?.username,
    email: response?.email,
    role: response?.role,
    daya_terpasang: response?.daya_terpasang,
    jumlah_penghuni: response?.jumlah_penghuni,
  };

  return {
    ...user,
    access_token: response?.access_token,
    refresh_token: response?.refresh_token,
    token_type: response?.token_type,
    expires_in: response?.expires_in,
    refresh_expires_in: response?.refresh_expires_in,
  };
}

export function getRedirectPathByRole(role) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  return "/dashboard";
}

export default function useAuth() {
  const [user, setUser] = useState(() => getStoredUser());

  const login = useCallback(async (payload) => {
    const response = await loginUser(payload);
    const loggedInUser = getUserFromResponse(response);

    saveUser(loggedInUser);
    setUser(loggedInUser);

    return loggedInUser;
  }, []);

  const register = useCallback(async (payload) => {
    return registerUser(payload);
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user?.user_id),
      login,
      register,
      logout,
    }),
    [login, logout, register, user]
  );
}
