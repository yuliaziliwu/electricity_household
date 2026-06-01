import { useNavigate } from "react-router-dom";

import useAuth from "hooks/useAuth";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-white/10 bg-white/10 p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-300">
              Dashboard Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold">Halo, {user?.username}</h1>
          </div>
          <button
            className="h-10 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-red-300 hover:text-red-200"
            onClick={handleLogout}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-sm text-slate-500">Role</p>
            <p className="mt-2 text-2xl font-bold">{user?.role}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-sm text-slate-500">Email</p>
            <p className="mt-2 text-xl font-bold">{user?.email || "-"}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white p-5 text-slate-950 shadow-sm">
            <p className="text-sm text-slate-500">User ID</p>
            <p className="mt-2 text-2xl font-bold">{user?.user_id}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
