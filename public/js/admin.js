// public/js/admin.js
(() => {
  const STATUS_OPTIONS = ['Menunggu Verifikasi', 'Diproses', 'Disetujui', 'Ditolak'];
  const selected = { klh: new Set(), ktn: new Set() };

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

  async function hapusSatu(kind, id) {
    const res = await fetch(`/api/${kind}/${id}`, { method: 'DELETE' });
    return res.json();
  }

  async function hapusMassal(kind, ids) {
    const res = await fetch(`/api/${kind}/hapus-massal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return res.json();
  }

  function deleteButton(label, onConfirmed) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-danger';
    btn.style.marginLeft = '6px';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      const yakin = window.confirm(
        'Data ini akan DIHAPUS PERMANEN beserta seluruh dokumen yang sudah diunggah.\n' +
        'Tindakan ini TIDAK BISA dibatalkan, namun jejaknya akan tetap tercatat di Audit Log.\n\n' +
        'Lanjutkan hapus?'
      );
      if (yakin) onConfirmed();
    });
    return btn;
  }

  function updateBulkButton(kind) {
    const map = { klh: 'hapus-massal-klh', ktn: 'hapus-massal-ktn' };
    const btn = document.getElementById(map[kind]);
    const count = selected[kind].size;
    btn.textContent = `Hapus yang Dipilih (${count})`;
    btn.disabled = count === 0;
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
      updateBulkButton('klh');
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
      actionCell.appendChild(
        statusSelect(row.status, (newStatus) => patchStatus('kelahiran', row.id, newStatus).then(() => loadKelahiran(filterText)))
      );
      actionCell.appendChild(
        deleteButton('Hapus', () => hapusSatu('kelahiran', row.id).then(() => loadKelahiran(filterText)))
      );

      tr.querySelector('.row-check-klh').addEventListener('change', (e) => {
        if (e.target.checked) selected.klh.add(row.id);
        else selected.klh.delete(row.id);
        updateBulkButton('klh');
      });

      tbody.appendChild(tr);
    });

    updateBulkButton('klh');
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
      updateBulkButton('ktn');
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
      actionCell.appendChild(
        statusSelect(row.status, (newStatus) => patchStatus('kematian', row.id, newStatus).then(() => loadKematian(filterText)))
      );
      actionCell.appendChild(
        deleteButton('Hapus', () => hapusSatu('kematian', row.id).then(() => loadKematian(filterText)))
      );

      tr.querySelector('.row-check-ktn').addEventListener('change', (e) => {
        if (e.target.checked) selected.ktn.add(row.id);
        else selected.ktn.delete(row.id);
        updateBulkButton('ktn');
      });

      tbody.appendChild(tr);
    });

    updateBulkButton('ktn');
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

  document.getElementById('refresh-klh').addEventListener('click', () => loadKelahiran(document.getElementById('filter-klh').value.toLowerCase()));
  document.getElementById('refresh-ktn').addEventListener('click', () => loadKematian(document.getElementById('filter-ktn').value.toLowerCase()));
  document.getElementById('refresh-audit').addEventListener('click', () => loadAuditLog());
  document.getElementById('filter-klh').addEventListener('input', (e) => loadKelahiran(e.target.value.toLowerCase()));
  document.getElementById('filter-ktn').addEventListener('input', (e) => loadKematian(e.target.value.toLowerCase()));

  document.getElementById('checkall-klh').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check-klh').forEach((cb) => { cb.checked = e.target.checked; cb.dispatchEvent(new Event('change')); });
  });
  document.getElementById('checkall-ktn').addEventListener('change', (e) => {
    document.querySelectorAll('.row-check-ktn').forEach((cb) => { cb.checked = e.target.checked; cb.dispatchEvent(new Event('change')); });
  });

  document.getElementById('hapus-massal-klh').addEventListener('click', () => {
    const ids = Array.from(selected.klh);
    if (!ids.length) return;
    const yakin = window.confirm(
      `${ids.length} data permohonan akan DIHAPUS PERMANEN beserta dokumennya.\n` +
      'Tindakan ini TIDAK BISA dibatalkan, namun jejaknya akan tetap tercatat di Audit Log.\n\n' +
      'Lanjutkan hapus?'
    );
    if (!yakin) return;
    hapusMassal('kelahiran', ids).then(() => {
      selected.klh.clear();
      loadKelahiran(document.getElementById('filter-klh').value.toLowerCase());
    });
  });

  document.getElementById('hapus-massal-ktn').addEventListener('click', () => {
    const ids = Array.from(selected.ktn);
    if (!ids.length) return;
    const yakin = window.confirm(
      `${ids.length} data permohonan akan DIHAPUS PERMANEN beserta dokumennya.\n` +
      'Tindakan ini TIDAK BISA dibatalkan, namun jejaknya akan tetap tercatat di Audit Log.\n\n' +
      'Lanjutkan hapus?'
    );
    if (!yakin) return;
    hapusMassal('kematian', ids).then(() => {
      selected.ktn.clear();
      loadKematian(document.getElementById('filter-ktn').value.toLowerCase());
    });
  });

  loadKelahiran();
  loadKematian();
  loadAuditLog();
})();
