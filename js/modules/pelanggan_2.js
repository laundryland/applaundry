// pelanggan.js - 2ROW ICONS + Search + Deposito FIXED
let editingPelangganId=null;
let selectedPelangganDepositoId=null;

function filterPelangganList(){
  const q=(document.getElementById('searchPelanggan')?.value||'').toLowerCase();
  const container=document.getElementById('pelangganListContainer');
  if(!container) return;
  const all=JSON.parse(localStorage.getItem('pelangganData')||'[]');
  const filtered=all.filter(p=> p.nama.toLowerCase().includes(q) || (p.wa||'').includes(q));
  renderPelangganListFiltered(filtered);
}
function toggleClearPelangganBtn(){ const i=document.getElementById('searchPelanggan'); const c=document.getElementById('clearSearchPelanggan'); if(c) c.style.display=i&&i.value?'flex':'none'; }
function clearSearchPelanggan(){ const i=document.getElementById('searchPelanggan'); if(i){ i.value=''; filterPelangganList(); toggleClearPelangganBtn(); } }

function renderPelangganList(){
  const all=JSON.parse(localStorage.getItem('pelangganData')||'[]');
  renderPelangganListFiltered(all);
}
function renderPelangganListFiltered(list){
  const container=document.getElementById('pelangganListContainer');
  if(!container) return;
  container.innerHTML='';
  if(!list.length){ container.innerHTML='<div style="padding:14px;text-align:center;color:#999;font-size:12px">Tidak ada pelanggan</div>'; return; }
  list.forEach(p=>{
    const card=document.createElement('div');
    card.className='customer-card-item border-3-glass-blur rounded-12';
    const depositoText = p.deposito ? `Rp ${Number(p.deposito).toLocaleString('id-ID')}` : 'Rp 0';
    const waIcon = p.tanpaWa ? '🚫' : '📱';
    card.innerHTML=`
      <div class="customer-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="openDetailPelanggan('${p.id}')" style="cursor:pointer">
        <div style="display:flex;flex-direction:column;gap:2px;overflow:hidden">
          <span style="font-weight:800;font-size:13px">${p.nama}</span>
          <span style="font-size:10px;color:#555">${waIcon} ${p.wa||'-'} • ${p.alamat||'-'}</span>
        </div>
        <span class="font-color-orange-bold" style="font-size:12px">${depositoText}</span>
      </div>
      <div class="antrian-card-row2">
        <div style="display:flex;gap:6px">
          <button onclick="openModalDeposito('${p.id}')" class="badge-status" style="background:#fef3c7;font-size:10px">💰 Deposito</button>
          <button onclick="editPelanggan('${p.id}')" style="font-size:10px;padding:4px 8px;background:#f3f4f6;border-radius:8px">Edit</button>
        </div>
        <button onclick="buatNotaUntukPelanggan('${p.id}')" style="font-size:10px;font-weight:700;padding:4px 10px;background:#111;color:#fff;border-radius:8px">+ Nota</button>
      </div>`;
    container.appendChild(card);
  });
}
function openModalPelanggan(){ document.getElementById('modalPelangganOverlay')?.classList.add('active'); }
function closeModalPelanggan(){ document.getElementById('modalPelangganOverlay')?.classList.remove('active'); resetFormPelanggan(); }
function resetFormPelanggan(){ editingPelangganId=null; document.getElementById('inputNamaPelanggan').value=''; document.getElementById('inputWaPelanggan').value=''; document.getElementById('inputAlamatPelanggan').value=''; document.getElementById('checkTanpaWa').checked=false; }

function simpanPelanggan(){
  const nama=document.getElementById('inputNamaPelanggan')?.value.trim();
  const wa=document.getElementById('inputWaPelanggan')?.value.trim();
  const alamat=document.getElementById('inputAlamatPelanggan')?.value.trim();
  const tanpaWa=document.getElementById('checkTanpaWa')?.checked||false;
  if(!nama){ window.showNoticeToast?.('Nama pelanggan wajib'); return; }
  let data=JSON.parse(localStorage.getItem('pelangganData')||'[]');
  const activeOutlet = JSON.parse(localStorage.getItem('outletsData')||'[]').find(o=>o.isActive) || JSON.parse(localStorage.getItem('outletsData')||'[]')[0];
  if(editingPelangganId){
    const idx=data.findIndex(p=>p.id===editingPelangganId);
    if(idx!==-1) data[idx]={...data[idx], nama, wa, alamat, tanpaWa, outletId: activeOutlet?.id};
  } else {
    data.push({id:'id_'+Date.now(), outletId: activeOutlet?.id, nama, wa, alamat, tanpaWa, deposito:0, simpanKontak:true});
  }
  localStorage.setItem('pelangganData', JSON.stringify(data));
  if(window.syncPelangganToSupabase) window.syncPelangganToSupabase();
  closeModalPelanggan(); renderPelangganList();
  window.showNoticeToast?.('Pelanggan disimpan');
}
function editPelanggan(id){
  const data=JSON.parse(localStorage.getItem('pelangganData')||'[]');
  const p=data.find(x=>x.id===id); if(!p) return;
  editingPelangganId=p.id;
  document.getElementById('inputNamaPelanggan').value=p.nama;
  document.getElementById('inputWaPelanggan').value=p.wa||'';
  document.getElementById('inputAlamatPelanggan').value=p.alamat||'';
  document.getElementById('checkTanpaWa').checked=!!p.tanpaWa;
  openModalPelanggan();
}
function openDetailPelanggan(id){ editingPelangganId=id; window.showNoticeToast?.('Detail pelanggan '+id.slice(0,6)); }
function buatNotaUntukPelanggan(id){ localStorage.setItem('selectedPelangganForNota', id); window.showPage?.('home'); window.showNoticeToast?.('Pilih layanan untuk nota'); }

window.renderPelangganList=renderPelangganList;
window.filterPelangganList=filterPelangganList;
window.toggleClearPelangganBtn=toggleClearPelangganBtn;
window.clearSearchPelanggan=clearSearchPelanggan;
window.openModalPelanggan=openModalPelanggan;
window.closeModalPelanggan=closeModalPelanggan;
window.simpanPelanggan=simpanPelanggan;
window.editPelanggan=editPelanggan;
window.openDetailPelanggan=openDetailPelanggan;
window.buatNotaUntukPelanggan=buatNotaUntukPelanggan;

console.log('✅ pelanggan.js 2ROW FIXED loaded');