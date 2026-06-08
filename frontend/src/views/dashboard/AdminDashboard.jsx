import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import {
  MdAdd,
  MdAutoFixHigh,
  MdDelete,
  MdEdit,
  MdRefresh,
  MdSave,
} from "react-icons/md";

import {
  createAdminDssRule,
  createAdminTarif,
  deleteAdminDssRule,
  deleteAdminTarif,
  getAdminDssRules,
  getAdminStatistics,
  getAdminTarif,
  getAdminUsers,
  retrainAdminModel,
  updateAdminDssRule,
  updateAdminTarif,
  updateAdminUserRole,
} from "api/adminApi";
import useAuth from "hooks/useAuth";

const today = new Date().toISOString().slice(0, 10);

const emptyTarifForm = {
  daya_va: "",
  tarif_per_kwh: "",
  berlaku_dari: today,
  berlaku_sampai: "",
};

const emptyRuleForm = {
  kode: "",
  nama_aturan: "",
  kondisi: "",
  rekomendasi: "",
  aktif: true,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function validateTarifForm(form) {
  const dayaVa = Number(form.daya_va);
  const tarifPerKwh = Number(form.tarif_per_kwh);

  if (!Number.isFinite(dayaVa) || dayaVa <= 0) {
    return "Daya VA harus lebih dari 0.";
  }

  if (!Number.isFinite(tarifPerKwh) || tarifPerKwh <= 0) {
    return "Tarif per kWh harus lebih dari 0.";
  }

  if (!form.berlaku_dari) {
    return "Tanggal berlaku dari wajib diisi.";
  }

  if (form.berlaku_sampai && form.berlaku_sampai < form.berlaku_dari) {
    return "Tanggal berlaku sampai tidak boleh sebelum berlaku dari.";
  }

  return "";
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <h2 className="text-xl font-bold text-[#13201d]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#4a5a55]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [tarif, setTarif] = useState([]);
  const [rules, setRules] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [tarifForm, setTarifForm] = useState(emptyTarifForm);
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [editingTarifId, setEditingTarifId] = useState(null);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const summary = statistics?.summary || {};
  const totalTagihan = Number(summary.total_tagihan || 0);
  const canRetrainModel = totalTagihan >= 3;

  const monthlyChart = useMemo(() => {
    const rows = statistics?.monthly_consumption || [];
    return {
      series: [
        {
          name: "Konsumsi kWh",
          data: rows.map((row) => Number(row.konsumsi_kWh || 0)),
        },
      ],
      options: {
        chart: { toolbar: { show: false }, zoom: { enabled: false } },
        colors: ["#176b52"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 3 },
        grid: { borderColor: "#d8e1dc" },
        xaxis: {
          categories: rows.map((row) => row.label),
          labels: { style: { colors: "#4a5a55" } },
        },
        yaxis: { labels: { style: { colors: "#4a5a55" } } },
        tooltip: { y: { formatter: (value) => `${formatNumber(value)} kWh` } },
      },
    };
  }, [statistics?.monthly_consumption]);

  const dayaChart = useMemo(() => {
    const rows = statistics?.users_by_daya || [];
    return {
      series: [
        {
          name: "User",
          data: rows.map((row) => Number(row.total || 0)),
        },
      ],
      options: {
        chart: { toolbar: { show: false } },
        colors: ["#0e7490"],
        dataLabels: { enabled: false },
        plotOptions: { bar: { borderRadius: 4, columnWidth: "48%" } },
        grid: { borderColor: "#d8e1dc" },
        xaxis: {
          categories: rows.map((row) => `${row.daya_va} VA`),
          labels: { style: { colors: "#4a5a55" } },
        },
        yaxis: { labels: { style: { colors: "#4a5a55" } } },
      },
    };
  }, [statistics?.users_by_daya]);

  const loadAdminData = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [usersResponse, tarifResponse, statisticsResponse, rulesResponse] =
        await Promise.all([
          getAdminUsers(user.user_id),
          getAdminTarif(user.user_id),
          getAdminStatistics(user.user_id),
          getAdminDssRules(user.user_id),
        ]);

      setUsers(usersResponse.users || []);
      setTarif(tarifResponse.tarif || []);
      setStatistics(statisticsResponse || null);
      setRules(rulesResponse.rules || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function updateTarifForm(field, value) {
    setTarifForm((current) => ({ ...current, [field]: value }));
  }

  function updateRuleForm(field, value) {
    setRuleForm((current) => ({ ...current, [field]: value }));
  }

  function resetTarifForm() {
    setTarifForm(emptyTarifForm);
    setEditingTarifId(null);
  }

  function resetRuleForm() {
    setRuleForm(emptyRuleForm);
    setEditingRuleId(null);
  }

  async function handleRoleChange(targetUserId, role) {
    setMessage("");
    setError("");
    try {
      const response = await updateAdminUserRole(user.user_id, targetUserId, role);
      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.user_id === targetUserId ? response.user : item
        )
      );
      setMessage("Role user berhasil diubah.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleTarifSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateTarifForm(tarifForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      daya_va: Number(tarifForm.daya_va),
      tarif_per_kwh: Number(tarifForm.tarif_per_kwh),
      berlaku_dari: tarifForm.berlaku_dari,
      berlaku_sampai: tarifForm.berlaku_sampai || null,
    };

    if (process.env.NODE_ENV === "development") {
      console.info("Submitting admin tarif payload", payload);
    }

    try {
      if (editingTarifId) {
        await updateAdminTarif(user.user_id, editingTarifId, payload);
        setMessage("Tarif listrik berhasil diubah.");
      } else {
        await createAdminTarif(user.user_id, payload);
        setMessage("Tarif listrik berhasil ditambahkan.");
      }
      resetTarifForm();
      await loadAdminData();
    } catch (err) {
      setError(err.status ? `${err.message} (HTTP ${err.status})` : err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditTarif(item) {
    setEditingTarifId(item.tarif_id);
    setTarifForm({
      daya_va: item.daya_va,
      tarif_per_kwh: item.tarif_per_kwh,
      berlaku_dari: item.berlaku_dari || today,
      berlaku_sampai: item.berlaku_sampai || "",
    });
  }

  async function handleDeleteTarif(tarifId) {
    setMessage("");
    setError("");
    try {
      await deleteAdminTarif(user.user_id, tarifId);
      setMessage("Tarif listrik berhasil dihapus.");
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRuleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      if (editingRuleId) {
        await updateAdminDssRule(user.user_id, editingRuleId, ruleForm);
        setMessage("Aturan DSS berhasil diubah.");
      } else {
        await createAdminDssRule(user.user_id, ruleForm);
        setMessage("Aturan DSS berhasil ditambahkan.");
      }
      resetRuleForm();
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditRule(item) {
    setEditingRuleId(item.rule_id);
    setRuleForm({
      kode: item.kode,
      nama_aturan: item.nama_aturan,
      kondisi: item.kondisi,
      rekomendasi: item.rekomendasi,
      aktif: item.aktif,
    });
  }

  async function handleDeleteRule(ruleId) {
    setMessage("");
    setError("");
    try {
      await deleteAdminDssRule(user.user_id, ruleId);
      setMessage("Aturan DSS berhasil dihapus.");
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRetrain() {
    setMessage("");
    setError("");

    if (!canRetrainModel) {
      setError(
        `Minimal 3 data tagihan diperlukan untuk retrain model. Data saat ini: ${totalTagihan}.`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await retrainAdminModel(user.user_id);
      setMessage(
        `${response.message}. Data training: ${response.training_rows}, model: ${response.model_path}`
      );
      await loadAdminData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-[#12312b] bg-[#12312b] p-6 text-white shadow-lg md:flex-row md:items-center">
          <div>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Pusat Kontrol Aplikasi
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Halo, {user?.username}. Kelola user, tarif listrik, statistik
              global, aturan DSS, dan retraining model Random Forest.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-emerald-200 hover:text-emerald-100"
              onClick={loadAdminData}
              type="button"
            >
              <MdRefresh className="h-5 w-5" />
              Muat Ulang
            </button>
            <button
              className="h-10 rounded-md border border-white/20 px-4 text-sm font-semibold text-white transition hover:border-red-300 hover:text-red-200"
              onClick={handleLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total User</p>
            <p className="mt-2 text-2xl font-bold">{summary.total_users || 0}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">End User</p>
            <p className="mt-2 text-2xl font-bold">
              {summary.total_end_user || 0}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total kWh Tagihan</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(summary.total_kWh_tagihan)} kWh
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Biaya</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(summary.total_biaya_tagihan)}
            </p>
          </div>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
            <SectionHeader
              title="Statistik Konsumsi Global"
              subtitle="Grafik agregat tagihan semua user berdasarkan bulan."
            />
            <div className="h-72">
              {monthlyChart.series[0].data.length ? (
                <Chart
                  height="100%"
                  options={monthlyChart.options}
                  series={monthlyChart.series}
                  type="line"
                  width="100%"
                />
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-[#5a6a64]">
                  Belum ada data tagihan untuk divisualisasikan.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
            <SectionHeader
              title="Sebaran Daya User"
              subtitle="Jumlah user berdasarkan daya terpasang yang tercatat."
            />
            <div className="h-72">
              {dayaChart.series[0].data.length ? (
                <Chart
                  height="100%"
                  options={dayaChart.options}
                  series={dayaChart.series}
                  type="bar"
                  width="100%"
                />
              ) : (
                <p className="flex h-full items-center justify-center text-sm text-[#5a6a64]">
                  Belum ada data user untuk divisualisasikan.
                </p>
              )}
            </div>
          </section>
        </div>

        <section className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <SectionHeader
            title="Kelola Tarif Listrik"
            subtitle="Tambah, edit, hapus tarif per kWh berdasarkan daya VA dan periode berlaku."
            action={
              editingTarifId ? (
                <button
                  className="h-10 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34]"
                  onClick={resetTarifForm}
                  type="button"
                >
                  Batal Edit
                </button>
              ) : null
            }
          />

          <form className="mb-5 grid gap-3 lg:grid-cols-[0.8fr_1fr_1fr_1fr_auto]" onSubmit={handleTarifSubmit}>
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              min="1"
              onChange={(event) => updateTarifForm("daya_va", event.target.value)}
              placeholder="Daya VA"
              required
              type="number"
              value={tarifForm.daya_va}
            />
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              min="1"
              onChange={(event) =>
                updateTarifForm("tarif_per_kwh", event.target.value)
              }
              placeholder="Tarif per kWh"
              required
              step="0.01"
              type="number"
              value={tarifForm.tarif_per_kwh}
            />
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              onChange={(event) =>
                updateTarifForm("berlaku_dari", event.target.value)
              }
              required
              type="date"
              value={tarifForm.berlaku_dari}
            />
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              onChange={(event) =>
                updateTarifForm("berlaku_sampai", event.target.value)
              }
              type="date"
              value={tarifForm.berlaku_sampai}
            />
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:bg-[#7a8b84]"
              disabled={isSubmitting}
              type="submit"
            >
              {editingTarifId ? <MdSave className="h-5 w-5" /> : <MdAdd className="h-5 w-5" />}
              {editingTarifId ? "Simpan" : "Tambah"}
            </button>
          </form>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                  <th className="px-4 py-3 font-semibold">Daya</th>
                  <th className="px-4 py-3 font-semibold">Tarif</th>
                  <th className="px-4 py-3 font-semibold">Berlaku Dari</th>
                  <th className="px-4 py-3 font-semibold">Berlaku Sampai</th>
                  <th className="px-4 py-3 font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {tarif.map((item) => (
                  <tr className="border-b border-[#edf4ef]" key={item.tarif_id}>
                    <td className="px-4 py-3">{item.daya_va} VA</td>
                    <td className="px-4 py-3">{formatCurrency(item.tarif_per_kwh)} / kWh</td>
                    <td className="px-4 py-3">{item.berlaku_dari}</td>
                    <td className="px-4 py-3">{item.berlaku_sampai || "Aktif"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="inline-flex h-9 items-center gap-1 rounded-md border border-amber-300 px-3 text-xs font-semibold text-amber-800"
                          onClick={() => startEditTarif(item)}
                          type="button"
                        >
                          <MdEdit className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700"
                          onClick={() => handleDeleteTarif(item.tarif_id)}
                          type="button"
                        >
                          <MdDelete className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!tarif.length ? (
              <p className="py-8 text-center text-sm text-[#5a6a64]">
                Belum ada data tarif listrik.
              </p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <SectionHeader
            title="Lihat Semua User"
            subtitle="Admin dapat melihat seluruh user dan mengubah role bila diperlukan."
          />
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Daya</th>
                  <th className="px-4 py-3 font-semibold">Penghuni</th>
                  <th className="px-4 py-3 font-semibold">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr className="border-b border-[#edf4ef]" key={item.user_id}>
                    <td className="px-4 py-3 font-semibold">{item.username}</td>
                    <td className="px-4 py-3">{item.email || "-"}</td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 rounded-md border border-[#b9c8c1] bg-white px-2 text-sm"
                        onChange={(event) =>
                          handleRoleChange(item.user_id, event.target.value)
                        }
                        value={item.role || "end_user"}
                      >
                        <option value="end_user">end_user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">{item.daya_terpasang} VA</td>
                    <td className="px-4 py-3">{item.jumlah_penghuni || "-"}</td>
                    <td className="px-4 py-3">{item.created_at || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <SectionHeader
            title="Kelola Aturan DSS"
            subtitle="Tambah, edit, hapus, dan aktif/nonaktifkan aturan rekomendasi penghematan."
            action={
              editingRuleId ? (
                <button
                  className="h-10 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34]"
                  onClick={resetRuleForm}
                  type="button"
                >
                  Batal Edit
                </button>
              ) : null
            }
          />

          <form className="mb-5 grid gap-3 lg:grid-cols-[0.6fr_1fr_1.3fr_1.5fr_auto]" onSubmit={handleRuleSubmit}>
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => updateRuleForm("kode", event.target.value)}
              placeholder="Kode"
              required
              value={ruleForm.kode}
            />
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              onChange={(event) =>
                updateRuleForm("nama_aturan", event.target.value)
              }
              placeholder="Nama aturan"
              required
              value={ruleForm.nama_aturan}
            />
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => updateRuleForm("kondisi", event.target.value)}
              placeholder="Kondisi"
              required
              value={ruleForm.kondisi}
            />
            <input
              className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
              onChange={(event) =>
                updateRuleForm("rekomendasi", event.target.value)
              }
              placeholder="Rekomendasi"
              required
              value={ruleForm.rekomendasi}
            />
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:bg-[#7a8b84]"
              disabled={isSubmitting}
              type="submit"
            >
              {editingRuleId ? <MdSave className="h-5 w-5" /> : <MdAdd className="h-5 w-5" />}
              {editingRuleId ? "Simpan" : "Tambah"}
            </button>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#243b34] lg:col-start-5">
              <input
                checked={ruleForm.aktif}
                onChange={(event) => updateRuleForm("aktif", event.target.checked)}
                type="checkbox"
              />
              Aktif
            </label>
          </form>

          <div className="grid gap-3">
            {rules.map((item) => (
              <article
                className="rounded-lg border border-[#d8e1dc] bg-white p-4"
                key={item.rule_id}
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#183b34] px-2 py-1 text-xs font-semibold text-white">
                        {item.kode}
                      </span>
                      <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.aktif ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                        {item.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <h3 className="text-base font-bold">{item.nama_aturan}</h3>
                    <p className="mt-2 text-sm text-[#4a5a55]">
                      Kondisi: {item.kondisi}
                    </p>
                    <p className="mt-1 text-sm text-[#13201d]">
                      {item.rekomendasi}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-amber-300 px-3 text-xs font-semibold text-amber-800"
                      onClick={() => startEditRule(item)}
                      type="button"
                    >
                      <MdEdit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700"
                      onClick={() => handleDeleteRule(item.rule_id)}
                      type="button"
                    >
                      <MdDelete className="h-4 w-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <SectionHeader
            title="Retrain Model Random Forest"
            subtitle="Admin dapat memicu ulang pelatihan model dengan seluruh data tagihan terbaru."
            action={
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#933f0e] px-4 text-sm font-semibold text-white transition hover:bg-[#7c2d12] disabled:bg-[#7a8b84]"
                disabled={isSubmitting || isLoading || !canRetrainModel}
                onClick={handleRetrain}
                type="button"
              >
                <MdAutoFixHigh className="h-5 w-5" />
                Retrain Model
              </button>
            }
          />
          <div
            className={`mb-4 rounded-md border px-4 py-3 text-sm ${
              canRetrainModel
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            }`}
          >
            {canRetrainModel
              ? `Data tagihan tersedia ${totalTagihan}. Model siap di-retrain.`
              : `Minimal 3 data tagihan diperlukan untuk retrain model. Data saat ini: ${totalTagihan}.`}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
              <p className="text-sm text-[#5a6a64]">Data Tagihan</p>
              <p className="mt-2 text-2xl font-bold">
                {totalTagihan}
              </p>
            </div>
            <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
              <p className="text-sm text-[#5a6a64]">Hari Pemakaian</p>
              <p className="mt-2 text-2xl font-bold">
                {summary.total_hari_pemakaian || 0}
              </p>
            </div>
            <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
              <p className="text-sm text-[#5a6a64]">Rata-rata Harian</p>
              <p className="mt-2 text-2xl font-bold">
                {formatNumber(summary.rata_rata_kWh_harian)} kWh
              </p>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="fixed bottom-4 right-4 rounded-md bg-[#12312b] px-4 py-3 text-sm font-semibold text-white shadow-lg">
            Memuat data admin...
          </div>
        ) : null}
      </section>
    </main>
  );
}
