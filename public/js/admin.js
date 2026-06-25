// public/js/admin.js
(() => {
  const STATUS_OPTIONS = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];

  function badgeClass(status) {
    return {
      'Menunggu Verifikasi': 'menunggu',
      Diproses: 'diproses',
      Disetujui: 'disetujui',
      Ditolak: 'ditolak',
    }[status] || 'menunggu';
  }

  function fmtDate(s) {
    if (!s) return '-';
    try {
      return new Date(s.replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return s;
    }
  }

  function statusSelect(current, onChange) {
    const select = document.createElement('select');
    STATUS_OPTIONS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (opt === current) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  async function patchStatus(kind, id, status) {
    await fetch(`/api/${kind}/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  function docLinks(paths) {
    const wrap = document.createElement('div');
    wrap.className = 'doc-links';
    paths.forEach(([label, url]) => {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = label;
      wrap.appendChild(a);
    });
    return wrap;
  }

  async function loadKelahiran(filterText = '') {
    const tbody = document.querySelector('#table-klh tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="muted">Memuat data...</td></tr>';
    const res = await fetch('/api/kelahiran');
    const { data } = await res.json();

    const filtered = data.filter((row) =>
      !filterText ||
      row.nomor_tracking.toLowerCase().includes(filterText) ||
      row.nama_lengkap_bayi.toLowerCase().includes(filterText)
    );

    tbody.innerHTML = '';
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted">Belum ada permohonan.</td></tr>';
      return;
    }

    filtered.forEach((row) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="mono">${row.nomor_tracking}</td>
        <td>${row.nama_lengkap_bayi}<div class="muted" style="font-size:0.76rem;">Anak ke-${row.anak_ke} · ${row.tempat_lahir}</div></td>
        <td class="mono">${row.no_kk}</td>
        <td>${row.tanggal_lahir}</td>
        <td>${fmtDate(row.created_at)}</td>
        <td class="docs-cell"></td>
        <td><span class="badge ${badgeClass(row.status)}">${row.status}</span></td>
        <td class="action-cell"></td>
      `;

      tr.querySelector('.docs-cell').appendChild(docLinks([
        ['Formulir', row.file_formulir_f201],
        ['KK', row.file_kartu_keluarga],
        ['Buku Nikah', row.file_buku_nikah],
        ['Ket. Lahir', row.file_keterangan_lahir],
      ]));

      tr.querySelector('.action-cell').appendChild(
        statusSelect(row.status, (newStatus) => patchStatus('kelahiran', row.id, newStatus).then(() => loadKelahiran(filterText)))
      );

      tbody.appendChild(tr);
    });
  }

  async function loadKematian(filterText = '') {
    const tbody = document.querySelector('#table-ktn tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="muted">Memuat data...</td></tr>';
    const res = await fetch('/api/kematian');
    const { data } = await res.json();

    const filtered = data.filter((row) =>
      !filterText ||
      row.nomor_tracking.toLowerCase().includes(filterText) ||
      row.nik_jenazah.toLowerCase().includes(filterText)
    );

    tbody.innerHTML = '';
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="muted">Belum ada permohonan.</td></tr>';
      return;
    }

    filtered.forEach((row) => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="mono">${row.nomor_tracking}</td>
        <td class="mono">${row.nik_jenazah}<div class="muted" style="font-size:0.76rem;">Anak ke-${row.anak_ke} · ${row.tempat_kematian}</div></td>
        <td class="mono">${row.no_kk}</td>
        <td>${row.tanggal_kematian}</td>
        <td>${fmtDate(row.created_at)}</td>
        <td class="docs-cell"></td>
        <td><span class="badge ${badgeClass(row.status)}">${row.status}</span></td>
        <td class="action-cell"></td>
      `;

      tr.querySelector('.docs-cell').appendChild(docLinks([
        ['Formulir', row.file_formulir_f201],
        ['KTP-el', row.file_ktp_el_jenazah],
        ['KK', row.file_kartu_keluarga],
        ['Ket. Kematian', row.file_keterangan_kematian],
      ]));

      tr.querySelector('.action-cell').appendChild(
        statusSelect(row.status, (newStatus) => patchStatus('kematian', row.id, newStatus).then(() => loadKematian(filterText)))
      );

      tbody.appendChild(tr);
    });
  }

  document.getElementById('refresh-klh').addEventListener('click', () => loadKelahiran(document.getElementById('filter-klh').value.toLowerCase()));
  document.getElementById('refresh-ktn').addEventListener('click', () => loadKematian(document.getElementById('filter-ktn').value.toLowerCase()));
  document.getElementById('filter-klh').addEventListener('input', (e) => loadKelahiran(e.target.value.toLowerCase()));
  document.getElementById('filter-ktn').addEventListener('input', (e) => loadKematian(e.target.value.toLowerCase()));

  loadKelahiran();
  loadKematian();
})();
