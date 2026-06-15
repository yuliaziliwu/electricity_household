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
  createAlatBulk,
  deleteAlat,
  getAlat,
  updateAlat,
} from "api/alatApi";
import { APP_MESSAGES, normalizeErrorMessage } from "constants/messages";
import useAuth from "hooks/useAuth";

function createEmptyRow() {
  return {
    nama_alat: "",
    jumlah: 1,
    daya_watt: "",
    jam_default_per_hari: "",
  };
}

function formatNumber(value, digits = 2) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
  }).format(Number(value || 0));
}

function validateRows(rows) {
  if (!rows.length) {
    return "Minimal satu alat wajib diisi.";
  }

  for (const row of rows) {
    if (!row.nama_alat.trim()) {
      return "Nama alat wajib diisi di setiap baris.";
    }

    if (Number(row.jumlah) < 1 || Number(row.daya_watt) < 1) {
      return "Jumlah dan daya watt harus lebih dari 0.";
    }

    if (
      row.jam_default_per_hari === "" ||
      Number(row.jam_default_per_hari) < 0 ||
      Number(row.jam_default_per_hari) > 24
    ) {
      return "Jam default per hari harus 0 sampai 24.";
    }
  }

  return "";
}

export default function AlatPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([createEmptyRow()]);
  const [alat, setAlat] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    return alat.reduce(
      (total, item) => ({
        totalAlat: total.totalAlat + Number(item.jumlah || 0),
        totalEstimasi:
          total.totalEstimasi + Number(item.estimasi_kWh_per_hari || 0),
      }),
      { totalAlat: 0, totalEstimasi: 0 }
    );
  }, [alat]);

  const loadAlat = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await getAlat(user.user_id);
      setAlat(response.alat || []);
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadAlat();
  }, [loadAlat]);

  function updateRow(index, field, value) {
    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  }

  function addRow() {
    setRows((currentRows) => [...currentRows, createEmptyRow()]);
  }

  function removeRow(index) {
    setRows((currentRows) =>
      currentRows.length === 1
        ? currentRows
        : currentRows.filter((_, rowIndex) => rowIndex !== index)
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
        nama_alat: row.nama_alat.trim(),
        jumlah: Number(row.jumlah),
        daya_watt: Number(row.daya_watt),
        jam_default_per_hari: Number(row.jam_default_per_hari),
      }));
      const response = await createAlatBulk(user.user_id, payload);
      setAlat(response.alat || []);
      setRows([createEmptyRow()]);
      setMessage(APP_MESSAGES.alat.createSuccess);
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(item) {
    setEditForm({
      alat_id: item.alat_id,
      nama_alat: item.nama_alat,
      jumlah: item.jumlah,
      daya_watt: item.daya_watt,
      jam_default_per_hari: item.jam_default_per_hari,
    });
    setMessage("");
    setError("");
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editForm) {
      return;
    }

    const validationError = validateRows([editForm]);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setError("");

    try {
      await updateAlat(user.user_id, editForm.alat_id, {
        nama_alat: editForm.nama_alat.trim(),
        jumlah: Number(editForm.jumlah),
        daya_watt: Number(editForm.daya_watt),
        jam_default_per_hari: Number(editForm.jam_default_per_hari),
      });
      setEditForm(null);
      setMessage(APP_MESSAGES.alat.updateSuccess);
      await loadAlat();
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(alatId) {
    setMessage("");
    setError("");

    try {
      await deleteAlat(user.user_id, alatId);
      setMessage(APP_MESSAGES.alat.deleteSuccess);
      await loadAlat();
    } catch (err) {
      setError(normalizeErrorMessage(err));
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
            Input Alat Elektronik
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">
            Simpan daftar alat elektronik rumah, jumlah unit, daya watt, dan jam
            default per hari. Sistem menghitung estimasi kWh harian secara
            otomatis.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Jenis Alat</p>
            <p className="mt-2 text-2xl font-bold">{alat.length}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Unit</p>
            <p className="mt-2 text-2xl font-bold">{summary.totalAlat}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Estimasi Teoritis</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(summary.totalEstimasi, 3)} kWh/hari
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
              <h2 className="text-2xl font-bold"> Alat Elektronik di Rumah Saya</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Tambahkan beberapa alat sekaligus dalam satu kali submit.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e]"
              onClick={addRow}
              type="button"
            >
              <MdAdd className="h-5 w-5" />
              Tambah Alat
            </button>
          </div>

          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                className="grid gap-3 rounded-lg border border-[#d8e1dc] bg-white p-4 md:grid-cols-[1.4fr_0.7fr_1fr_1fr_auto]"
                key={index}
              >
                <input
                  className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none placeholder:text-[#7a8b84] focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) =>
                    updateRow(index, "nama_alat", event.target.value)
                  }
                  placeholder="Nama alat"
                  required
                  value={row.nama_alat}
                />
                <input
                  className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                  min="1"
                  onChange={(event) =>
                    updateRow(index, "jumlah", event.target.value)
                  }
                  placeholder="Jumlah"
                  required
                  type="number"
                  value={row.jumlah}
                />
                <input
                  className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                  min="1"
                  onChange={(event) =>
                    updateRow(index, "daya_watt", event.target.value)
                  }
                  placeholder="Daya watt"
                  required
                  type="number"
                  value={row.daya_watt}
                />
                <input
                  className="h-11 rounded-md border border-[#b9c8c1] bg-white px-3 text-sm outline-none focus:border-[#176b52] focus:ring-2 focus:ring-emerald-100"
                  max="24"
                  min="0"
                  onChange={(event) =>
                    updateRow(index, "jam_default_per_hari", event.target.value)
                  }
                  placeholder="Jam/hari"
                  required
                  step="0.01"
                  type="number"
                  value={row.jam_default_per_hari}
                />
                <button
                  className="h-11 rounded-md border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#d8e1dc] disabled:text-[#7a8b84]"
                  disabled={rows.length === 1}
                  onClick={() => removeRow(index)}
                  type="button"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <button
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84] md:w-auto"
            disabled={isSubmitting}
            type="submit"
          >
            <MdSave className="h-5 w-5" />
            {isSubmitting ? "Menyimpan..." : "Simpan Alat"}
          </button>
        </form>

        {editForm ? (
          <form
            className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm"
            onSubmit={handleUpdate}
          >
            <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold">Edit Alat</h2>
                <p className="mt-1 text-sm text-amber-900">
                  Perubahan daya atau jam default akan memengaruhi perhitungan
                  konsumsi pemakaian harian.
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

            <div className="grid gap-3 md:grid-cols-4">
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    nama_alat: event.target.value,
                  }))
                }
                required
                value={editForm.nama_alat}
              />
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                min="1"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    jumlah: event.target.value,
                  }))
                }
                required
                type="number"
                value={editForm.jumlah}
              />
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                min="1"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    daya_watt: event.target.value,
                  }))
                }
                required
                type="number"
                value={editForm.daya_watt}
              />
              <input
                className="h-11 rounded-md border border-amber-300 bg-white px-3 text-sm"
                max="24"
                min="0"
                onChange={(event) =>
                  setEditForm((current) => ({
                    ...current,
                    jam_default_per_hari: event.target.value,
                  }))
                }
                required
                step="0.01"
                type="number"
                value={editForm.jam_default_per_hari}
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
              <h2 className="text-2xl font-bold">Daftar Alat</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Semua alat elektronik yang sudah tersimpan untuk user login.
              </p>
            </div>
            <button
              className="h-10 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
              onClick={loadAlat}
              type="button"
            >
              Muat Ulang
            </button>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Memuat daftar alat...
            </p>
          ) : alat.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada data alat elektronik.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">Jumlah</th>
                    <th className="px-4 py-3 font-semibold">Daya</th>
                    <th className="px-4 py-3 font-semibold">Jam Default</th>
                    <th className="px-4 py-3 font-semibold">Estimasi</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {alat.map((item) => (
                    <tr
                      className="border-b border-[#edf4ef] text-[#13201d]"
                      key={item.alat_id}
                    >
                      <td className="px-4 py-3 font-semibold">
                        {item.nama_alat}
                      </td>
                      <td className="px-4 py-3">{item.jumlah}</td>
                      <td className="px-4 py-3">{item.daya_watt} W</td>
                      <td className="px-4 py-3">
                        {formatNumber(item.jam_default_per_hari)} jam
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.estimasi_kWh_per_hari, 3)} kWh
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
                            onClick={() => handleDelete(item.alat_id)}
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
