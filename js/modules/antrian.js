// antrian.js - FIXED List + Filter + Status Cycle + Search
let activeAntrianFilter='Semua';
let searchAntrianQuery='';

function filterAntrianByStatus(status, el){
  activeAntrianFilter=status;
  document.querySelectorAll('.badge-status-label').forEach(lbl=>lbl.classList.remove('active'));
  if(el) el.classList.add('active');
  renderAntrianList(status);
}
function onSearchAntrianInput(input){
  searchAntrianQuery=input.value.toLowerCase().trim();
  const btn=document.getElementById('btnClearSearchAntrian');
  if(searchAntrianQuery.length>0) btn?.classList.add('visible'); else btn?.classList.remove('visible');
  renderAntrianList(activeAntrianFilter);
}
function clearSearchAntrian(){
  const input=document.getElementById('searchAntrianInput');
  if(input) input.value='';
  searchAntrianQuery='';
  document.getElementById('btnClearSearchAntrian')?.classList.remove('visible');
  renderAntrianList(activeAntrianFilter);
}
function renderRowEstimasiSubCard(item){
  const est = item.estimasi||'';
  const isTerlambat = item.statusProses==='Terlambat';
  const isDeadline = item.statusProses==='Deadline';
  return `<div class="antrian-card-row-estimasi"><span style="font-size:10px">⏱️ ${est}</span><span style="font-size:10px;font-weight:700" class="${isTerlambat?'font-color-red-bold': isDeadline?'font-color-orange-bold':''}">${item.statusProses}</span></div>`;
}
function cycleStatusProses(id, e){
  if(e) e.stopPropagation();
  let antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const idx=antrianData.findIndex(n=>n.id===id);
  if(idx===-1) return;
  const order=['Antrian','Proses','Siap Ambil','Selesai'];
  let cur=antrianData[idx].statusProses;
  let nextIdx=(order.indexOf(cur)+1)%order.length;
  if(cur==='Deadline' || cur==='Terlambat') nextIdx=0;
  antrianData[idx].statusProses=order[nextIdx];
  localStorage.setItem('antrianData', JSON.stringify(antrianData));
  if(window.syncAntrianToSupabase) window.syncAntrianToSupabase();
  renderAntrianList(activeAntrianFilter);
  updateSummaryCounters();
  window.showNoticeToast?.('Status: '+order[nextIdx]);
}
function renderAntrianList(filter='Semua'){
  const container=document.getElementById('antrianListContainer');
  if(!container) return;
  let antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const activeOutlet=JSON.parse(localStorage.getItem('outletsData')||'[]').find(o=>o.isActive) || JSON.parse(localStorage.getItem('outletsData')||'[]')[0];
  // Filter outlet
  if(activeOutlet) antrianData=antrianData.filter(it=> !it.outletId || it.outletId===activeOutlet.id || it.outlet_id===activeOutlet.id);
  // Filter status
  let filtered=antrianData;
  if(filter!=='Semua') filtered=filtered.filter(it=> it.statusProses===filter);
  // Search
  if(searchAntrianQuery){
    filtered=filtered.filter(it=> (it.namaPelanggan||'').toLowerCase().includes(searchAntrianQuery) || (it.nota||'').toLowerCase().includes(searchAntrianQuery));
  }
  container.innerHTML='';
  if(!filtered.length){ container.innerHTML='<div style="font-size:11px;color:#666;text-align:center;padding:14px">Tidak ada nota pada tahapan ini</div>'; updateSummaryCounters(); return; }
  filtered.forEach(item=>{
    const card=document.createElement('div');
    card.className='antrian-sub-card border-3-glass-blur rounded-12';
    let statusClass=item.statusProses==='Proses'?'st-proses': item.statusProses==='Siap Ambil'?'st-siap': item.statusProses==='Deadline'?'st-deadline': item.statusProses==='Terlambat'?'st-terlambat': item.statusProses==='Selesai'?'st-selesai':'st-antrian';
    let bayarClass=item.statusBayar==='Lunas'?'pay-lunas': item.statusBayar==='DP'?'pay-dp':'pay-belum';
    card.innerHTML=`
      <div class="antrian-card-row-top-actions">
        <div class="btn-action-top-slot btn-action-print" onclick="actionPrintNota('${item.id}', event)"><span style="font-size:9.5px;font-weight:700">Print</span></div>
        <div class="sekat-vertical"></div>
        <div class="btn-action-top-slot btn-action-share" onclick="actionShareWANota('${item.id}', event)"><span style="font-size:9.5px;font-weight:700">Share WA</span></div>
      </div>
      <div class="antrian-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="openModalDetailNota('${item.id}')" style="cursor:pointer">
        <div style="display:flex;flex-direction:column;gap:2px;overflow:hidden">
          <span style="font-size:13px;font-weight:800;color:#111">${item.namaPelanggan}</span>
          <span style="font-size:10px;font-weight:700;color:#f618a9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.layanan||'Layanan Laundry'}</span>
        </div>
        <span class="input-nominal-label">Rp ${Number(item.totalNota||0).toLocaleString('id-ID')}</span>
      </div>
      <div class="antrian-card-row2">
        <span class="badge-status ${statusClass} tap-model" onclick="cycleStatusProses('${item.id}', event)">${item.statusProses}</span>
        <div class="sekat-vertical"></div>
        <span class="badge-status ${bayarClass} tap-model" onclick="openBayarNotaModal('${item.id}', event)">${item.statusBayar}</span>
        <div class="sekat-vertical"></div>
        <span class="badge-nota-num tap-model" onclick="openModalDetailNota('${item.id}')">${item.nota}</span>
      </div>
      ${renderRowEstimasiSubCard(item)}
    `;
    container.appendChild(card);
  });
  updateSummaryCounters();
}
function updateSummaryCounters(){
  const outlets=JSON.parse(localStorage.getItem('outletsData')||'[]');
  const active=outlets.find(o=>o.isActive)||outlets[0];
  let antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  if(active) antrianData=antrianData.filter(it=> !it.outletId || it.outletId===active.id);
  const counts={antrian:0,proses:0,siap:0,deadline:0,terlambat:0,selesai:0};
  antrianData.forEach(item=>{
    const st=(item.statusProses||'').toLowerCase();
    if(st==='antrian') counts.antrian++;
    else if(st==='proses') counts.proses++;
    else if(st.includes('siap')) counts.siap++;
    else if(st==='deadline') counts.deadline++;
    else if(st==='terlambat') counts.terlambat++;
    else if(st==='selesai') counts.selesai++;
  });
  const set=(id,val)=>{ const el=document.getElementById(id); if(el) el.innerText=val; };
  set('val-antrian', counts.antrian); set('val-proses', counts.proses); set('val-siap-ambil', counts.siap);
  set('val-deadline', counts.deadline); set('val-terlambat', counts.terlambat); set('val-selesai', counts.selesai);
}
function openModalDetailNota(id){
  const antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const nota=antrianData.find(n=>n.id===id);
  if(!nota) return;
  document.getElementById('detailNotaNama').innerText=nota.namaPelanggan||'-';
  document.getElementById('detailNotaNomor').innerText=nota.nota||'-';
  document.getElementById('detailNotaTotal').innerText='Rp '+Number(nota.totalNota||0).toLocaleString('id-ID');
  document.getElementById('modalDetailNotaOverlay')?.classList.add('active');
}
function closeModalDetailNota(){ document.getElementById('modalDetailNotaOverlay')?.classList.remove('active'); }
function closeModalDetailNotaOnBackdrop(e){ if(e.target.id==='modalDetailNotaOverlay') closeModalDetailNota(); }

window.renderAntrianList=renderAntrianList;
window.filterAntrianByStatus=filterAntrianByStatus;
window.onSearchAntrianInput=onSearchAntrianInput;
window.clearSearchAntrian=clearSearchAntrian;
window.cycleStatusProses=cycleStatusProses;
window.updateSummaryCounters=updateSummaryCounters;
window.openModalDetailNota=openModalDetailNota;
window.closeModalDetailNota=closeModalDetailNota;
window.closeModalDetailNotaOnBackdrop=closeModalDetailNotaOnBackdrop;
window.renderRowEstimasiSubCard=renderRowEstimasiSubCard;

console.log('✅ antrian.js FIXED loaded');