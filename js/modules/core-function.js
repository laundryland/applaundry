
// CORE FUNCTIONS - Semua onclick dari original-body.html 914KB - v2.5.28 Modular Fix
// Dibuat karena original-body.html tidak punya <script> tag, jadi semua handler harus didefinisikan di sini

function toast(msg){
  if(window.showNoticeToast) showNoticeToast(msg);
  else console.log(msg);
}

// Helper modal
function openModalById(id){
  const el = document.getElementById(id);
  if(el){ el.classList.add('active'); el.style.display='flex'; el.style.opacity='1'; el.style.visibility='visible'; }
}
function closeModalById(id){
  const el = document.getElementById(id);
  if(el){ el.classList.remove('active'); el.style.display='none'; el.style.opacity='0'; el.style.visibility='hidden'; }
}

// Page switching - FIX TAP ZONK utama
window.switchPage = function(page){
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  const target = document.getElementById('page-' + page) || document.getElementById('pageView' + page) || document.querySelector(`[data-page="${page}"]`);
  if(target) target.classList.remove('hidden');
  else {
    // Fallback: cari page by text
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
  toast('Filter: ' + filter);
}
window.filterAntrianByStatus = function(status){ toast('Filter antrian: ' + status); }
window.clearSearchAntrian = function(){ const el=document.getElementById('searchAntrian'); if(el) el.value=''; }
window.onSearchAntrianInput = function(e){ console.log('search antrian', e.target.value); }
window.clearSearchPelanggan = function(){ const el=document.getElementById('searchPelanggan'); if(el) el.value=''; window.filterPelangganList(''); }
window.filterPelangganList = function(v){ if(window.renderPelangganList) renderPelangganList(v||''); }
window.clearSearchLayanan = function(){ const el=document.getElementById('searchLayanan'); if(el) el.value=''; }
window.onSearchLayananInput = function(e){}

// Header & Outlet
window.toggleHeaderOutletDropdown = window.toggleHeaderOutletDropdown || function(){
  const dd = document.getElementById('headerOutletDropdown');
  if(dd){ dd.style.display = (dd.style.display==='none' || !dd.style.display) ? 'block' : 'none'; }
}
window.openKaryawanPicker = function(){ openModalById('modalKaryawanPicker'); toast('Pilih karyawan'); }
window.toggleSystemTheme = function(){ document.body.classList.toggle('dark'); toast('Theme toggle'); }
window.doLogout = function(){ openModalById('logoutModal'); }
window.confirmLogout = function(){ localStorage.clear(); location.reload(); }
window.closeLogoutModal = function(){ closeModalById('logoutModal'); }
window.handleLogoUpload = function(){ document.getElementById('logoFileInput')?.click(); }
window.removeLogo = function(){ localStorage.removeItem('outletLogo'); const img=document.getElementById('outletLogoImg'); if(img) img.style.display='none'; const ph=document.getElementById('logoPlaceholderIcon'); if(ph) ph.style.display='block'; }

// Dropdown Kas
window.toggleDropdown = function(id){
  const el=document.getElementById(id);
  if(el){ el.style.display = el.style.display==='none' || !el.style.display ? 'block' : 'none'; }
}

// Kas Modals
window.openKasTunaiModal = function(){ openModalById('kasTunaiModal'); }
window.closeKasTunaiModal = function(){ closeModalById('kasTunaiModal'); }
window.openKasNonTunaiModal = function(){ openModalById('kasNonTunaiModal'); }
window.closeKasNonTunaiModal = function(){ closeModalById('kasNonTunaiModal'); }
window.openKasPengeluaranModal = function(){ openModalById('kasPengeluaranModal'); }
window.closeKasPengeluaranModal = function(){ closeModalById('kasPengeluaranModal'); }
window.openKasHariIniModal = function(){ openModalById('kasHariIniModal'); }
window.closeKasHariIniModal = function(){ closeModalById('kasHariIniModal'); }
window.openKasDepositoModal = function(){ openModalById('kasDepositoModal'); }
window.closeKasDepositoModal = function(){ closeModalById('kasDepositoModal'); }

// Master Modals
window.openModalOutlet = function(){ openModalById('modalOutlet'); }
window.closeModalOutlet = function(){ closeModalById('modalOutlet'); }
window.closeModalOutletOnBackdrop = function(e){ if(e.target.id==='modalOutlet') closeModalById('modalOutlet'); }
window.simpanOutlet = function(){ toast('Simpan outlet - TODO integrasi Supabase'); closeModalById('modalOutlet'); }

window.openModalKaryawan = function(){ openModalById('modalKaryawan'); }
window.closeModalKaryawan = function(){ closeModalById('modalKaryawan'); }
window.closeModalKaryawanOnBackdrop = function(e){ if(e.target.id==='modalKaryawan') closeModalById('modalKaryawan'); }
window.simpanKaryawan = function(){ toast('Simpan karyawan'); closeModalById('modalKaryawan'); }
window.togglePasswordKaryawan = function(){ const el=document.getElementById('karyawanPassword'); if(el) el.type = el.type==='password'?'text':'password'; }

window.openModalPelanggan = function(){ openModalById('modalPelanggan'); }
window.closeModalPelanggan = function(){ closeModalById('modalPelanggan'); }
window.closeModalPelangganOnBackdrop = function(e){ if(e.target.id==='modalPelanggan') closeModalById('modalPelanggan'); }
window.simpanPelanggan = function(){ toast('Simpan pelanggan'); closeModalById('modalPelanggan'); }
window.toggleTanpaWa = function(e){}

window.openModalLayanan = function(){ openModalById('modalLayanan'); }
window.closeModalLayanan = function(){ closeModalById('modalLayanan'); }
window.closeModalLayananOnBackdrop = function(e){ if(e.target.id==='modalLayanan') closeModalById('modalLayanan'); }
window.simpanLayanan = function(){ toast('Simpan layanan'); closeModalById('modalLayanan'); }
window.setEstimasiUnit = function(unit){ console.log('estimasi unit', unit); }

// Nota & Antrian
window.openModalNota = function(){ openModalById('modalNota'); }
window.closeModalNota = function(){ closeModalById('modalNota'); }
window.closeModalNotaOnBackdrop = function(e){ if(e.target.id==='modalNota') closeModalById('modalNota'); }
window.simpanNotaBaru = function(){ toast('Simpan nota baru'); closeModalById('modalNota'); }
window.openPelangganPickerForNota = function(){ openModalById('modalPelangganPicker'); toast('Pilih pelanggan'); }
window.openLayananPickerForNota = function(){ openModalById('modalLayananPicker'); toast('Pilih layanan'); }
window.openSubModalTambahPelanggan = function(){ openModalById('subModalPelanggan'); }
window.closeSubModalPelanggan = function(){ closeModalById('subModalPelanggan'); }
window.closeSubModalPelangganOnBackdrop = function(e){ if(e.target.id==='subModalPelanggan') closeModalById('subModalPelanggan'); }
window.openSubModalTambahLayanan = function(){ openModalById('subModalLayanan'); }
window.closeSubModalIsiDeposito = function(){ closeModalById('subModalIsiDeposito'); }
window.closeSubModalIsiDepositoOnBackdrop = function(e){ if(e.target.id==='subModalIsiDeposito') closeModalById('subModalIsiDeposito'); }
window.updateLiveDepositoCalculation = function(){}
window.simpanDeposito = function(){ toast('Simpan deposito'); }

window.openModalPreviewNota = function(){ openModalById('modalPreviewNota'); }
window.closeModalPreviewNota = function(){ closeModalById('modalPreviewNota'); }
window.closeModalPreviewNotaOnBackdrop = function(e){ if(e.target.id==='modalPreviewNota') closeModalById('modalPreviewNota'); }
window.executePrintFromPreview = function(){ if(window.downloadESCPOS) downloadESCPOS(); else toast('Print'); }
window.executeShareWAText = window.executeShareWAText || function(){ toast('Share WA Text'); }
window.executeShareWAPNG = window.executeShareWAPNG || function(){ toast('Share WA PNG'); }
window.requestBluetoothPrinter = window.requestBluetoothPrinter || function(){ toast('Bluetooth printer'); }

window.openModalDetailNota = function(){ openModalById('modalDetailNota'); }
window.closeModalDetailNota = function(){ closeModalById('modalDetailNota'); }
window.closeModalDetailNotaOnBackdrop = function(e){ if(e.target.id==='modalDetailNota') closeModalById('modalDetailNota'); }
window.openBayarNotaModalFromDetail = function(){ openModalById('modalBayarNota'); }
window.closeModalBayarNota = function(){ closeModalById('modalBayarNota'); }
window.closeModalBayarNotaOnBackdrop = function(e){ if(e.target.id==='modalBayarNota') closeModalById('modalBayarNota'); }
window.eksekusiSimpanPembayaran = function(){ toast('Simpan pembayaran'); closeModalById('modalBayarNota'); }
window.hitungKalkulasiPembayaran = function(){}
window.selectMetodePembayaran = function(m){ console.log('metode', m); }
window.simpanAlasanAction = function(){ closeModalById('alasanModal'); }
window.closeAlasanModal = function(){ closeModalById('alasanModal'); }
window.cycleStatusDetailNota = function(){ toast('Cycle status'); }
window.hapusNotaAktifDetail = function(){ toast('Hapus nota'); }

// Diskon
window.openModalDiskon = function(){ openModalById('modalDiskon'); }
window.closeModalDiskon = function(){ closeModalById('modalDiskon'); }
window.closeModalDiskonOnBackdrop = function(e){ if(e.target.id==='modalDiskon') closeModalById('modalDiskon'); }
window.simpanDiskonSettings = function(){ toast('Simpan diskon'); closeModalById('modalDiskon'); }
window.setDiskonType = function(t){ console.log('diskon type', t); }
window.updatePreviewDiskonInfo = function(){}

// Notice & Hutang
window.closeModalNoticePeringatan = function(){ closeModalById('modalNoticePeringatan'); }
window.closeModalNoticePeringatanOnBackdrop = function(e){ if(e.target.id==='modalNoticePeringatan') closeModalById('modalNoticePeringatan'); }
window.prosesHutangNota = function(){ toast('Proses hutang'); }
window.lanjutkanBayarDariNotice = function(){ toast('Lanjutkan bayar'); }

// Struk Master
window.openMasterStrukModal = function(){ openModalById('masterStrukModal'); }
window.closeMasterStrukModal = function(){ closeModalById('masterStrukModal'); }
window.simpanMasterStruk = function(){ toast('Simpan master struk'); }
window.previewModeFromMaster = function(){ toast('Preview struk'); }
window.onHeaderInput = function(){}
window.onFooterInput = function(){}
window.updateStrukPreview = function(){}
window.setStrukPrintMode = function(m){}

// Export Import
window.openModalExportImport = function(){ openModalById('modalExportImport'); }
window.closeModalExportImport = function(){ closeModalById('modalExportImport'); }
window.closeModalExportImportOnBackdrop = function(e){ if(e.target.id==='modalExportImport') closeModalById('modalExportImport'); }
window.switchExportTab = function(tab){ console.log('export tab', tab); }
window.exportFullBackup = function(){ toast('Export backup'); }
window.importFullBackup = function(){ toast('Import backup'); }
window.exportPelanggan = function(){ toast('Export pelanggan'); }
window.importPelanggan = function(){ toast('Import pelanggan'); }
window.exportLayanan = function(){ toast('Export layanan'); }
window.importLayanan = function(){ toast('Import layanan'); }
window.downloadTemplatePelanggan = function(){ toast('Download template pelanggan'); }
window.downloadTemplateLayanan = function(){ toast('Download template layanan'); }

// Pengeluaran Kas
window.openModalPengeluaranKas = function(){ openModalById('modalPengeluaranKas'); }
window.closeModalPengeluaranKas = function(){ closeModalById('modalPengeluaranKas'); }
window.closeModalPengeluaranKasOnBackdrop = function(e){ if(e.target.id==='modalPengeluaranKas') closeModalById('modalPengeluaranKas'); }
window.simpanPengeluaranKas = function(){ toast('Simpan pengeluaran'); }

// Laporan
window.openLaporanHarianModal = function(){ openModalById('laporanHarianModal'); }
window.openLaporanMingguanModal = function(){ openModalById('laporanMingguanModal'); }
window.closeLaporanMingguanModal = function(){ closeModalById('laporanMingguanModal'); }
window.openLaporanBulananModal = function(){ openModalById('laporanBulananModal'); }
window.closeLaporanBulananModal = function(){ closeModalById('laporanBulananModal'); }
window.openLaporanCustomModal = function(){ openModalById('laporanCustomModal'); }
window.closeLaporanCustomModal = function(){ closeModalById('laporanCustomModal'); }
window.openLaporanLabaRugiModal = function(){ openModalById('laporanLabaRugiModal'); }
window.closeLaporanLabaRugiModal = function(){ closeModalById('laporanLabaRugiModal'); }
window.openLaporanDepositoModal = function(){ openModalById('laporanDepositoModal'); }
window.closeLaporanDepositoModal = function(){ closeModalById('laporanDepositoModal'); }
window.applyCustomLaporan = function(){ toast('Apply laporan'); }

// Statistik & Pertumbuhan
window.openStatistikLayananModal = function(){ openModalById('statistikLayananModal'); }
window.closeStatistikLayananModal = function(){ closeModalById('statistikLayananModal'); }
window.switchStatistikPeriode = function(p){ console.log('statistik periode', p); }
window.openPertumbuhanPelangganModal = function(){ openModalById('pertumbuhanPelangganModal'); }
window.closePertumbuhanPelangganModal = function(){ closeModalById('pertumbuhanPelangganModal'); }
window.switchPertumbuhanPeriode = function(p){ console.log('pertumbuhan', p); }
window.switchGrafikTab = function(t){ console.log('grafik tab', t); }

// Riwayat
window.openRiwayatNotaModal = function(){ openModalById('riwayatNotaModal'); }
window.closeRiwayatNotaModal = function(){ closeModalById('riwayatNotaModal'); }
window.renderRiwayatNotaList = function(){}
window.openPreviewNotaFromMaster = function(){ openModalById('modalPreviewNota'); }

// Level Setting
window.openLevelSettingModal = function(){ openModalById('levelSettingModal'); }
window.closeLevelSettingModal = function(){ closeModalById('levelSettingModal'); }
window.switchLevelTab = function(tab){ console.log('level tab', tab); }
window.checkAllLevelMenu = function(){}
window.saveLevelSetting = function(){ toast('Simpan level'); }

// Hapus Data
window.closeModalKonfirmasiHapus = function(){ closeModalById('modalKonfirmasiHapus'); }
window.closeModalKonfirmasiHapusOnBackdrop = function(e){ if(e.target.id==='modalKonfirmasiHapus') closeModalById('modalKonfirmasiHapus'); }
window.eksekusiHapusData = function(){ toast('Hapus data'); }

// Contact Permission
window.requestContactPermission = function(){ toast('Request contact permission'); }
window.checkContactPermission = function(){}

// Font Size
window.changeFontSize = function(size){ document.documentElement.style.fontSize = size+'px'; }

console.log('✅ core-functions.js loaded - 147 onclick handlers defined - tap fix active');
