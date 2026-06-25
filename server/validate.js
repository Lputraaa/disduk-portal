// server/validate.js
// Validasi sederhana untuk input formulir.
// Catatan: validasi format saja (panjang & jenis karakter), bukan validasi
// kebenaran data ke sumber resmi (Dukcapil/Disdukcapil pusat).

function isDigits(str, len) {
  return typeof str === 'string' && new RegExp(`^\\d{${len}}$`).test(str.trim());
}

function isNonEmpty(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

function isValidDate(str) {
  if (!isNonEmpty(str)) return false;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return false;
  // Tidak boleh tanggal di masa depan
  return d.getTime() <= Date.now();
}

function isPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 50;
}

/**
 * Memvalidasi body formulir Akta Kelahiran.
 * Mengembalikan array pesan error (kosong jika valid).
 */
function validateKelahiran(body) {
  const errors = [];
  if (!isDigits(body.no_kk, 16)) errors.push('No KK harus 16 digit angka.');
  if (!isNonEmpty(body.nama_lengkap_bayi)) errors.push('Nama lengkap bayi wajib diisi.');
  if (!isPositiveInt(body.anak_ke)) errors.push('Anak ke- harus berupa angka antara 1 dan 50.');
  if (!isNonEmpty(body.tempat_lahir)) errors.push('Tempat lahir wajib diisi.');
  if (!isValidDate(body.tanggal_lahir)) errors.push('Tanggal lahir tidak valid atau berada di masa depan.');
  if (!isDigits(body.nik_pelapor, 16)) errors.push('NIK Pelapor harus 16 digit angka.');
  if (!isDigits(body.nik_saksi1, 16)) errors.push('NIK Saksi 1 harus 16 digit angka.');
  if (!isDigits(body.nik_saksi2, 16)) errors.push('NIK Saksi 2 harus 16 digit angka.');
  return errors;
}

/**
 * Memvalidasi body formulir Akta Kematian.
 */
function validateKematian(body) {
  const errors = [];
  if (!isDigits(body.no_kk, 16)) errors.push('No KK harus 16 digit angka.');
  if (!isDigits(body.nik_jenazah, 16)) errors.push('NIK Jenazah harus 16 digit angka.');
  if (!isNonEmpty(body.tempat_kematian)) errors.push('Tempat kematian wajib diisi.');
  if (!isValidDate(body.tanggal_kematian)) errors.push('Tanggal kematian tidak valid atau berada di masa depan.');
  if (!isPositiveInt(body.anak_ke)) errors.push('Anak ke- harus berupa angka antara 1 dan 50.');
  if (!isDigits(body.nik_pelapor, 16)) errors.push('NIK Pelapor harus 16 digit angka.');
  if (!isDigits(body.nik_saksi1, 16)) errors.push('NIK Saksi 1 harus 16 digit angka.');
  if (!isDigits(body.nik_saksi2, 16)) errors.push('NIK Saksi 2 harus 16 digit angka.');
  return errors;
}

module.exports = { validateKelahiran, validateKematian };
