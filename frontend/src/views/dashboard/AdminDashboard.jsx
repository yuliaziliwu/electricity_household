import { useNavigate } from "react-router-dom";

import ModuleGrid from "components/module/ModuleGrid";
import useAuth from "hooks/useAuth";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">
              Dashboard Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Pusat Kontrol Aplikasi
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Halo, {user?.username}. Halaman ini menjadi titik awal untuk
              mengelola user, tarif, model, dan modul sistem berikutnya.
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-red-300 hover:text-red-200"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-sm text-slate-500">Role</p>
            <p className="mt-2 text-2xl font-bold">{user?.role}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-sm text-slate-500">Email</p>
            <p className="mt-2 text-xl font-bold">{user?.email || "-"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-sm text-slate-500">User ID</p>
            <p className="mt-2 text-2xl font-bold">{user?.user_id}</p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-950">Daftar Modul</h2>
          <p className="mt-2 text-sm text-slate-600">
            Card modul sementara membantu admin melihat arah fitur dari Modul 1
            sampai Modul 10.
          </p>
        </div>

        <ModuleGrid />
      </section>
    </main>
  );
}
