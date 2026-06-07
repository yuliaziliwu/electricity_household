import { Link } from "react-router-dom";
import { MdArrowForward, MdBolt } from "react-icons/md";

const moduleItems = [
  {
    title: "Modul 1",
    name: "Autentikasi & Profil",
    description: "Login, register, role user, dan profil rumah tangga.",
    path: "/dashboard",
  },
  {
    title: "Modul 2",
    name: "Input Tagihan",
    description: "Placeholder untuk data historis struk tagihan listrik.",
    path: "/tagihan",
  },
  {
    title: "Modul 3",
    name: "Prediksi Biaya",
    description: "Prediksi tagihan bulan depan dengan model AI enhanced.",
    path: "/prediksi",
  },
  {
    title: "Modul 4",
    name: "Alat Elektronik",
    description: "Input bulk, edit, hapus, dan estimasi konsumsi alat.",
    path: "/alat",
  },
  {
    title: "Modul 5",
    name: "Pemakaian Harian",
    description: "Input jam aktual per alat, riwayat, dan ringkasan kWh.",
    path: "/pemakaian",
  },
  {
    title: "Modul 6",
    name: "Dashboard & Visualisasi",
    description: "Placeholder untuk grafik, ringkasan, dan indikator energi.",
  },
  {
    title: "Modul 7",
    name: "Rekomendasi Hemat",
    description: "Rekomendasi penghematan berbasis aturan DSS IF-THEN.",
    path: "/rekomendasi",
  },
  {
    title: "Modul 8",
    name: "Aturan DSS",
    description: "Placeholder untuk aturan keputusan dan saran hemat energi.",
  },
  {
    title: "Modul 9",
    name: "Laporan & Export",
    description: "Placeholder untuk export data, laporan, dan cetak dashboard.",
  },
  {
    title: "Modul 10",
    name: "Admin",
    description: "Kelola user, tarif, statistik global, aturan DSS, dan model RF.",
    path: "/admin/dashboard",
  },
];

export default function ModuleGrid() {
  function renderAction(item) {
    const className =
      "mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#183b34] bg-[#183b34] px-4 text-sm font-semibold text-white transition hover:bg-emerald-800";

    if (item.path) {
      return (
        <Link className={className} to={item.path}>
          Buka Modul
          <MdArrowForward className="h-4 w-4" />
        </Link>
      );
    }

    return (
      <button
        className={`${className} cursor-not-allowed opacity-70`}
        disabled
        type="button"
      >
        Buka Modul
        <MdArrowForward className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {moduleItems.map((item, index) => (
        <article
          className="flex min-h-[220px] flex-col justify-between rounded-lg border border-[#d8e1dc] bg-[#fffdf7] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-md"
          key={item.title}
        >
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-md ${
                  index % 3 === 0
                    ? "bg-emerald-100 text-emerald-800"
                    : index % 3 === 1
                    ? "bg-amber-100 text-amber-800"
                    : "bg-cyan-100 text-cyan-800"
                }`}
              >
                <MdBolt className="h-6 w-6" />
              </div>
              <span className="rounded-md bg-[#183b34] px-3 py-1 text-xs font-semibold uppercase tracking-normal text-white">
                {item.title}
              </span>
            </div>
            <h3 className="text-lg font-bold text-[#13201d]">{item.name}</h3>
            <p className="mt-3 text-sm leading-6 text-[#4a5a55]">
              {item.description}
            </p>
          </div>

          {renderAction(item)}
        </article>
      ))}
    </div>
  );
}
