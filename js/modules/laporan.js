// laporan.js - Kas Hari Ini, Omzet Global, Riwayat, Deposito
function getTodayRange(){
  const now=new Date(); const start=new Date(now); start.setHours(0,0,0,0); const end=new Date(now); end.setHours(23,59,59,999); return {now,start,end};
}
function getTanggalNota(it){ if(it.tanggal) return new Date(it.tanggal); if(it.tglEstimasi) return new Date(it.tglEstimasi); return new Date(); }
function getNotasHariIni(){
  const {start,end}=getTodayRange();
  let data=JSON.parse(localStorage.getItem('antrianData')||'[]');
  return data.filter(it=>{ const t=getTanggalNota(it); return t>=start && t<=end; });
}
function hitungRingkasanKas(){
  const notas=getNotasHariIni();
  const total=notas.reduce((s,it)=>s+Number(it.totalNota||0),0);
  const lunas=notas.filter(it=>it.statusBayar==='Lunas').reduce((s,it)=>s+Number(it.totalNota||0),0);
  const dp=notas.filter(it=>it.statusBayar==='DP').reduce((s,it)=>s+Number(it.bayarNominal||0),0);
  document.getElementById('kasHariIniTotal')&&(document.getElementById('kasHariIniTotal').innerText='Rp '+total.toLocaleString('id-ID'));
  document.getElementById('kasHariIniLunas')&&(document.getElementById('kasHariIniLunas').innerText='Rp '+lunas.toLocaleString('id-ID'));
  document.getElementById('kasHariIniDP')&&(document.getElementById('kasHariIniDP').innerText='Rp '+dp.toLocaleString('id-ID'));
}
function openKasHariIniModal(){
  hitungRingkasanKas();
  document.getElementById('modalKasHariIniOverlay')?.classList.add('active');
}
function closeKasHariIniModal(){ document.getElementById('modalKasHariIniOverlay')?.classList.remove('active'); }

function openGlobalOmzetModal(){
  const outlets=JSON.parse(localStorage.getItem('outletsData')||'[]');
  const container=document.getElementById('globalOmzetList');
  if(!container) return;
  container.innerHTML='';
  outlets.forEach(out=>{
    let data=JSON.parse(localStorage.getItem('antrianData')||'[]').filter(n=> n.outletId===out.id || !n.outletId);
    const total=data.reduce((s,it)=>s+Number(it.totalNota||0),0);
    const div=document.createElement('div');
    div.className='flex justify-between p-2 border-b text-[12px]';
    div.innerHTML=`<span>${out.nama}</span><span class="font-bold">Rp ${total.toLocaleString('id-ID')}</span>`;
    container.appendChild(div);
  });
  document.getElementById('modalGlobalOmzetOverlay')?.classList.add('active');
}
function closeGlobalOmzetModal(){ document.getElementById('modalGlobalOmzetOverlay')?.classList.remove('active'); }
function updateGlobalOmzetCard(){
  const antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const total=antrianData.reduce((s,it)=>s+Number(it.totalNota||0),0);
  const el=document.getElementById('globalOmzetValue');
  if(el) el.innerText='Rp '+total.toLocaleString('id-ID');
}

// Riwayat Nota
function catatRiwayatNota(nota, tindakan){
  let riwayat=JSON.parse(localStorage.getItem('riwayatNotaData')||'[]');
  riwayat.unshift({id:'id_'+Date.now(), notaId: nota.id, tindakan, tanggal: new Date().toISOString(), nama: nota.namaPelanggan, total: nota.totalNota});
  if(riwayat.length>200) riwayat=riwayat.slice(0,200);
  localStorage.setItem('riwayatNotaData', JSON.stringify(riwayat));
}
function openRiwayatNotaModal(){ renderRiwayatNotaList(); document.getElementById('modalRiwayatNotaOverlay')?.classList.add('active'); }
function closeRiwayatNotaModal(){ document.getElementById('modalRiwayatNotaOverlay')?.classList.remove('active'); }
function renderRiwayatNotaList(){
  const container=document.getElementById('riwayatNotaList');
  if(!container) return;
  const data=JSON.parse(localStorage.getItem('riwayatNotaData')||'[]');
  container.innerHTML=data.length?'':'<div style="padding:12px;text-align:center;color:#999">Belum ada riwayat</div>';
  data.slice(0,50).forEach(r=>{
    const div=document.createElement('div'); div.className='p-2 border-b text-[11px] flex justify-between';
    div.innerHTML=`<span>${r.tindakan} - ${r.nama}</span><span>${new Date(r.tanggal).toLocaleTimeString('id-ID')}</span>`;
    container.appendChild(div);
  });
}

window.hitungRingkasanKas=hitungRingkasanKas;
window.openKasHariIniModal=openKasHariIniModal;
window.closeKasHariIniModal=closeKasHariIniModal;
window.openGlobalOmzetModal=openGlobalOmzetModal;
window.closeGlobalOmzetModal=closeGlobalOmzetModal;
window.updateGlobalOmzetCard=updateGlobalOmzetCard;
window.catatRiwayatNota=catatRiwayatNota;
window.openRiwayatNotaModal=openRiwayatNotaModal;
window.closeRiwayatNotaModal=closeRiwayatNotaModal;
window.renderRiwayatNotaList=renderRiwayatNotaList;
window.getTodayRange=getTodayRange;

console.log('✅ laporan.js FIXED loaded');