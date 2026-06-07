import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdCheckCircle,
  MdLightbulb,
  MdRefresh,
} from "react-icons/md";

import {
  getRekomendasi,
  getRiwayatRekomendasi,
  markRekomendasiApplied,
} from "api/rekomendasiApi";
import useAuth from "hooks/useAuth";

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPriorityClass(priority) {
  if (priority === "tinggi") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (priority === "sedang") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function RecommendationCard({ item, onApply, isApplying }) {
  return (
    <article className="rounded-lg border border-[#d8e1dc] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-md bg-emerald-100 text-emerald-800">
            <MdLightbulb className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-md bg-[#183b34] px-3 py-1 text-xs font-semibold uppercase tracking-normal text-white">
                {item.kode || "DSS"}
              </span>
              <span
                className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-normal ${getPriorityClass(
                  item.prioritas
                )}`}
              >
                {item.prioritas || "rendah"}
              </span>
              <span className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-cyan-800">
                {item.kategori || "default"}
              </span>
            </div>
            <p className="break-words text-base font-semibold leading-7 text-[#13201d]">
              {item.teks}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-3 text-left md:min-w-[180px]">
          <p className="text-xs font-semibold uppercase tracking-normal text-[#5a6a64]">
            Potensi Hemat
          </p>
          <p className="mt-1 text-lg font-bold text-[#13201d]">
            {formatCurrency(item.potensi_hemat)}
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 border-t border-[#edf4ef] pt-4 md:flex-row md:items-center">
        <p className="text-sm text-[#5a6a64]">{formatDate(item.tanggal)}</p>
        {item.sudah_diterapkan ? (
          <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800">
            <MdCheckCircle className="h-5 w-5" />
            Sudah Diterapkan
          </span>
        ) : (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] disabled:cursor-not-allowed disabled:bg-[#7a8b84]"
            disabled={isApplying}
            onClick={() => onApply(item.rekomendasi_id)}
            type="button"
          >
            <MdCheckCircle className="h-5 w-5" />
            {isApplying ? "Menyimpan..." : "Tandai Sudah Diterapkan"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function RekomendasiPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [latest, setLatest] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    return history.reduce(
      (total, item) => ({
        total: total.total + 1,
        diterapkan: total.diterapkan + (item.sudah_diterapkan ? 1 : 0),
        potensi: total.potensi + Number(item.potensi_hemat || 0),
      }),
      { total: 0, diterapkan: 0, potensi: 0 }
    );
  }, [history]);

  const loadHistory = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await getRiwayatRekomendasi(user.user_id);
      setHistory(response.rekomendasi || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleGenerate() {
    setIsGenerating(true);
    setMessage("");
    setError("");

    try {
      const response = await getRekomendasi(user.user_id);
      const recommendations = response.rekomendasi || [];
      setLatest(recommendations);
      setMessage("Rekomendasi DSS berhasil dibuat.");
      await loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleApply(rekomendasiId) {
    setApplyingId(rekomendasiId);
    setMessage("");
    setError("");

    try {
      const response = await markRekomendasiApplied(user.user_id, rekomendasiId);
      const updated = response.rekomendasi;
      setLatest((current) =>
        current.map((item) =>
          item.rekomendasi_id === rekomendasiId ? updated : item
        )
      );
      setHistory((current) =>
        current.map((item) =>
          item.rekomendasi_id === rekomendasiId ? updated : item
        )
      );
      setMessage("Rekomendasi berhasil ditandai sudah diterapkan.");
    } catch (err) {
      setError(err.message);
    } finally {
      setApplyingId(null);
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

        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-[#12312b] bg-[#12312b] p-6 text-white shadow-lg md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-200">
              Modul 7
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Rekomendasi Penghematan
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">
              DSS berbasis aturan IF-THEN membaca profil, alat, konsumsi
              harian, dan tarif listrik untuk membuat saran penghematan.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f8d36b] px-4 text-sm font-bold text-[#13201d] transition hover:bg-[#f4c84c] disabled:cursor-not-allowed disabled:bg-[#7a8b84] disabled:text-white"
            disabled={isGenerating}
            onClick={handleGenerate}
            type="button"
          >
            <MdLightbulb className="h-5 w-5" />
            {isGenerating ? "Memproses..." : "Dapatkan Rekomendasi"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Riwayat</p>
            <p className="mt-2 text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Sudah Diterapkan</p>
            <p className="mt-2 text-2xl font-bold">{summary.diterapkan}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Akumulasi Potensi Hemat</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(summary.potensi)}
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

        <div className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Rekomendasi Terbaru</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Hasil DSS dari data terbaru user login.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
              onClick={loadHistory}
              type="button"
            >
              <MdRefresh className="h-5 w-5" />
              Muat Riwayat
            </button>
          </div>

          {latest.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#b9c8c1] bg-white px-4 py-8 text-center text-sm text-[#4a5a55]">
              Belum ada rekomendasi terbaru.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {latest.map((item) => (
                <RecommendationCard
                  isApplying={applyingId === item.rekomendasi_id}
                  item={item}
                  key={item.rekomendasi_id}
                  onApply={handleApply}
                />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Riwayat Rekomendasi</h2>
            <p className="mt-1 text-sm text-[#4a5a55]">
              Semua rekomendasi yang pernah dibuat oleh DSS.
            </p>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Memuat riwayat rekomendasi...
            </p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada riwayat rekomendasi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                    <th className="px-4 py-3 font-semibold">Kode</th>
                    <th className="px-4 py-3 font-semibold">Rekomendasi</th>
                    <th className="px-4 py-3 font-semibold">Prioritas</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Potensi</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      className="border-b border-[#edf4ef] text-[#13201d]"
                      key={item.rekomendasi_id}
                    >
                      <td className="px-4 py-3 font-semibold">{item.kode}</td>
                      <td className="max-w-xl px-4 py-3">
                        <p className="break-words leading-6">{item.teks}</p>
                        <p className="mt-1 text-xs text-[#5a6a64]">
                          {formatDate(item.tanggal)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md border px-2 py-1 text-xs font-semibold uppercase tracking-normal ${getPriorityClass(
                            item.prioritas
                          )}`}
                        >
                          {item.prioritas}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.kategori}</td>
                      <td className="px-4 py-3">
                        {formatCurrency(item.potensi_hemat)}
                      </td>
                      <td className="px-4 py-3">
                        {item.sudah_diterapkan ? "Sudah" : "Belum"}
                      </td>
                      <td className="px-4 py-3">
                        {item.sudah_diterapkan ? (
                          <span className="text-sm font-semibold text-emerald-700">
                            Selesai
                          </span>
                        ) : (
                          <button
                            className="inline-flex h-9 items-center gap-1 rounded-md border border-emerald-200 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:text-[#7a8b84]"
                            disabled={applyingId === item.rekomendasi_id}
                            onClick={() => handleApply(item.rekomendasi_id)}
                            type="button"
                          >
                            <MdCheckCircle className="h-4 w-4" />
                            Terapkan
                          </button>
                        )}
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
