import { useNavigate } from "react-router-dom";

import useAuth from "hooks/useAuth";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">
              Dashboard End User
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Halo, {user?.username}
            </h1>
          </div>
          <button
            className="h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-red-500 hover:text-red-600"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
      </section>
    </main>
  );
}
