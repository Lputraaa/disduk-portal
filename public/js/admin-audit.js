// public/js/admin-audit.js
(() => {
  function fmtDate(s) {
    if (!s) return '-';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return s; }
  }

  async function loadAuditLog() {
    const tbody = document.querySelector('#table-audit tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Memuat data...</td></tr>';
    const res = await fetch('/api/audit-log');
    const { data } = await res.json();

    tbody.innerHTML = '';
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Belum ada riwayat penghapusan.</td></tr>';
      return;
    }

    data.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtDate(row.created_at)}</td>
        <td>${row.jenis_data === 'akta_kelahiran' ? 'Akta Kelahiran' : 'Akta Kematian'}</td>
        <td class="mono">${row.nomor_tracking || '-'}</td>
        <td>${row.ringkasan_data}</td>
        <td>${row.dihapus_oleh}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('refresh-audit').addEventListener('click', () => loadAuditLog());

  loadAuditLog();
})();