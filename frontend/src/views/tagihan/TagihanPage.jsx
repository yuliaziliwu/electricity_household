import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdArrowBack,
  MdDelete,
  MdEdit,
  MdSave,
} from "react-icons/md";

import {
  createTagihanBulk,
  deleteTagihan,
  getTagihan,
  updateTagihan,
} from "api/tagihanApi";
import useAuth from "hooks/useAuth";

const monthOptions = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const currentYear = new Date().getFullYear();

function createEmptyRow() {
  return {
    bulan: "",
    tahun: currentYear,
    biaya: "",
  };
}

function getMonthLabel(value) {
  return monthOptions.find((month) => month.value === Number(value))?.label || "-";
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function validateRows(rows) {
  if (rows.length < 3 || rows.length > 6) {
    return "Input tagihan wajib 3 sampai 6 baris.";
  }

  const keys = new Set();

  for (const row of rows) {
    if (!row.bulan || !row.tahun) {
      return "Bulan dan tahun wajib diisi di setiap baris.";
    }

    if (!row.biaya || Number(row.biaya) <= 0) {
      return "Nominal tagihan wajib diisi dan harus lebih dari 0.";
    }

    const key = `${row.bulan}-${row.tahun}`;
    if (keys.has(key)) {
      return "Bulan dan tahun tidak boleh duplikat.";
    }

    keys.add(key);
  }

  return "";
}

export default function TagihanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);
  const [history, setHistory] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    return history.reduce(
      (total, item) => ({
        biaya: total.biaya + Number(item.biaya || 0),
      }),
      { biaya: 0 }
    );
  }, [history]);

  const loadHistory = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await getTagihan(user.user_id);
      setHistory(response.tagihan || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  function updateRow(index, field, value) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function addRow() {
    if (rows.length >= 6) {
      return;
    }

    setRows((currentRows) => [...currentRows, createEmptyRow()]);
  }

  function removeRow(index) {
    if (rows.length <= 3) {
      return;
    }

    setRows((currentRows) =>
      currentRows.filter((_, rowIndex) => rowIndex !== index)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateRows(rows);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = rows.map((row) => ({
        bulan: Number(row.bulan),
        tahun: Number(row.tahun),
        konsumsi_kWh: null,
        biaya: row.biaya ? Number(row.biaya) : null,
      }));

      const response = await createTagihanBulk(user.user_id, payload);
      setHistory(response.tagihan || []);
      setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
      setMessage("Tagihan berhasil disimpan.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(item) {
    setEditForm({
      tagihan_id: item.tagihan_id,
      bulan: item.bulan,
      tahun: item.tahun,
      biaya: item.biaya ?? "",
    });
    setMessage("");
    setError("");
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    if (!editForm.biaya || Number(editForm.biaya) <= 0) {
      setError("Nominal tagihan wajib diisi dan harus lebih dari 0.");
      setIsSubmitting(false);
      return;
    }

    try {
      await updateTagihan(user.user_id, editForm.tagihan_id, {
        bulan: Number(editForm.bulan),
        tahun: Number(editForm.tahun),
        konsumsi_kWh: null,
        biaya: editForm.biaya ? Number(editForm.biaya) : null,
      });
      setEditForm(null);
      setMessage("Tagihan berhasil diubah.");
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(tagihanId) {
    setMessage("");
    setError("");

    try {
      await deleteTagihan(user.user_id, tagihanId);
      setMessage("Tagihan berhasil dihapus.");
      await loadHistory();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto max-w-7xl">
        <button
          className="mb-4 inline-flex h-10 items-center gap-2 rounded-md border border-[#b9c8c1] bg-[#fffdf7] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
          onClick={() => navigate(user?.role === "admin" ? "/admin/dashboard" : "/dashboard")}
          type="button"
        >
          <MdArrowBack className="h-5 w-5" />
          Kembali ke Dashboard
        </button>

        <div className="mb-6 rounded-lg border border-[#12312b] bg-[#12312b] p-6 text-white shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-normal text-emerald-200">
            Modul 2
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
            Input Data Historis Tagihan
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">
            Masukkan nominal tagihan listrik sesuai struk untuk 3 sampai 6
            bulan terakhir. Data ini menjadi dasar prediksi biaya bulan
            berikutnya.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Data</p>
            <p className="mt-2 text-2xl font-bold">{history.length}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Biaya Tersimpan</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(summary.biaya)}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Rata-rata Tagihan</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(
                history.length ? summary.biaya / history.length : 0
              )}
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
              <h2 className="text-2xl font-bold">Input Tagihan Baru</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Isi bulan, tahun, dan nominal biaya tagihan sesuai struk.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84]"
              disabled={rows.length >= 6}
              onClick={addRow}
              type="button"
            >
              <MdAdd className="h-5 w-5" />
              Tambah Baris
            </button>
          </div>

          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                className="grid gap-3 rounded-lg border border-[#d8e1dc] bg-white p-4 md:grid-cols-[1.1fr_0.8fr_1fr_auto]"
                key={index}
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Bulan
                  </span>
                  <select
                    className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) =>
                      updateRow(index, "bulan", event.target.value)
                    }
                    required
                    value={row.bulan}
                  >
                    <option value="">Pilih bulan</option>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Tahun
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                    min="2000"
                    onChange={(event) =>
                      updateRow(index, "tahun", event.target.value)
                    }
                    required
                    type="number"
                    value={row.tahun}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    Nominal Tagihan Rp
                  </span>
                  <input
                    className="h-11 w-full rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                    min="0"
                    onChange={(event) =>
                      updateRow(index, "biaya", event.target.value)
                    }
                    placeholder="Contoh: 175000"
                    step="0.01"
                    type="number"
                    required
                    value={row.biaya}
                  />
                </label>

                <div className="flex items-end">
                  <button
                    className="h-11 w-full rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#d8e1dc] disabled:text-[#7a8b84]"
                    disabled={rows.length <= 3}
                    onClick={() => removeRow(index)}
                    type="button"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84] md:w-auto"
            disabled={isSubmitting}
            type="submit"
          >
            <MdSave className="h-5 w-5" />
            {isSubmitting ? "Menyimpan..." : "Simpan Tagihan"}
          </button>
        </form>

        {editForm ? (
          <form
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm"
            onSubmit={handleUpdate}
          >
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">Edit Tagihan</h2>
                <p className="mt-1 text-sm text-amber-900">
                  Ubah bulan, tahun, dan nominal tagihan yang dipilih.
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
              <select
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    bulan: event.target.value,
                  }))
                }
                value={editForm.bulan}
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                min="2000"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    tahun: event.target.value,
                  }))
                }
                type="number"
                value={editForm.tahun}
              />
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                min="0"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    biaya: event.target.value,
                  }))
                }
                placeholder="Biaya"
                step="0.01"
                type="number"
                required
                value={editForm.biaya}
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

        <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Riwayat Tagihan</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Data tagihan yang sudah tersimpan untuk user login.
              </p>
            </div>
            <button
              className="h-10 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
              onClick={loadHistory}
              type="button"
            >
              Muat Ulang
            </button>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Memuat riwayat tagihan...
            </p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada data tagihan.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                    <th className="px-4 py-3 font-semibold">Bulan</th>
                    <th className="px-4 py-3 font-semibold">Tahun</th>
                    <th className="px-4 py-3 font-semibold">Estimasi kWh</th>
                    <th className="px-4 py-3 font-semibold">Biaya</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      className="border-b border-[#edf4ef] text-[#13201d]"
                      key={item.tagihan_id}
                    >
                      <td className="px-4 py-3">{getMonthLabel(item.bulan)}</td>
                      <td className="px-4 py-3">{item.tahun}</td>
                      <td className="px-4 py-3">
                        {item.konsumsi_kWh === null ||
                        item.konsumsi_kWh === undefined
                          ? "-"
                          : `${Number(item.konsumsi_kWh).toFixed(2)} kWh`}
                      </td>
                      <td className="px-4 py-3">{formatCurrency(item.biaya)}</td>
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
                            onClick={() => handleDelete(item.tagihan_id)}
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
