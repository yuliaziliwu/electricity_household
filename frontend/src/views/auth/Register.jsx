import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MdPersonAdd } from "react-icons/md";

import { APP_MESSAGES, normalizeErrorMessage } from "constants/messages";
import useAuth from "hooks/useAuth";
import useTarifOptions from "hooks/useTarifOptions";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { options, isLoading, error, isFallback } = useTarifOptions();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    daya_terpasang: "",
    jumlah_penghuni: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await register({
        username: form.username,
        email: form.email,
        password: form.password,
        daya_terpasang: Number(form.daya_terpasang),
        jumlah_penghuni: Number(form.jumlah_penghuni),
      });

      setSuccessMessage(APP_MESSAGES.auth.registerSuccess);
      setTimeout(
        () =>
          navigate("/login", {
            state: {
              message: APP_MESSAGES.auth.registerSuccess,
              type: "success",
            },
          }),
        700
      );
    } catch (err) {
      setSubmitError(normalizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[1fr_500px]">
        <div className="rounded-lg bg-[#12312b] p-6 text-white shadow-lg md:p-8">
          <div className="mb-5 inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-emerald-100">
            Registrasi 
          </div>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Buat profil awal untuk analisis listrik rumah.
          </h1>
          <div className="mt-6 rounded-md border border-white/15 bg-white/10 p-4 text-sm leading-6 text-emerald-50">
            Siapkan username, email, password, daya terpasang, dan jumlah
            penghuni untuk membuat profil awal.
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-[#cfded6] bg-[#fffdf7] p-6 shadow-lg shadow-emerald-950/10"
        >
          <div className="mb-6 rounded-md bg-[#e5f2ec] p-4">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-[#176b52] text-white">
              <MdPersonAdd className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[#13201d]">Register</h2>
            <p className="mt-2 text-sm text-[#4a5a55]">
              Lengkapi data akun dan profil rumah.
            </p>
          </div>

          {submitError ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {isFallback ? (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              API pilihan daya belum tersedia. Dropdown memakai fallback
              sementara. {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#243b34]">
                Username
              </span>
              <input
                className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                name="username"
                placeholder="Contoh: budi123"
                value={form.username}
                onChange={handleChange}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#243b34]">
                Email
              </span>
              <input
                className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                name="email"
                placeholder="nama@email.com"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-semibold text-[#243b34]">
              Password
            </span>
            <input
              className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              name="password"
              placeholder="Minimal 6 karakter"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#243b34]">
                Daya Terpasang
              </span>
              <select
                className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                name="daya_terpasang"
                value={form.daya_terpasang}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="">
                  {isLoading ? "Memuat daya..." : "Daya Rumah"}
                </option>
                {options.map((option) => (
                  <option key={option.daya_va} value={option.daya_va}>
                    {option.daya_va} VA
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#243b34]">
                Jumlah Penghuni
              </span>
              <input
                className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm text-[#13201d] outline-none transition placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                min="1"
                name="jumlah_penghuni"
                placeholder="Contoh: 4"
                type="number"
                value={form.jumlah_penghuni}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <button
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84]"
            type="submit"
            disabled={isSubmitting || isLoading}
          >
            <MdPersonAdd className="h-5 w-5" />
            {isSubmitting ? "Mendaftarkan..." : "Submit / Register"}
          </button>

          <p className="mt-5 text-center text-sm text-[#4a5a55]">
            Sudah punya akun?{" "}
            <Link className="font-semibold text-[#176b52]" to="/login">
              Login
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
