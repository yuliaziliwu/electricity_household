import { MdArrowForward, MdBolt } from "react-icons/md";

const moduleItems = [
  {
    title: "Modul 1",
    name: "Autentikasi & Profil",
    description: "Login, register, role user, dan profil rumah tangga.",
  },
  {
    title: "Modul 2",
    name: "Input Tagihan",
    description: "Placeholder untuk data historis struk tagihan listrik.",
  },
  {
    title: "Modul 3",
    name: "Prediksi Biaya",
    description: "Placeholder untuk prediksi konsumsi dan biaya listrik.",
  },
  {
    title: "Modul 4",
    name: "Alat Elektronik",
    description: "Placeholder untuk daftar alat dan daya per perangkat.",
  },
  {
    title: "Modul 5",
    name: "Pemakaian Harian",
    description: "Placeholder untuk input jam pemakaian aktual harian.",
  },
  {
    title: "Modul 6",
    name: "Dashboard & Visualisasi",
    description: "Placeholder untuk grafik, ringkasan, dan indikator energi.",
  },
  {
    title: "Modul 7",
    name: "Rekomendasi Hemat",
    description: "Placeholder untuk rekomendasi penghematan berbasis DSS.",
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
    description: "Placeholder untuk kelola user, tarif, statistik, dan model.",
  },
];

export default function ModuleGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {moduleItems.map((item) => (
        <article
          className="flex min-h-[210px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          key={item.title}
        >
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <MdBolt className="h-6 w-6" />
              </div>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-normal text-slate-600">
                {item.title}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-950">{item.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {item.description}
            </p>
          </div>

          <button
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            type="button"
          >
            Buka Modul
            <MdArrowForward className="h-4 w-4" />
          </button>
        </article>
      ))}
    </div>
  );
}
