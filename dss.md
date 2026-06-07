## Implementasi Decision Support System (DSS) untuk Rekomendasi Penghematan

DSS pada sistem ini digunakan untuk menghasilkan rekomendasi penghematan energi berdasarkan aturan berbasis kondisi atau rule-based IF-THEN.

DSS tidak digunakan untuk memprediksi biaya listrik. Prediksi biaya listrik dilakukan oleh model Random Forest. DSS digunakan setelah data user tersedia untuk memberikan saran penghematan yang mudah dipahami oleh pengguna.

### Cara Kerja DSS

Alur kerja DSS:

```text
User input data alat elektronik dan pemakaian harian
        ↓
Backend membaca profil user, daya terpasang, daftar alat, dan konsumsi harian
        ↓
Sistem menjalankan aturan DSS berbasis IF-THEN
        ↓
Jika kondisi aturan terpenuhi, sistem membuat rekomendasi
        ↓
Rekomendasi disimpan ke database
        ↓
Frontend menampilkan rekomendasi ke user
```

### Data yang Digunakan DSS

DSS menggunakan data berikut:

1. Data profil user:

   * user_id
   * daya_terpasang
   * jumlah_penghuni

2. Data alat elektronik:

   * nama_alat
   * jumlah
   * daya_watt
   * jam_default_per_hari

3. Data pemakaian harian:

   * tanggal
   * jam_aktual
   * konsumsi_kWh

4. Data tarif listrik:

   * daya_va
   * tarif_per_kwh

### Output DSS

Setiap rekomendasi DSS harus memiliki format:

```json
{
  "kode": "R1",
  "teks": "Isi rekomendasi penghematan",
  "prioritas": "tinggi",
  "kategori": "daya",
  "potensi_hemat": 0
}
```

Keterangan:

* kode: kode aturan DSS, misalnya R1, R2, R3
* teks: pesan rekomendasi yang ditampilkan ke user
* prioritas: tinggi, sedang, atau rendah
* kategori: daya, alat, konsumsi, profil, atau default
* potensi_hemat: estimasi penghematan dalam rupiah jika bisa dihitung

---

## Aturan DSS yang Harus Diimplementasikan

### R1 - Daya Kecil

Kondisi:

```text
daya_terpasang <= 900
```

Rekomendasi:

```text
Hindari menggunakan perangkat tinggi watt seperti setrika, pompa air, dispenser, dan magicom secara bersamaan untuk mencegah listrik turun atau mati.
```

Prioritas: tinggi
Kategori: daya

---

### R2 - Daya Besar

Kondisi:

```text
daya_terpasang >= 1300
```

Rekomendasi:

```text
Pertimbangkan menggunakan perangkat hemat energi seperti AC inverter, kulkas inverter, dan lampu LED untuk menekan konsumsi listrik.
```

Prioritas: sedang
Kategori: daya

---

### R3 - Konsumsi Per Orang Tinggi

Kondisi:

```text
estimasi_konsumsi_bulanan / jumlah_penghuni > 120
```

Rumus:

```text
estimasi_konsumsi_bulanan = rata_rata_konsumsi_harian * 30
konsumsi_per_orang = estimasi_konsumsi_bulanan / jumlah_penghuni
```

Rekomendasi:

```text
Konsumsi listrik per penghuni cukup tinggi. Lakukan audit penggunaan alat elektronik harian.
```

Prioritas: tinggi
Kategori: profil

---

### R4 - AC Boros

Kondisi:

```text
nama_alat mengandung "ac"
AND daya_watt > 500
AND jam_default_per_hari > 8
```

Rekomendasi:

```text
AC Anda digunakan lebih dari 8 jam per hari. Gunakan timer dan atur suhu 24–26°C untuk menghemat listrik.
```

Rumus potensi hemat:

```text
hemat_kwh_bulan = jumlah * daya_watt * 2 * 30 / 1000
potensi_hemat = hemat_kwh_bulan * tarif_per_kwh
```

Jika tarif belum tersedia, gunakan default:

```text
tarif_per_kwh = 1444.70
```

Prioritas: tinggi
Kategori: alat

---

### R5 - Lampu Boros

Kondisi:

```text
nama_alat mengandung "lampu"
AND jumlah > 5
AND daya_watt > 15
```

Rekomendasi:

```text
Jumlah atau daya lampu cukup besar. Ganti lampu ke LED 5–10 watt untuk menghemat biaya pencahayaan.
```

Prioritas: sedang
Kategori: alat

---

### R6 - Lonjakan Konsumsi Harian

Kondisi:

```text
jumlah data konsumsi harian >= 7
AND konsumsi hari terakhir > 1.5 * rata_rata_7_hari
```

Rekomendasi:

```text
Konsumsi listrik terakhir melonjak dibanding rata-rata 7 hari terakhir. Cek kemungkinan ada perangkat yang lupa dimatikan.
```

Prioritas: tinggi
Kategori: konsumsi

---

### R7 - Akhir Pekan Boros

Kondisi:

```text
rata_rata_konsumsi_sabtu_minggu > 1.3 * rata_rata_konsumsi_senin_jumat
```

Rekomendasi:

```text
Konsumsi akhir pekan lebih tinggi dari hari kerja. Kurangi penggunaan TV, gaming, AC, atau perangkat hiburan berdaya besar saat hari libur.
```

Prioritas: sedang
Kategori: konsumsi

---

### R8 - Risiko Melebihi Daya Terpasang

Kondisi:

```text
total_watt_alat > 0.9 * daya_terpasang
```

Rumus:

```text
total_watt_alat = SUM(jumlah * daya_watt)
batas_aman = 0.9 * daya_terpasang
```

Rekomendasi:

```text
Total daya perangkat elektronik berisiko mendekati batas daya terpasang. Hindari menyalakan banyak perangkat besar secara bersamaan.
```

Prioritas: tinggi
Kategori: daya

---

### R9 - Standby Power

Kondisi:

```text
rekomendasi spesifik kurang dari 3
```

Rekomendasi:

```text
Cabut charger, TV, rice cooker, dan perangkat elektronik lain saat tidak digunakan karena mode standby tetap menggunakan listrik.
```

Prioritas: rendah
Kategori: default

---

### R10 - Rekomendasi Default

Kondisi:

```text
tidak ada aturan lain yang terpenuhi
```

Rekomendasi:

```text
Penggunaan listrik Anda masih tergolong normal. Tetap pantau konsumsi harian dan gunakan alat elektronik seperlunya.
```

Prioritas: rendah
Kategori: default

---

## Ketentuan Implementasi Backend DSS

Buat file:

```text
backend/utils/rules_dss.py
```

atau jika backend menggunakan NestJS:

```text
src/modules/recommendation/recommendation.service.ts
```

Function utama DSS harus menerima data:

```text
user
alat_list / devices
konsumsi_harian / device_usages
tarif_per_kwh
```

Function DSS harus mengembalikan list rekomendasi.

Contoh nama function:

```text
generateRecommendations()
```

atau:

```text
generateDssRecommendations()
```

Backend harus menyediakan endpoint:

```http
GET /api/rekomendasi
```

Endpoint ini digunakan untuk membuat rekomendasi baru berdasarkan data terbaru user.

Backend juga harus menyediakan endpoint:

```http
GET /api/rekomendasi/riwayat
```

Endpoint ini digunakan untuk melihat riwayat rekomendasi.

Backend juga harus menyediakan endpoint:

```http
PUT /api/rekomendasi/:id/terapkan
```

Endpoint ini digunakan untuk menandai rekomendasi sebagai sudah diterapkan.

Semua rekomendasi yang dihasilkan DSS harus disimpan ke tabel rekomendasi.

---

## Ketentuan Implementasi Frontend DSS

Frontend harus memiliki fitur:

1. Button “Dapatkan Rekomendasi”
2. Menampilkan rekomendasi dalam bentuk card
3. Menampilkan:

   * teks rekomendasi
   * prioritas
   * kategori
   * potensi hemat jika tersedia
4. Button “Tandai Sudah Diterapkan”
5. Riwayat rekomendasi

Frontend hanya bertugas menampilkan hasil DSS dari backend. Logic utama DSS tidak boleh ditaruh di frontend.
