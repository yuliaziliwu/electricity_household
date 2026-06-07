# Status Implementasi Fitur

Checklist ini dicocokkan dari `README.md` terhadap kode backend dan frontend saat ini.

Legenda:
- `[x]` Sudah terimplementasi di backend dan frontend, atau sudah tersedia sebagai fitur yang bisa dipakai.
- `[ ]` Belum terimplementasi atau baru berupa placeholder.

## Ringkasan Modul

| Modul | Nama Modul | Status |
|-------|------------|--------|
| 1 | Autentikasi & Profil | Parsial, fitur wajib selesai |
| 2 | Input Data Historis Tagihan | Selesai |
| 3 | Prediksi Biaya Listrik | Belum |
| 4 | Input Alat Elektronik | Selesai |
| 5 | Input Pemakaian Harian | Selesai |
| 6 | Dashboard & Visualisasi End User | Belum |
| 7 | Rekomendasi Penghematan DSS | Selesai, kecuali benchmarking opsional |
| 8 | Aturan Decision Support System | Parsial, master aturan admin tersedia |
| 9 | Laporan & Export | Belum |
| 10 | Admin | Selesai |

## 1. Modul Autentikasi & Profil

| No | Fitur | Status |
|----|-------|--------|
| 1.1 | Registrasi Akun | [x] |
| 1.2 | Login | [x] |
| 1.3 | Pilih Daya Terpasang saat registrasi | [x] |
| 1.4 | Input Jumlah Penghuni | [x] |
| 1.5 | Edit Profil | [ ] |

Catatan: login sudah mengembalikan token bearer dan refresh token. Edit profil belum ada route dan halaman/form frontend khusus.

## 2. Modul Input Data Historis (Struk Tagihan)

| No | Fitur | Status |
|----|-------|--------|
| 2.1 | Input Tagihan Per bulan | [x] |
| 2.2 | Tambah Baris Tagihan | [x] |
| 2.3 | Hapus Baris Tagihan | [x] |
| 2.4 | Validasi bulan Unik | [x] |
| 2.5 | Konversi Biaya ke kWh | [x] |
| 2.6 | Edit Tagihan | [x] |
| 2.7 | Hapus Tagihan | [x] |
| 2.8 | Lihat Riwayat Tagihan | [x] |

## 3. Modul Prediksi Biaya Listrik

| No | Fitur | Status |
|----|-------|--------|
| 3.1 | Prediksi Awal setelah input 3-6 tagihan | [ ] |
| 3.2 | Tampilkan Hasil Prediksi | [ ] |
| 3.3 | Prediksi Ulang Hybrid | [ ] |
| 3.4 | Indikator metode Prediksi | [ ] |
| 3.5 | Riwayat Prediksi | [ ] |
| 3.6 | Simpan Hasil Prediksi | [ ] |

Catatan: file `backend/routes/prediksi.py` masih kosong dan belum didaftarkan di `backend/app.py`. Belum ada API atau UI prediksi end user.

## 4. Modul Input Alat Elektronik (Bulk Mode)

| No | Fitur | Status |
|----|-------|--------|
| 4.1 | Input Bulk Alat Elektronik | [x] |
| 4.2 | Tambah Baris Alat | [x] |
| 4.3 | Hapus Baris Alat | [x] |
| 4.4 | Submit Multiple Alat | [x] |
| 4.5 | Edit Daftar Alat | [x] |
| 4.6 | Hapus Alat | [x] |
| 4.7 | Lihat Daftar Alat | [x] |
| 4.8 | Hitung Estimasi Konsumsi Teoritis | [x] |

## 5. Modul Input Pemakaian Harian (Jam Aktual per Alat)

| No | Fitur | Status |
|----|-------|--------|
| 5.1 | Input Pemakaian Harian per Alat | [x] |
| 5.2 | Input untuk Tanggal Kemarin/Hari Ini | [x] |
| 5.3 | Validasi Tanggal Unik per Alat | [x] |
| 5.4 | Edit Pemakaian Harian | [x] |
| 5.5 | Hapus Pemakaian Harian | [x] |
| 5.6 | Lihat Riwayat Pemakaian | [x] |
| 5.7 | Pesan Ajakan Input Harian | [x] |

## 6. Modul Dashboard & Visualisasi

| No | Fitur | Status |
|----|-------|--------|
| 6.1 | Line Chart Konsumsi Harian | [ ] |
| 6.2 | Bar Chart Perbandingan Hari | [ ] |
| 6.3 | Kartu Info Ringkasan | [ ] |
| 6.4 | Tampilkan Prediksi Terbaru | [ ] |
| 6.5 | Gauge Sisa Kuota Daya | [ ] |
| 6.6 | Tooltip Interaktif | [ ] |

Catatan: `UserDashboard` masih berupa profil singkat dan navigasi modul. Grafik yang ada saat ini berada di dashboard admin, bukan dashboard end user sesuai modul 6.

## 7. Modul Rekomendasi Penghematan (DSS)

| No | Fitur | Status |
|----|-------|--------|
| 7.1 | Button Dapatkan Rekomendasi | [x] |
| 7.2 | Rekomendasi Berdasarkan Alat | [x] |
| 7.3 | Rekomendasi Berdasarkan Konsumsi Harian | [x] |
| 7.4 | Rekomendasi Berdasarkan Profil Daya | [x] |
| 7.5 | Rekomendasi Berdasarkan Benchmarking | [ ] |
| 7.6 | Estimasi Potensi Hemat | [x] |
| 7.7 | Tandai Rekomendasi Sudah Diterapkan | [x] |
| 7.8 | Riwayat Rekomendasi | [x] |
| 7.9 | Simpan Rekomendasi ke Database | [x] |

Catatan: Modul 7 sudah tersedia melalui `GET /api/rekomendasi`, `GET /api/rekomendasi/riwayat`, dan `PUT /api/rekomendasi/<id>/terapkan`. Frontend sudah memiliki halaman `/rekomendasi`. Benchmarking belum diimplementasikan karena belum ada tabel atau dataset referensi rumah tangga sejenis.

## 8. Modul Aturan Decision Support System (DSS)

| No | Aturan | Status |
|----|--------|--------|
| R1 | Daya kecil | [x] |
| R2 | Daya besar | [x] |
| R3 | Konsumsi melebihi rata-rata | [x] |
| R4 | AC boros | [x] |
| R5 | Kulkas boros | [x] |
| R6 | Lonjakan konsumsi | [x] |
| R7 | Akhir pekan boros | [x] |
| R8 | Risiko melebihi daya | [x] |
| R9 | Pencahayaan | [x] |
| R10 | Standby power | [x] |

Catatan: aturan R1-R10 tersedia sebagai master aturan admin. Evaluasi DSS untuk rekomendasi user sudah berjalan di `backend/utils/rules_dss.py` dengan model rule-based IF-THEN sesuai `dss.md`.

## 9. Modul Laporan & Export

| No | Fitur | Status |
|----|-------|--------|
| 9.1 | Export Data Konsumsi ke CSV | [ ] |
| 9.2 | Export Laporan Bulanan PDF | [ ] |
| 9.3 | Print Dashboard | [ ] |

## 10. Modul Admin

| No | Fitur | Status |
|----|-------|--------|
| 10.1 | Login Admin | [x] |
| 10.2 | Kelola Tarif Listrik | [x] |
| 10.3 | Lihat Semua User | [x] |
| 10.4 | Lihat Statistik Global | [x] |
| 10.5 | Kelola Aturan DSS | [x] |
| 10.6 | Retrain Model RF | [x] |

## Modul yang Belum Diimplementasikan

- Modul 3 Prediksi Biaya Listrik.
- Modul 6 Dashboard & Visualisasi End User.
- Fitur 7.5 Rekomendasi Berdasarkan Benchmarking.
- Modul 9 Laporan & Export.
- Fitur 1.5 Edit Profil.
