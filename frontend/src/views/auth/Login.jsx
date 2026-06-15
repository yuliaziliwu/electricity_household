import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { MdLogin } from "react-icons/md";

import { normalizeErrorMessage } from "constants/messages";
import useAuth, { getRedirectPathByRole } from "hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({
    username: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [routeFeedback, setRouteFeedback] = useState(() => ({
    message: location.state?.message || "",
    type: location.state?.type || "error",
  }));

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
    setRouteFeedback({ message: "", type: "error" });
    setIsSubmitting(true);

    try {
      const user = await login(form);
      navigate(getRedirectPathByRole(user.role), { replace: true });
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1fr_440px]">
        <div className="rounded-lg bg-[#12312b] p-6 text-white shadow-lg md:p-8">
          <div className="mb-5 inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-emerald-100">
            Sistem Listrik Rumah Tangga
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Masuk untuk memantau profil konsumsi listrik rumah.
          </h1>
          <p className="mt-5 text-base leading-7 text-emerald-50">
            Akun admin diarahkan ke dashboard admin, sedangkan pengguna rumah
            tangga diarahkan ke dashboard pribadi.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-emerald-50 sm:grid-cols-2">
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              Redirect otomatis sesuai role.
            </div>
            <div className="rounded-md border border-white/15 bg-white/10 p-4">
              Data login tersimpan untuk protected route.
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-[#cfded6] bg-[#fffdf7] p-6 shadow-lg shadow-emerald-950/10"
        >
          <div className="mb-6 rounded-md bg-[#e5f2ec] p-4">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-[#176b52] text-white">
              <MdLogin className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#13201d]">Login</h2>
            <p className="mt-2 text-sm text-[#4a5a55]">
              Gunakan username dan password yang terdaftar.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {routeFeedback.message ? (
            <div
              className={`mb-4 rounded-md border px-4 py-3 text-sm ${
                routeFeedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {routeFeedback.message}
            </div>
          ) : null}

          <label className="mb-4 block">
            <span className="mb-2 block text-sm font-semibold text-[#243b34]">
              Username
            </span>
            <input
              className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              name="username"
              placeholder="Masukkan username"
              value={form.username}
              onChange={handleChange}
              required
            />
          </label>

          <label className="mb-6 block">
            <span className="mb-2 block text-sm font-semibold text-[#243b34]">
              Password
            </span>
            <input
              className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              name="password"
              placeholder="Masukkan password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84]"
            type="submit"
            disabled={isSubmitting}
          >
            <MdLogin className="h-5 w-5" />
            {isSubmitting ? "Memproses..." : "Masuk / Login"}
          </button>

          <p className="mt-5 text-center text-sm text-[#4a5a55]">
            Belum punya akun?{" "}
            <Link className="font-semibold text-[#176b52]" to="/register">
              Register
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
