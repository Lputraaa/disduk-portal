// public/js/admin.js
(() => {
  const STATUS_COLOR = {
    'Menunggu Verifikasi': { bg: '#fff8e1', border: '#FFC42F', text: '#7a5800' },
    'Diproses':           { bg: '#e3f2fd', border: '#0A9AB0', text: '#01579b' },
    'Disetujui':          { bg: '#e8f5e9', border: '#12A64E', text: '#1b5e20' },
    'Ditolak':            { bg: '#fce4ec', border: '#b3261e', text: '#7f0000' },
  };

  function badgeHtml(status) {
    const c = STATUS_COLOR[status] || STATUS_COLOR['Menunggu Verifikasi'];
    return `<span style="background:${c.border}; color:#fff; padding:2px 10px; border-radius:20px; font-size:0.78rem; font-weight:600; white-space:nowrap;">${status}</span>`;
  }

  function fmtDate(s) {
    if (!s) return '-';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return s; }
  }

  function makeStatusBar(statusArr, total) {
    if (!total) return '<div class="muted" style="font-size:0.84rem;">Belum ada data.</div>';
    const STATUS_ORDER = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];
    return STATUS_ORDER.map(st => {
      const found = statusArr.find(r => r.status === st);
      const n = found ? found.n : 0;
      const pct = total ? Math.round(n / total * 100) : 0;
      const c = STATUS_COLOR[st] || STATUS_COLOR['Menunggu Verifikasi'];
      return `<div style="margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; font-size:0.84rem; margin-bottom:4px;">
          <span style="color:${c.text}; font-weight:600;">${st}</span>
          <span style="color:var(--color-muted);">${n} (${pct}%)</span>
        </div>
        <div style="background:#f0f4f5; border-radius:4px; height:8px; overflow:hidden;">
          <div style="width:${pct}%; background:${c.border}; height:100%; border-radius:4px; transition:width .4s;"></div>
        </div>
      </div>`;
    }).join('');
  }

  async function loadDashboard() {
    const loading = document.getElementById('dashboard-loading');
    const content = document.getElementById('dashboard-content');

    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (!json.ok) throw new Error('Gagal fetch');

      const d = json.data;
      const klhTotal = d.kelahiran.total;
      const ktnTotal = d.kematian.total;
      const total = klhTotal + ktnTotal;

      const menungguKlh = (d.kelahiran.status.find(r => r.status === 'Menunggu Verifikasi') || {}).n || 0;
      const menungguKtn = (d.kematian.status.find(r => r.status === 'Menunggu Verifikasi') || {}).n || 0;
      const menunggu = menungguKlh + menungguKtn;

      document.getElementById('stat-klh-total').textContent = klhTotal;
      document.getElementById('stat-ktn-total').textContent = ktnTotal;
      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-menunggu').textContent = menunggu;

      document.getElementById('status-klh').innerHTML = makeStatusBar(d.kelahiran.status, klhTotal);
      document.getElementById('status-ktn').innerHTML = makeStatusBar(d.kematian.status, ktnTotal);

      // Tabel 5 terbaru kelahiran
      const tbodyKlh = document.querySelector('#recent-klh tbody');
      tbodyKlh.innerHTML = '';
      if (!d.recentKlh.length) {
        tbodyKlh.innerHTML = '<tr><td colspan="3" class="muted">Belum ada data.</td></tr>';
      } else {
        d.recentKlh.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td class="mono" style="font-size:0.78rem;">${r.nomor_tracking}</td><td>${r.nama_lengkap_bayi}</td><td>${badgeHtml(r.status)}</td>`;
          tbodyKlh.appendChild(tr);
        });
      }

      // Tabel 5 terbaru kematian
      const tbodyKtn = document.querySelector('#recent-ktn tbody');
      tbodyKtn.innerHTML = '';
      if (!d.recentKtn.length) {
        tbodyKtn.innerHTML = '<tr><td colspan="3" class="muted">Belum ada data.</td></tr>';
      } else {
        d.recentKtn.forEach(r => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td class="mono" style="font-size:0.78rem;">${r.nomor_tracking}</td><td class="mono">${r.nik_jenazah}</td><td>${badgeHtml(r.status)}</td>`;
          tbodyKtn.appendChild(tr);
        });
      }

      loading.style.display = 'none';
      content.style.display = 'block';

    } catch (e) {
      loading.textContent = 'Gagal memuat statistik. Coba muat ulang halaman.';
    }
  }

  loadDashboard();
})();