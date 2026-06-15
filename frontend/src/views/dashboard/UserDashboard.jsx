import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import {
  MdAccessTime,
  MdBolt,
  MdDevices,
  MdLightbulb,
  MdLogout,
  MdPictureAsPdf,
  MdPrint,
  MdReceipt,
  MdRefresh,
} from "react-icons/md";

import { getAlat } from "api/alatApi";
import { downloadBulananPrediksiPdf } from "api/laporanApi";
import { getPemakaian } from "api/pemakaianApi";
import { getLatestPrediksi } from "api/prediksiApi";
import { getTagihan } from "api/tagihanApi";
import { APP_MESSAGES, normalizeErrorMessage } from "constants/messages";
import useAuth from "hooks/useAuth";

const quickActions = [
  {
    label: "Input Tagihan",
    path: "/tagihan",
    icon: MdReceipt,
  },
  {
    label: "Prediksi",
    path: "/prediksi",
    icon: MdBolt,
  },
  {
    label: "Alat Elektronik",
    path: "/alat",
    icon: MdDevices,
  },
  {
    label: "Pemakaian Harian",
    path: "/pemakaian",
    icon: MdAccessTime,
  },
  {
    label: "Rekomendasi",
    path: "/rekomendasi",
    icon: MdLightbulb,
  },
];

const weekdayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

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

function formatShortDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getMonthLabel(month, year) {
  if (!month || !year) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
  }).format(new Date(Number(year), Number(month) - 1, 1));
}

function EmptyChart({ children }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-[#cfded6] bg-white text-center text-sm text-[#5a6a64]">
      {children}
    </div>
  );
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

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tagihan, setTagihan] = useState([]);
  const [ringkasanHarian, setRingkasanHarian] = useState([]);
  const [alatSummary, setAlatSummary] = useState(null);
  const [latestPrediksi, setLatestPrediksi] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!user?.user_id) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [tagihanResponse, pemakaianResponse, alatResponse, prediksiResponse] =
        await Promise.all([
          getTagihan(user.user_id),
          getPemakaian(user.user_id),
          getAlat(user.user_id),
          getLatestPrediksi(user.user_id),
        ]);

      setTagihan(tagihanResponse.tagihan || []);
      setRingkasanHarian(pemakaianResponse.ringkasan_harian || []);
      setAlatSummary({
        totalAlat: (alatResponse.alat || []).reduce(
          (total, item) => total + Number(item.jumlah || 0),
          0
        ),
        estimasiHarian: Number(alatResponse.total_estimasi_kWh_per_hari || 0),
      });
      setLatestPrediksi(prediksiResponse.prediksi || null);
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [user?.user_id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const sortedTagihan = useMemo(() => {
    return [...tagihan].sort(
      (a, b) => Number(a.tahun) - Number(b.tahun) || Number(a.bulan) - Number(b.bulan)
    );
  }, [tagihan]);

  const sortedDaily = useMemo(() => {
    return [...ringkasanHarian]
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal))
      .slice(-30);
  }, [ringkasanHarian]);

  const summary = useMemo(() => {
    const totalBiaya = tagihan.reduce(
      (total, item) => total + Number(item.biaya || 0),
      0
    );
    const averageBill = tagihan.length ? totalBiaya / tagihan.length : 0;
    const averageDailyKwh = ringkasanHarian.length
      ? ringkasanHarian.reduce(
          (total, item) => total + Number(item.konsumsi_kWh || 0),
          0
        ) / ringkasanHarian.length
      : 0;

    return {
      totalTagihan: tagihan.length,
      totalBiaya,
      averageBill,
      averageDailyKwh,
      estimatedDeviceKwh: Number(alatSummary?.estimasiHarian || 0),
      totalAlat: Number(alatSummary?.totalAlat || 0),
    };
  }, [alatSummary, ringkasanHarian, tagihan]);

  const billChart = useMemo(() => {
    return {
      series: [
        {
          name: "Tagihan",
          data: sortedTagihan.map((item) => Number(item.biaya || 0)),
        },
      ],
      options: {
        chart: { toolbar: { show: false }, zoom: { enabled: false } },
        colors: ["#176b52"],
        dataLabels: { enabled: false },
        grid: { borderColor: "#d8e1dc" },
        plotOptions: { bar: { borderRadius: 4, columnWidth: "46%" } },
        xaxis: {
          categories: sortedTagihan.map((item) =>
            getMonthLabel(item.bulan, item.tahun)
          ),
          labels: { style: { colors: "#4a5a55" } },
        },
        yaxis: {
          labels: {
            style: { colors: "#4a5a55" },
            formatter: (value) => `${Math.round(value / 1000)} rb`,
          },
        },
        tooltip: { y: { formatter: (value) => formatCurrency(value) } },
      },
    };
  }, [sortedTagihan]);

  const dailyLineChart = useMemo(() => {
    return {
      series: [
        {
          name: "kWh",
          data: sortedDaily.map((item) => Number(item.konsumsi_kWh || 0)),
        },
      ],
      options: {
        chart: { toolbar: { show: false }, zoom: { enabled: false } },
        colors: ["#0e7490"],
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 3 },
        grid: { borderColor: "#d8e1dc" },
        xaxis: {
          categories: sortedDaily.map((item) => formatShortDate(item.tanggal)),
          labels: { style: { colors: "#4a5a55" } },
        },
        yaxis: { labels: { style: { colors: "#4a5a55" } } },
        tooltip: { y: { formatter: (value) => `${formatNumber(value, 3)} kWh` } },
      },
    };
  }, [sortedDaily]);

  const weekdayChart = useMemo(() => {
    const buckets = weekdayLabels.map(() => ({ total: 0, count: 0 }));
    ringkasanHarian.forEach((item) => {
      const dayIndex = new Date(item.tanggal).getDay();
      buckets[dayIndex].total += Number(item.konsumsi_kWh || 0);
      buckets[dayIndex].count += 1;
    });

    return {
      series: [
        {
          name: "Rata-rata kWh",
          data: buckets.map((bucket) =>
            bucket.count ? Number((bucket.total / bucket.count).toFixed(3)) : 0
          ),
        },
      ],
      options: {
        chart: { toolbar: { show: false } },
        colors: ["#f59e0b"],
        dataLabels: { enabled: false },
        grid: { borderColor: "#d8e1dc" },
        plotOptions: { bar: { borderRadius: 4, columnWidth: "52%" } },
        xaxis: {
          categories: weekdayLabels,
          labels: { style: { colors: "#4a5a55" } },
        },
        yaxis: { labels: { style: { colors: "#4a5a55" } } },
        tooltip: { y: { formatter: (value) => `${formatNumber(value, 3)} kWh` } },
      },
    };
  }, [ringkasanHarian]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handlePrint() {
    window.print();
  }

  async function handleExportPdf() {
    if (!user?.user_id) {
      return;
    }

    setIsExportingPdf(true);
    setMessage("");
    setError("");

    try {
      await downloadBulananPrediksiPdf(user.user_id);
      setMessage(APP_MESSAGES.laporan.exportSuccess);
    } catch (err) {
      setError(normalizeErrorMessage(err));
    } finally {
      setIsExportingPdf(false);
    }
  }

  const needsTagihan = summary.totalTagihan < 3;

  return (
    <main className="min-h-screen bg-[#edf4ef] px-4 py-6 text-[#13201d] md:py-8">
      <section className="mx-auto max-w-7xl print-dashboard">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-lg border border-[#12312b] bg-[#12312b] p-6 text-white shadow-lg md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-200">
              Dashboard 
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">
              Ayo Hemat Listrik! Using Electricity Wisely
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-50">
              Halo, {user?.username}. Pantau tagihan, konsumsi harian, prediksi,
              dan rekomendasi dari satu layar kerja.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row no-print">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition hover:border-emerald-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:border-white/20 disabled:text-white/70"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              type="button"
            >
              <MdPictureAsPdf className="h-5 w-5" />
              {isExportingPdf ? "Mengunduh..." : "Export PDF"}
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition hover:border-emerald-200 hover:bg-white/10"
              onClick={handlePrint}
              type="button"
            >
              <MdPrint className="h-5 w-5" />
              Cetak Dashboard
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/30 px-4 text-sm font-semibold text-white transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
              type="button"
            >
              <MdLogout className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>

        {needsTagihan ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-amber-800">
                  Langkah Awal
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#13201d]">
                  Lengkapi minimal 3 bulan tagihan
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
                  Data tagihan dibutuhkan agar prediksi biaya bulan depan dan
                  chart historis bisa dihitung. Saat ini tersedia{" "}
                  {summary.totalTagihan} dari 3 tagihan minimum.
                </p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] no-print"
                onClick={() => navigate("/tagihan")}
                type="button"
              >
                <MdReceipt className="h-5 w-5" />
                Input Tagihan
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Total Tagihan</p>
            <p className="mt-2 text-2xl font-bold">{summary.totalTagihan}</p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Rata-rata Tagihan</p>
            <p className="mt-2 text-2xl font-bold">
              {formatCurrency(summary.averageBill)}
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Rata-rata Harian</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(summary.averageDailyKwh, 3)} kWh
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Estimasi Alat</p>
            <p className="mt-2 text-2xl font-bold">
              {formatNumber(summary.estimatedDeviceKwh, 3)} kWh
            </p>
          </div>
          <div className="rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm">
            <p className="text-sm text-[#5a6a64]">Prediksi Terbaru</p>
            <p className="mt-2 text-2xl font-bold">
              {latestPrediksi ? formatCurrency(latestPrediksi.prediksi_biaya) : "-"}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm no-print">
          <SectionHeader
            title="Aksi Cepat"
            subtitle="Akses fitur dibawah ini untuk mendapatkan prediksi biaya listrik atau rekomendasi penghematan."
            action={
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#b9c8c1] px-4 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
                disabled={isLoading}
                onClick={loadDashboard}
                type="button"
              >
                <MdRefresh className="h-5 w-5" />
                Muat Ulang
              </button>
            }
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-[#d8e1dc] bg-white px-3 text-sm font-semibold text-[#243b34] transition hover:border-[#176b52] hover:text-[#176b52]"
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  type="button"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
            <SectionHeader
              title="Histori Tagihan"
              subtitle="Nominal tagihan yang tersimpan"
            />
            {billChart.series[0].data.length ? (
              <div className="h-[320px]">
                <Chart
                  options={billChart.options}
                  series={billChart.series}
                  type="bar"
                  width="100%"
                  height="100%"
                />
              </div>
            ) : (
              <EmptyChart>Belum ada data tagihan untuk divisualisasikan.</EmptyChart>
            )}
          </div>

          <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
            <SectionHeader
              title="Prediksi Bulan Depan"
              subtitle="Hasil prediksi terbaru dari model Random Forest."
            />
            {latestPrediksi ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                  <p className="text-sm text-[#5a6a64]">Estimasi Biaya</p>
                  <p className="mt-2 text-3xl font-bold">
                    {formatCurrency(latestPrediksi.prediksi_biaya)}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                    <p className="text-sm text-[#5a6a64]">Estimasi kWh</p>
                    <p className="mt-2 text-xl font-bold">
                      {formatNumber(latestPrediksi.prediksi_kWh)} kWh
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#d8e1dc] bg-white p-4">
                    <p className="text-sm text-[#5a6a64]">Metode</p>
                    <p className="mt-2 text-xl font-bold">
                      {latestPrediksi.metode === "hybrid_harian"
                        ? "hybrid_harian"
                        : "Histori Tagihan"}
                    </p>
                  </div>
                </div>
                <button
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#176b52] px-4 text-sm font-semibold text-white transition hover:bg-[#0f523e] no-print"
                  onClick={() => navigate("/prediksi")}
                  type="button"
                >
                  <MdBolt className="h-5 w-5" />
                  Lihat Detail Prediksi
                </button>
              </div>
            ) : (
              <EmptyChart>
                Belum ada prediksi. Buat prediksi setelah tagihan minimal 3 bulan.
              </EmptyChart>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
            <SectionHeader
              title="Konsumsi Harian"
              subtitle="Konsumsi kWh dari input pemakaian harian 30 data terakhir."
            />
            {dailyLineChart.series[0].data.length ? (
              <div className="h-[320px]">
                <Chart
                  options={dailyLineChart.options}
                  series={dailyLineChart.series}
                  type="line"
                  width="100%"
                  height="100%"
                />
              </div>
            ) : (
              <EmptyChart>Belum ada data pemakaian harian.</EmptyChart>
            )}
          </div>

          <div className="rounded-lg border border-[#cfded6] bg-[#fffdf7] p-5 shadow-sm">
            <SectionHeader
              title="Rata-rata Per Hari"
              subtitle="Perbandingan rata-rata konsumsi kWh berdasarkan hari."
            />
            {ringkasanHarian.length ? (
              <div className="h-[320px]">
                <Chart
                  options={weekdayChart.options}
                  series={weekdayChart.series}
                  type="bar"
                  width="100%"
                  height="100%"
                />
              </div>
            ) : (
              <EmptyChart>Belum ada data untuk perbandingan hari.</EmptyChart>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
