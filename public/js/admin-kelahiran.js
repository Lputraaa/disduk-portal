// public/js/admin-kelahiran.js
(() => {
  const STATUS_OPTIONS = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];
  const selected = { klh: new Set() };

  function badgeClass(status) {
    return { 'Menunggu Verifikasi': 'menunggu', Diproses: 'diproses', Disetujui: 'disetujui', Ditolak: 'ditolak' }[status] || 'menunggu';
  }

  function fmtDate(s) {
    if (!s) return '-';
    try { return new Date(s.replace(' ', 'T')).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }); }
    catch { return s; }
  }

  function statusSelect(current, onChange) {
    const select = document.createElement('select');
    STATUS_OPTIONS.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt; o.textContent = opt;
      if (opt === current) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => onChange(select.value));
    return select;
  }

  async function patchStatus(id, status) {
    await fetch(`/api/kelahiran/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async function hapusSatu(id) {
    const res = await fetch(`/api/kelahiran/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async function hapusMassal(ids) {
    const res = await fetch('/api/kelahiran/hapus-massal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.json();
  }

  function deleteButton(onConfirmed) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger';
    btn.style.marginLeft = '6px';
    btn.textContent = 'Hapus';
    btn.addEventListener('click', () => {
      if (window.confirm('Data ini akan DIHAPUS PERMANEN beserta seluruh dokumen.\nTindakan ini TIDAK BISA dibatalkan.\n\nLanjutkan hapus?')) {
        onConfirmed();
      }
    });
    return btn;
  }

  function updateBulkButton() {
    const btn = document.getElementById('hapus-massal-klh');
    const count = selected.klh.size;
    btn.textContent = `Hapus yang Dipilih (${count})`;
    btn.disabled = count === 0;
  }

  function docLinks(paths) {
    const wrap = document.createElement('div');
    wrap.className = 'doc-links';
    paths.forEach(([label, url]) => {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = label;
      wrap.appendChild(a);
    });
    return wrap;
  }

  async function loadKelahiran(filterText = '') {
    const tbody = document.querySelector('#table-klh tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="muted">Memuat data...</td></tr>';
    const res = await fetch('/api/kelahiran');
    const { data } = await res.json();

    const filtered = data.filter((row) =>
      !filterText ||
      row.nomor_tracking.toLowerCase().includes(filterText) ||
      row.nama_lengkap_bayi.toLowerCase().includes(filterText)
    );

    const visibleIds = new Set(filtered.map((r) => r.id));
    selected.klh.forEach((id) => { if (!visibleIds.has(id)) selected.klh.delete(id); });

    tbody.innerHTML = '';
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="muted">Belum ada permohonan.</td></tr>';
      updateBulkButton();
      return;
    }

    filtered.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="row-check-klh" ${selected.klh.has(row.id) ? 'checked' : ''}></td>
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

      const actionCell = tr.querySelector('.action-cell');
      actionCell.style.display = 'flex';
      actionCell.style.alignItems = 'center';
      actionCell.appendChild(statusSelect(row.status, (newStatus) => patchStatus(row.id, newStatus).then(() => loadKelahiran(filterText))));
      actionCell.appendChild(deleteButton(() => hapusSatu(row.id).then(() => loadKelahiran(filterText))));

      tr.querySelector('.row-check-klh').addEventListener('change', (e) => {
        if (e.target.checked) selected.klh.add(row.id);
        else selected.klh.delete(row.id);
        updateBulkButton();
      });

      tbody.appendChild(tr);
    });

    updateBulkButton();
  }

  document.getElementById('refresh-klh').addEventListener('click', () => loadKelahiran(document.getElementById('filter-klh').value.toLowerCase()));
  document.getElementById('filter-klh').addEventListener('input', (e) => loadKelahiran(e.target.value.toLowerCase()));
  document.getElementById('checkall-klh').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check-klh').forEach((cb) => { cb.checked = e.target.checked; cb.dispatchEvent(new Event('change')); });
  });
  document.getElementById('hapus-massal-klh').addEventListener('click', () => {
    const ids = Array.from(selected.klh);
    if (!ids.length) return;
    if (window.confirm(`${ids.length} data akan DIHAPUS PERMANEN.\nTidak bisa dibatalkan.\n\nLanjutkan?`)) {
      hapusMassal(ids).then(() => { selected.klh.clear(); loadKelahiran(document.getElementById('filter-klh').value.toLowerCase()); });
    }
  });

  loadKelahiran();
})();