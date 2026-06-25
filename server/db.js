// server/db.js
// Lapisan database menggunakan modul bawaan Node.js `node:sqlite`.
// Tidak perlu instal database server terpisah - data tersimpan permanen
// di dalam satu file: data/disduk.db

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'disduk.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS akta_kelahiran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomor_tracking TEXT UNIQUE NOT NULL,
  no_kk TEXT NOT NULL,
  nama_lengkap_bayi TEXT NOT NULL,
  anak_ke INTEGER NOT NULL,
  tempat_lahir TEXT NOT NULL,
  tanggal_lahir TEXT NOT NULL,
  nik_pelapor TEXT NOT NULL,
  nik_saksi1 TEXT NOT NULL,
  nik_saksi2 TEXT NOT NULL,
  file_formulir_f201 TEXT NOT NULL,
  file_kartu_keluarga TEXT NOT NULL,
  file_buku_nikah TEXT NOT NULL,
  file_keterangan_lahir TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
  catatan_petugas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS akta_kematian (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomor_tracking TEXT UNIQUE NOT NULL,
  no_kk TEXT NOT NULL,
  nik_jenazah TEXT NOT NULL,
  tempat_kematian TEXT NOT NULL,
  tanggal_kematian TEXT NOT NULL,
  anak_ke INTEGER NOT NULL,
  nik_pelapor TEXT NOT NULL,
  nik_saksi1 TEXT NOT NULL,
  nik_saksi2 TEXT NOT NULL,
  file_formulir_f201 TEXT NOT NULL,
  file_ktp_el_jenazah TEXT NOT NULL,
  file_kartu_keluarga TEXT NOT NULL,
  file_keterangan_kematian TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Menunggu Verifikasi',
  catatan_petugas TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS counters (
  scope TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0
);
`);

/**
 * Menghasilkan nomor tracking berurutan per hari, contoh:
 * KLH-20260624-0001, KTN-20260624-0001
 */
function nextTrackingNumber(prefix) {
  const today = new Date();
  const ymd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const scope = `${prefix}-${ymd}`;

  const tx = db.prepare('BEGIN IMMEDIATE');
  tx.run();
  try {
    const row = db.prepare('SELECT last_value FROM counters WHERE scope = ?').get(scope);
    const nextVal = row ? row.last_value + 1 : 1;
    if (row) {
      db.prepare('UPDATE counters SET last_value = ? WHERE scope = ?').run(nextVal, scope);
    } else {
      db.prepare('INSERT INTO counters (scope, last_value) VALUES (?, ?)').run(scope, nextVal);
    }
    db.prepare('COMMIT').run();
    return `${scope}-${String(nextVal).padStart(4, '0')}`;
  } catch (err) {
    db.prepare('ROLLBACK').run();
    throw err;
  }
}

module.exports = { db, nextTrackingNumber };
