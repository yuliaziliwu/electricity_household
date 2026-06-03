import { useNavigate } from "react-router-dom";

import ModuleGrid from "components/module/ModuleGrid";
import useAuth from "hooks/useAuth";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
              Dashboard End User
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
              Dashboard Konsumsi Listrik
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Halo, {user?.username}. Berikut ringkasan profil dan daftar modul
              yang akan dikembangkan untuk sistem analisis listrik rumah.
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Role</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {user?.role}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Daya Terpasang</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {user?.daya_terpasang} VA
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Jumlah Penghuni</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">
              {user?.jumlah_penghuni}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-950">Daftar Modul</h2>
          <p className="mt-2 text-sm text-slate-600">
            Card berikut masih berupa navigasi sementara agar dashboard tidak
            kosong dan struktur fitur mudah dipahami.
          </p>
        </div>

        <ModuleGrid />
      </section>
    </main>
  );
}
