import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

      setSuccessMessage("Registrasi berhasil. Silakan login.");
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <section className="mx-auto grid min-h-[calc(100vh-64px)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-normal text-emerald-700">
            Registrasi Mandiri
          </p>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 md:text-5xl">
            Buat profil awal untuk analisis listrik rumah.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-600">
            Role pengguna baru otomatis menjadi end_user. Pilihan daya diambil
            dari tarif aktif yang tersimpan di database.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-950">Register</h2>
            <p className="mt-2 text-sm text-slate-600">
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

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </span>
              <input
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <label className="mt-4 block">
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

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Daya Terpasang
              </span>
              <select
                className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                name="daya_terpasang"
                value={form.daya_terpasang}
                onChange={handleChange}
                required
                disabled={isLoading}
              >
                <option value="">
                  {isLoading ? "Memuat daya..." : "Pilih daya"}
                </option>
                {options.map((option) => (
                  <option key={option.daya_va} value={option.daya_va}>
                    {option.daya_va} VA
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Jumlah Penghuni
              </span>
              <input
                className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                min="1"
                name="jumlah_penghuni"
                type="number"
                value={form.jumlah_penghuni}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <button
            className="mt-6 h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? "Mendaftarkan..." : "Register"}
          </button>

          <p className="mt-5 text-center text-sm text-slate-600">
            Sudah punya akun?{" "}
            <Link className="font-semibold text-emerald-700" to="/login">
              Login
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
