// public/js/form-common.js
// Helper bersama untuk halaman formulir Akta Kelahiran & Akta Kematian.

function isDigitsLen(str, len) {
  return new RegExp(`^\\d{${len}}$`).test((str || '').trim());
}

function isNonEmpty(str) {
  return !!(str && str.trim().length > 0);
}

function isPastOrTodayDate(str) {
  if (!isNonEmpty(str)) return false;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

function isAnakKe(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 50;
}

function setFieldError(form, fieldName, hasError) {
  const wrap = form.querySelector(`[data-field="${fieldName}"]`);
  if (!wrap) return;
  wrap.classList.toggle('has-error', hasError);
}

function clearAllErrors(form) {
  form.querySelectorAll('[data-field]').forEach((el) => el.classList.remove('has-error'));
}

function showAlert(form, messages) {
  const alertBox = form.querySelector('#form-alert') || document.getElementById('form-alert');
  const list = alertBox.querySelector('#form-alert-list') || document.getElementById('form-alert-list');
  list.innerHTML = '';
  messages.forEach((m) => {
    const li = document.createElement('li');
    li.textContent = m;
    list.appendChild(li);
  });
  alertBox.classList.add('show');
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideAlert(form) {
  const alertBox = document.getElementById('form-alert');
  alertBox.classList.remove('show');
}

// Menampilkan nama berkas yang dipilih di bawah input file
document.addEventListener('change', (e) => {
  if (e.target && e.target.type === 'file') {
    const box = e.target.closest('.upload-box');
    if (!box) return;
    let nameTag = box.querySelector('.file-name');
    if (!nameTag) {
      nameTag = document.createElement('span');
      nameTag.className = 'file-name';
      box.appendChild(nameTag);
    }
    const file = e.target.files[0];
    nameTag.textContent = file ? `Terpilih: ${file.name}` : '';
  }
});

function formatTanggalIndo(isoString) {
  try {
    const d = new Date(isoString.replace(' ', 'T'));
    return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return isoString;
  }
}

function openTicket({ nomor, label, value, tanggal }) {
  document.getElementById('ticket-number').textContent = nomor;
  document.getElementById('ticket-nama').textContent = value;
  document.getElementById('ticket-tanggal').textContent = formatTanggalIndo(tanggal);
  document.getElementById('ticket-overlay').classList.add('show');
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.getElementById('ticket-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('ticket-overlay').classList.remove('show');
      window.location.href = '/layanan-kependudukan.html';
    });
  }
});
