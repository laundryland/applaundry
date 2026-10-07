
export function initPelanggan() {
  window.filterPelangganList = function() {
    const query = document.getElementById('searchPelanggan')?.value.toLowerCase().trim() || '';
    renderPelangganList(query);
  };
  window.toggleClearPelangganBtn = function(){
    const i=document.getElementById('searchPelanggan');
    const c=document.getElementById('clearSearchPelanggan');
    if(c) c.style.display = i && i.value ? 'flex' : 'none';
  };
  window.clearSearchPelanggan = function(){
    const i=document.getElementById('searchPelanggan');
    if(i){ i.value=''; window.filterPelangganList(); window.toggleClearPelangganBtn(); }
  };
}

export function renderPelangganList(filterQuery = '') {
  const container = document.getElementById('customerListContainer');
  if (!container) return;
  container.innerHTML = '';
  const activeOutlet = window.getActiveOutlet ? window.getActiveOutlet() : {id: 'default', nama: 'Laundry Land'};
  const listP = (window.pelangganData || []).filter(p => (p.outletId === activeOutlet.id || !p.outletId) && p.nama.toLowerCase().includes(filterQuery));
  if (listP.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: #666; text-align: center; padding: 10px;">Tidak ada data pelanggan di ${activeOutlet.nama}.</div>`;
    return;
  }
  listP.forEach(p => {
    const card = document.createElement('div');
    card.className = 'customer-card-item border-3-glass-blur rounded-12';
    const onSelectAction = window.isPelangganPickerForNota ? `selectPelangganTargetNota('${p.id}')` : `openSubModalTambahPelanggan('${p.id}')`;
    card.innerHTML = `
      <div class="customer-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="${onSelectAction}" style="cursor: pointer; display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
        <span style="font-weight: 800; font-size: 13px; color: #111; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.nama}</span>
        <span style="font-weight: 800; font-size: 12px; color: #10b981; flex-shrink:0; margin-left:8px;">Rp ${p.deposito.toLocaleString('id-ID')}</span>
      </div>
      <div class="customer-card-row2" style="display:flex; align-items:center; justify-content:space-around; padding:6px 8px; background:rgba(255,255,255,0.4); border-radius:8px; margin-top:2px;">
        <div class="tap-model" onclick="openSubModalTambahPelanggan('${p.id}')" style="width:32px; height:32px; border-radius:50%; background:rgba(2,132,199,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Edit">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#0284c7; stroke-width:2; fill:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </div>
        <div class="tap-model" onclick="confirmHapusData('pelanggan', '${p.id}', '${p.nama}')" style="width:32px; height:32px; border-radius:50%; background:rgba(220,38,38,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Hapus">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#dc2626; stroke-width:2; fill:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
        <div class="tap-model" onclick="openSubModalIsiDeposito('${p.id}', 'tambah')" style="width:32px; height:32px; border-radius:50%; background:rgba(16,185,129,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Tambah Deposito">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#10b981; stroke-width:2; fill:none;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
        <div class="tap-model" onclick="openSubModalIsiDeposito('${p.id}', 'edit')" style="width:32px; height:32px; border-radius:50%; background:rgba(245,158,11,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Edit Deposito">
          <svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#f59e0b; stroke-width:2; fill:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}
window.renderPelangganList = renderPelangganList;
