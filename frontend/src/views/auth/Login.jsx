import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import useAuth, { getRedirectPathByRole } from "hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const user = await login(form);
      navigate(getRedirectPathByRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <section className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Sistem Listrik Rumah Tangga
          </p>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
            Masuk untuk memantau profil konsumsi listrik rumah.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Akun admin diarahkan ke dashboard admin, sedangkan pengguna rumah
            tangga diarahkan ke dashboard pribadi.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-950">Login</h2>
            <p className="mt-2 text-sm text-slate-600">
              Gunakan username dan password yang terdaftar.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Username
            </span>
            <input
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </span>
            <input
              className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button
            className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Memproses..." : "Login"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-600">
            Belum punya akun?{" "}
            <Link className="font-semibold text-emerald-700" to="/register">
              Register
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
