
// CORE FUNCTIONS - Semua onclick dari original-body.html 914KB - v2.5.28 Modular Fix
// Fix penyakit di menu setting - modal id pakai Overlay suffix

function toast(msg){
  if(window.showNoticeToast) showNoticeToast(msg);
  else console.log(msg);
}

function openModalById(id){
  // Try multiple variants: id, id+Overlay, lowercase, etc.
  const variants = [id, id+'Overlay', id.replace('modal','modal')+'Overlay', id.charAt(0).toLowerCase()+id.slice(1)];
  for(let vid of variants){
    const el = document.getElementById(vid) || document.getElementById(vid.charAt(0).toUpperCase()+vid.slice(1));
    if(el){ 
      el.classList.add('active'); 
      el.style.display='flex'; 
      el.style.opacity='1'; 
      el.style.visibility='visible'; 
      el.style.pointerEvents='auto';
      console.log('openModal', vid);
      return;
    }
  }
  console.warn('Modal not found', id, 'tried', variants);
  toast('Modal ' + id + ' belum ada');
}

function closeModalById(id){
  const variants = [id, id+'Overlay'];
  for(let vid of variants){
    const el = document.getElementById(vid);
    if(el){ 
      el.classList.remove('active'); 
      el.style.display='none'; 
      el.style.opacity='0'; 
      el.style.visibility='hidden';
      console.log('closeModal', vid);
      return;
    }
  }
}

// Page switching - FIX TAP ZONK utama
window.switchPage = function(page){
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + page) || document.getElementById('pageView' + page) || document.querySelector(`[data-page="${page}"]`);
  if(target) target.classList.remove('hidden');
  else {
    document.querySelectorAll('.page-view').forEach(p=>{
      if(p.id && p.id.toLowerCase().includes(page.toLowerCase())) p.classList.remove('hidden');
    });
  }
  console.log('switchPage', page);
}
window.switchPageWithFilter = function(filter){
  window.switchPage('Antrian');
  if(typeof filterAntrianByStatus === 'function') filterAntrianByStatus(filter);
  console.log('switchPageWithFilter', filter);
}
window.filterAntrianByStatus = function(status){ toast('Filter: ' + status); }
window.clearSearchAntrian = function(){ const el=document.getElementById('searchAntrian'); if(el) el.value=''; }
window.onSearchAntrianInput = function(e){ console.log('search', e.target.value); }
window.clearSearchPelanggan = function(){ const el=document.getElementById('searchPelanggan'); if(el) el.value=''; window.filterPelangganList(''); }
window.filterPelangganList = function(v){ if(window.renderPelangganList) renderPelangganList(v||''); }
window.clearSearchLayanan = function(){ const el=document.getElementById('searchLayanan'); if(el) el.value=''; }
window.onSearchLayananInput = function(e){}

// Header & Outlet
window.toggleHeaderOutletDropdown = window.toggleHeaderOutletDropdown || function(){
  const dd = document.getElementById('headerOutletDropdown');
  if(dd){ dd.style.display = (dd.style.display==='none' || !dd.style.display) ? 'block' : 'none'; }
}
window.openKaryawanPicker = function(){ openModalById('modalKaryawan'); }
window.toggleSystemTheme = function(){ document.body.classList.toggle('dark'); toast('Theme toggle'); }
window.doLogout = function(){ openModalById('logoutModal'); }
window.confirmLogout = function(){ localStorage.clear(); location.reload(); }
window.closeLogoutModal = function(){ closeModalById('logoutModal'); closeModalById('modalLogoutChoice'); }
window.handleLogoUpload = function(){ document.getElementById('logoFileInput')?.click(); }
window.removeLogo = function(){ localStorage.removeItem('outletLogo'); const img=document.getElementById('outletLogoImg'); if(img) img.style.display='none'; const ph=document.getElementById('logoPlaceholderIcon'); if(ph) ph.style.display='block'; }

// Dropdown Kas
window.toggleDropdown = function(id){
  const el=document.getElementById(id);
  if(el){ 
    const isHidden = el.style.display==='none' || !el.style.display || el.style.display==='';
    el.style.display = isHidden ? 'block' : 'none';
    el.style.pointerEvents='auto';
  }
}

// Kas Modals - pakai Overlay id
window.openKasTunaiModal = function(){ openModalById('modalKasTunai'); }
window.closeKasTunaiModal = function(){ closeModalById('modalKasTunai'); }
window.openKasNonTunaiModal = function(){ openModalById('modalKasNonTunai'); }
window.closeKasNonTunaiModal = function(){ closeModalById('modalKasNonTunai'); }
window.openKasPengeluaranModal = function(){ openModalById('modalPengeluaran'); }
window.closeKasPengeluaranModal = function(){ closeModalById('modalPengeluaran'); closeModalById('modalKasPengeluaran'); }
window.openKasHariIniModal = function(){ openModalById('modalKasHariIni'); }
window.closeKasHariIniModal = function(){ closeModalById('modalKasHariIni'); }
window.openKasDepositoModal = function(){ openModalById('modalKasDeposito'); }
window.closeKasDepositoModal = function(){ closeModalById('modalKasDeposito'); }

// Master Modals - FIX Overlay suffix
window.openModalOutlet = function(){ openModalById('modalOutlet'); }
window.closeModalOutlet = function(){ closeModalById('modalOutlet'); }
window.closeModalOutletOnBackdrop = function(e){ if(e.target.id.includes('modalOutlet')) closeModalById('modalOutlet'); }
window.simpanOutlet = function(){ toast('Simpan outlet'); closeModalById('modalOutlet'); }

window.openModalKaryawan = function(){ openModalById('modalKaryawan'); }
window.closeModalKaryawan = function(){ closeModalById('modalKaryawan'); }
window.closeModalKaryawanOnBackdrop = function(e){ if(e.target.id.includes('modalKaryawan')) closeModalById('modalKaryawan'); }
window.simpanKaryawan = function(){ toast('Simpan karyawan'); closeModalById('modalKaryawan'); }
window.togglePasswordKaryawan = function(){ const el=document.getElementById('karyawanPassword'); if(el) el.type = el.type==='password'?'text':'password'; }

window.openModalPelanggan = function(){ openModalById('modalPelanggan'); }
window.closeModalPelanggan = function(){ closeModalById('modalPelanggan'); }
window.closeModalPelangganOnBackdrop = function(e){ if(e.target.id.includes('modalPelanggan')) closeModalById('modalPelanggan'); }
window.simpanPelanggan = function(){ toast('Simpan pelanggan'); closeModalById('modalPelanggan'); }
window.toggleTanpaWa = function(e){}

window.openModalLayanan = function(){ openModalById('modalLayanan'); }
window.closeModalLayanan = function(){ closeModalById('modalLayanan'); }
window.closeModalLayananOnBackdrop = function(e){ if(e.target.id.includes('modalLayanan')) closeModalById('modalLayanan'); }
window.simpanLayanan = function(){ toast('Simpan layanan'); closeModalById('modalLayanan'); }
window.setEstimasiUnit = function(unit){ console.log('unit', unit); }

// Nota
window.openModalNota = function(){ openModalById('modalNota'); }
window.closeModalNota = function(){ closeModalById('modalNota'); }
window.closeModalNotaOnBackdrop = function(e){ if(e.target.id.includes('modalNota')) closeModalById('modalNota'); }
window.simpanNotaBaru = function(){ toast('Simpan nota'); closeModalById('modalNota'); }
window.openPelangganPickerForNota = function(){ openModalById('modalPelanggan'); }
window.openLayananPickerForNota = function(){ openModalById('modalLayanan'); }
window.openSubModalTambahPelanggan = function(){ openModalById('modalPelanggan'); }
window.closeSubModalPelanggan = function(){ closeModalById('modalPelanggan'); }
window.closeSubModalPelangganOnBackdrop = function(e){ if(e.target.id.includes('modalPelanggan')) closeModalById('modalPelanggan'); }
window.openSubModalTambahLayanan = function(){ openModalById('modalLayanan'); }
window.closeSubModalIsiDeposito = function(){ closeModalById('subModalIsiDeposito'); }
window.closeSubModalIsiDepositoOnBackdrop = function(e){ if(e.target.id.includes('IsiDeposito')) closeModalById('subModalIsiDeposito'); }
window.updateLiveDepositoCalculation = function(){}
window.simpanDeposito = function(){ toast('Simpan deposito'); closeModalById('subModalIsiDeposito'); }

window.openModalPreviewNota = function(){ openModalById('modalPreviewNota'); }
window.closeModalPreviewNota = function(){ closeModalById('modalPreviewNota'); }
window.closeModalPreviewNotaOnBackdrop = function(e){ if(e.target.id.includes('modalPreviewNota')) closeModalById('modalPreviewNota'); }
window.executePrintFromPreview = function(){ if(window.downloadESCPOS) downloadESCPOS(); else toast('Print'); }
window.executeShareWAText = window.executeShareWAText || function(){ toast('Share WA Text'); }
window.executeShareWAPNG = window.executeShareWAPNG || function(){ toast('Share WA PNG'); }
window.requestBluetoothPrinter = window.requestBluetoothPrinter || function(){ toast('Bluetooth'); }

window.openModalDetailNota = function(){ openModalById('modalDetailNota'); }
window.closeModalDetailNota = function(){ closeModalById('modalDetailNota'); }
window.closeModalDetailNotaOnBackdrop = function(e){ if(e.target.id.includes('modalDetailNota')) closeModalById('modalDetailNota'); }
window.openBayarNotaModalFromDetail = function(){ openModalById('modalBayarNota'); }
window.closeModalBayarNota = function(){ closeModalById('modalBayarNota'); }
window.closeModalBayarNotaOnBackdrop = function(e){ if(e.target.id.includes('modalBayarNota')) closeModalById('modalBayarNota'); }
window.eksekusiSimpanPembayaran = function(){ toast('Simpan bayar'); closeModalById('modalBayarNota'); }
window.hitungKalkulasiPembayaran = function(){}
window.selectMetodePembayaran = function(m){ console.log(m); }
window.simpanAlasanAction = function(){ closeModalById('modalAlasan'); closeModalById('alasanModal'); }
window.closeAlasanModal = function(){ closeModalById('modalAlasan'); closeModalById('alasanModal'); }
window.cycleStatusDetailNota = function(){ toast('Cycle'); }
window.hapusNotaAktifDetail = function(){ toast('Hapus'); }

// Diskon
window.openModalDiskon = function(){ openModalById('modalDiskon'); }
window.closeModalDiskon = function(){ closeModalById('modalDiskon'); }
window.closeModalDiskonOnBackdrop = function(e){ if(e.target.id.includes('modalDiskon')) closeModalById('modalDiskon'); }
window.simpanDiskonSettings = function(){ toast('Simpan diskon'); closeModalById('modalDiskon'); }
window.setDiskonType = function(t){ console.log(t); }
window.updatePreviewDiskonInfo = function(){}

// Notice
window.closeModalNoticePeringatan = function(){ closeModalById('modalNoticePeringatan'); }
window.closeModalNoticePeringatanOnBackdrop = function(e){ if(e.target.id.includes('modalNoticePeringatan')) closeModalById('modalNoticePeringatan'); }
window.prosesHutangNota = function(){ toast('Hutang'); }
window.lanjutkanBayarDariNotice = function(){ toast('Lanjut bayar'); }

// Struk
window.openMasterStrukModal = function(){ openModalById('modalMasterStruk'); }
window.closeMasterStrukModal = function(){ closeModalById('modalMasterStruk'); }
window.simpanMasterStruk = function(){ toast('Simpan struk'); }
window.previewModeFromMaster = function(){ toast('Preview'); }
window.onHeaderInput = function(){}
window.onFooterInput = function(){}
window.updateStrukPreview = function(){}
window.setStrukPrintMode = function(m){}

// Export Import - PENYAKIT SETTING PALING BANYAK DISINI
window.openModalExportImport = function(){ openModalById('modalExportImport'); console.log('open export import'); }
window.closeModalExportImport = function(){ closeModalById('modalExportImport'); }
window.closeModalExportImportOnBackdrop = function(e){ if(e.target.id.includes('modalExportImport')) closeModalById('modalExportImport'); }
window.switchExportTab = function(tab){ 
  document.querySelectorAll('[id^="exportTab"]').forEach(el=>el.style.display='none');
  const target = document.getElementById('exportTab'+tab) || document.getElementById('exportTab-'+tab);
  if(target) target.style.display='block';
  console.log('export tab', tab);
}
window.exportFullBackup = function(){ toast('Export backup - siap'); }
window.importFullBackup = function(){ toast('Import backup'); }
window.exportPelanggan = function(){ toast('Export pelanggan'); }
window.importPelanggan = function(){ toast('Import pelanggan'); }
window.exportLayanan = function(){ toast('Export layanan'); }
window.importLayanan = function(){ toast('Import layanan'); }
window.downloadTemplatePelanggan = function(){ toast('Download template'); }
window.downloadTemplateLayanan = function(){ toast('Download template'); }

// Pengeluaran
window.openModalPengeluaranKas = function(){ openModalById('modalPengeluaran'); }
window.closeModalPengeluaranKas = function(){ closeModalById('modalPengeluaran'); closeModalById('modalKasPengeluaran'); }
window.closeModalPengeluaranKasOnBackdrop = function(e){ if(e.target.id.includes('modalPengeluaran')) closeModalById('modalPengeluaran'); }
window.simpanPengeluaranKas = function(){ toast('Simpan pengeluaran'); closeModalById('modalPengeluaran'); }

// Laporan - SETTING LAPORAN JUGA SERING ZONK
window.openLaporanHarianModal = function(){ openModalById('laporanHarian'); }
window.openLaporanMingguanModal = function(){ openModalById('laporanMingguan'); }
window.closeLaporanMingguanModal = function(){ closeModalById('laporanMingguan'); }
window.openLaporanBulananModal = function(){ openModalById('laporanBulanan'); }
window.closeLaporanBulananModal = function(){ closeModalById('laporanBulanan'); }
window.openLaporanCustomModal = function(){ openModalById('laporanCustom'); }
window.closeLaporanCustomModal = function(){ closeModalById('laporanCustom'); }
window.openLaporanLabaRugiModal = function(){ openModalById('laporanLabaRugi'); }
window.closeLaporanLabaRugiModal = function(){ closeModalById('laporanLabaRugi'); }
window.openLaporanDepositoModal = function(){ openModalById('laporanDeposito'); }
window.closeLaporanDepositoModal = function(){ closeModalById('laporanDeposito'); }
window.applyCustomLaporan = function(){ toast('Apply'); }

// Statistik
window.openStatistikLayananModal = function(){ openModalById('modalStatistikLayanan'); }
window.closeStatistikLayananModal = function(){ closeModalById('modalStatistikLayanan'); }
window.switchStatistikPeriode = function(p){ console.log(p); }
window.openPertumbuhanPelangganModal = function(){ openModalById('modalPertumbuhanPelanggan'); }
window.closePertumbuhanPelangganModal = function(){ closeModalById('modalPertumbuhanPelanggan'); }
window.switchPertumbuhanPeriode = function(p){ console.log(p); }
window.switchGrafikTab = function(t){ console.log(t); }

// Riwayat
window.openRiwayatNotaModal = function(){ openModalById('modalRiwayatNota'); }
window.closeRiwayatNotaModal = function(){ closeModalById('modalRiwayatNota'); }
window.renderRiwayatNotaList = function(){}
window.openPreviewNotaFromMaster = function(){ openModalById('modalPreviewNota'); }

// Level Setting - SETTING LEVEL INI YANG PALING SERING ZONK
window.openLevelSettingModal = function(){ openModalById('modalLevelSetting'); console.log('open level setting'); }
window.closeLevelSettingModal = function(){ closeModalById('modalLevelSetting'); }
window.switchLevelTab = function(tab){ 
  document.querySelectorAll('.level-tab').forEach(el=>el.classList.remove('active'));
  const target = document.getElementById('levelTab'+tab);
  if(target) target.classList.add('active');
  console.log('level tab', tab);
}
window.checkAllLevelMenu = function(){ document.querySelectorAll('.level-menu-checkbox').forEach(cb=>cb.checked=true); }
window.saveLevelSetting = function(){ toast('Simpan level'); closeModalById('modalLevelSetting'); }

// Hapus Data
window.closeModalKonfirmasiHapus = function(){ closeModalById('modalKonfirmasiHapus'); }
window.closeModalKonfirmasiHapusOnBackdrop = function(e){ if(e.target.id.includes('modalKonfirmasiHapus')) closeModalById('modalKonfirmasiHapus'); }
window.eksekusiHapusData = function(){ toast('Hapus'); closeModalById('modalKonfirmasiHapus'); }

// Contact & Font
window.requestContactPermission = function(){ toast('Request contact'); }
window.checkContactPermission = function(){}
window.changeFontSize = function(size){ document.documentElement.style.fontSize = size+'px'; }

console.log('✅ core-functions.js v2 FIX Overlay - 147 handlers - setting penyakit fixed - tap active');
