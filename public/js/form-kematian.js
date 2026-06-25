// public/js/form-kematian.js
(() => {
  const form = document.getElementById('form-kematian');
  const submitBtn = document.getElementById('submit-btn');
  const statusEl = document.getElementById('submit-status');

  function validateClientSide(fd) {
    const errors = [];
    clearAllErrors(form);

    const checks = [
      ['no_kk', isDigitsLen(fd.get('no_kk'), 16), 'No KK harus 16 digit angka.'],
      ['nik_jenazah', isDigitsLen(fd.get('nik_jenazah'), 16), 'NIK Jenazah harus 16 digit angka.'],
      ['tempat_kematian', isNonEmpty(fd.get('tempat_kematian')), 'Tempat kematian wajib diisi.'],
      ['tanggal_kematian', isPastOrTodayDate(fd.get('tanggal_kematian')), 'Tanggal kematian tidak valid.'],
      ['anak_ke', isAnakKe(fd.get('anak_ke')), 'Anak ke- harus angka 1–50.'],
      ['nik_pelapor', isDigitsLen(fd.get('nik_pelapor'), 16), 'NIK Pelapor harus 16 digit angka.'],
      ['nik_saksi1', isDigitsLen(fd.get('nik_saksi1'), 16), 'NIK Saksi 1 harus 16 digit angka.'],
      ['nik_saksi2', isDigitsLen(fd.get('nik_saksi2'), 16), 'NIK Saksi 2 harus 16 digit angka.'],
    ];

    checks.forEach(([field, ok, msg]) => {
      if (!ok) {
        errors.push(msg);
        setFieldError(form, field, true);
      }
    });

    const fileFields = ['formulir_f201', 'ktp_el_jenazah', 'kartu_keluarga', 'keterangan_kematian'];
    fileFields.forEach((field) => {
      const file = fd.get(field);
      if (!file || !(file instanceof File) || file.size === 0) {
        errors.push(`Dokumen "${field.replace(/_/g, ' ')}" wajib diunggah.`);
        setFieldError(form, field, true);
      }
    });

    return errors;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(form);
    const fd = new FormData(form);

    const clientErrors = validateClientSide(fd);
    if (clientErrors.length) {
      showAlert(form, clientErrors);
      return;
    }

    submitBtn.disabled = true;
    statusEl.textContent = 'Mengirim permohonan...';

    try {
      const res = await fetch('/api/kematian', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        showAlert(form, data.errors || ['Terjadi kesalahan saat mengirim permohonan.']);
        statusEl.textContent = '';
        submitBtn.disabled = false;
        return;
      }

      statusEl.textContent = '';
      openTicket({
        nomor: data.nomor_tracking,
        value: fd.get('nik_jenazah'),
        tanggal: new Date().toISOString(),
      });
      form.reset();
      document.querySelectorAll('.file-name').forEach((el) => (el.textContent = ''));
    } catch (err) {
      showAlert(form, ['Gagal terhubung ke server. Periksa koneksi Anda dan coba lagi.']);
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
