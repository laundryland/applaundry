// nota-bayar.js - 5 ROW INTERAKTIF FIXED UUID
let activeBayarNotaObj=null;
let activeMetodePembayaran='Tunai';
let bayarSplitModeChoice=null;

function openBayarNotaModal(notaId, event){
  if(event) event.stopPropagation();
  const antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const nota=antrianData.find(n=>n.id===notaId);
  if(!nota) return;
  activeBayarNotaObj=nota;
  bayarSplitModeChoice=null;
  document.getElementById('modalBayarNotaOverlay')?.classList.add('active');
  // Row1: Jumlah Nota
  const elTotal=document.getElementById('bayarNotaTotal');
  if(elTotal) elTotal.innerText='Rp '+Number(nota.totalNota||0).toLocaleString('id-ID');
  // Row2: Deposito
  const pelangganData=JSON.parse(localStorage.getItem('pelangganData')||'[]');
  const pel=pelangganData.find(p=>p.nama===nota.namaPelanggan);
  const depEl=document.getElementById('bayarNotaDeposito');
  if(depEl) depEl.innerText= pel ? `Deposito: Rp ${Number(pel.deposito||0).toLocaleString('id-ID')}` : 'Deposito: Rp 0';
  // Reset metode
  activeMetodePembayaran='Tunai';
  document.querySelectorAll('.metode-card').forEach(c=>c.classList.remove('active'));
  document.querySelector(`[data-metode="Tunai"]`)?.classList.add('active');
  hitungKalkulasiPembayaran();
}
function closeModalBayarNota(){ document.getElementById('modalBayarNotaOverlay')?.classList.remove('active'); activeBayarNotaObj=null; }
function closeModalBayarNotaOnBackdrop(e){ if(e.target.id==='modalBayarNotaOverlay') closeModalBayarNota(); }

function selectMetodePembayaran(metode, el){
  activeMetodePembayaran=metode;
  document.querySelectorAll('.metode-card').forEach(c=>c.classList.remove('active'));
  if(el) el.classList.add('active');
  hitungKalkulasiPembayaran();
}
function hitungKalkulasiPembayaran(){
  if(!activeBayarNotaObj) return;
  const total=Number(activeBayarNotaObj.totalNota||0);
  const bayarInput=Number(document.getElementById('inputBayarTunai')?.value||0);
  const kembalianEl=document.getElementById('bayarKembalian');
  const sisaEl=document.getElementById('bayarSisa');
  if(kembalianEl) kembalianEl.innerText='Rp '+Math.max(0, bayarInput-total).toLocaleString('id-ID');
  if(sisaEl) sisaEl.innerText='Rp '+Math.max(0, total-bayarInput).toLocaleString('id-ID');
  // Deposito & Split logic
  const pelangganData=JSON.parse(localStorage.getItem('pelangganData')||'[]');
  const pel=pelangganData.find(p=>p.nama===activeBayarNotaObj.namaPelanggan);
  if(pel && (pel.deposito||0) >= total){
    document.getElementById('rowDepositoSplit')?.classList.remove('hidden');
  } else {
    document.getElementById('rowDepositoSplit')?.classList.add('hidden');
  }
}
function eksekusiSimpanPembayaran(){
  if(!activeBayarNotaObj) return;
  const bayarInput=Number(document.getElementById('inputBayarTunai')?.value||0);
  const total=Number(activeBayarNotaObj.totalNota||0);
  let antrianData=JSON.parse(localStorage.getItem('antrianData')||'[]');
  const idx=antrianData.findIndex(n=>n.id===activeBayarNotaObj.id);
  if(idx===-1) return;
  // Logika DP / Lunas
  let statusBayar='Belum Lunas';
  if(bayarInput>=total) statusBayar='Lunas';
  else if(bayarInput>0) statusBayar='DP';
  
  // Jika pakai deposito split
  if(bayarSplitModeChoice==='deposito'){
    const pelangganData=JSON.parse(localStorage.getItem('pelangganData')||'[]');
    const pelIdx=pelangganData.findIndex(p=>p.nama===activeBayarNotaObj.namaPelanggan);
    if(pelIdx!==-1){
      pelangganData[pelIdx].deposito = Math.max(0, (pelangganData[pelIdx].deposito||0) - total);
      localStorage.setItem('pelangganData', JSON.stringify(pelangganData));
      if(window.syncPelangganToSupabase) window.syncPelangganToSupabase();
      statusBayar='Lunas';
    }
  }
  
  antrianData[idx].statusBayar=statusBayar;
  antrianData[idx].metodeBayar=activeMetodePembayaran;
  antrianData[idx].bayarNominal=bayarInput;
  antrianData[idx].tanggalBayar=new Date().toISOString();
  localStorage.setItem('antrianData', JSON.stringify(antrianData));
  if(window.syncAntrianToSupabase) window.syncAntrianToSupabase();
  closeModalBayarNota();
  if(window.renderAntrianList) window.renderAntrianList(window.activeAntrianFilter||'Semua');
  window.showNoticeToast?.('Pembayaran '+statusBayar);
}
function toggleStatusBayar(id){ openBayarNotaModal(id); }
function setSplitMode(mode){ bayarSplitModeChoice=mode; document.querySelectorAll('.split-option').forEach(o=>o.classList.remove('active')); document.querySelector(`[data-split="${mode}"]`)?.classList.add('active'); }

window.openBayarNotaModal=openBayarNotaModal;
window.closeModalBayarNota=closeModalBayarNota;
window.closeModalBayarNotaOnBackdrop=closeModalBayarNotaOnBackdrop;
window.selectMetodePembayaran=selectMetodePembayaran;
window.hitungKalkulasiPembayaran=hitungKalkulasiPembayaran;
window.eksekusiSimpanPembayaran=eksekusiSimpanPembayaran;
window.toggleStatusBayar=toggleStatusBayar;
window.setSplitMode=setSplitMode;

console.log('✅ nota-bayar.js 5ROW FIXED loaded');