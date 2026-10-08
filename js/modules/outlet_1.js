// outlet.js - FIXED UUID + Supabase Sync
let editingOutletId = null;

function getActiveOutlet() { 
  const data = JSON.parse(localStorage.getItem('outletsData')||'[]');
  return data.find(o => o.isActive) || data[0] || null; 
}
function syncActiveOutletHeader(){
  const active = getActiveOutlet();
  const label = document.getElementById('label-outlet');
  if(label && active) { 
    label.innerText = active.nama;
    if(window.fitOutletFont) window.fitOutletFont();
  }
}
function toggleHeaderOutletDropdown(){
  const dd = document.getElementById('headerOutletDropdown');
  if(dd){ dd.classList.toggle('active'); if(dd.classList.contains('active')) renderHeaderOutletDropdown(); }
}
function renderHeaderOutletDropdown(){
  const dd = document.getElementById('headerOutletDropdown');
  if(!dd) return;
  const outletsData = JSON.parse(localStorage.getItem('outletsData')||'[]');
  dd.innerHTML='';
  outletsData.forEach(o=>{
    const card=document.createElement('div');
    card.className=`outlet-item-card ${o.isActive?'active-outlet':''}`;
    card.onclick=()=>{ setActiveOutlet(o.id); dd.classList.remove('active'); };
    card.innerHTML=`<span style="font-size:12px;font-weight:800">${o.nama}</span> ${o.isActive?'<span class="active-badge">Aktif</span>':'<span style="font-size:9px;background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px">Pilih</span>'}`;
    dd.appendChild(card);
  });
}
function setActiveOutlet(id){
  let outletsData = JSON.parse(localStorage.getItem('outletsData')||'[]');
  outletsData = outletsData.map(o=>({...o, isActive: o.id===id}));
  localStorage.setItem('outletsData', JSON.stringify(outletsData));
  localStorage.setItem('activeOutletId', id);
  syncActiveOutletHeader();
  renderOutletList();
  renderHeaderOutletDropdown();
  if(window.syncOutletsToSupabase) window.syncOutletsToSupabase();
  if(window.showNoticeToast) window.showNoticeToast('Outlet aktif: '+ (outletsData.find(o=>o.id===id)?.nama||''));
}
function renderOutletList(){
  const container = document.getElementById('outletListContainer');
  if(!container) return;
  const outletsData = JSON.parse(localStorage.getItem('outletsData')||'[]');
  container.innerHTML='';
  if(!outletsData.length){ container.innerHTML='<div style="padding:14px;text-align:center;color:#999;font-size:12px">Belum ada outlet</div>'; return; }
  outletsData.forEach(o=>{
    const card=document.createElement('div');
    card.className=`customer-card-item border-3-glass-blur rounded-12 ${o.isActive?'active-item':''}`;
    card.innerHTML=`
      <div class="customer-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="setActiveOutlet('${o.id}')" style="cursor:pointer">
        <div style="display:flex;flex-direction:column;gap:2px;overflow:hidden">
          <span style="font-weight:800;font-size:13px">${o.nama}</span>
          <span style="font-size:10px;color:#555">${o.alamat||'Alamat belum diisi'}</span>
        </div>
        ${o.isActive?'<span class="active-badge">Aktif</span>':'<span style="font-size:9px;color:#666;background:rgba(0,0,0,.06);padding:2px 6px;border-radius:4px">Pilih</span>'}
      </div>
      <div class="antrian-card-row2">
        <button onclick="editOutlet('${o.id}')" style="font-size:11px;font-weight:700;padding:4px 10px;background:#f3f4f6;border-radius:8px">Edit</button>
        <button onclick="hapusOutlet('${o.id}')" style="font-size:11px;font-weight:700;padding:4px 10px;background:#fee2e2;color:#dc2626;border-radius:8px">Hapus</button>
      </div>`;
    container.appendChild(card);
  });
}
function openModalOutlet(){ document.getElementById('modalOutletOverlay')?.classList.add('active'); }
function closeModalOutlet(){ document.getElementById('modalOutletOverlay')?.classList.remove('active'); resetFormOutlet(); }
function closeModalOutletOnBackdrop(e){ if(e.target.id==='modalOutletOverlay') closeModalOutlet(); }
function resetFormOutlet(){ editingOutletId=null; document.getElementById('inputNamaOutlet')&&(document.getElementById('inputNamaOutlet').value=''); document.getElementById('inputAlamatOutlet')&&(document.getElementById('inputAlamatOutlet').value=''); document.getElementById('inputWaOutlet')&&(document.getElementById('inputWaOutlet').value=''); }

function simpanOutlet(){
  const nama=document.getElementById('inputNamaOutlet')?.value.trim();
  const alamat=document.getElementById('inputAlamatOutlet')?.value.trim();
  const wa=document.getElementById('inputWaOutlet')?.value.trim();
  if(!nama){ window.showNoticeToast?.('Nama outlet tidak boleh kosong'); return; }
  let outletsData = JSON.parse(localStorage.getItem('outletsData')||'[]');
  if(editingOutletId){
    const idx=outletsData.findIndex(o=>o.id===editingOutletId);
    if(idx!==-1){ outletsData[idx]={...outletsData[idx], nama, alamat, wa}; }
  } else {
    // FIX: jangan pakai id outlet-xxx text, biarkan supabase bikin uuid, pakai temp id_ untuk local
    const tempId='id_'+Date.now();
    outletsData.push({id:tempId, nama, alamat, wa, isActive: outletsData.length===0});
  }
  localStorage.setItem('outletsData', JSON.stringify(outletsData));
  // sync ke supabase dengan cleanPayload (hapus id_xxx)
  if(window.syncOutletsToSupabase) window.syncOutletsToSupabase();
  resetFormOutlet(); closeModalOutlet();
  renderOutletList(); renderHeaderOutletDropdown(); syncActiveOutletHeader();
  window.showNoticeToast?.('Outlet disimpan');
}
function editOutlet(id){
  const outletsData=JSON.parse(localStorage.getItem('outletsData')||'[]');
  const o=outletsData.find(x=>x.id===id);
  if(!o) return;
  editingOutletId=o.id;
  document.getElementById('inputNamaOutlet').value=o.nama;
  document.getElementById('inputAlamatOutlet').value=o.alamat||'';
  document.getElementById('inputWaOutlet').value=o.wa||'';
  openModalOutlet();
}
function hapusOutlet(id){
  if(!confirm('Hapus outlet ini?')) return;
  let outletsData=JSON.parse(localStorage.getItem('outletsData')||'[]');
  outletsData=outletsData.filter(o=>o.id!==id);
  localStorage.setItem('outletsData', JSON.stringify(outletsData));
  renderOutletList(); renderHeaderOutletDropdown();
  window.showNoticeToast?.('Outlet dihapus');
  if(window.syncOutletsToSupabase) window.syncOutletsToSupabase();
}

window.getActiveOutlet=getActiveOutlet;
window.syncActiveOutletHeader=syncActiveOutletHeader;
window.toggleHeaderOutletDropdown=toggleHeaderOutletDropdown;
window.renderHeaderOutletDropdown=renderHeaderOutletDropdown;
window.setActiveOutlet=setActiveOutlet;
window.renderOutletList=renderOutletList;
window.openModalOutlet=openModalOutlet;
window.closeModalOutlet=closeModalOutlet;
window.closeModalOutletOnBackdrop=closeModalOutletOnBackdrop;
window.simpanOutlet=simpanOutlet;
window.editOutlet=editOutlet;
window.hapusOutlet=hapusOutlet;

console.log('✅ outlet.js FIXED loaded');