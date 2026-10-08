// layanan.js - FIXED estimasiVal/Unit + minKg
let editingLayananId=null;
function renderLayananList(){
  const container=document.getElementById('layananListContainer');
  if(!container) return;
  const data=JSON.parse(localStorage.getItem('layananData')||'[]');
  const activeOutlet=JSON.parse(localStorage.getItem('outletsData')||'[]').find(o=>o.isActive);
  let filtered=data;
  if(activeOutlet) filtered=data.filter(l=> !l.outletId || l.outletId===activeOutlet.id);
  container.innerHTML='';
  filtered.forEach(l=>{
    const card=document.createElement('div');
    card.className='customer-card-item border-3-glass-blur rounded-12';
    const estVal=l.estimasiVal|| (l.estimasi? parseInt(l.estimasi):3) || 3;
    const estUnit=l.estimasiUnit||'Jam';
    card.innerHTML=`
      <div class="customer-card-row1">
        <div style="display:flex;flex-direction:column">
          <span style="font-weight:800;font-size:13px">${l.nama}</span>
          <span style="font-size:10px;color:#555">${l.kode||''} • Rp ${Number(l.harga||0).toLocaleString('id-ID')}/${l.satuan||'Kg'} • ⏱️ ${estVal} ${estUnit}</span>
        </div>
        <button onclick="editLayanan('${l.id}')" style="font-size:10px;padding:4px 8px;background:#f3f4f6;border-radius:8px">Edit</button>
      </div>`;
    container.appendChild(card);
  });
}
function openModalLayanan(){ document.getElementById('modalLayananOverlay')?.classList.add('active'); }
function closeModalLayanan(){ document.getElementById('modalLayananOverlay')?.classList.remove('active'); editingLayananId=null; document.getElementById('inputNamaLayanan').value=''; document.getElementById('inputHargaLayanan').value=''; }
function simpanLayanan(){
  const nama=document.getElementById('inputNamaLayanan')?.value.trim();
  const harga=Number(document.getElementById('inputHargaLayanan')?.value||0);
  const satuan=document.getElementById('inputSatuanLayanan')?.value||'Kg';
  const estVal=Number(document.getElementById('inputEstimasiVal')?.value||3);
  const estUnit=document.getElementById('inputEstimasiUnit')?.value||'Jam';
  if(!nama){ window.showNoticeToast?.('Nama layanan wajib'); return; }
  let data=JSON.parse(localStorage.getItem('layananData')||'[]');
  const activeOutlet=JSON.parse(localStorage.getItem('outletsData')||'[]').find(o=>o.isActive);
  if(editingLayananId){
    const idx=data.findIndex(l=>l.id===editingLayananId);
    if(idx!==-1) data[idx]={...data[idx], nama, harga, satuan, estimasiVal: estVal, estimasiUnit: estUnit};
  } else {
    data.push({id:'id_'+Date.now(), outletId: activeOutlet?.id, nama, kode: nama.slice(0,3).toUpperCase(), harga, satuan, estimasiVal: estVal, estimasiUnit: estUnit, minKg:3});
  }
  localStorage.setItem('layananData', JSON.stringify(data));
  if(window.syncLayananToSupabase) window.syncLayananToSupabase();
  closeModalLayanan(); renderLayananList();
}
function editLayanan(id){
  const data=JSON.parse(localStorage.getItem('layananData')||'[]');
  const l=data.find(x=>x.id===id); if(!l) return;
  editingLayananId=l.id;
  document.getElementById('inputNamaLayanan').value=l.nama;
  document.getElementById('inputHargaLayanan').value=l.harga;
  openModalLayanan();
}
window.renderLayananList=renderLayananList;
window.openModalLayanan=openModalLayanan;
window.closeModalLayanan=closeModalLayanan;
window.simpanLayanan=simpanLayanan;
window.editLayanan=editLayanan;
console.log('✅ layanan.js FIXED loaded');