// public/js/admin-kematian.js
(() => {
  const STATUS_OPTIONS = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];
  const selected = { ktn: new Set() };

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
    await fetch(`/api/kematian/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }

  async function hapusSatu(id) {
    const res = await fetch(`/api/kematian/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async function hapusMassal(ids) {
    const res = await fetch('/api/kematian/hapus-massal', {
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
    const btn = document.getElementById('hapus-massal-ktn');
    const count = selected.ktn.size;
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

  async function loadKematian(filterText = '') {
    const tbody = document.querySelector('#table-ktn tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="muted">Memuat data...</td></tr>';
    const res = await fetch('/api/kematian');
    const { data } = await res.json();

    const filtered = data.filter((row) =>
      !filterText ||
      row.nomor_tracking.toLowerCase().includes(filterText) ||
      row.nik_jenazah.toLowerCase().includes(filterText)
    );

    const visibleIds = new Set(filtered.map((r) => r.id));
    selected.ktn.forEach((id) => { if (!visibleIds.has(id)) selected.ktn.delete(id); });

    tbody.innerHTML = '';
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="muted">Belum ada permohonan.</td></tr>';
      updateBulkButton();
      return;
    }

    filtered.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="row-check-ktn" ${selected.ktn.has(row.id) ? 'checked' : ''}></td>
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

      const actionCell = tr.querySelector('.action-cell');
      actionCell.style.display = 'flex';
      actionCell.style.alignItems = 'center';
      actionCell.appendChild(statusSelect(row.status, (newStatus) => patchStatus(row.id, newStatus).then(() => loadKematian(filterText))));
      actionCell.appendChild(deleteButton(() => hapusSatu(row.id).then(() => loadKematian(filterText))));

      tr.querySelector('.row-check-ktn').addEventListener('change', (e) => {
        if (e.target.checked) selected.ktn.add(row.id);
        else selected.ktn.delete(row.id);
        updateBulkButton();
      });

      tbody.appendChild(tr);
    });

    updateBulkButton();
  }

  document.getElementById('refresh-ktn').addEventListener('click', () => loadKematian(document.getElementById('filter-ktn').value.toLowerCase()));
  document.getElementById('filter-ktn').addEventListener('input', (e) => loadKematian(e.target.value.toLowerCase()));
  document.getElementById('checkall-ktn').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check-ktn').forEach((cb) => { cb.checked = e.target.checked; cb.dispatchEvent(new Event('change')); });
  });
  document.getElementById('hapus-massal-ktn').addEventListener('click', () => {
    const ids = Array.from(selected.ktn);
    if (!ids.length) return;
    if (window.confirm(`${ids.length} data akan DIHAPUS PERMANEN.\nTidak bisa dibatalkan.\n\nLanjutkan?`)) {
      hapusMassal(ids).then(() => { selected.ktn.clear(); loadKematian(document.getElementById('filter-ktn').value.toLowerCase()); });
    }
  });

  loadKematian();
})();