import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdSave,
} from "react-icons/md";

import { getAlat } from "api/alatApi";
import {
  createPemakaianBulk,
  deletePemakaian,
  getPemakaian,
  updatePemakaian,
} from "api/pemakaianApi";
import useAuth from "hooks/useAuth";

const today = new Date().toISOString().slice(0, 10);

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function calculateKwh(alat, jamAktual) {
  return (
    (Number(alat.jumlah || 0) *
      Number(alat.daya_watt || 0) *
      Number(jamAktual || 0)) /
    1000
  );
}

export default function PemakaianPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tanggal, setTanggal] = useState(today);
  const [alat, setAlat] = useState([]);
  const [jamByAlat, setJamByAlat] = useState({});
  const [pemakaian, setPemakaian] = useState([]);
  const [ringkasan, setRingkasan] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalInputKwh = useMemo(() => {
    return alat.reduce(
      (total, item) => total + calculateKwh(item, jamByAlat[item.alat_id]),
      0
    );
  }, [alat, jamByAlat]);

  const totalRiwayatKwh = useMemo(() => {
    return ringkasan.reduce(
      (total, item) => total + Number(item.konsumsi_kWh || 0),
      0
    );
  }, [ringkasan]);

  const loadData = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [alatResponse, pemakaianResponse] = await Promise.all([
        getAlat(user.user_id),
        getPemakaian(user.user_id),
      ]);

      const alatRows = alatResponse.alat || [];
      setAlat(alatRows);
      setJamByAlat((current) => {
        const next = {};
        alatRows.forEach((item) => {
          next[item.alat_id] =
            current[item.alat_id] ?? item.jam_default_per_hari ?? 0;
        });
        return next;
      });
      setPemakaian(pemakaianResponse.pemakaian || []);
      setRingkasan(pemakaianResponse.ringkasan_harian || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleJamChange(alatId, value) {
    setJamByAlat((current) => ({
      ...current,
      [alatId]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!tanggal) {
      setError("Tanggal wajib diisi.");
      return;
    }

    if (!alat.length) {
      setError("Tambahkan alat elektronik terlebih dahulu di Modul 4.");
      return;
    }

    const invalidJam = alat.some((item) => {
      const value = Number(jamByAlat[item.alat_id]);
      return Number.isNaN(value) || value < 0 || value > 24;
    });
    if (invalidJam) {
      setError("Jam aktual harus 0 sampai 24 untuk semua alat.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tanggal,
        pemakaian: alat.map((item) => ({
          alat_id: item.alat_id,
          jam_aktual: Number(jamByAlat[item.alat_id]),
        })),
      };
      const response = await createPemakaianBulk(user.user_id, payload);
      setPemakaian(response.pemakaian || []);
      setRingkasan(response.ringkasan_harian || []);
      setMessage("Pemakaian harian berhasil disimpan.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(item) {
    setEditForm({
      pemakaian_id: item.pemakaian_id,
      alat_id: item.alat_id,
      tanggal: item.tanggal,
      jam_aktual: item.jam_aktual,
    });
    setMessage("");
    setError("");
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    const jamAktual = Number(editForm.jam_aktual);
    if (!editForm.tanggal || Number.isNaN(jamAktual) || jamAktual < 0 || jamAktual > 24) {
      setError("Tanggal dan jam aktual 0 sampai 24 wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      const response = await updatePemakaian(
        user.user_id,
        editForm.pemakaian_id,
        {
          alat_id: Number(editForm.alat_id),
          tanggal: editForm.tanggal,
          jam_aktual: jamAktual,
        }
      );
      setPemakaian(response.pemakaian || []);
      setRingkasan(response.ringkasan_harian || []);
      setEditForm(null);
      setMessage("Pemakaian harian berhasil diubah.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(pemakaianId) {
    setMessage("");
    setError("");

    try {
      const response = await deletePemakaian(user.user_id, pemakaianId);
      setPemakaian(response.pemakaian || []);
      setRingkasan(response.ringkasan_harian || []);
      setMessage("Pemakaian harian berhasil dihapus.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto max-w-7xl">
        <button
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-md border border-[#b9c8c1] bg-[#fffdf7] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
          onClick={() =>
            navigate(user?.role === "admin" ? "/admin/dashboard" : "/dashboard")
          }
          type="button"
        >
          <MdArrowBack className="h-5 w-5" />
          Kembali ke Dashboard
        </button>

        <div className="mb-6 rounded-lg border border-[#12312b] bg-[#12312b] p-6 text-white shadow-lg">
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Input Pemakaian Harian
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">
            Lengkapi data pemakaian harian untuk mendapatkan rekomendasi
            pengoptimalan yang lebih akurat!
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Alat Tersedia</p>
            <p className="mt-2 text-2xl font-bold">{alat.length}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Estimasi Input</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(totalInputKwh, 3)} kWh
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Riwayat</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(totalRiwayatKwh, 3)} kWh
            </p>
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

        <form
          className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Input Tanggal</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Nilai awal jam aktual memakai jam default yang telah anda daftarkan.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Tanggal Pemakaian
              </span>
              <input
                className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                onChange={(event) => setTanggal(event.target.value)}
                required
                type="date"
                value={tanggal}
              />
            </label>
          </div>

          {alat.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Tambahkan alat elektronik terlebih dahulu di Modul 4 sebelum
              mengisi pemakaian harian.
            </div>
          ) : (
            <div className="space-y-4">
              {alat.map((item) => (
                <div
                  className="grid gap-3 rounded-lg border border-[#d8e1dc] bg-white p-4 md:grid-cols-[1.4fr_1fr_1fr_1fr]"
                  key={item.alat_id}
                >
                  <div>
                    <p className="font-semibold">{item.nama_alat}</p>
                    <p className="mt-1 text-sm text-[#5a6a64]">
                      {item.jumlah} unit x {item.daya_watt} W
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-[#5a6a64]">Jam Default</p>
                    <p className="mt-1 font-semibold">
                      {formatNumber(item.jam_default_per_hari)} jam
                    </p>
                  </div>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">
                      Jam Aktual
                    </span>
                    <input
                      className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                      max="24"
                      min="0"
                      onChange={(event) =>
                        handleJamChange(item.alat_id, event.target.value)
                      }
                      required
                      step="0.01"
                      type="number"
                      value={jamByAlat[item.alat_id] ?? ""}
                    />
                  </label>
                  <div>
                    <p className="text-sm text-[#5a6a64]">Konsumsi</p>
                    <p className="mt-1 font-semibold">
                      {formatNumber(
                        calculateKwh(item, jamByAlat[item.alat_id]),
                        3
                      )}{" "}
                      kWh
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84] md:w-auto"
            disabled={isSubmitting || alat.length === 0}
            type="submit"
          >
            <MdSave className="h-5 w-5" />
            {isSubmitting ? "Menyimpan..." : "Simpan Pemakaian Harian"}
          </button>
        </form>

        {editForm ? (
          <form
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm"
            onSubmit={handleUpdate}
          >
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">Edit Pemakaian</h2>
                <p className="mt-1 text-sm text-amber-900">
                  Ubah tanggal, alat, atau jam aktual pada riwayat yang dipilih.
                </p>
              </div>
              <button
                className="h-10 rounded-md border border-amber-300 px-4 text-sm font-semibold text-amber-900"
                onClick={() => setEditForm(null)}
                type="button"
              >
                Batal
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    tanggal: event.target.value,
                  }))
                }
                required
                type="date"
                value={editForm.tanggal}
              />
              <select
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    alat_id: event.target.value,
                  }))
                }
                required
                value={editForm.alat_id}
              >
                {alat.map((item) => (
                  <option key={item.alat_id} value={item.alat_id}>
                    {item.nama_alat}
                  </option>
                ))}
              </select>
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                max="24"
                min="0"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    jam_aktual: event.target.value,
                  }))
                }
                required
                step="0.01"
                type="number"
                value={editForm.jam_aktual}
              />
            </div>
            <button
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800"
              disabled={isSubmitting}
              type="submit"
            >
              <MdSave className="h-5 w-5" />
              Simpan Perubahan
            </button>
          </form>
        ) : null}

        <div className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Ringkasan Harian</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Total konsumsi per tanggal dari view konsumsi harian.
              </p>
            </div>
            <button
              className="h-10 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
              onClick={loadData}
              type="button"
            >
              Muat Ulang
            </button>
          </div>
          {ringkasan.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada ringkasan pemakaian harian.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ringkasan.map((item) => (
                <div
                  className="rounded-lg border border-[#d8e1dc] bg-white p-4"
                  key={item.tanggal}
                >
                  <p className="text-sm text-[#5a6a64]">{item.tanggal}</p>
                  <p className="mt-2 text-xl font-bold">
                    {formatNumber(item.konsumsi_kWh, 3)} kWh
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Riwayat Pemakaian</h2>
            <p className="mt-1 text-sm text-[#4a5a55]">
              Data jam aktual per alat yang sudah tersimpan.
            </p>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Memuat pemakaian harian...
            </p>
          ) : pemakaian.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada data pemakaian harian.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                    <th className="px-4 py-3 font-semibold">Tanggal</th>
                    <th className="px-4 py-3 font-semibold">Alat</th>
                    <th className="px-4 py-3 font-semibold">Jam Aktual</th>
                    <th className="px-4 py-3 font-semibold">Konsumsi</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pemakaian.map((item) => (
                    <tr
                      className="border-b border-[#edf4ef] text-[#13201d]"
                      key={item.pemakaian_id}
                    >
                      <td className="px-4 py-3">{item.tanggal}</td>
                      <td className="px-4 py-3 font-semibold">
                        {item.nama_alat}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.jam_aktual)} jam
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.konsumsi_kWh, 3)} kWh
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-amber-300 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-50"
                            onClick={() => startEdit(item)}
                            type="button"
                          >
                            <MdEdit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            onClick={() => handleDelete(item.pemakaian_id)}
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
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
