// server/server.js
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');

const { db, nextTrackingNumber } = require('./db');
const { validateKelahiran, validateKematian } = require('./validate');

const app = express();
const PORT = process.env.PORT || 3000;

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
for (const sub of ['kelahiran', 'kematian']) {
  const dir = path.join(UPLOAD_ROOT, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

app.use(express.json());

// Header keamanan dasar
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// ---------------------------------------------------------------------------
// Basic Auth untuk Panel Petugas (/admin.html) dan semua API yang dipakainya.
// Username/password diatur lewat environment variable ADMIN_USER & ADMIN_PASS.
// Tujuannya: mencegah siapa pun yang punya link bisa lihat/ubah data warga
// (NIK, KK, dokumen) tanpa login. Ini PERLINDUNGAN MINIMAL untuk demo —
// untuk produksi sungguhan, ganti dengan sistem login + role yang lebih layak.
// ---------------------------------------------------------------------------
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'ubah-password-ini';

function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const sepIndex = decoded.indexOf(':');
    const user = decoded.slice(0, sepIndex);
    const pass = decoded.slice(sepIndex + 1);

    const userOk = crypto.timingSafeEqual(
      Buffer.from(user.padEnd(ADMIN_USER.length, '\0')),
      Buffer.from(ADMIN_USER.padEnd(user.length, '\0'))
    ) && user.length === ADMIN_USER.length;
    const passOk = crypto.timingSafeEqual(
      Buffer.from(pass.padEnd(ADMIN_PASS.length, '\0')),
      Buffer.from(ADMIN_PASS.padEnd(pass.length, '\0'))
    ) && pass.length === ADMIN_PASS.length;

    if (userOk && passOk) return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Panel Petugas Disduk", charset="UTF-8"');
  return res.status(401).send('Autentikasi diperlukan untuk mengakses Panel Petugas.');
}

// Lindungi halaman admin secara spesifik SEBELUM static file di-serve,
// supaya /admin.html tidak bisa dibuka langsung tanpa login.
app.get('/admin.html', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// Lindungi seluruh API kelahiran & kematian (dipakai oleh panel admin
// untuk melihat & mengubah status permohonan warga). POST (submit formulir
// oleh warga) TIDAK diproteksi karena itu memang harus bisa diakses publik.
app.get('/api/kelahiran', requireAdminAuth);
app.get('/api/kelahiran/:id', requireAdminAuth);
app.patch('/api/kelahiran/:id/status', requireAdminAuth);
app.get('/api/kematian', requireAdminAuth);
app.get('/api/kematian/:id', requireAdminAuth);
app.patch('/api/kematian/:id/status', requireAdminAuth);

// Lindungi akses dokumen yang diunggah warga (KK, KTP, akta, dll).
app.use('/uploads', requireAdminAuth);

app.use(express.static(PUBLIC_DIR));

// ---------------------------------------------------------------------------
// Konfigurasi upload dokumen (foto asli: jpg/jpeg/png/webp atau pdf hasil scan)
// ---------------------------------------------------------------------------
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per berkas

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, subfolder)),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(8).toString('hex');
      cb(null, `${Date.now()}-${unique}${ext}`);
    },
  });
}

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Jenis berkas tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.'));
  }
  cb(null, true);
}

const kelahiranFields = [
  { name: 'formulir_f201', maxCount: 1 },
  { name: 'kartu_keluarga', maxCount: 1 },
  { name: 'buku_nikah', maxCount: 1 },
  { name: 'keterangan_lahir', maxCount: 1 },
];

const kematianFields = [
  { name: 'formulir_f201', maxCount: 1 },
  { name: 'ktp_el_jenazah', maxCount: 1 },
  { name: 'kartu_keluarga', maxCount: 1 },
  { name: 'keterangan_kematian', maxCount: 1 },
];

const uploadKelahiran = multer({
  storage: makeStorage('kelahiran'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields(kelahiranFields);

const uploadKematian = multer({
  storage: makeStorage('kematian'),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).fields(kematianFields);

function relUploadPath(subfolder, filename) {
  return `/uploads/${subfolder}/${filename}`;
}

// Berkas dokumen disajikan lewat rute terbatas (bukan static langsung),
// supaya mudah ditambahkan otorisasi di kemudian hari.
app.get('/uploads/:subfolder/:filename', (req, res) => {
  const { subfolder, filename } = req.params;
  if (!['kelahiran', 'kematian'].includes(subfolder) || filename.includes('..')) {
    return res.status(400).send('Permintaan tidak valid.');
  }
  const filePath = path.join(UPLOAD_ROOT, subfolder, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Berkas tidak ditemukan.');
  res.sendFile(filePath);
});

function cleanupFiles(filesObj) {
  if (!filesObj) return;
  Object.values(filesObj).flat().forEach((f) => {
    fs.unlink(f.path, () => {});
  });
}

// ---------------------------------------------------------------------------
// API: Akta Kelahiran
// ---------------------------------------------------------------------------
app.post('/api/kelahiran', (req, res) => {
  uploadKelahiran(req, res, (err) => {
    if (err) {
      cleanupFiles(req.files);
      return res.status(400).json({ ok: false, errors: [err.message] });
    }

    const required = ['formulir_f201', 'kartu_keluarga', 'buku_nikah', 'keterangan_lahir'];
    const missing = required.filter((f) => !req.files || !req.files[f]);
    if (missing.length) {
      cleanupFiles(req.files);
      return res.status(400).json({
        ok: false,
        errors: missing.map((f) => `Dokumen "${f}" wajib diunggah.`),
      });
    }

    const errors = validateKelahiran(req.body);
    if (errors.length) {
      cleanupFiles(req.files);
      return res.status(400).json({ ok: false, errors });
    }

    try {
      const nomor_tracking = nextTrackingNumber('KLH');
      const f = req.files;
      const stmt = db.prepare(`
        INSERT INTO akta_kelahiran (
          nomor_tracking, no_kk, nama_lengkap_bayi, anak_ke, tempat_lahir, tanggal_lahir,
          nik_pelapor, nik_saksi1, nik_saksi2,
          file_formulir_f201, file_kartu_keluarga, file_buku_nikah, file_keterangan_lahir
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        nomor_tracking,
        req.body.no_kk.trim(),
        req.body.nama_lengkap_bayi.trim(),
        Number(req.body.anak_ke),
        req.body.tempat_lahir.trim(),
        req.body.tanggal_lahir,
        req.body.nik_pelapor.trim(),
        req.body.nik_saksi1.trim(),
        req.body.nik_saksi2.trim(),
        relUploadPath('kelahiran', f.formulir_f201[0].filename),
        relUploadPath('kelahiran', f.kartu_keluarga[0].filename),
        relUploadPath('kelahiran', f.buku_nikah[0].filename),
        relUploadPath('kelahiran', f.keterangan_lahir[0].filename),
      );

      return res.status(201).json({
        ok: true,
        id: Number(info.lastInsertRowid),
        nomor_tracking,
        message: 'Permohonan Akta Kelahiran berhasil disimpan dan menunggu verifikasi petugas.',
      });
    } catch (dbErr) {
      cleanupFiles(req.files);
      console.error(dbErr);
      return res.status(500).json({ ok: false, errors: ['Gagal menyimpan data ke database.'] });
    }
  });
});

app.get('/api/kelahiran', (req, res) => {
  const rows = db.prepare('SELECT * FROM akta_kelahiran ORDER BY id DESC').all();
  res.json({ ok: true, data: rows });
});

app.get('/api/kelahiran/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM akta_kelahiran WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, errors: ['Data tidak ditemukan.'] });
  res.json({ ok: true, data: row });
});

app.patch('/api/kelahiran/:id/status', (req, res) => {
  const { status, catatan_petugas } = req.body || {};
  const allowed = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, errors: ['Status tidak valid.'] });
  }
  const info = db
    .prepare(`UPDATE akta_kelahiran SET status = ?, catatan_petugas = ?, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(status, catatan_petugas || null, req.params.id);
  if (info.changes === 0) return res.status(404).json({ ok: false, errors: ['Data tidak ditemukan.'] });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// API: Akta Kematian
// ---------------------------------------------------------------------------
app.post('/api/kematian', (req, res) => {
  uploadKematian(req, res, (err) => {
    if (err) {
      cleanupFiles(req.files);
      return res.status(400).json({ ok: false, errors: [err.message] });
    }

    const required = ['formulir_f201', 'ktp_el_jenazah', 'kartu_keluarga', 'keterangan_kematian'];
    const missing = required.filter((f) => !req.files || !req.files[f]);
    if (missing.length) {
      cleanupFiles(req.files);
      return res.status(400).json({
        ok: false,
        errors: missing.map((f) => `Dokumen "${f}" wajib diunggah.`),
      });
    }

    const errors = validateKematian(req.body);
    if (errors.length) {
      cleanupFiles(req.files);
      return res.status(400).json({ ok: false, errors });
    }

    try {
      const nomor_tracking = nextTrackingNumber('KTN');
      const f = req.files;
      const stmt = db.prepare(`
        INSERT INTO akta_kematian (
          nomor_tracking, no_kk, nik_jenazah, tempat_kematian, tanggal_kematian, anak_ke,
          nik_pelapor, nik_saksi1, nik_saksi2,
          file_formulir_f201, file_ktp_el_jenazah, file_kartu_keluarga, file_keterangan_kematian
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(
        nomor_tracking,
        req.body.no_kk.trim(),
        req.body.nik_jenazah.trim(),
        req.body.tempat_kematian.trim(),
        req.body.tanggal_kematian,
        Number(req.body.anak_ke),
        req.body.nik_pelapor.trim(),
        req.body.nik_saksi1.trim(),
        req.body.nik_saksi2.trim(),
        relUploadPath('kematian', f.formulir_f201[0].filename),
        relUploadPath('kematian', f.ktp_el_jenazah[0].filename),
        relUploadPath('kematian', f.kartu_keluarga[0].filename),
        relUploadPath('kematian', f.keterangan_kematian[0].filename),
      );

      return res.status(201).json({
        ok: true,
        id: Number(info.lastInsertRowid),
        nomor_tracking,
        message: 'Permohonan Akta Kematian berhasil disimpan dan menunggu verifikasi petugas.',
      });
    } catch (dbErr) {
      cleanupFiles(req.files);
      console.error(dbErr);
      return res.status(500).json({ ok: false, errors: ['Gagal menyimpan data ke database.'] });
    }
  });
});

app.get('/api/kematian', (req, res) => {
  const rows = db.prepare('SELECT * FROM akta_kematian ORDER BY id DESC').all();
  res.json({ ok: true, data: rows });
});

app.get('/api/kematian/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM akta_kematian WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ ok: false, errors: ['Data tidak ditemukan.'] });
  res.json({ ok: true, data: row });
});

app.patch('/api/kematian/:id/status', (req, res) => {
  const { status, catatan_petugas } = req.body || {};
  const allowed = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ ok: false, errors: ['Status tidak valid.'] });
  }
  const info = db
    .prepare(`UPDATE akta_kematian SET status = ?, catatan_petugas = ?, updated_at = datetime('now','localtime') WHERE id = ?`)
    .run(status, catatan_petugas || null, req.params.id);
  if (info.changes === 0) return res.status(404).json({ ok: false, errors: ['Data tidak ditemukan.'] });
  res.json({ ok: true });
});

// Fallback 404 untuk rute API
app.use('/api', (req, res) => res.status(404).json({ ok: false, errors: ['Rute tidak ditemukan.'] }));

app.listen(PORT, () => {
  console.log(`Portal Kependudukan & Pencatatan Sipil berjalan di http://localhost:${PORT}`);
});
