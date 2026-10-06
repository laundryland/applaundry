
import { StorageManager, purgeLegacyCache, initServiceWorker, safeLS } from './db.js';
import { initModalBackdrop, openModal, closeModal } from './modules/modalManager.js';
import * as MasterStruk from './modules/masterStruk.js';
import * as OutletModule from './modules/outlet.js';
import * as KaryawanModule from './modules/karyawan.js';
import * as PelangganModule from './modules/pelanggan.js';
import * as LayananModule from './modules/layanan.js';
import * as AntrianModule from './modules/antrian.js';
import * as BayarNotaModule from './modules/bayarNota.js';
import * as KasModule from './modules/kasHariIni.js';
import * as LaporanModule from './modules/laporan.js';
import * as OmzetModule from './modules/omzet.js';
import * as ExportImportModule from './modules/exportImport.js';
import * as PrintModule from './modules/print.js';
import * as PertumbuhanModule from './modules/pertumbuhan.js';
import { getPermissions, applyPermissions } from './modules/auth.js';
import { pad, getTanggalNota, formatRupiah, debounce } from './utils.js';

// Expose modules globally for inline onclick compatibility
window.OutletModule=OutletModule;
window.KaryawanModule=KaryawanModule;
window.PelangganModule=PelangganModule;
window.LayananModule=LayananModule;
window.AntrianModule=AntrianModule;
window.BayarNotaModule=BayarNotaModule;
window.KasModule=KasModule;
window.LaporanModule=LaporanModule;
window.OmzetModule=OmzetModule;
window.ExportImportModule=ExportImportModule;
window.PrintModule=PrintModule;
window.PertumbuhanModule=PertumbuhanModule;

window.safeLS=safeLS;
window.pad=pad;
window.getTanggalNota=getTanggalNota;

// Global error anti-crash
window.addEventListener('error', (e)=>{ console.warn('🛡️ Caught', e.message); e.preventDefault(); return true; });
window.addEventListener('unhandledrejection', (e)=>{ console.warn('🛡️ Promise', e.reason); e.preventDefault(); });

async function initSupabaseFirst(){
  const overlay=document.getElementById('supabase-loading');
  if(overlay) overlay.style.display='flex';
  await purgeLegacyCache();
  initServiceWorker();
  initModalBackdrop();

  const tables=['outlets','karyawan','pelanggan','layanan','antrian'];
  for(let t of tables){
    try{
      const data=await StorageManager.getData(t);
      window[t+'Data']=data;
      console.log('☁️ Loaded', t, data.length);
    }catch(e){ console.warn('Load fail', t, e); window[t+'Data']=[]; }
  }
  // Fallback defaults if empty
  if(!window.outletsData || !window.outletsData.length){
    window.outletsData=[{id:'outlet-1', nama:'Laundry Land', alamat:'Jl. Merdeka No.12', wa:'08123456789', isActive:true}];
    safeLS.set('outletsData', window.outletsData);
  }
  if(!window.karyawanData || !window.karyawanData.length){
    window.karyawanData=[{id:'karyawan-1', outletId:'outlet-1', nama:'Kasir Utama', level:'Owner'}];
    safeLS.set('karyawanData', window.karyawanData);
  }

  // Inject original_body.html into app-root if exists, otherwise use existing DOM
  try{
    const appRoot=document.getElementById('app-root');
    if(appRoot && appRoot.innerHTML.includes('Loading modular')){
      const resp=await fetch('./original_body.html');
      if(resp.ok){
        const html=await resp.text();
        appRoot.innerHTML=html;
      }
    }
  }catch(e){}

  // Init all modules after DOM injected
  setTimeout(()=>{
    try{ OutletModule.renderOutletList(); }catch(e){}
    try{ KaryawanModule.renderKaryawanList(); }catch(e){}
    try{ PelangganModule.renderPelangganList(); }catch(e){}
    try{ LayananModule.renderLayananList(); }catch(e){}
    try{ AntrianModule.renderAntrian(); }catch(e){}
    try{ MasterStruk.attachListeners(); MasterStruk.syncUI(); }catch(e){}
    try{ KasModule.hitungRingkasanKas(); }catch(e){}
    try{ OmzetModule.updateGlobalOmzetCard(); }catch(e){}
    try{ PertumbuhanModule.renderPertumbuhanPelanggan(); }catch(e){}
    try{ applyPermissions(); }catch(e){}
    // Attach global search debounce
    const searchAntrian=document.getElementById('inputSearchAntrian');
    if(searchAntrian){
      searchAntrian.addEventListener('input', debounce((e)=>{ safeLS.set('searchAntrianQuery', e.target.value); AntrianModule.renderAntrian(); },300));
    }
    const searchPelanggan=document.getElementById('inputSearchPelanggan');
    if(searchPelanggan){
      searchPelanggan.addEventListener('input', debounce(()=>{ PelangganModule.renderPelangganList(); },300));
    }
    const searchLayanan=document.getElementById('inputSearchLayanan');
    if(searchLayanan){
      searchLayanan.addEventListener('input', debounce(()=>{ LayananModule.renderLayananList(); },300));
    }
  },500);

  if(overlay){
    overlay.style.opacity='0';
    overlay.style.transition='opacity 0.3s';
    setTimeout(()=>{ overlay.remove(); },300);
  }
  console.log('✅ FINAL MODULAR v11 Ready - Supabase First, No Hidden Tap');
}

// Background sync queue retry
setInterval(async()=>{
  try{
    if(!window.db||!window.db.sync_queue) return;
    const q=await window.db.sync_queue.toArray();
    if(!q.length) return;
    console.log('🔄 Retry queue', q.length);
    for(let item of q){
      const payload=Array.isArray(item.data)?item.data:[item.data];
      const res=await StorageManager.saveSupabaseFirst(item.table_name,payload);
      if(res.ok) await window.db.sync_queue.delete(item.qid);
    }
  }catch(e){}
}, 30000);

// Start
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', ()=>setTimeout(initSupabaseFirst, 400));
}else{
  setTimeout(initSupabaseFirst, 400);
}

// Expose for inline onclick (legacy compatibility)
window.simpanOutlet=OutletModule.simpanOutlet;
window.setActiveOutlet=OutletModule.setActiveOutlet;
window.editOutlet=OutletModule.editOutlet;
window.simpanKaryawan=KaryawanModule.simpanKaryawan;
window.editKaryawan=KaryawanModule.editKaryawan;
window.simpanPelanggan=PelangganModule.simpanPelanggan;
window.editPelanggan=PelangganModule.editPelanggan;
window.simpanLayanan=LayananModule.simpanLayanan;
window.editLayanan=LayananModule.editLayanan;
window.simpanNotaBaru=AntrianModule.simpanNotaBaru;
window.renderAntrian=AntrianModule.renderAntrian;
window.exportData=ExportImportModule.exportData;
window.importData=ExportImportModule.importData;
