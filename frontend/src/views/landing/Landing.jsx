import { Link } from "react-router-dom";
import { MdBolt, MdLogin, MdPersonAdd } from "react-icons/md";

import authImg from "assets/img/auth/auth.png";

export default function Landing() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 md:px-8 lg:grid-cols-[1fr_520px]">
        <div className="max-w-3xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-emerald-700 text-white">
            <MdBolt className="h-7 w-7" />
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Sistem Analisis Konsumsi Listrik Rumah Tangga
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Kelola profil rumah, masuk sesuai role, dan siapkan dasar data
            untuk fitur prediksi biaya listrik berikutnya.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              to="/register"
            >
              <MdPersonAdd className="h-5 w-5" />
              Register
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 px-5 text-sm font-semibold text-slate-800 transition hover:border-emerald-700 hover:text-emerald-700"
              to="/login"
            >
              <MdLogin className="h-5 w-5" />
              Login
            </Link>
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden rounded-lg bg-slate-100 shadow-sm">
          <img
            alt="Dashboard preview"
            className="absolute inset-0 h-full w-full object-cover"
            src={authImg}
          />
        </div>
      </section>
    </main>
  );
}
