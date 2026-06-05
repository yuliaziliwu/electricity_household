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
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-[#12312b] bg-[#12312b] p-6 text-white shadow-lg md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-200">
              Dashboard End User
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Dashboard Konsumsi Listrik
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
              Halo, {user?.username}. Berikut ringkasan profil dan daftar modul
              yang akan dikembangkan untuk sistem analisis listrik rumah.
            </p>
          </div>
          <button
            className="h-10 rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Role</p>
            <p className="mt-2 text-2xl font-bold text-[#13201d]">
              {user?.role}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Daya Terpasang</p>
            <p className="mt-2 text-2xl font-bold text-[#13201d]">
              {user?.daya_terpasang} VA
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Jumlah Penghuni</p>
            <p className="mt-2 text-2xl font-bold text-[#13201d]">
              {user?.jumlah_penghuni}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-bold text-[#13201d]">Daftar Modul</h2>
          <p className="mt-2 text-sm text-[#4a5a55]">
            Card berikut masih berupa navigasi sementara agar dashboard tidak
            kosong dan struktur fitur mudah dipahami.
          </p>
        </div>

        <ModuleGrid />
      </section>
    </main>
  );
}
