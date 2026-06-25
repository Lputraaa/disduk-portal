# Portal Layanan Dukcapil — Kependudukan & Pencatatan Sipil

Aplikasi web contoh untuk layanan **Kependudukan & Pencatatan Sipil**, dengan dua
loket: **Akta Kelahiran** dan **Akta Kematian**. Pemohon mengisi formulir, mengunggah
dokumen pendukung, dan mendapat **nomor tanda terima**. Petugas memverifikasi
permohonan lewat **Panel Petugas**.

Data disimpan **permanen** di database SQLite (berkas `data/disduk.db`) dan berkas
unggahan disimpan di folder `uploads/`. Tidak ada data yang hilang saat server
di-restart.

## Stack teknis

- **Backend:** Node.js + Express
- **Database:** SQLite, lewat modul bawaan Node.js `node:sqlite` (tidak perlu instal
  database server terpisah, tidak perlu kompilasi native module)
- **Upload berkas:** Multer (disimpan ke disk, divalidasi tipe & ukuran)
- **Frontend:** HTML/CSS/JS murni (tanpa framework, tanpa build step)

## Cara menjalankan

Membutuhkan **Node.js versi 22.5 atau lebih baru** (karena memakai `node:sqlite`).

```bash
npm install
npm start
```

Lalu buka **http://localhost:3000**.

Untuk pengembangan dengan auto-reload saat file berubah:

```bash
npm run dev
```

Server berjalan di port `3000` secara default. Untuk mengubah port:

```bash
PORT=8080 npm start
```

## Struktur folder

```
disduk-portal/
├── server/
│   ├── server.js       # Express app + semua route API
│   ├── db.js            # Setup SQLite & skema tabel
│   └── validate.js      # Validasi input formulir
├── public/               # Semua halaman & aset frontend (statis)
│   ├── index.html
│   ├── layanan-kependudukan.html
│   ├── akta-kelahiran.html
│   ├── akta-kematian.html
│   ├── admin.html        # Panel verifikasi petugas
│   ├── css/style.css
│   └── js/
├── uploads/               # Berkas dokumen yang diunggah pemohon (dibuat otomatis)
│   ├── kelahiran/
│   └── kematian/
└── data/
    └── disduk.db          # Database SQLite (dibuat otomatis saat pertama jalan)
```

## Alur pemakaian

1. Beranda → kategori **Kependudukan & Pencatatan Sipil** → pilih loket.
2. Pemohon mengisi formulir + mengunggah 4 dokumen wajib (foto asli, JPG/PNG/WEBP/PDF, maks. 5MB per berkas).
3. Setelah submit berhasil, sistem menampilkan **tiket tanda terima** dengan nomor unik, contoh `KLH-20260624-0001`.
4. Data & berkas tersimpan ke database dan folder `uploads/`.
5. Petugas membuka **/admin.html** untuk melihat daftar permohonan, membuka dokumen yang diunggah, dan mengubah status (`Menunggu Verifikasi` → `Diproses` → `Disetujui`/`Ditolak`).

## Ringkasan API

| Method | Endpoint                          | Keterangan                                  |
|--------|------------------------------------|----------------------------------------------|
| POST   | `/api/kelahiran`                  | Kirim permohonan akta kelahiran (multipart)  |
| GET    | `/api/kelahiran`                  | Daftar semua permohonan akta kelahiran       |
| GET    | `/api/kelahiran/:id`              | Detail satu permohonan                       |
| PATCH  | `/api/kelahiran/:id/status`       | Ubah status verifikasi                       |
| POST   | `/api/kematian`                   | Kirim permohonan akta kematian (multipart)   |
| GET    | `/api/kematian`                   | Daftar semua permohonan akta kematian        |
| GET    | `/api/kematian/:id`               | Detail satu permohonan                       |
| PATCH  | `/api/kematian/:id/status`        | Ubah status verifikasi                       |

Body `POST` dikirim sebagai `multipart/form-data` berisi field teks formulir +
4 field berkas (`formulir_f201`, dst., sesuai nama pada masing-masing form HTML).

Body `PATCH .../status`:
```json
{ "status": "Disetujui", "catatan_petugas": "opsional" }
```

## ⚠️ Catatan penting sebelum dipakai untuk data sungguhan

Aplikasi ini adalah **contoh/template fungsional**, bukan sistem produksi siap pakai.
Karena data yang ditangani memuat **NIK dan No KK** (data pribadi yang dilindungi
**UU Pelindungan Data Pribadi/UU PDP**), sebelum dipakai untuk melayani masyarakat
sungguhan, sebaiknya tambahkan minimal:

1. **Autentikasi & otorisasi** — Halaman `/admin.html` dan endpoint `PATCH status`
   saat ini **tidak memiliki login**. Tambahkan sistem login petugas + kontrol akses
   berbasis peran sebelum dipublikasikan.
2. **HTTPS** — Jalankan di belakang reverse proxy (Nginx/Caddy) dengan sertifikat TLS,
   karena NIK/KK dan dokumen kependudukan tidak boleh dikirim lewat HTTP biasa.
3. **Enkripsi data sensitif** — Pertimbangkan enkripsi kolom NIK/No KK saat disimpan,
   serta enkripsi berkas dokumen di disk.
4. **Validasi & antivirus berkas unggahan** — Tambahkan pemeriksaan malware pada
   berkas yang diunggah, terutama jika nantinya menerima berkas dari banyak pengguna publik.
5. **Rate limiting & anti-spam** — Misalnya dengan `express-rate-limit`, untuk mencegah
   permohonan otomatis berulang (bot).
6. **Audit log** — Catat siapa mengubah status permohonan dan kapan.
7. **Integrasi data resmi** — Untuk verifikasi NIK/KK ke basis data Dukcapil/SIAK resmi,
   perlu kerja sama dan integrasi resmi dengan Direktorat Jenderal Kependudukan dan
   Pencatatan Sipil (Ditjen Dukcapil) — aplikasi ini tidak melakukan validasi tersebut.
8. **Backup rutin** — Cadangkan `data/disduk.db` dan folder `uploads/` secara berkala.

## Lisensi & penggunaan

Kode ini dibuat sebagai contoh teknis dan dapat dimodifikasi bebas sesuai kebutuhan.
Bukan merupakan produk atau situs resmi instansi pemerintah mana pun.
