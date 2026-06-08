import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdBolt,
  MdHistory,
  MdRefresh,
} from "react-icons/md";

import {
  createPrediksi,
  getLatestPrediksi,
  getPrediksiHistory,
} from "api/prediksiApi";
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

function getMonthLabel(value) {
  return monthOptions.find((month) => month.value === Number(value))?.label || "-";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: digits,
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

function getMethodLabel(value) {
  if (value === "hybrid_harian") {
    return "Hybrid Harian";
  }

  return "Histori Tagihan";
}

export default function PrediksiPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    return history.reduce(
      (total, item) => ({
        count: total.count + 1,
        totalBill: total.totalBill + Number(item.prediksi_biaya || 0),
      }),
      { count: 0, totalBill: 0 }
    );
  }, [history]);

  const loadData = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [latestResponse, historyResponse] = await Promise.all([
        getLatestPrediksi(user.user_id),
        getPrediksiHistory(user.user_id),
      ]);
      setLatest(latestResponse.prediksi || null);
      setHistory(historyResponse.prediksi || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    setIsGenerating(true);
    setMessage("");
    setError("");

    try {
      const response = await createPrediksi(user.user_id);
      setLatest(response.prediksi || null);
      setMessage("Prediksi tagihan bulan depan berhasil dibuat.");
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
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
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Prediksi Biaya Listrik
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-50">
              Model AI membaca histori nominal tagihan, pola perangkat, dan
              pemakaian harian untuk memperkirakan biaya bulan berikutnya.
            </p>
          </div>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f8d36b] px-4 text-sm font-bold text-[#13201d] transition hover:bg-[#f4c84c] disabled:cursor-not-allowed disabled:bg-[#7a8b84] disabled:text-white"
            disabled={isGenerating}
            onClick={handleGenerate}
            type="button"
          >
            <MdBolt className="h-5 w-5" />
            {isGenerating ? "Memproses..." : "Prediksi Bulan Depan"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Prediksi Terbaru</p>
            <p className="mt-2 text-2xl font-bold">
              {latest ? formatCurrency(latest.prediksi_biaya) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Target Bulan</p>
            <p className="mt-2 text-2xl font-bold">
              {latest
                ? `${getMonthLabel(latest.bulan_target)} ${latest.tahun_target}`
                : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Riwayat</p>
            <p className="mt-2 text-2xl font-bold">{summary.count}</p>
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
              <h2 className="text-2xl font-bold">Hasil Prediksi Terbaru</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Minimal 3 data tagihan diperlukan sebelum model dapat membuat
                prediksi.
              </p>
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
              disabled={isLoading}
              onClick={loadData}
              type="button"
            >
              <MdRefresh className="h-5 w-5" />
              Muat Ulang
            </button>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Memuat prediksi...
            </p>
          ) : latest ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                <p className="text-sm text-[#5a6a64]">Nominal Prediksi</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatCurrency(latest.prediksi_biaya)}
                </p>
              </div>
              <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                <p className="text-sm text-[#5a6a64]">Estimasi kWh</p>
                <p className="mt-2 text-2xl font-bold">
                  {formatNumber(latest.prediksi_kWh)} kWh
                </p>
              </div>
              <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                <p className="text-sm text-[#5a6a64]">Range Estimasi</p>
                <p className="mt-2 text-lg font-bold leading-7">
                  {formatCurrency(latest.confidence_lower)} -{" "}
                  {formatCurrency(latest.confidence_upper)}
                </p>
              </div>
              <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                <p className="text-sm text-[#5a6a64]">Metode</p>
                <p className="mt-2 text-2xl font-bold">
                  {getMethodLabel(latest.metode)}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada prediksi. Klik tombol prediksi setelah mengisi minimal
              3 bulan tagihan.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">Riwayat Prediksi</h2>
              <p className="mt-1 text-sm text-[#4a5a55]">
                Semua prediksi yang pernah dibuat untuk user login.
              </p>
            </div>
            <span className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d8e1dc] bg-white px-4 text-sm font-semibold text-[#243b34]">
              <MdHistory className="h-5 w-5" />
              Rata-rata {formatCurrency(summary.count ? summary.totalBill / summary.count : 0)}
            </span>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Memuat riwayat prediksi...
            </p>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#4a5a55]">
              Belum ada riwayat prediksi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#d8e1dc] bg-[#e5f2ec] text-[#243b34]">
                    <th className="px-4 py-3 font-semibold">Target</th>
                    <th className="px-4 py-3 font-semibold">Prediksi Biaya</th>
                    <th className="px-4 py-3 font-semibold">Estimasi kWh</th>
                    <th className="px-4 py-3 font-semibold">Metode</th>
                    <th className="px-4 py-3 font-semibold">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr
                      className="border-b border-[#edf4ef] text-[#13201d]"
                      key={item.prediksi_id}
                    >
                      <td className="px-4 py-3">
                        {getMonthLabel(item.bulan_target)} {item.tahun_target}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(item.prediksi_biaya)}
                      </td>
                      <td className="px-4 py-3">
                        {formatNumber(item.prediksi_kWh)} kWh
                      </td>
                      <td className="px-4 py-3">
                        {getMethodLabel(item.metode)}
                      </td>
                      <td className="px-4 py-3">{formatDate(item.created_at)}</td>
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
