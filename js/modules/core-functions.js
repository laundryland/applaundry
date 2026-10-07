// FINAL PROFESIONAL FIX - v2.5.28 2ROW ICONS - ANTI HILANG + SUPA SYNC
const db = window.db || { struk_settings: { put: async()=>{}, get: async()=>{}, delete: async()=>{} }, sync_queue: { add: async()=>{} } };


// HYBRID STORAGE: localStorage + IndexedDB + Supabase sync untuk Master Struk
var STRUK_DB_KEY = 'struk_settings_cache';

async function saveHybridStruk(key, value){
  try{
    // 1. localStorage - cepat
    if(typeof value === 'object') localStorage.setItem(key, JSON.stringify(value));
    else localStorage.setItem(key, value);
    
    // 2. IndexedDB - aman & besar (untuk logo base64)
    const activeOutlet = (typeof getActiveOutlet === 'function') ? getActiveOutlet() : {id:'default'};
    const outletId = activeOutlet?.id || 'default';
    await db.struk_settings.put({
      id: outletId + '_' + key,
      outletId: outletId,
      key: key,
      value: value,
      updated_at: new Date().toISOString()
    });
    
    // 3. Queue sync ke Supabase jika ada
    try{
      await db.sync_queue.add({
        table_name: 'struk_settings',
        action: 'upsert',
        data: { outlet_id: outletId, key: key, value: value },
        created_at: new Date().toISOString()
      });
      if(typeof syncToSupabase === 'function') syncToSupabase();
    }catch(e){}
  }catch(e){ console.log('Hybrid save error', e); }
}

async function loadHybridStruk(key, defaultVal){
  // 1. Coba localStorage dulu (paling cepat)
  let val = localStorage.getItem(key);
  if(val !== null){
    try{ return JSON.parse(val); }catch(e){ return val; }
  }
  // 2. Coba IndexedDB
  try{
    const activeOutlet = (typeof getActiveOutlet === 'function') ? getActiveOutlet() : {id:'default'};
    const outletId = activeOutlet?.id || 'default';
    const rec = await db.struk_settings.get(outletId + '_' + key);
    if(rec && rec.value !== undefined){
      // Restore ke localStorage untuk next load cepat
      if(typeof rec.value === 'object') localStorage.setItem(key, JSON.stringify(rec.value));
      else localStorage.setItem(key, rec.value);
      return rec.value;
    }
  }catch(e){}
  return defaultVal;
}

async function initHybridStruk(){
  // Migrasi existing localStorage ke IndexedDB jika belum ada
  const keys = ['strukLogoBase64','strukPrintMode','strukHeaderCustom','strukFooterCustom','strukFontSizes',
                'strukShowEstimasi','strukShowNamaKasir','strukShowAlamatOutlet','strukShowWaOutlet','strukShowNoNota','strukShowTanggal','strukShowLayanan','strukShowNamaPelanggan','strukShowStatusBayar','strukShowNominal','strukShowEstimasi','strukShowDepositInfo'];
  for(let k of keys){
    let v = localStorage.getItem(k);
    if(v){
      try{ 
        let parsed;
        try{ parsed = JSON.parse(v); }catch(e){ parsed = v; }
        await saveHybridStruk(k, parsed);
      }catch(e){}
    }
  }
  // Load print mode hybrid
  let mode = await loadHybridStruk('strukPrintMode', 'text');
  strukPrintMode = mode || 'text';
  if(typeof updateModeUI === 'function') updateModeUI();
}

// Override setStrukPrintMode untuk pakai hybrid
var _origSetStrukPrintMode = window.setStrukPrintMode;
window.setStrukPrintMode = function(mode){
  strukPrintMode = mode;
  saveHybridStruk('strukPrintMode', mode);
  if(typeof updateModeUI === 'function') updateModeUI();
  if(typeof showNoticeToast === 'function') showNoticeToast(mode==='ios' ? '🍎 Mode Gambar iOS aktif (local+IDB)' : '📄 Mode Text Nota aktif (local+IDB)');
};

// Override logo handling untuk hybrid
var _origHandleLogo = window.handleLogoUpload;
window.handleLogoUpload = async function(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ if(typeof showNoticeToast==='function') showNoticeToast('File terlalu besar, max 5MB'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const img = new Image();
    img.onload = async function(){
      const canvas = document.createElement('canvas');
      let w=img.width, h=img.height;
      const maxW=400;
      if(w>maxW){ h=h*maxW/w; w=maxW; }
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      const compressed=canvas.toDataURL('image/jpeg',0.7);
      strukLogoBase64=compressed;
      await saveHybridStruk('strukLogoBase64', compressed);
      const cont=document.getElementById('logoPreviewContainer');
      if(cont) cont.innerHTML='<img src="'+compressed+'" style="width:100%;height:100%;object-fit:contain;">';
      if(typeof showNoticeToast==='function') showNoticeToast('✅ Logo disimpan (local+IDB)');
      if(typeof updateStrukPreview==='function') updateStrukPreview();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
};

var _origRemoveLogo = window.removeLogo;
window.removeLogo = async function(){
  strukLogoBase64='';
  localStorage.removeItem('strukLogoBase64');
  try{ 
    const activeOutlet = (typeof getActiveOutlet === 'function') ? getActiveOutlet() : {id:'default'};
    await db.struk_settings.delete((activeOutlet?.id || 'default') + '_strukLogoBase64');
  }catch(e){}
  const cont=document.getElementById('logoPreviewContainer');
  if(cont) cont.innerHTML='<span style="font-size:10px;color:#999;">Belum ada logo</span>';
  if(typeof showNoticeToast==='function') showNoticeToast('🗑️ Logo dihapus dari local+IDB');
  if(typeof updateStrukPreview==='function') updateStrukPreview();
};

// Init saat load
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){ initHybridStruk(); }, 800);
});



/* Global State Management - Multi-Outlet & Diskon Parameter */
let globalDiskonSettings = { val: 5, type: 'persen' };

let outletsData = [
  { id: "outlet-1", nama: "Laundry Land", alamat: "Jl. Merdeka No. 12", wa: "08123456789", isActive: true },
  { id: "outlet-2", nama: "ResiQ Laundry", alamat: "Jl. Pemuda No. 45", wa: "08987654321", isActive: false }
];

let karyawanData = [
  { id: "karyawan-1", outletId: "outlet-1", nama: "Kasir Utama", wa: "081234567890", alamat: "Pusat", isActive: true },
  { id: "karyawan-2", outletId: "outlet-1", nama: "Budi Santoso", wa: "089876543210", alamat: "Cabang 1", isActive: false },
  { id: "karyawan-3", outletId: "outlet-2", nama: "Siti Rahma", wa: "085566778899", alamat: "Cabang 2", isActive: true }
];

let pelangganData = [
  { id: "pelanggan-1", outletId: "outlet-1", nama: "Budi Santoso", wa: "081234567890", tanpaWa: false, simpanKontak: true, alamat: "Jl. Mawar No. 10", deposito: 150000 },
  { id: "pelanggan-2", outletId: "outlet-1", nama: "Siti Aminah", wa: "081299887766", tanpaWa: true, simpanKontak: false, alamat: "Jl. Melati No. 5", deposito: 10000 },
  { id: "pelanggan-3", outletId: "outlet-2", nama: "Dewi Lestari", wa: "081122334455", tanpaWa: false, simpanKontak: true, alamat: "Jl. Anggrek No. 8", deposito: 100000 }
];

let layananData = [
  { id: "layanan-1", outletId: "outlet-1", nama: "Cuci Komplit Express", kode: "CKE", harga: 10000, satuan: "Kg", estimasiVal: 3, estimasiUnit: "Jam", minKg: 3 },
  { id: "layanan-2", outletId: "outlet-1", nama: "Cuci Kering Karpet", kode: "CKK", harga: 30000, satuan: "Pcs", estimasiVal: 2, estimasiUnit: "Hari", minKg: 0 },
  { id: "layanan-3", outletId: "outlet-2", nama: "Cuci Komplit Hemat", kode: "CKH", harga: 7000, satuan: "Kg", estimasiVal: 2, estimasiUnit: "Hari", minKg: 3 },
  { id: "layanan-4", outletId: "outlet-2", nama: "Setrika Kilat", kode: "SKL", harga: 10000, satuan: "Kg", estimasiVal: 4, estimasiUnit: "Jam", minKg: 0 }
];

let antrianData = [
  { id: "nota-1001", outletId: "outlet-1", nota: "#NT-1001", namaPelanggan: "Budi Santoso", totalNota: 30000, statusProses: "Proses", statusBayar: "Lunas", layanan: "Cuci Komplit Express 2.8Kg (Min 3Kg)", estimasi: "3 Jam", estimasiFormatted: "04-10-26 10:00", estimasiISO: new Date(Date.now()+3*3600000).toISOString(), tanggal: new Date().toISOString(), items:[{nama:"Cuci Komplit Express", qtyInput:"2.8", satuan:"Kg", estimasiVal:3, estimasiUnit:"Jam"}] },
  { id: "nota-1002", outletId: "outlet-1", nota: "#NT-1002", namaPelanggan: "Siti Aminah", totalNota: 30000, statusProses: "Antrian", statusBayar: "Belum Lunas", layanan: "Cuci Kering Karpet 1 Pcs", estimasi: "2 Hari", estimasiFormatted: "06-10-26 10:00", estimasiISO: new Date(Date.now()+2*86400000).toISOString(), tanggal: new Date(Date.now()-86400000).toISOString(), items:[{nama:"Cuci Kering Karpet", qtyInput:"1", satuan:"Pcs", estimasiVal:2, estimasiUnit:"Hari"}] }
];

let pengeluaranKasData = [];
let riwayatNotaData = [];

/* State Pembuatan & Preview Nota */
let currentNotaPelanggan = null;
let currentNotaItems = [];
let isPelangganPickerForNota = false;
let isLayananPickerForNota = false;
let activePreviewNotaObj = null;

let currentEstimasiUnit = 'Jam';
let editingLayananId = null;
let editingOutletId = null;
let editingKaryawanId = null;
let editingPelangganId = null;
let selectedPelangganDepositoId = null;
let activeDetailNotaId = null;
let modeDeposito = 'tambah';
let activeAntrianFilter = 'Semua';
let searchAntrianQuery = '';

/* State Pembayaran Nota (Modal Bayar Baru) */
let activeBayarNotaObj = null;
let activeMetodePembayaran = 'Tunai';
let bayarSplitModeChoice = null; // 'lanjut' atau 'batal'

/* System Global Variables for Delete Notice */
let pendingDeleteType = null;
let pendingDeleteId = null;

/* Native Window Intercept */
(function pauseWindowNativeFunctions() {
  console.log('[System Checkpoint v2.5.28-PELANGGAN-2ROW-ICONS] Pembaruan Modal Bayar Nota Aktif.');
  window.print = function() { console.warn('[PAUSED] window.print() dipause.'); };
  window.alert = function(msg) { console.warn('[PAUSED] Native alert dipause:', msg); };
})();

document.addEventListener('DOMContentLoaded', () => {
  syncActiveOutletHeader();
  syncActiveKaryawanHeader();
  renderHeaderOutletDropdown();
  renderAntrianList('Semua');
  updateSummaryCounters();
  hitungRingkasanKas();
});

/* Helper Functions */
function getActiveOutlet() { return outletsData.find(o => o.isActive) || outletsData[0]; }
function getActiveKaryawan() { const activeOutlet = getActiveOutlet(); return karyawanData.find(k => k.isActive && (k.outletId === activeOutlet.id || !k.outletId)) || karyawanData[0]; }

function syncActiveOutletHeader() { const activeOutlet = getActiveOutlet(); const labelHeader = document.getElementById('label-outlet'); if (labelHeader) labelHeader.innerText = activeOutlet.nama; }
function syncActiveKaryawanHeader() { const activeKaryawan = getActiveKaryawan(); const labelKaryawan = document.getElementById('label-karyawan'); if (labelKaryawan && activeKaryawan) labelKaryawan.innerText = activeKaryawan.nama; }

function showNoticeToast(msg) {
  let toast = document.getElementById('noticeToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'noticeToast';
    toast.style.cssText = 'position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 4000; background: rgba(17, 24, 39, 0.92); color: #fff; padding: 10px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; box-shadow: 0 4px 16px rgba(0,0,0,0.25); backdrop-filter: blur(8px); transition: opacity 0.3s ease; opacity: 0; pointer-events: none; text-align: center; max-width: 320px; width: 90%;';
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.style.opacity = '1';
  setTimeout(() => { toast.style.opacity = '0'; }, 2600);
}

/* ============================================================================== */
/* MODUL MODAL BAYAR NOTA (5 ROW INTERAKTIF & DEPOSITO SPLIT)                     */
/* ============================================================================== */

function openBayarNotaModal(notaId, event) {
  if (event) event.stopPropagation();
  const nota = antrianData.find(n => n.id === notaId);
  if (!nota) return;
  activeBayarNotaObj = nota;
  bayarSplitModeChoice = null;

  // Find customer
  const cust = pelangganData.find(p => p.nama.toLowerCase() === nota.namaPelanggan.toLowerCase());
  const saldoDep = cust ? cust.deposito : 0;

  document.getElementById('titleModalBayarNota').innerText = `Bayar Nota ${nota.nota}`;
  document.getElementById('bayarRow1NamaPelanggan').innerText = `${nota.namaPelanggan} (${nota.nota})`;
  document.getElementById('bayarRow1Nominal').innerText = `Rp ${nota.totalNota.toLocaleString('id-ID')}`;

  // Row 2: Deposito Logic
  const row2Container = document.getElementById('bayarRow2Container');
  const row2SaldoVal = document.getElementById('bayarRow2SaldoVal');
  const row2InfoPotongan = document.getElementById('bayarRow2InfoPotongan');

  if (saldoDep > 0) {
    row2Container.style.display = 'flex';
    row2SaldoVal.innerText = `Rp ${saldoDep.toLocaleString('id-ID')}`;
    
    if (saldoDep >= nota.totalNota) {
      row2InfoPotongan.innerHTML = `✅ Saldo cukup! Otomatis memotong deposito sebesar <strong>Rp ${nota.totalNota.toLocaleString('id-ID')}</strong> sebagai alat pembayaran utama.`;
    } else {
      row2InfoPotongan.innerHTML = `⚠️ Saldo tidak mencukupi (Sisa Rp ${saldoDep.toLocaleString('id-ID')}). Terdeteksi kurang <strong>Rp ${(nota.totalNota - saldoDep).toLocaleString('id-ID')}</strong>. <br><span style="color:#dc2626; font-weight:800;">Split pembayaran diperlukan!</span>`;
    }
  } else {
    // Jika tidak ada deposito, jadikan hidden sesuai instruksi
    row2Container.style.display = 'none';
  }

  // Reset Row 3 & 4
  selectMetodePembayaran('Tunai', document.querySelector('#metodePembayaranContainer div'));
  document.getElementById('inputBayarNominal').value = nota.totalNota;
  hitungKalkulasiPembayaran();

  document.getElementById('modalBayarNotaOverlay').classList.add('active');
}

function openBayarNotaModalFromDetail() {
  if (!activeDetailNotaId) return;
  const notaId = activeDetailNotaId;
  closeModalDetailNota();
  openBayarNotaModal(notaId);
}

function closeModalBayarNota() {
  document.getElementById('modalBayarNotaOverlay').classList.remove('active');
  activeBayarNotaObj = null;
}

function closeModalBayarNotaOnBackdrop(e) {
  if (e.target.id === 'modalBayarNotaOverlay') closeModalBayarNota();
}

function selectMetodePembayaran(metode, el) {
  activeMetodePembayaran = metode;
  document.querySelectorAll('#metodePembayaranContainer div').forEach(d => d.classList.remove('active'));
  if (el) el.classList.add('active');

  const labelTitle = document.getElementById('bayarRow4LabelTitle');
  const inputNominal = document.getElementById('inputBayarNominal');
  
  if (metode === 'Tunai') {
    if (labelTitle) labelTitle.innerText = 'Row 4: Nominal Pembayaran Tunai';
    if (activeBayarNotaObj) inputNominal.value = activeBayarNotaObj.totalNota;
  } else if (metode === 'QRIS') {
    if (labelTitle) labelTitle.innerText = 'Row 4: Pembayaran QRIS (Otomatis Sesuai Tagihan)';
    if (activeBayarNotaObj) inputNominal.value = activeBayarNotaObj.totalNota;
  } else if (metode === 'Transfer') {
    if (labelTitle) labelTitle.innerText = 'Row 4: Pembayaran Transfer Bank (Otomatis Sesuai Tagihan)';
    if (activeBayarNotaObj) inputNominal.value = activeBayarNotaObj.totalNota;
  }
  hitungKalkulasiPembayaran();
}

function hitungKalkulasiPembayaran() {
  if (!activeBayarNotaObj) return;
  const tagihan = activeBayarNotaObj.totalNota;
  const bayar = parseFloat(document.getElementById('inputBayarNominal').value) || 0;

  const cust = pelangganData.find(p => p.nama.toLowerCase() === activeBayarNotaObj.namaPelanggan.toLowerCase());
  const saldoDep = cust ? cust.deposito : 0;

  let sisaTagihan = tagihan;
  if (saldoDep >= tagihan) {
    sisaTagihan = 0; // Tercover penuh oleh deposito
  } else if (saldoDep > 0) {
    sisaTagihan = tagihan - saldoDep; // Setelah potong deposito
  }

  const labelStatus = document.getElementById('labelKalkulasiStatus');
  const labelVal = document.getElementById('labelKalkulasiKembalianVal');

  if (activeMetodePembayaran === 'Tunai') {
    if (bayar >= sisaTagihan) {
      const kembalian = bayar - sisaTagihan;
      labelStatus.innerText = 'Kembalian:';
      labelStatus.style.color = '#10b981';
      labelVal.innerText = `Rp ${kembalian.toLocaleString('id-ID')}`;
    } else {
      const kurang = sisaTagihan - bayar;
      labelStatus.innerText = 'Status: KURANG (Menjadi DP / Belum Lunas)';
      labelStatus.style.color = '#b45309';
      labelVal.innerText = `Kurang Rp ${kurang.toLocaleString('id-ID')}`;
    }
  } else {
    labelStatus.innerText = `Status Pembayaran (${activeMetodePembayaran}):`;
    labelStatus.style.color = '#0284c7';
    labelVal.innerText = bayar >= sisaTagihan ? 'LUNAS' : 'DP / BELUM LUNAS';
  }
}

function eksekusiSimpanPembayaran() {
  if (!activeBayarNotaObj) return;
  const nota = activeBayarNotaObj;
  const tagihan = nota.totalNota;
  const bayar = parseFloat(document.getElementById('inputBayarNominal').value) || 0;

  const cust = pelangganData.find(p => p.nama.toLowerCase() === nota.namaPelanggan.toLowerCase());
  const saldoDep = cust ? cust.deposito : 0;

  let efektifBayar = bayar;
  let potongDep = 0;

  if (saldoDep >= tagihan) {
    potongDep = tagihan;
    cust.deposito -= tagihan;
    nota.statusBayar = 'Lunas';
    catatRiwayatNota(nota, `Bayar Nota ${nota.nota} lunas menggunakan Deposito (Potong Rp ${tagihan.toLocaleString('id-ID')})`);
  } else if (saldoDep > 0) {
    let sisaKurang = tagihan - saldoDep;
    if (bayar < sisaKurang && bayar < tagihan) {
      showNoticeToast('Pembayaran kurang dari sisa tagihan. Dicatat sebagai DP.');
      nota.statusBayar = 'DP';
    } else {
      potongDep = saldoDep;
      cust.deposito = 0;
      nota.statusBayar = (bayar >= sisaKurang) ? 'Lunas' : 'DP';
      catatRiwayatNota(nota, `Split Pembayaran Nota ${nota.nota}: Deposito Rp ${potongDep.toLocaleString('id-ID')} + ${activeMetodePembayaran} Rp ${bayar.toLocaleString('id-ID')}`);
    }
  } else {
    if (bayar >= tagihan) {
      nota.statusBayar = 'Lunas';
    } else {
      nota.statusBayar = 'DP';
    }
    catatRiwayatNota(nota, `Bayar Nota ${nota.nota} via ${activeMetodePembayaran} sebesar Rp ${bayar.toLocaleString('id-ID')} (${nota.statusBayar})`);
  }

  // Simpan ke local & Supabase (slot LOCKED tetap aman)
  try { localStorage.setItem('pelangganData', JSON.stringify(pelangganData)); } catch(e){}
  try { localStorage.setItem('antrianData', JSON.stringify(antrianData)); } catch(e){}
  if(window.syncPelangganToSupabase) window.syncPelangganToSupabase();
  if(window.syncAntrianToSupabase) window.syncAntrianToSupabase();

  updateSummaryCounters();
  hitungRingkasanKas();
  renderAntrianList(activeAntrianFilter);
  closeModalBayarNota();
  showNoticeToast(`Pembayaran Nota ${nota.nota} berhasil disimpan! Status: ${nota.statusBayar}`);

  // === INTEGRASI SLOT UNLOCKED: icon-Print & icon-ShareWA (v2.5.28-PELANGGAN-2ROW-ICONS-FIXED-SINGLE) ===
  // Row 5 sekarang punya aksi Print & Share WA setelah simpan
  setTimeout(()=>{
    const notaUntukCetak = nota;
    // Auto offer Print & Share WA karena slot unlocked
    if(confirm(`Nota ${nota.nota} ${nota.statusBayar}. Cetak struk & Share WA?`)){
      if(typeof window.printNotaThermal === 'function') window.printNotaThermal(notaUntukCetak);
      if(typeof window.shareNotaWA === 'function') window.shareNotaWA(notaUntukCetak);
      else if(typeof window.shareViaWA === 'function') window.shareViaWA(notaUntukCetak);
    }
  }, 400);

  switchPage('page-antrian');
}

/* Action dari Badge Status di Row 2 Antrian (Tap untuk memicu modal Bayar Nota) */
function toggleStatusBayar(notaId, event) {
  if (event) event.stopPropagation();
  openBayarNotaModal(notaId);
}

/* ============================================================================== */
/* MODUL SLOTS: icon-Print & icon-ShareWA (PREVIEW NOTA STRUK)                   */
/* ============================================================================== */

function actionPrintNota(notaId, event) {
  if (event) event.stopPropagation();
  openPreviewNotaModal(notaId, 'print');
}

function actionShareWANota(notaId, event) {
  if (event) event.stopPropagation();
  openPreviewNotaModal(notaId, 'share');
}


function openPreviewNotaModal(notaId, mode = 'preview') {
  const nota = antrianData.find(n => n.id === notaId);
  if (!nota) return;
  activePreviewNotaObj = nota;

  const activeOutlet = getActiveOutlet();
  const activeKaryawan = getActiveKaryawan();

  // Populate Thermal Canvas Struk Info
  document.getElementById('p_outlet_name').innerText = activeOutlet.nama.toUpperCase();
  document.getElementById('p_outlet_address').innerText = activeOutlet.alamat || 'Jl. Merdeka No. 12';
  document.getElementById('p_outlet_wa').innerText = `WA: ${activeOutlet.wa || '08123456789'}`;

  document.getElementById('p_nota_num').innerText = nota.nota;
  document.getElementById('p_nota_date').innerText = new Date().toLocaleDateString('id-ID');
  document.getElementById('p_customer_name').innerText = nota.namaPelanggan;
  document.getElementById('p_kasir_name').innerText = activeKaryawan.nama;

  const itemsContainer = document.getElementById('p_items_container');
  // === PER ROW JENIS LAYANAN - TIDAK DISAMBUNG ===
  let rowsHtml = '';
  if(nota.items && nota.items.length>0){
    rowsHtml = nota.items.map(function(it){
      const sub = (it.subtotal||0).toLocaleString('id-ID');
      const qty = `${it.qtyInput||''}${it.satuan||''}`;
      const harga = it.harga ? ` @Rp ${it.harga.toLocaleString('id-ID')}` : '';
      return `<div style="display:flex; flex-direction:column; gap:1px; padding:5px 0; border-bottom:1px dashed #bbb;">
        <div style="display:flex; justify-content:space-between; font-weight:700; font-size:11px;">
          <span>${it.nama}</span>
          <span>Rp ${sub}</span>
        </div>
        <div style="font-size:10px; color:#555; display:flex; justify-content:space-between;">
          <span>${qty}${harga}</span>
          <span>${it.estimasiVal||''} ${it.estimasiUnit||''}</span>
        </div>
      </div>`;
    }).join('');
  } else {
    // fallback jika items tidak ada - pecah dari string layanan
    const layananList = (nota.layanan||'Layanan Laundry').split(',').map(s=>s.trim()).filter(Boolean);
    rowsHtml = layananList.map(function(l){
      return `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #bbb; font-size:11px;"><span>${l}</span><span>-</span></div>`;
    }).join('');
    if(layananList.length===0){
      rowsHtml = `<div style="display:flex; justify-content:space-between;"><span>${nota.layanan || 'Layanan Laundry'}</span><span>Rp ${nota.totalNota.toLocaleString('id-ID')}</span></div>`;
    }
  }
  itemsContainer.innerHTML = rowsHtml;

  document.getElementById('p_grand_total').innerText = `Rp ${nota.totalNota.toLocaleString('id-ID')}`;
  document.getElementById('p_status_bayar').innerText = nota.statusBayar.toUpperCase();
  document.getElementById('p_status_proses').innerText = nota.statusProses.toUpperCase();

  const titleModal = document.getElementById('previewNotaTitle');
  if (titleModal) {
    titleModal.innerText = mode === 'print' ? `Preview Struk Cetak (${nota.nota})` : `Preview Struk Share WA (${nota.nota})`;
  }

  document.getElementById('modalPreviewNotaOverlay').classList.add('active');
}


function closeModalPreviewNota() {
  document.getElementById('modalPreviewNotaOverlay').classList.remove('active');
  activePreviewNotaObj = null;
}

function closeModalPreviewNotaOnBackdrop(e) {
  if (e.target.id === 'modalPreviewNotaOverlay') closeModalPreviewNota();
}

function executePrintFromPreview() {
  if (!activePreviewNotaObj) return;
  catatRiwayatNota(activePreviewNotaObj, `Cetak Thermal Struk ${activePreviewNotaObj.nota}`);
  showNoticeToast(`Mencetak Struk Nota ${activePreviewNotaObj.nota} via Thermal Printer...`);
}


function executeShareWAText(isBusiness = false) {
  if (!activePreviewNotaObj) return;
  const activeOutlet = getActiveOutlet();
  const pTarget = pelangganData.find(p => p.nama.toLowerCase() === activePreviewNotaObj.namaPelanggan.toLowerCase());
  const phone = pTarget && pTarget.wa ? pTarget.wa.replace(/[^0-9]/g, '') : '';

  // === LAYANAN PER ROW UNTUK WA ===
  let layananLines = '';
  if(activePreviewNotaObj.items && activePreviewNotaObj.items.length>0){
    layananLines = activePreviewNotaObj.items.map(function(it, idx){
      const sub = (it.subtotal||0).toLocaleString('id-ID');
      return `${idx+1}. ${it.nama} (${it.qtyInput}${it.satuan}) - Rp ${sub}`;
    }).join('\n');
  } else {
    const list = (activePreviewNotaObj.layanan||'').split(',').map(s=>s.trim()).filter(Boolean);
    layananLines = list.map(function(l,i){ return `${i+1}. ${l}`; }).join('\n');
    if(!layananLines) layananLines = activePreviewNotaObj.layanan;
  }

  const waMsg = `*-- NOTA TRANSAKSI ${activeOutlet.nama.toUpperCase()} --*\n` +
    `No. Nota: ${activePreviewNotaObj.nota}\n` +
    `Pelanggan: ${activePreviewNotaObj.namaPelanggan}\n` +
    `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n` +
    `----------------------\n` +
    `*Rincian Layanan (per row):*\n` +
    `${layananLines}\n` +
    `----------------------\n` +
    `Total Tagihan: Rp ${activePreviewNotaObj.totalNota.toLocaleString('id-ID')}\n` +
    `Status Bayar: *${activePreviewNotaObj.statusBayar}*\n` +
    `Status Proses: *${activePreviewNotaObj.statusProses}*\n\n` +
    `Terima kasih telah mempercayakan laundry Anda kepada kami! 🙏`;

  const encodedMsg = encodeURIComponent(waMsg);
  const waDomain = isBusiness ? "https://api.whatsapp.com/send" : "https://wa.me";
  const url = phone ? `${waDomain}/${phone}?text=${encodedMsg}` : `${waDomain}?text=${encodedMsg}`;

  catatRiwayatNota(activePreviewNotaObj, `Kirim Teks Struk WA ${activePreviewNotaObj.nota}`);
  window.open(url, '_blank');
  showNoticeToast(`Membuka WhatsApp (${isBusiness ? 'Bisnis' : 'Personal'})...`);
}


function executeShareWAPNG(isBusiness) {
  if (!activePreviewNotaObj) return;
  // FIX: Pilih canvas sesuai mode
  var mode = (typeof strukPrintMode!=='undefined') ? strukPrintMode : 'text';
  var elementId = mode==='ios' ? 'notaPrintCanvasAreaIOS' : 'notaPrintCanvasArea';
  var element = document.getElementById(elementId);
  if(!element) element = document.getElementById('notaPrintCanvasArea');
  if (!element) return;

  showNoticeToast('Rendering ' + (mode==='ios'?'Gambar iOS':'Text Nota') + ' ke PNG...');

  var bgColor = mode==='ios' ? null : "#ffffff";
  html2canvas(element, { scale: 2, backgroundColor: bgColor, useCORS:true, allowTaint:true }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Struk-${activePreviewNotaObj.nota.replace('#', '')}-${mode==='ios'?'iOS':'Text'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    if(typeof catatRiwayatNota==='function') catatRiwayatNota(activePreviewNotaObj, `Download Gambar PNG ${mode} Struk ${activePreviewNotaObj.nota}`);
    showNoticeToast('✅ PNG ' + (mode==='ios'?'iOS #f618a9':'Text') + ' berhasil! Mode: ' + mode);
  }).catch(err => {
    showNoticeToast('Gagal merender PNG: ' + err.message);
    console.error(err);
  });
}

// Override WA image to use mode correctly
var _origSendWAImage = window.sendWAImage;
window.sendWAImage = async function(nota, isBusiness){
  if(!nota) return;
  var mode = (typeof strukPrintMode!=='undefined') ? strukPrintMode : 'text';
  var elementId = mode==='ios' ? 'notaPrintCanvasAreaIOS' : 'notaPrintCanvasArea';
  var element = document.getElementById(elementId);
  if(!element) element = document.getElementById('notaPrintCanvasArea');
  if(!element) return;
  
  var pTarget = (typeof pelangganData!=='undefined') ? pelangganData.find(p=>p.nama.toLowerCase()===nota.namaPelanggan.toLowerCase()) : null;
  var wa = pTarget ? pTarget.wa : '';
  
  if(isBusiness){
    var saved = typeof isContactSaved==='function' ? await isContactSaved(wa) : false;
    if(!saved && pTarget && !pTarget.simpanKontak){
      if(confirm('WA Bisnis butuh kontak untuk kirim gambar. Simpan kontak '+nota.namaPelanggan+'?')){
        if(typeof saveToDeviceContact==='function') await saveToDeviceContact(nota.namaPelanggan, wa);
      }
    }
  }
  
  try{
    var bgColor = mode==='ios' ? null : "#ffffff";
    const canvas = await html2canvas(element, {scale:2, backgroundColor:bgColor, useCORS:true});
    canvas.toBlob(async function(blob){
      const fileName = `Struk-${nota.nota.replace('#','')}-${mode==='ios'?'iOS':'Text'}.png`;
      const file = new File([blob], fileName, {type:'image/png'});
      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{ await navigator.share({files:[file], title:fileName, text:`Nota ${nota.nota} - ${nota.namaPelanggan}`}); if(typeof showNoticeToast==='function') showNoticeToast('✅ Gambar '+mode+' dishare ke WA'+(isBusiness?' Bisnis':'')); return; }catch(e){}
      }
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=fileName; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      var phone=wa?wa.replace(/[^0-9]/g,''):''; var waDomain=isBusiness?'https://api.whatsapp.com/send':'https://wa.me'; var waUrl=phone?`${waDomain}/${phone}?text=${encodeURIComponent('Berikut nota '+nota.nota+' ('+mode+' sudah didownload)')}`:`${waDomain}?text=${encodeURIComponent('Nota '+nota.nota)}`; setTimeout(()=>window.open(waUrl,'_blank'),800);
      if(typeof showNoticeToast==='function') showNoticeToast('📥 PNG '+mode+' didownload, attach di WA');
    },'image/png');
  }catch(e){ console.log('WA Image error', e); }
};


/* Header Dropdown Outlet */
function toggleHeaderOutletDropdown() {
  const dropdown = document.getElementById('headerOutletDropdown');
  if (dropdown) { dropdown.classList.toggle('active'); if (dropdown.classList.contains('active')) renderHeaderOutletDropdown(); }
}

function renderHeaderOutletDropdown() {
  const dropdown = document.getElementById('headerOutletDropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '';

  outletsData.forEach(o => {
    const card = document.createElement('div');
    card.className = `outlet-item-card ${o.isActive ? 'active-outlet' : ''}`;
    card.onclick = () => { setActiveOutlet(o.id); dropdown.classList.remove('active'); };
    card.innerHTML = `
      <span style="font-size: 12px; font-weight: 800; color: #111;">${o.nama}</span>
      ${o.isActive ? '<span class="active-badge" style="margin:0;">Aktif</span>' : '<span style="font-size: 9px; font-weight: 700; color: #666; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">Pilih</span>'}
    `;
    dropdown.appendChild(card);
  });
}

/* System Logging */
function catatRiwayatNota(nota, tindakan) {
  const activeKaryawan = getActiveKaryawan();
  const now = new Date();
  const jamWib = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  
  riwayatNotaData.unshift({
    id: 'riwayat-' + Date.now(),
    outletId: nota.outletId || getActiveOutlet().id,
    nota: nota.nota,
    namaPelanggan: nota.namaPelanggan,
    tindakan: tindakan,
    kasir: activeKaryawan ? activeKaryawan.nama : 'Kasir Utama',
    waktu: jamWib
  });
}

function hitungRingkasanKas() {
  const activeOutlet = getActiveOutlet();
  let totalTunai = 0, totalNonTunai = 0, totalOmzet = 0;
  
  antrianData.filter(n => n.outletId === activeOutlet.id || !n.outletId).forEach(n => {
    totalOmzet += n.totalNota;
    if (n.statusBayar === 'Lunas') {
      totalTunai += n.totalNota;
    }
  });

  let totalPengeluaran = pengeluaranKasData.filter(p => p.outletId === activeOutlet.id || !p.outletId).reduce((acc, curr) => acc + curr.nominal, 0);
  let totalDeposito = pelangganData.filter(p => p.outletId === activeOutlet.id || !p.outletId).reduce((acc, curr) => acc + curr.deposito, 0);
  let selisih = (totalTunai + totalNonTunai) - totalPengeluaran;

  // Update Home Dropdown Kas
  if (document.getElementById('val-kas-tunai')) document.getElementById('val-kas-tunai').innerText = `Rp ${totalTunai.toLocaleString('id-ID')}`;
  if (document.getElementById('val-kas-nontunai')) document.getElementById('val-kas-nontunai').innerText = `Rp ${totalNonTunai.toLocaleString('id-ID')}`;
  if (document.getElementById('val-kas-pengeluaran')) document.getElementById('val-kas-pengeluaran').innerText = `Rp ${totalPengeluaran.toLocaleString('id-ID')}`;
  if (document.getElementById('val-kas-selisih')) document.getElementById('val-kas-selisih').innerText = `Rp ${selisih.toLocaleString('id-ID')}`;
  if (document.getElementById('val-kas-deposito')) document.getElementById('val-kas-deposito').innerText = `Rp ${totalDeposito.toLocaleString('id-ID')}`;
  if (document.getElementById('val-omzet-hari-ini')) document.getElementById('val-omzet-hari-ini').innerText = `Rp ${totalOmzet.toLocaleString('id-ID')}`;

  // Update Halaman Laporan Row 1 (Ringkasan Keuangan Hari Ini)
  if (document.getElementById('rep-omzet')) document.getElementById('rep-omzet').innerText = `Rp ${totalOmzet.toLocaleString('id-ID')}`;
  if (document.getElementById('rep-tunai')) document.getElementById('rep-tunai').innerText = `Rp ${totalTunai.toLocaleString('id-ID')}`;
  if (document.getElementById('rep-nontunai')) document.getElementById('rep-nontunai').innerText = `Rp ${(totalNonTunai + totalDeposito).toLocaleString('id-ID')}`;
  if (document.getElementById('rep-pengeluaran')) document.getElementById('rep-pengeluaran').innerText = `Rp ${totalPengeluaran.toLocaleString('id-ID')}`;
}

function switchGrafikTab(type, el) {
  document.querySelectorAll('#page-laporan .badge-status-label').forEach(b => {
    if (b.innerText === 'Harian' || b.innerText === 'Mingguan' || b.innerText === 'Bulanan') {
      b.classList.remove('active');
    }
  });
  if (el) el.classList.add('active');

  const labelPeriode = document.getElementById('grafik-periode-label');
  const labelTotal = document.getElementById('grafik-total-val');
  const container = document.getElementById('grafikBarsContainer');

  if (type === 'Harian') {
    if (labelPeriode) labelPeriode.innerText = 'Periode: Hari Ini';
    if (labelTotal) labelTotal.innerText = 'Rp 30.000';
    if (container) container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 32px; background: #f618a9; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">30rb</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 18px; background: rgba(246,24,169,0.4); border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">15rb</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 42px; background: #f618a9; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">45rb</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 24px; background: rgba(246,24,169,0.4); border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">20rb</span></div>
    `;
  } else if (type === 'Mingguan') {
    if (labelPeriode) labelPeriode.innerText = 'Periode: Minggu Ini';
    if (labelTotal) labelTotal.innerText = 'Rp 210.000';
    if (container) container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 25px; background: #0284c7; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">Sen</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 35px; background: #0284c7; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">Sel</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 20px; background: rgba(2,132,199,0.4); border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">Rab</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 45px; background: #0284c7; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">Kam</span></div>
    `;
  } else if (type === 'Bulanan') {
    if (labelPeriode) labelPeriode.innerText = 'Periode: Bulan Ini';
    if (labelTotal) labelTotal.innerText = 'Rp 1.250.000';
    if (container) container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 20px; background: #10b981; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">M1</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 35px; background: #10b981; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">M2</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 48px; background: #10b981; border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">M3</span></div>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1;"><div style="width: 12px; height: 30px; background: rgba(16,185,129,0.4); border-radius: 3px;"></div><span style="font-size: 8px; font-weight: 700; color: #444;">M4</span></div>
    `;
  }
}

function openModalPengeluaranKas() {
  document.getElementById('inputKeteranganPengeluaran').value = '';
  document.getElementById('inputNominalPengeluaran').value = '';
  document.getElementById('modalPengeluaranOverlay').classList.add('active');
}

function closeModalPengeluaranKas() { document.getElementById('modalPengeluaranOverlay').classList.remove('active'); }
function closeModalPengeluaranKasOnBackdrop(e) { if (e.target.id === 'modalPengeluaranOverlay') closeModalPengeluaranKas(); }

function simpanPengeluaranKas() {
  const activeOutlet = getActiveOutlet();
  const ket = document.getElementById('inputKeteranganPengeluaran').value.trim();
  const nominal = parseFloat(document.getElementById('inputNominalPengeluaran').value) || 0;

  if (!ket) { showNoticeToast('Keterangan pengeluaran wajib diisi'); return; }
  if (nominal <= 0) { showNoticeToast('Nominal pengeluaran harus lebih besar dari 0'); return; }

  pengeluaranKasData.push({ id: 'p' + Date.now(), outletId: activeOutlet.id, keterangan: ket, nominal: nominal });
  hitungRingkasanKas();
  closeModalPengeluaranKas();
  showNoticeToast(`Pengeluaran Kas Rp ${nominal.toLocaleString('id-ID')} (${ket}) berhasil dicatat.`);
}

/* Detail Nota Functions */
function openModalDetailNota(notaId) {
  const item = antrianData.find(n => n.id === notaId);
  if (!item) return;
  activeDetailNotaId = notaId;

  document.getElementById('detailNotaTitle').innerText = `Detail Nota ${item.nota}`;
  document.getElementById('detailNotaPelanggan').innerText = item.namaPelanggan;
  document.getElementById('detailNotaLayanan').innerHTML = (item.items && item.items.length>0) ? item.items.map(function(it){ return `<div style='padding:2px 0; border-bottom:1px dashed #eee;'>• ${it.nama} (${it.qtyInput}${it.satuan}) - Rp ${(it.subtotal||0).toLocaleString('id-ID')}</div>`; }).join('') : (item.layanan||'-');
  document.getElementById('detailNotaEstimasi').innerText = item.estimasiFormatted || item.estimasi || '-';
  document.getElementById('detailNotaTotal').innerText = `Rp ${item.totalNota.toLocaleString('id-ID')}`;
  document.getElementById('detailNotaStatusProses').innerText = item.statusProses;
  document.getElementById('detailNotaStatusBayar').innerText = item.statusBayar;

  const btnBayarLabel = document.getElementById('labelBtnBayarDetail');
  if (item.statusBayar === 'Lunas') {
    btnBayarLabel.innerText = 'Lunasi Ulang / Ubah Pembayaran';
  } else {
    btnBayarLabel.innerText = 'Bayar / Lunasi Nota';
  }

  document.getElementById('modalDetailNotaOverlay').classList.add('active');
}

function closeModalDetailNota() {
  document.getElementById('modalDetailNotaOverlay').classList.remove('active');
  activeDetailNotaId = null;
}

function closeModalDetailNotaOnBackdrop(e) {
  if (e.target.id === 'modalDetailNotaOverlay') closeModalDetailNota();
}

function cycleStatusProses(notaId, event){
  if(event) event.stopPropagation();
  var item=antrianData.find(function(n){return n.id===notaId;});
  if(!item) return;
  if(item.statusProses==='Siap Ambil'){
    var b=(item.statusBayar||'').toLowerCase();
    if(!(b==='lunas'||b==='hutang')){activeNotaPendingId=notaId;openModalNoticePeringatan(item);return;}
  }
  var statuses=['Antrian','Proses','Siap Ambil','Selesai'];
  var idx=statuses.indexOf(item.statusProses);
  if(idx===-1||idx===statuses.length-1) item.statusProses=statuses[0]; else item.statusProses=statuses[idx+1];
  catatRiwayatNota(item,'Ubah status jadi '+item.statusProses);
  updateSummaryCounters();
  renderAntrianList(activeAntrianFilter);
  hitungRingkasanKas();
  showNoticeToast('Status '+item.nota+' jadi '+item.statusProses);
}

function cycleStatusProsesDirect(notaId) {
  const item = antrianData.find(n => n.id === notaId);
  if (!item) return;
  const statuses = ['Antrian', 'Proses', 'Siap Ambil', 'Selesai'];
  let idx = statuses.indexOf(item.statusProses);
  if (idx === -1 || idx === statuses.length - 1) item.statusProses = statuses[0];
  else item.statusProses = statuses[idx + 1];
  catatRiwayatNota(item, `Ubah status proses menjadi ${item.statusProses}`);
  updateSummaryCounters();
  renderAntrianList(activeAntrianFilter);
  hitungRingkasanKas();
  showNoticeToast(`Status ${item.nota} diubah ke ${item.statusProses}`);
}



function getEstimasiTimeStatus(s){
  if(!s) return {badgeLabel:'On Time',badgeClass:'st-antrian',display:''};
  var now=Date.now(); var et=NaN; var d=new Date(s); if(!isNaN(d.getTime())) et=d.getTime();
  if(isNaN(et)){try{var toks=String(s).split(/[- :]/); if(toks.length>=5){var day=parseInt(toks[0]),mon=parseInt(toks[1])-1,yr=parseInt(toks[2]),hr=parseInt(toks[3]),mn=parseInt(toks[4]); if(yr<100) yr+=2000; var dd=new Date(yr,mon,day,hr,mn); if(!isNaN(dd.getTime())) et=dd.getTime();}}catch(e){}}
  if(isNaN(et)) return {badgeLabel:'On Time',badgeClass:'st-antrian',display:s};
  var diffH=(et-now)/(1000*60*60); var badge='On Time',cls='st-antrian';
  if(diffH<0){badge='Terlambat';cls='st-terlambat-red';} else if(diffH<=6){badge='Deadline';cls='st-deadline-orange';}
  var display=s; if(String(s).indexOf('T')>-1){var dd=new Date(et);function pad(n){return String(n).padStart(2,'0');} display=pad(dd.getDate())+'-'+pad(dd.getMonth()+1)+'-'+String(dd.getFullYear()).slice(-2)+' '+pad(dd.getHours())+':'+pad(dd.getMinutes());}
  return {badgeLabel:badge,badgeClass:cls,display:display};
}
function renderRowEstimasiSubCard(item){
  var raw=item.estimasiFormatted||item.estimasi||'';
  var info=getEstimasiTimeStatus(item.estimasiISO||raw);
  return '<div class="antrian-card-row-estimasi"><span style="font-size:11px;font-weight:800;">Estimasi: '+(info.display||raw)+'</span><span class="badge-status '+info.badgeClass+'">'+info.badgeLabel+'</span></div>';
}
function openModalNoticePeringatan(nota){
  var el=document.getElementById('noticePeringatanText'); if(el) el.innerText='Nota '+nota.nota+' belum lunas. Pilih Hutang atau Bayar.';
  var ov=document.getElementById('modalNoticePeringatanBelumLunasOverlay'); if(ov) ov.classList.add('active');
}
function closeModalNoticePeringatan(){var ov=document.getElementById('modalNoticePeringatanBelumLunasOverlay'); if(ov) ov.classList.remove('active'); activeNotaPendingId=null;}
function prosesHutangNota(e){if(e){e.preventDefault();e.stopPropagation();} if(!activeNotaPendingId) return; var nota=antrianData.find(function(n){return n.id===activeNotaPendingId;}); if(nota){nota.statusBayar='Hutang';nota.statusProses='Selesai';catatRiwayatNota(nota,'Hutang & Selesai');showNoticeToast(nota.nota+' Hutang Selesai');renderAntrianList(activeAntrianFilter);updateSummaryCounters();hitungRingkasanKas();} closeModalNoticePeringatan();}
function lanjutkanBayarDariNotice(e){if(e){e.preventDefault();e.stopPropagation();} var id=activeNotaPendingId; closeModalNoticePeringatan(); if(id) setTimeout(function(){openBayarNotaModal(id);},150);}

function cycleStatusDetailNota() {
  if (!activeDetailNotaId) return;
  cycleStatusProses(activeDetailNotaId);
  openModalDetailNota(activeDetailNotaId);
}

function hapusNotaAktifDetail() {
  if (!activeDetailNotaId) return;
  const notaId = activeDetailNotaId;
  closeModalDetailNota();
  const nota = antrianData.find(n => n.id === notaId);
  if (nota) {
    confirmHapusData('nota', nota.id, nota.nota);
  }
}

/* Pembuatan Nota Baru Sub-Cards */
function openModalNota() { 
  currentNotaPelanggan = null;
  currentNotaItems = [];
  document.getElementById('labelSelectedPelangganNota').innerText = 'Belum Dipilih ▾';
  renderRincianNotaSubCards();
  document.getElementById('modalNotaOverlay').classList.add('active'); 
}

function closeModalNota() { document.getElementById('modalNotaOverlay').classList.remove('active'); }
function closeModalNotaOnBackdrop(e) { if (e.target.id === 'modalNotaOverlay') closeModalNota(); }

function openPelangganPickerForNota() {
  isPelangganPickerForNota = true;
  const modalPelanggan = document.getElementById('modalPelangganOverlay');
  document.getElementById('modalPelangganHeaderTitle').innerText = 'Pilih Pelanggan Nota';
  modalPelanggan.classList.add('picker-mode');
  renderPelangganList();
  modalPelanggan.classList.add('active');
}

function selectPelangganTargetNota(pelangganId) {
  const p = pelangganData.find(item => item.id === pelangganId);
  if (p) {
    currentNotaPelanggan = p;
    const infoSaldo = p.deposito > 0 ? ` (Saldo: Rp ${p.deposito.toLocaleString('id-ID')})` : '';
    document.getElementById('labelSelectedPelangganNota').innerText = `${p.nama}${infoSaldo}`;
    showNoticeToast(`Pelanggan terpilih: ${p.nama}`);
  }
  closeModalPelanggan();
}

function closeModalPelanggan() { 
  const modalPelanggan = document.getElementById('modalPelangganOverlay');
  modalPelanggan.classList.remove('active', 'picker-mode');
  isPelangganPickerForNota = false;
}

function openLayananPickerForNota() {
  isLayananPickerForNota = true;
  const modalLayanan = document.getElementById('modalLayananOverlay');
  document.getElementById('modalLayananHeaderTitle').innerText = 'Pilih Jenis Layanan Nota';
  document.getElementById('formLayananBox').style.display = 'none';
  modalLayanan.classList.add('picker-mode');
  renderLayananList();
  modalLayanan.classList.add('active');
}

function closeModalLayanan() { 
  const modalLayanan = document.getElementById('modalLayananOverlay');
  modalLayanan.classList.remove('active', 'picker-mode');
  isLayananPickerForNota = false;
}

function addLayananToNotaRincian(layananId) {
  const l = layananData.find(item => item.id === layananId);
  if (!l) return;

  const existingItemIndex = currentNotaItems.findIndex(i => i.layananId === l.id);

  if (existingItemIndex > -1) {
    let currentQtyNum = parseFloat((currentNotaItems[existingItemIndex].qtyInput || '0').replace(',', '.')) || 0;
    currentQtyNum += 1;
    currentNotaItems[existingItemIndex].qtyInput = currentQtyNum.toString();
    showNoticeToast(`Qty ${l.nama} ditambah menjadi ${currentQtyNum} ${l.satuan}`);
  } else {
    const initialQty = (l.minKg && l.minKg > 0) ? l.minKg : 1;
    currentNotaItems.push({
      layananId: l.id,
      nama: l.nama,
      kode: l.kode,
      harga: l.harga,
      satuan: l.satuan,
      minKg: l.minKg || 0,
      estimasiVal: l.estimasiVal || 1,
      estimasiUnit: l.estimasiUnit || 'Jam',
      qtyInput: initialQty.toString()
    });
    showNoticeToast(`${l.nama} ditambahkan ke Rincian Nota.`);
  }

  renderRincianNotaSubCards();
  closeModalLayanan();
}

/* Render Sub Cards Rincian Nota */
function renderRincianNotaSubCards() {
  const container = document.getElementById('rincianNotaContainer');
  if (!container) return;
  container.innerHTML = '';

  const labelBadgeTotal = document.getElementById('labelTotalJumlahItemNota');
  if (labelBadgeTotal) {
    labelBadgeTotal.innerText = `${currentNotaItems.length} Item`;
  }

  if (currentNotaItems.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: #666; text-align: center; padding: 12px; background: rgba(255,255,255,0.45); border-radius: 10px; border: 1.5px dashed rgba(0,0,0,0.15);">Belum ada jenis layanan dipilih. Tap "+ Tambah Jenis Layanan" diatas.</div>`;
    updateGrandTotalNota();
    return;
  }

  currentNotaItems.forEach((item, index) => {
    const normalizedQtyStr = (item.qtyInput || '0').replace(',', '.');
    const rawQty = parseFloat(normalizedQtyStr) || 0;
    
    let effectiveQty = rawQty;
    let isUnderMin = false;

    if (item.minKg > 0 && rawQty > 0 && rawQty < item.minKg) {
      effectiveQty = item.minKg;
      isUnderMin = true;
    }

    const subtotal = item.harga * effectiveQty;
    item.subtotal = subtotal;

    const subCard = document.createElement('div');
    subCard.className = 'subcard-item-nota border-1-glass-blur rounded-12';
    subCard.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 3px; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0 2px;">
          <span style="font-size: 10px; font-weight: 800; color: #f618a9;">Item / Jenis Layanan:</span>
          <span class="tap-model" onclick="removeNotaItem(${index})" style="color: #dc2626; font-weight: bold; font-size: 16px; cursor: pointer; padding: 0 4px; line-height: 1;" title="Hapus Item">&times;</span>
        </div>
        
        <div class="subcard-row1 border-1-glass-blur rounded-12" style="background: rgba(255,255,255,0.75);">
          <span style="font-size: 11.5px; font-weight: 800; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${item.nama}</span>
          <span style="font-size: 11px; font-weight: 800; color: #10b981; flex-shrink: 0;">Rp ${item.harga.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="subcard-row2 border-1-glass-blur rounded-12">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 10px; font-weight: 800; color: #333;">Qty (${item.satuan}):</span>
          <input type="text" inputmode="decimal" class="input-field" value="${item.qtyInput}" oninput="handleQtyChange(${index}, this.value)" style="background: rgba(255,255,255,0.85); padding: 2px 6px; border-radius: 6px; font-size: 12px; font-weight: 800; width: 80px; text-align: center; border: 1.5px solid rgba(0,0,0,0.15);">
        </div>
        <div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
          <span style="font-size: 10px; font-weight: 800; color: #333;">Sub total:</span>
          <span style="font-size: 13px; font-weight: 900; color: #10b981;" id="subtotal-val-${index}">Rp ${subtotal.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div class="subcard-row3">
        <span style="display: flex; align-items: center; gap: 4px; font-weight: 700;">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: #333;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Estimasi ${item.estimasiVal} ${item.estimasiUnit}
        </span>
        <span id="notice-val-${index}" class="${isUnderMin ? 'notice-blink' : ''}" style="display: flex; align-items: center; gap: 4px; ${isUnderMin ? 'color: #dc2626; font-weight: 800;' : 'font-weight: 700; color: #333;'}">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: ${isUnderMin ? '#dc2626' : '#333'};">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Minimal Berat ${item.minKg > 0 ? item.minKg + ' Kg' : '-'} ${isUnderMin ? '(Kena Tariff Min)' : ''}
        </span>
      </div>
    `;
    container.appendChild(subCard);
  });

  updateGrandTotalNota();
}

function handleQtyChange(index, valStr) {
  const item = currentNotaItems[index];
  if (!item) return;

  item.qtyInput = valStr;
  const normalized = valStr.replace(',', '.');
  const rawQty = parseFloat(normalized) || 0;

  let effectiveQty = rawQty;
  let isUnderMin = false;

  if (item.minKg > 0 && rawQty > 0 && rawQty < item.minKg) {
    effectiveQty = item.minKg;
    isUnderMin = true;
  }

  item.subtotal = item.harga * effectiveQty;

  const subtotalEl = document.getElementById(`subtotal-val-${index}`);
  if (subtotalEl) {
    subtotalEl.innerText = `Rp ${item.subtotal.toLocaleString('id-ID')}`;
  }

  const noticeEl = document.getElementById(`notice-val-${index}`);
  if (noticeEl) {
    if (isUnderMin) {
      noticeEl.className = 'notice-blink';
      noticeEl.style.color = '#dc2626';
      noticeEl.style.fontWeight = '800';
    } else {
      noticeEl.className = '';
      noticeEl.style.color = '#333';
      noticeEl.style.fontWeight = '700';
    }
    noticeEl.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: ${isUnderMin ? '#dc2626' : '#333'};">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      Minimal Berat ${item.minKg > 0 ? item.minKg + ' Kg' : '-'} ${isUnderMin ? '(Kena Tariff Min)' : ''}
    `;
  }

  updateGrandTotalNota();
}

function removeNotaItem(index) {
  currentNotaItems.splice(index, 1);
  renderRincianNotaSubCards();
}

function updateGrandTotalNota() {
  const grandTotal = currentNotaItems.reduce((acc, curr) => acc + (curr.subtotal || 0), 0);
  const labelGrand = document.getElementById('labelNotaTotalGrand');
  if (labelGrand) labelGrand.innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
}

function simpanNotaBaru(){
  var activeOutlet=getActiveOutlet();
  if(!currentNotaPelanggan){showNoticeToast('Pilih pelanggan dulu');return;}
  if(currentNotaItems.length===0){showNoticeToast('Pilih layanan dulu');return;}
  var grandTotal=currentNotaItems.reduce(function(a,c){return a+(c.subtotal||0);},0);
  var newNotaNum='#NT-'+(1000+antrianData.length+1);
  var layananSummaryStr=currentNotaItems.map(function(it){return it.nama+' ('+it.qtyInput+it.satuan+')';}).join(', ');
  var now=new Date();
  var maxMs=0;
  currentNotaItems.forEach(function(it){
    var v=parseFloat(it.estimasiVal)||1;
    var u=(it.estimasiUnit||'Jam').toLowerCase();
    var ms=u.indexOf('hari')>-1?v*24*60*60*1000:v*60*60*1000;
    if(ms>maxMs)maxMs=ms;
  });
  var estimasiDate=new Date(now.getTime()+maxMs);
  function pad(n){return String(n).padStart(2,'0');}
  var estimasiFormatted=pad(estimasiDate.getDate())+'-'+pad(estimasiDate.getMonth()+1)+'-'+String(estimasiDate.getFullYear()).slice(-2)+' '+pad(estimasiDate.getHours())+':'+pad(estimasiDate.getMinutes());
  var newNota={id:'nota-'+Date.now(),outletId:activeOutlet.id,nota:newNotaNum,namaPelanggan:currentNotaPelanggan.nama,totalNota:grandTotal,statusProses:'Antrian',statusBayar:'Belum Lunas',layanan:layananSummaryStr,estimasi:estimasiFormatted,estimasiFormatted:estimasiFormatted,estimasiISO:estimasiDate.toISOString(),tglEstimasi:estimasiDate.toISOString(),tanggal:now.toISOString(),kasir:getActiveKaryawan()?getActiveKaryawan().nama:'Kasir Utama',items:JSON.parse(JSON.stringify(currentNotaItems))};
  antrianData.unshift(newNota);
  catatRiwayatNota(newNota,'Membuat Nota Baru Estimasi '+estimasiFormatted);
  updateSummaryCounters();
  hitungRingkasanKas();
  closeModalNota();
  switchPage('page-antrian');
  renderAntrianList(activeAntrianFilter);
  showNoticeToast('Nota '+newNotaNum+' Estimasi '+estimasiFormatted);
}

/* Master Data Pelanggan */
function openModalPelanggan() { 
  isPelangganPickerForNota = false; 
  document.getElementById('modalPelangganHeaderTitle').innerText = 'Master Data Pelanggan';
  renderPelangganList(); 
  document.getElementById('modalPelangganOverlay').classList.add('active'); 
}

function closeModalPelangganOnBackdrop(e) { if (e.target.id === 'modalPelangganOverlay') closeModalPelanggan(); }
function filterPelangganList() { const query = document.getElementById('searchPelanggan').value.toLowerCase().trim(); renderPelangganList(query); }

function renderPelangganList(filterQuery = '') {
  const container = document.getElementById('customerListContainer');
  if (!container) return;
  container.innerHTML = '';
  
  const activeOutlet = getActiveOutlet();
  const listP = pelangganData.filter(p => (p.outletId === activeOutlet.id || !p.outletId) && p.nama.toLowerCase().includes(filterQuery));

  if (listP.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: #666; text-align: center; padding: 10px;">Tidak ada data pelanggan di ${activeOutlet.nama}.</div>`;
    return;
  }

  listP.forEach(p => {
    const card = document.createElement('div');
    card.className = 'customer-card-item border-3-glass-blur rounded-12';
    const onSelectAction = isPelangganPickerForNota ? `selectPelangganTargetNota('${p.id}')` : `openSubModalTambahPelanggan('${p.id}')`;

    card.innerHTML = `
      <!-- ROW 1: Nama + Deposito -->
      <div class="customer-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="${onSelectAction}" style="cursor: pointer; display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
        <span style="font-weight: 800; font-size: 13px; color: #111; flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.nama}</span>
        <span style="font-weight: 800; font-size: 12px; color: #10b981; flex-shrink:0; margin-left:8px;">Rp ${p.deposito.toLocaleString('id-ID')}</span>
      </div>
      <!-- ROW 2: ICONS ONLY - Edit, Hapus, Tambah Deposito, Edit Deposito -->
      <div class="customer-card-row2" style="display:flex; align-items:center; justify-content:space-around; padding:6px 8px; background:rgba(255,255,255,0.4); border-radius:8px; margin-top:2px;">
        <div class="tap-model" onclick="openSubModalTambahPelanggan('${p.id}')" style="width:32px; height:32px; border-radius:50%; background:rgba(2,132,199,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Edit">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#0284c7; stroke-width:2; fill:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </div>
        <div class="tap-model" onclick="confirmHapusData('pelanggan', '${p.id}', '${p.nama}')" style="width:32px; height:32px; border-radius:50%; background:rgba(220,38,38,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Hapus">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#dc2626; stroke-width:2; fill:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </div>
        <div class="tap-model" onclick="openSubModalIsiDeposito('${p.id}', 'tambah')" style="width:32px; height:32px; border-radius:50%; background:rgba(16,185,129,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Tambah Deposito">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#10b981; stroke-width:2; fill:none;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
        <div class="tap-model" onclick="openSubModalIsiDeposito('${p.id}', 'edit')" style="width:32px; height:32px; border-radius:50%; background:rgba(245,158,11,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer;" title="Edit Deposito">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#f59e0b; stroke-width:2; fill:none;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function openSubModalTambahPelanggan(pelangganId = null) {
  editingPelangganId = pelangganId;
  const titleForm = document.getElementById('title-form-pelanggan');
  
  if (pelangganId) {
    const p = pelangganData.find(item => item.id === pelangganId);
    if (p) {
      document.getElementById('inputNamaPelanggan').value = p.nama;
      document.getElementById('inputWaPelanggan').value = p.wa || '';
      document.getElementById('checkTanpaWa').checked = p.tanpaWa || false;
      document.getElementById('checkSimpanKontak').checked = p.simpanKontak || false;
      document.getElementById('inputAlamatPelanggan').value = p.alamat || '';
      toggleTanpaWa(document.getElementById('checkTanpaWa'));
    }
    if (titleForm) titleForm.innerText = 'Edit Data Pelanggan';
  } else {
    document.getElementById('inputNamaPelanggan').value = '';
    document.getElementById('inputWaPelanggan').value = '';
    document.getElementById('checkTanpaWa').checked = false;
    document.getElementById('checkSimpanKontak').checked = true;
    document.getElementById('inputAlamatPelanggan').value = '';
    toggleTanpaWa(document.getElementById('checkTanpaWa'));
    if (titleForm) titleForm.innerText = 'Tambah Data Pelanggan';
  }
  document.getElementById('subModalTambahPelangganOverlay').classList.add('active');
}

function closeSubModalPelanggan() { document.getElementById('subModalTambahPelangganOverlay').classList.remove('active'); }
function closeSubModalPelangganOnBackdrop(e) { if (e.target.id === 'subModalTambahPelangganOverlay') closeSubModalPelanggan(); }

function toggleTanpaWa(checkbox) {
  const inputWa = document.getElementById('inputWaPelanggan');
  if (checkbox.checked) { inputWa.value = ''; inputWa.disabled = true; }
  else inputWa.disabled = false;
}

function simpanPelanggan() {
  const activeOutlet = (typeof getActiveOutlet === 'function') ? getActiveOutlet() : {id:'outlet-1'};
  const nama = document.getElementById('inputNamaPelanggan')?.value.trim() || '';
  const wa = document.getElementById('inputWaPelanggan')?.value.trim() || '';
  const tanpaWa = document.getElementById('checkTanpaWa')?.checked || false;
  const simpanKontak = document.getElementById('checkSimpanKontak')?.checked || false;
  const alamat = document.getElementById('inputAlamatPelanggan')?.value.trim() || '';
  if (!nama) { if(window.showNoticeToast) showNoticeToast('Nama tidak boleh kosong'); return; }
  let target = null;
  if (window.editingPelangganId) {
    const p = window.pelangganData.find(x=>x.id===window.editingPelangganId);
    if(p){ p.nama=nama; p.wa=wa; p.alamat=alamat; p.tanpaWa=tanpaWa; p.simpanKontak=simpanKontak; p.outlet_id=activeOutlet.id; target=p; }
  } else {
    target = { id:'pelanggan-'+Date.now(), outlet_id:activeOutlet.id, outletId:activeOutlet.id, nama:nama, wa:wa, alamat:alamat, deposito:0, is_active:true, tanpaWa:tanpaWa, simpanKontak:simpanKontak };
    window.pelangganData.push(target);
    if(window.isPelangganPickerForNota) window.selectPelangganTargetNota(target.id);
  }
  try{ localStorage.setItem('pelangganData', JSON.stringify(window.pelangganData)); }catch(e){}
  if(window.StorageManager && window.StorageManager.saveToSupaAndLS){
    window.StorageManager.saveToSupaAndLS('pelanggan', target).then(r=>{ if(r.ok) showNoticeToast('✅ Supa+HP tersimpan'); else showNoticeToast('💾 HP aman, Supa RLS cek'); });
  } else {
    const client = window.supabaseClient || window.supa;
    if(client) client.from('pelanggan').upsert({id:target.id, outlet_id:target.outlet_id, nama:target.nama, wa:target.wa, alamat:target.alamat, deposito:0}).then(({error})=>{ if(error) console.error(error.message); });
  }
  if(window.closeSubModalPelanggan) closeSubModalPelanggan(); else if(window.closeModalPelanggan) closeModalPelanggan();
  if(window.renderPelangganList) renderPelangganList('');
}

function openSubModalIsiDeposito(pelangganId, mode = 'tambah') {
  selectedPelangganDepositoId = pelangganId;
  modeDeposito = mode;
  const p = pelangganData.find(item => item.id === pelangganId);
  if (!p) return;

  document.getElementById('namaPelangganTarget').innerText = p.nama;
  const inputNominal = document.getElementById('inputNominalDeposito');
  const titleModal = document.getElementById('titleModalDeposito');

  if (mode === 'edit') {
    if (titleModal) titleModal.innerText = 'Edit Saldo Deposito';
    inputNominal.value = p.deposito;
  } else {
    if (titleModal) titleModal.innerText = 'Tambah Saldo Deposito';
    inputNominal.value = '';
  }

  updateLiveDepositoCalculation();
  document.getElementById('subModalIsiDepositoOverlay').classList.add('active');
}

function updateLiveDepositoCalculation() {
  const inputNominal = parseFloat(document.getElementById('inputNominalDeposito').value) || 0;
  const previewBox = document.getElementById('previewDepositoBonus');
  if (!previewBox) return;

  if (modeDeposito === 'tambah' && inputNominal > 0) {
    let bonus = globalDiskonSettings.type === 'persen' ? inputNominal * (globalDiskonSettings.val / 100) : globalDiskonSettings.val;
    const total = inputNominal + bonus;
    previewBox.innerHTML = `Bonus Deposito (${globalDiskonSettings.type === 'persen' ? globalDiskonSettings.val + '%' : 'Rp ' + globalDiskonSettings.val.toLocaleString('id-ID')}): <strong>+Rp ${bonus.toLocaleString('id-ID')}</strong><br>Total Saldo Bertambah: <strong style="color: #10b981;">Rp ${total.toLocaleString('id-ID')}</strong>`;
    previewBox.style.display = 'block';
  } else {
    previewBox.style.display = 'none';
  }
}

function closeSubModalIsiDeposito() { document.getElementById('subModalIsiDepositoOverlay').classList.remove('active'); }
function closeSubModalIsiDepositoOnBackdrop(e) { if (e.target.id === 'subModalIsiDepositoOverlay') closeSubModalIsiDeposito(); }

function simpanDeposito() {
  const p = pelangganData.find(item => item.id === selectedPelangganDepositoId);
  if (!p) return;

  const nominal = parseFloat(document.getElementById('inputNominalDeposito').value) || 0;

  if (modeDeposito === 'edit') {
    p.deposito = nominal;
    showNoticeToast(`Saldo deposito ${p.nama} diubah menjadi Rp ${nominal.toLocaleString('id-ID')}`);
  } else {
    let bonus = globalDiskonSettings.type === 'persen' ? nominal * (globalDiskonSettings.val / 100) : globalDiskonSettings.val;
    const totalDiterima = nominal + bonus;
    p.deposito += totalDiterima;
    showNoticeToast(`Tambah deposito Rp ${nominal.toLocaleString('id-ID')} (+ Bonus ${bonus.toLocaleString('id-ID')}) ke ${p.nama} berhasil.`);
  }

  hitungRingkasanKas();
  closeSubModalIsiDeposito();
  renderPelangganList();
}

/* Master Data Outlet */
function openModalOutlet() { resetFormOutlet(); renderOutletList(); document.getElementById('modalOutletOverlay').classList.add('active'); }
function closeModalOutlet() { document.getElementById('modalOutletOverlay').classList.remove('active'); }
function closeModalOutletOnBackdrop(e) { if (e.target.id === 'modalOutletOverlay') closeModalOutlet(); }

function resetFormOutlet() { editingOutletId = null; document.getElementById('inputNamaOutlet').value = ''; document.getElementById('inputAlamatOutlet').value = ''; document.getElementById('inputWaOutlet').value = ''; }

function setActiveOutlet(id) {
  outletsData.forEach(o => { o.isActive = (o.id === id); });
  syncActiveOutletHeader();
  syncActiveKaryawanHeader();
  renderOutletList();
  renderHeaderOutletDropdown();
  updateSummaryCounters();
  hitungRingkasanKas();
  renderAntrianList(activeAntrianFilter);
  showNoticeToast(`Outlet Aktif: ${getActiveOutlet().nama}.`);
}

function simpanOutlet() {
  const nama = document.getElementById('inputNamaOutlet').value.trim();
  const alamat = document.getElementById('inputAlamatOutlet').value.trim();
  const wa = document.getElementById('inputWaOutlet').value.trim();
  if (!nama) { showNoticeToast('Nama outlet tidak boleh kosong'); return; }

  if (editingOutletId) {
    const o = outletsData.find(item => item.id === editingOutletId);
    if (o) { o.nama = nama; o.alamat = alamat; o.wa = wa; }
  } else outletsData.push({ id: 'outlet-' + Date.now(), nama: nama, alamat: alamat, wa: wa, isActive: false });

  resetFormOutlet();
  renderOutletList();
  renderHeaderOutletDropdown();
  showNoticeToast('Data outlet berhasil disimpan.');
}

function editOutlet(id) {
  const o = outletsData.find(item => item.id === id);
  if (!o) return;
  editingOutletId = o.id;
  document.getElementById('inputNamaOutlet').value = o.nama;
  document.getElementById('inputAlamatOutlet').value = o.alamat || '';
  document.getElementById('inputWaOutlet').value = o.wa || '';
}

function renderOutletList() {
  const container = document.getElementById('outletListContainer');
  if (!container) return;
  container.innerHTML = '';

  outletsData.forEach(o => {
    const card = document.createElement('div');
    card.className = `customer-card-item border-3-glass-blur rounded-12 ${o.isActive ? 'active-item' : ''}`;
    card.innerHTML = `
      <div class="customer-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="setActiveOutlet('${o.id}')" style="cursor: pointer;">
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
          <span style="font-weight: 800; font-size: 13px; color: #111;">${o.nama}</span>
          <span style="font-size: 10px; font-weight: 600; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${o.alamat || 'Alamat belum diisi'}</span>
        </div>
        ${o.isActive ? '<span class="active-badge">Aktif</span>' : '<span style="font-size: 9px; font-weight: 700; color: #777; background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px;">Pilih</span>'}
      </div>
      <div class="customer-card-row2">
        <div style="display:flex; gap:8px;">
          <div class="tap-model" onclick="editOutlet('${o.id}')" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #0284c7;"><svg class="icon-svg" viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: #0284c7;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg><span style="font-size: 10px; font-weight: 700;">Edit</span></div>
          <div class="sekat-vertical"></div>
          <div class="tap-model" onclick="confirmHapusData('outlet', '${o.id}', '${o.nama}')" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #dc2626;"><svg class="icon-svg" viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: #dc2626;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg><span style="font-size: 10px; font-weight: 700;">Hapus</span></div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/* Master Data Karyawan */
function openModalKaryawan() { resetFormKaryawan(); renderKaryawanList(); document.getElementById('modalKaryawanOverlay').classList.add('active'); }
function closeModalKaryawan() { document.getElementById('modalKaryawanOverlay').classList.remove('active'); }
function closeModalKaryawanOnBackdrop(e) { if (e.target.id === 'modalKaryawanOverlay') closeModalKaryawan(); }

function resetFormKaryawan() { 
  editingKaryawanId = null; 
  document.getElementById('inputNamaKaryawan').value = ''; 
  document.getElementById('inputWaKaryawan').value = ''; 
  document.getElementById('inputAlamatKaryawan').value = ''; 
  var le=document.getElementById('inputLevelKaryawan'); if(le) le.value='';
  var ue=document.getElementById('inputUsernameKaryawan'); if(ue) ue.value='';
  var pe=document.getElementById('inputPasswordKaryawan'); if(pe) { pe.value=''; pe.type='password'; }
  var bt=document.getElementById('btnTogglePass'); if(bt) bt.innerText='LIHAT';
  var info=document.getElementById('infoLevelDesc'); if(info) info.style.display='none';
  var ttl=document.getElementById('title-form-karyawan');
  if(ttl) ttl.innerHTML='<svg class="icon-svg" viewBox="0 0 24 24" style="width:16px; height:16px; stroke: #f618a9;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> Tambah Karyawan';
}

function setActiveKaryawan(id) {
  const activeOutlet = getActiveOutlet();
  karyawanData.forEach(k => { if (k.outletId === activeOutlet.id || !k.outletId) k.isActive = (k.id === id); });
  syncActiveKaryawanHeader();
  renderKaryawanList();
  showNoticeToast(`Kasir Aktif: ${getActiveKaryawan().nama}`);
}

function simpanKaryawan() {
  const activeOutlet = getActiveOutlet();
  const nama = document.getElementById('inputNamaKaryawan').value.trim();
  const wa = document.getElementById('inputWaKaryawan').value.trim();
  const alamat = document.getElementById('inputAlamatKaryawan').value.trim();
  const level = document.getElementById('inputLevelKaryawan') ? document.getElementById('inputLevelKaryawan').value : '';
  const username = document.getElementById('inputUsernameKaryawan') ? document.getElementById('inputUsernameKaryawan').value.trim() : '';
  const password = document.getElementById('inputPasswordKaryawan') ? document.getElementById('inputPasswordKaryawan').value.trim() : '';
  if (!nama) { showNoticeToast('Nama karyawan wajib diisi!'); return; }
  if (!level) { showNoticeToast('Pilih Level / Hak Akses!'); return; }
  if (!username) { showNoticeToast('Username wajib diisi!'); return; }
  if (!password) { showNoticeToast('Password wajib diisi!'); return; }
  var isDup = karyawanData.some(function(k){ return k.username && k.username.toLowerCase()===username.toLowerCase() && k.id!==editingKaryawanId; });
  if(isDup){ showNoticeToast('Username sudah dipakai!'); return; }
  if (editingKaryawanId) {
    const k = karyawanData.find(item => item.id === editingKaryawanId);
    if (k) { k.nama = nama; k.wa = wa; k.alamat = alamat; k.level = level; k.username = username; k.password = password; }
  } else karyawanData.push({ id: 'karyawan-' + Date.now(), outletId: activeOutlet.id, nama: nama, wa: wa, alamat: alamat, level: level, username: username, password: password, isActive: false });
  try{ localStorage.setItem('karyawanData', JSON.stringify(karyawanData)); }catch(e){}
  resetFormKaryawan();
  renderKaryawanList();
  showNoticeToast(`Data karyawan ${nama} (${level}) disimpan.`);
}

function togglePasswordKaryawan(){
  var pe=document.getElementById('inputPasswordKaryawan');
  var bt=document.getElementById('btnTogglePass');
  if(!pe) return;
  if(pe.type==='password'){ pe.type='text'; if(bt) bt.innerText='SEMBUNYI'; }
  else { pe.type='password'; if(bt) bt.innerText='LIHAT'; }
}
function updateInfoLevelDesc(){
  var le=document.getElementById('inputLevelKaryawan');
  var info=document.getElementById('infoLevelDesc');
  if(!le || !info) return;
  var map={'Owner':'🔓 Akses penuh semua menu','Admin':'🛡️ Kelola outlet, karyawan, laporan','Kasir':'💰 Transaksi & kas','Operator':'⚙️ Operasional harian'};
  if(le.value && map[le.value]){ info.innerText=map[le.value]; info.style.display='block'; } else info.style.display='none';
}
document.addEventListener('change', function(e){ if(e.target && e.target.id==='inputLevelKaryawan') updateInfoLevelDesc(); });


function editKaryawan(id) {
  const k = karyawanData.find(item => item.id === id);
  if (!k) return;
  editingKaryawanId = k.id;
  document.getElementById('inputNamaKaryawan').value = k.nama;
  document.getElementById('inputWaKaryawan').value = k.wa || '';
  document.getElementById('inputAlamatKaryawan').value = k.alamat || '';
  var le=document.getElementById('inputLevelKaryawan'); if(le) le.value=k.level||'';
  var ue=document.getElementById('inputUsernameKaryawan'); if(ue) ue.value=k.username||'';
  var pe=document.getElementById('inputPasswordKaryawan'); if(pe) pe.value=k.password||'';
  updateInfoLevelDesc();
  var ttl=document.getElementById('title-form-karyawan');
  if(ttl) ttl.innerHTML='<svg class="icon-svg" viewBox="0 0 24 24" style="width:16px; height:16px; stroke: #f618a9;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> Edit - '+k.nama;
}


function renderKaryawanList() {
  const container = document.getElementById('karyawanListContainer');
  if (!container) return;
  container.innerHTML = '';
  const activeOutlet = getActiveOutlet();
  const listK = karyawanData.filter(k => k.outletId === activeOutlet.id || !k.outletId);
  listK.forEach(k => {
    const card = document.createElement('div');
    card.className = `customer-card-item border-3-glass-blur rounded-12 ${k.isActive ? 'active-item' : ''}`;
    var lc='#7e22ce', lb='rgba(126,34,206,0.1)';
    if(k.level==='Kasir'){ lc='#065f46'; lb='rgba(16,185,129,0.12)'; }
    else if(k.level==='Operator'){ lc='#1e40af'; lb='rgba(59,130,246,0.12)'; }
    var levelBadge = k.level ? `<span style="font-size:9px;font-weight:800;color:${lc};background:${lb};padding:2px 6px;border-radius:6px;">${k.level}</span>` : '';
    var userBadge = k.username ? `<span style="font-size:9px;font-weight:600;color:#444;background:rgba(0,0,0,0.05);padding:2px 5px;border-radius:5px;">@${k.username}</span>` : '';
    card.innerHTML = `
      <div class="customer-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="setActiveKaryawan('${k.id}')" style="cursor: pointer;">
        <div style="display: flex; flex-direction: column; gap: 3px; overflow: hidden;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;"><span style="font-weight: 800; font-size: 13px; color: #111;">${k.nama}</span>${levelBadge}${userBadge}</div>
          <span style="font-size: 10px; font-weight: 600; color: #555;">${k.wa ? 'WA: ' + k.wa : ''} ${k.level ? '• '+k.level : ''} ${k.username ? '• @'+k.username : ''}</span>
        </div>
        ${k.isActive ? '<span class="active-badge">Aktif</span>' : '<span style="font-size: 9px; font-weight: 700; color: #777;">Pilih</span>'}
      </div>
      <div class="customer-card-row2">
        <div style="display:flex; gap:8px;">
          <div class="tap-model" onclick="editKaryawan('${k.id}')" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #0284c7;"><span style="font-size: 10px; font-weight: 700;">Edit</span></div>
          <div class="sekat-vertical"></div>
          <div class="tap-model" onclick="confirmHapusData('karyawan', '${k.id}', '${k.nama}')" style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #dc2626;"><span style="font-size: 10px; font-weight: 700;">Hapus</span></div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/* Master Data Layanan */
function openModalLayanan() { 
  isLayananPickerForNota = false; 
  document.getElementById('modalLayananHeaderTitle').innerText = 'Jenis Layanan';
  document.getElementById('formLayananBox').style.display = 'flex';
  resetFormLayanan(); 
  renderLayananList(); 
  document.getElementById('modalLayananOverlay').classList.add('active'); 
}

function closeModalLayananOnBackdrop(e) { if (e.target.id === 'modalLayananOverlay') closeModalLayanan(); }

function setEstimasiUnit(unit) {
  currentEstimasiUnit = unit;
  if (unit === 'Jam') { document.getElementById('btnOptJam').classList.add('active'); document.getElementById('btnOptHari').classList.remove('active'); }
  else { document.getElementById('btnOptHari').classList.add('active'); document.getElementById('btnOptJam').classList.remove('active'); }
}

function resetFormLayanan() { 
  editingLayananId = null; 
  document.getElementById('inputNamaLayanan').value = ''; 
  document.getElementById('inputKodeLayanan').value = ''; 
  document.getElementById('inputHargaLayanan').value = ''; 
  document.getElementById('selectSatuanLayanan').value = 'Kg'; 
  document.getElementById('inputEstimasiLayanan').value = ''; 
  document.getElementById('inputMinKgLayanan').value = '';
  setEstimasiUnit('Jam'); 
}

function onSearchLayananInput(input) {
  const q = input.value;
  const btnClear = document.getElementById('btnClearSearchLayanan');
  if (q.trim().length > 0) btnClear.classList.add('visible');
  else btnClear.classList.remove('visible');
  renderLayananList(q.toLowerCase().trim());
}

function clearSearchLayanan() {
  const input = document.getElementById('searchLayananInput');
  input.value = '';
  document.getElementById('btnClearSearchLayanan').classList.remove('visible');
  renderLayananList();
}

function simpanLayanan() {
  const activeOutlet = getActiveOutlet();
  const nama = document.getElementById('inputNamaLayanan').value.trim();
  const kode = document.getElementById('inputKodeLayanan').value.trim().toUpperCase();
  const harga = parseFloat(document.getElementById('inputHargaLayanan').value) || 0;
  const satuan = document.getElementById('selectSatuanLayanan').value;
  const estimasiVal = parseInt(document.getElementById('inputEstimasiLayanan').value) || 1;
  const minKg = parseFloat(document.getElementById('inputMinKgLayanan').value) || 0;

  if (!nama) { showNoticeToast('Nama layanan tidak boleh kosong'); return; }

  if (editingLayananId) {
    const item = layananData.find(l => l.id === editingLayananId);
    if (item) { 
      item.nama = nama; 
      item.kode = kode || 'LYN'; 
      item.harga = harga; 
      item.satuan = satuan; 
      item.estimasiVal = estimasiVal; 
      item.estimasiUnit = currentEstimasiUnit; 
      item.minKg = minKg;
    }
  } else {
    layananData.push({ 
      id: 'layanan-' + Date.now(), 
      outletId: activeOutlet.id, 
      nama: nama, 
      kode: kode || 'LYN', 
      harga: harga, 
      satuan: satuan, 
      estimasiVal: estimasiVal, 
      estimasiUnit: currentEstimasiUnit,
      minKg: minKg
    });
  }

  resetFormLayanan();
  renderLayananList();
  showNoticeToast(`Data Layanan disimpan.`);
}

function editLayanan(id) {
  const item = layananData.find(l => l.id === id);
  if (!item) return;
  editingLayananId = item.id;
  document.getElementById('inputNamaLayanan').value = item.nama;
  document.getElementById('inputKodeLayanan').value = item.kode || '';
  document.getElementById('inputHargaLayanan').value = item.harga || '';
  document.getElementById('selectSatuanLayanan').value = item.satuan || 'Kg';
  document.getElementById('inputEstimasiLayanan').value = item.estimasiVal || 1;
  document.getElementById('inputMinKgLayanan').value = item.minKg || 0;
  setEstimasiUnit(item.estimasiUnit || 'Jam');
}

function renderLayananList(filterQuery = '') {
  const container = document.getElementById('layananListContainer');
  if (!container) return;
  container.innerHTML = '';

  const activeOutlet = getActiveOutlet();
  const filtered = layananData.filter(l => (l.outletId === activeOutlet.id || !l.outletId) && (l.nama.toLowerCase().includes(filterQuery) || (l.kode && l.kode.toLowerCase().includes(filterQuery))));

  filtered.forEach(l => {
    const card = document.createElement('div');
    card.className = 'item-sub-card border-3-glass-blur rounded-12';
    const minText = (l.minKg && l.minKg > 0) ? `<span style="color: #dc2626; font-weight:800;">• Min ${l.minKg} Kg</span>` : '';
    
    const tapAction = isLayananPickerForNota 
      ? `addLayananToNotaRincian('${l.id}')`
      : `editLayanan('${l.id}')`;

    card.innerHTML = `
      <div class="item-sub-card-left tap-model" onclick="${tapAction}" style="flex-direction: column; align-items: flex-start; gap: 2px; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 6px; width: 100%;">
          <span class="active-badge" style="background: rgba(246, 24, 169, 0.15); color: #f618a9; margin:0;">${l.kode || 'LYN'}</span>
          <span class="item-name-text">${l.nama}</span>
        </div>
        <div style="font-size: 10px; font-weight: 700; color: #555; display: flex; gap: 6px; margin-top: 2px; flex-wrap: wrap;">
          <span style="color: #10b981;">Rp ${l.harga.toLocaleString('id-ID')} / ${l.satuan}</span>
          <span style="color: #f618a9;">⏱ ${l.estimasiVal} ${l.estimasiUnit}</span>
          ${minText}
        </div>
      </div>
      <div class="item-actions">
        ${isLayananPickerForNota ? `
          <button class="tap-model" onclick="addLayananToNotaRincian('${l.id}')" style="background: #f618a9; color: #fff; border: none; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; cursor: pointer;">+ Pilih</button>
        ` : `
          <div class="action-icon-btn tap-model" onclick="editLayanan('${l.id}')"><svg class="icon-svg" viewBox="0 0 24 24" style="width:13px; height:13px; stroke: #0284c7;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></div>
          <div class="action-icon-btn tap-model" onclick="confirmHapusData('layanan', '${l.id}', '${l.nama}')"><svg class="icon-svg" viewBox="0 0 24 24" style="width:13px; height:13px; stroke: #dc2626;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></div>
        `}
      </div>
    `;
    container.appendChild(card);
  });
}

/* Master Data Diskon */
function openModalDiskon() { document.getElementById('inputDiskonDepositoValue').value = globalDiskonSettings.val; setDiskonType(globalDiskonSettings.type); updatePreviewDiskonInfo(); document.getElementById('modalDiskonOverlay').classList.add('active'); }
function closeModalDiskon() { document.getElementById('modalDiskonOverlay').classList.remove('active'); }
function closeModalDiskonOnBackdrop(e) { if (e.target.id === 'modalDiskonOverlay') closeModalDiskon(); }

function setDiskonType(type) {
  globalDiskonSettings.type = type;
  const btnP = document.getElementById('btnDiskonPersen');
  const btnN = document.getElementById('btnDiskonNominal');
  if (type === 'persen') { btnP.classList.add('active'); btnN.classList.remove('active'); }
  else { btnN.classList.add('active'); btnP.classList.remove('active'); }
  updatePreviewDiskonInfo();
}

function updatePreviewDiskonInfo() {
  const val = parseFloat(document.getElementById('inputDiskonDepositoValue').value) || 0;
  const type = globalDiskonSettings.type;
  const previewEl = document.getElementById('previewDiskonInfo');
  if (!previewEl) return;

  if (type === 'persen') {
    const bonus = 100000 * (val / 100);
    const total = 100000 + bonus;
    previewEl.innerHTML = `* Contoh: Input Deposito Rp 100.000 + ${val}% (${bonus.toLocaleString('id-ID')}) = <strong>Total Rp ${total.toLocaleString('id-ID')}</strong>`;
  } else {
    const total = 100000 + val;
    previewEl.innerHTML = `* Contoh: Input Deposito Rp 100.000 + Bonus Rp ${val.toLocaleString('id-ID')} = <strong>Total Rp ${total.toLocaleString('id-ID')}</strong>`;
  }
}

function simpanDiskonSettings() {
  const val = parseFloat(document.getElementById('inputDiskonDepositoValue').value) || 0;
  globalDiskonSettings.val = val;
  const typeLabel = globalDiskonSettings.type === 'persen' ? `${val}%` : `Rp ${val.toLocaleString('id-ID')}`;
  showNoticeToast(`Diskon Deposito (${typeLabel}) disimpan untuk seluruh outlet.`);
  closeModalDiskon();
}

/* Konfirmasi Hapus Universal */
function confirmHapusData(type, id, name) {
  pendingDeleteType = type;
  pendingDeleteId = id;
  const textNotice = document.getElementById('textKonfirmasiHapus');
  if (textNotice) textNotice.innerHTML = `Apakah Anda yakin ingin menghapus data <strong>"${name}"</strong>?`;
  document.getElementById('modalKonfirmasiHapusOverlay').classList.add('active');
}

function closeModalKonfirmasiHapus() {
  document.getElementById('modalKonfirmasiHapusOverlay').classList.remove('active');
  pendingDeleteType = null;
  pendingDeleteId = null;
}
function closeModalKonfirmasiHapusOnBackdrop(e) { if (e.target.id === 'modalKonfirmasiHapusOverlay') closeModalKonfirmasiHapus(); }

function eksekusiHapusData() {
  if (!pendingDeleteType || !pendingDeleteId) return;
  const deleteId = pendingDeleteId;
  const deleteType = pendingDeleteType;
  const deleteFromSupabase = async (table, id)=>{
    try{ if(window.supabaseClient){ await window.supabaseClient.from(table).delete().eq('id', id); } }catch(e){}
  };
  if (deleteType === 'pelanggan') {
    pelangganData = pelangganData.filter(p => p.id !== deleteId);
    try{ localStorage.setItem('pelangganData', JSON.stringify(pelangganData)); }catch(e){}
    if(window.StorageManager && window.StorageManager.deleteFromSupaAndLS) window.StorageManager.deleteFromSupaAndLS('pelanggan', deleteId); else if(window.deleteFromSupabase) deleteFromSupabase('pelanggan', deleteId);
    renderPelangganList(); showNoticeToast('✅ Pelanggan dihapus');
  } else if (deleteType === 'karyawan') {
    if (karyawanData.length <= 1) { showNoticeToast('Minimal 1 karyawan'); closeModalKonfirmasiHapus(); return; }
    const isActive = karyawanData.find(k => k.id === deleteId)?.isActive;
    karyawanData = karyawanData.filter(k => k.id !== deleteId);
    try{ localStorage.setItem('karyawanData', JSON.stringify(karyawanData)); }catch(e){}
    deleteFromSupabase('karyawan', deleteId);
    if (isActive && karyawanData.length>0) karyawanData[0].isActive=true;
    renderKaryawanList(); showNoticeToast('✅ Karyawan dihapus');
  } else if (deleteType === 'outlet') {
    if (outletsData.length <= 1) { showNoticeToast('Minimal 1 outlet'); closeModalKonfirmasiHapus(); return; }
    const isActive = outletsData.find(o => o.id === deleteId)?.isActive;
    outletsData = outletsData.filter(o => o.id !== deleteId);
    try{ localStorage.setItem('outletsData', JSON.stringify(outletsData)); }catch(e){}
    deleteFromSupabase('outlets', deleteId);
    if (isActive && outletsData.length>0) setActiveOutlet(outletsData[0].id); else renderOutletList();
    showNoticeToast('✅ Outlet dihapus');
  } else if (deleteType === 'layanan') {
    layananData = layananData.filter(l => l.id !== deleteId);
    try{ localStorage.setItem('layananData', JSON.stringify(layananData)); }catch(e){}
    deleteFromSupabase('layanan', deleteId);
    renderLayananList(); showNoticeToast('✅ Layanan dihapus');
  } else if (deleteType === 'nota') {
    const nota = antrianData.find(n => n.id === deleteId);
    if (nota) {
      antrianData = antrianData.filter(n => n.id !== deleteId);
      try{ localStorage.setItem('antrianData', JSON.stringify(antrianData)); }catch(e){}
      deleteFromSupabase('antrian', deleteId);
      renderAntrianList(activeAntrianFilter); showNoticeToast('✅ Nota dihapus');
    }
  }
  closeModalKonfirmasiHapus();
}

/* Base SPA Navigation & Counters */
function switchPage(pageId) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');
  document.querySelectorAll('.footer-nav-item').forEach(item => item.classList.remove('active'));
  
  if (pageId === 'page-home') { document.getElementById('btn-home').classList.add('active'); hitungRingkasanKas(); }
  else if (pageId === 'page-antrian') { document.getElementById('btn-antrian').classList.add('active'); renderAntrianList(activeAntrianFilter); }
  else if (pageId === 'page-laporan') { document.getElementById('btn-laporan').classList.add('active'); hitungRingkasanKas(); }
  else if (pageId === 'page-setting') document.getElementById('btn-setting').classList.add('active');
}

function switchPageWithFilter(filterStatus) {
  activeAntrianFilter = filterStatus;
  switchPage('page-antrian');
  document.querySelectorAll('.badge-status-label').forEach(lbl => {
    if (lbl.innerText.trim() === filterStatus) lbl.classList.add('active');
    else lbl.classList.remove('active');
  });
}

function toggleDropdown(elementId) { const dropdown = document.getElementById(elementId); if (dropdown) dropdown.classList.toggle('expanded'); }

function renderAntrianList(filter = 'Semua') {
  const container = document.getElementById('antrianSubCardsContainer');
  if (!container) return;
  container.innerHTML = '';

  const activeOutlet = getActiveOutlet();
  const filteredData = antrianData.filter(item => (item.outletId === activeOutlet.id || !item.outletId) && (filter === 'Semua' || item.statusProses.toLowerCase() === filter.toLowerCase()) && (searchAntrianQuery === '' || item.namaPelanggan.toLowerCase().includes(searchAntrianQuery) || item.nota.toLowerCase().includes(searchAntrianQuery)));

  if (filteredData.length === 0) {
    container.innerHTML = `<div style="font-size: 11px; color: #666; text-align: center; padding: 14px;">Tidak ada nota pada tahapan proses ini.</div>`;
    return;
  }

  filteredData.forEach(item => {
    const card = document.createElement('div');
    card.className = 'antrian-sub-card border-3-glass-blur rounded-12 max-w-auto-300-360 min-w-300';
    let statusClass = item.statusProses === 'Proses' ? 'st-proses' : item.statusProses === 'Siap Ambil' ? 'st-siap' : item.statusProses === 'Deadline' ? 'st-deadline' : item.statusProses === 'Terlambat' ? 'st-terlambat' : item.statusProses === 'Selesai' ? 'st-selesai' : 'st-antrian';

    let bayarClass = 'pay-belum';
    if (item.statusBayar === 'Lunas') bayarClass = 'pay-lunas';
    else if (item.statusBayar === 'DP') bayarClass = 'pay-dp';

    card.innerHTML = `
      <!-- SLOTS: icon-Print & icon-ShareWA -->
      <div class="antrian-card-row-top-actions">
        <div class="btn-action-top-slot btn-action-print" onclick="actionPrintNota('${item.id}', event)" title="Preview Struk Cetak">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: #333;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
          <span style="font-size: 9.5px; font-weight: 700;">Print</span>
        </div>
        <div class="sekat-vertical"></div>
        <div class="btn-action-top-slot btn-action-share" onclick="actionShareWANota('${item.id}', event)" title="Preview Struk Share WA">
          <svg class="icon-svg" viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: #25d366;"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          <span style="font-size: 9.5px; font-weight: 700;">Share WA</span>
        </div>
      </div>

      <!-- Row 1: Tappable membuka detail nota -->
      <div class="antrian-card-row1 border-2-glass-blur rounded-12 tap-model" onclick="openModalDetailNota('${item.id}')" style="cursor: pointer;" title="Tap untuk lihat detail nota">
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
          <span class="input-nota-label" style="font-size: 13px; font-weight: 800; color: #111;">${item.namaPelanggan}</span>
          <span style="font-size: 10px; font-weight: 700; color: #f618a9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.layanan || 'Layanan Laundry'}</span>
        </div>
        <span class="input-nominal-label">Rp ${item.totalNota.toLocaleString('id-ID')}</span>
      </div>

      <!-- Row 2: Badge Status Interaktif -->
      <div class="antrian-card-row2">
        <div class="antrian-row2-left" style="width: 100%; display: flex; align-items: center; justify-content: space-between;">
          <span class="badge-status ${statusClass} tap-model" onclick="cycleStatusProses('${item.id}', event)" title="Tap untuk ubah status proses">
            <svg class="icon-svg" viewBox="0 0 24 24" style="width:11px; height:11px; stroke:currentColor; margin-right:2px;"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
            ${item.statusProses}
          </span>
          <div class="sekat-vertical"></div>
          <span class="badge-status ${bayarClass} tap-model" onclick="openBayarNotaModal('${item.id}', event)" title="Tap untuk buka Bayar Nota">
            <svg class="icon-svg" viewBox="0 0 24 24" style="width:11px; height:11px; stroke:currentColor; margin-right:2px;"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2"></circle></svg>
            ${item.statusBayar}
          </span>
          <div class="sekat-vertical"></div>
          <span class="badge-nota-num tap-model" onclick="openModalDetailNota('${item.id}')" title="Tap untuk lihat detail">
            <svg class="icon-svg" viewBox="0 0 24 24" style="width:11px; height:11px; stroke:currentColor; margin-right:2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            ${item.nota}
          </span>
        </div>
      </div>

      <!-- Row 3: Estimasi + Deadline/Terlambat -->
      ${renderRowEstimasiSubCard(item)}
    `;
    container.appendChild(card);
  });
}

function updateSummaryCounters() {
  const activeOutlet = getActiveOutlet();
  const counts = { antrian: 0, proses: 0, siap: 0, deadline: 0, terlambat: 0, selesai: 0 };
  
  antrianData.filter(item => item.outletId === activeOutlet.id || !item.outletId).forEach(item => {
    const st = item.statusProses.toLowerCase();
    if (st === 'antrian') counts.antrian++;
    else if (st === 'proses') counts.proses++;
    else if (st === 'siap ambil' || st === 'siap') counts.siap++;
    else if (st === 'deadline') counts.deadline++;
    else if (st === 'terlambat') counts.terlambat++;
    else if (st === 'selesai') counts.selesai++;
  });

  if (document.getElementById('val-antrian')) document.getElementById('val-antrian').innerText = counts.antrian;
  if (document.getElementById('val-proses')) document.getElementById('val-proses').innerText = counts.proses;
  if (document.getElementById('val-siap-ambil')) document.getElementById('val-siap-ambil').innerText = counts.siap;
  if (document.getElementById('val-deadline')) document.getElementById('val-deadline').innerText = counts.deadline;
  if (document.getElementById('val-terlambat')) document.getElementById('val-terlambat').innerText = counts.terlambat;
  if (document.getElementById('val-selesai')) document.getElementById('val-selesai').innerText = counts.selesai;
}

function filterAntrianByStatus(status, element) { 
  activeAntrianFilter = status; 
  document.querySelectorAll('.badge-status-label').forEach(lbl => lbl.classList.remove('active')); 
  if (element) element.classList.add('active'); 
  renderAntrianList(status); 
}

function onSearchAntrianInput(input) {
  searchAntrianQuery = input.value.toLowerCase().trim();
  const btnClear = document.getElementById('btnClearSearchAntrian');
  if (searchAntrianQuery.length > 0) btnClear.classList.add('visible');
  else btnClear.classList.remove('visible');
  renderAntrianList(activeAntrianFilter);
}

function clearSearchAntrian() {
  const input = document.getElementById('searchAntrianInput');
  input.value = '';
  searchAntrianQuery = '';
  document.getElementById('btnClearSearchAntrian').classList.remove('visible');
  renderAntrianList(activeAntrianFilter);
}


(function(){var loc=location.href.replace(/#.*$/,"");var ATTR_NAMES=["data-product-id","data-productid","data-product_id","product-id","productid","product_id","data-source-entity-id","source-entity-id","source_entity_id","data-product","data-metadata","data-meta"];var DATASET_KEYS=["productId","productid","product_id","sourceEntityId","sourceentityid","source_entity_id","product","metadata","meta"];function readProductId(value){if(typeof value!=="string"||value.length===0)return null;if(/^[0-9]{6,}$/.test(value))return value;var match=value.match(/(?:product(?:_|-)?id|source(?:_|-)?entity(?:_|-)?id)["'=:\s]+([0-9]{6,})/i);return match?match[1]:null}function extractProductId(start){for(var node=start;node&&node!==document.body;node=node.parentElement){for(var i=0;i<ATTR_NAMES.length;i++){var attrValue=node.getAttribute&&node.getAttribute(ATTR_NAMES[i]);var attrProductId=readProductId(attrValue);if(attrProductId)return attrProductId}var dataset=node.dataset||null;if(dataset){for(var j=0;j<DATASET_KEYS.length;j++){var dataValue=dataset[DATASET_KEYS[j]];var dataProductId=readProductId(dataValue);if(dataProductId)return dataProductId}}}return null}function isInlineMediaSlotElement(node){return !!(node&&node.getAttribute&&node.getAttribute("data-clippy-inline-media-slot")!==null)}function findInlineMediaSlot(start){for(var node=start;node&&node!==document.body;node=node.parentElement){if(isInlineMediaSlotElement(node))return node}return null}function readInlineMediaUrl(node){if(!node)return null;return node.getAttribute&&((node.getAttribute("data-clippy-inline-media-url")||node.getAttribute("data-url")||node.getAttribute("data_url")))||node.href||null}function stripHash(url){return String(url).replace(/#.*$/,"")}function urlsMatch(a,b){if(!a||!b)return false;try{return stripHash(new URL(a,loc).href)===stripHash(new URL(b,loc).href)}catch(_){return stripHash(a)===stripHash(b)}}function isFirstPartyReelUrl(value){try{var url=new URL(value,loc);if(url.protocol!=="https:")return false;var host=url.hostname.toLowerCase();var supported=host==="instagram.com"||host.endsWith(".instagram.com")||host==="facebook.com"||host.endsWith(".facebook.com");return supported&&/\/reels?\//i.test(url.pathname)}catch(_){return false}}function isInlineMediaUrlClick(node,href){var slot=findInlineMediaSlot(node);if(!slot)return false;var slotUrl=readInlineMediaUrl(slot);if(slotUrl)return urlsMatch(href,slotUrl);return isFirstPartyReelUrl(href)}function findDataHref(start){for(var node=start;node&&node!==document.body;node=node.parentElement){if(node.getAttribute){var href=node.getAttribute("data-href")||node.getAttribute("data-url");if(href)return{href:href,node:node}}}return null}var nativeOpen=window.open;window.open=function(url){if(parent!==window&&typeof url==="string"&&/^https?:\/\//.test(url)){parent.postMessage({type:"ecto:usercontent-link-click",href:url},"*");return null}return nativeOpen?nativeOpen.apply(window,arguments):null};document.addEventListener("click",function(e){var target=e.target instanceof Element?e.target:null;if(!target)return;if(parent===window)return;var a=target.closest?target.closest("a[href]"):null;if(a&&a.href&&/^https?:\/\//.test(a.href)&&a.href.replace(/#.*$/,"")!==loc){if(isInlineMediaUrlClick(a,a.href))return;var productId=extractProductId(target)||extractProductId(a);if(productId){e.preventDefault();parent.postMessage({type:"ecto-artifact-link-click",productId:productId},"*");return}e.preventDefault();parent.postMessage({type:"ecto:usercontent-link-click",href:a.href},"*");return}var dataHref=findDataHref(target);if(dataHref&&/^https?:\/\//.test(dataHref.href)&&dataHref.href.replace(/#.*$/,"")!==loc){if(isInlineMediaUrlClick(dataHref.node,dataHref.href))return;e.preventDefault();parent.postMessage({type:"ecto:usercontent-link-click",href:dataHref.href},"*")}},true)})();

(function(){var FOCUS_TYPE="ecto:artifact-focus-request";var CLOSE_TYPE="ecto:artifact-close-request";function focusArtifactDocument(){var body=document.body;if(!body)return;try{window.focus();}catch(e){}if(!body.hasAttribute("tabindex"))body.setAttribute("tabindex","-1");try{body.focus({preventScroll:true});}catch(e){try{body.focus();}catch(e2){}}}window.addEventListener("message",function(event){if(event.source!==window.parent)return;var data=event.data;if(!data||typeof data!=="object"||data.type!==FOCUS_TYPE)return;if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",focusArtifactDocument,{once:true});return;}focusArtifactDocument();});window.addEventListener("keydown",function(event){if(event.key!=="Escape")return;window.setTimeout(function(){if(event.defaultPrevented)return;window.parent.postMessage({type:CLOSE_TYPE},"*");},0);});})();


function getTanggalNota(it){ if(it.tanggal) return new Date(it.tanggal); return new Date(); }
function filterNotaByOutletAndDate(s,e){ var ao=getActiveOutlet(); return antrianData.filter(function(it){ if(it.outletId!==ao.id&&it.outletId) return false; var t=getTanggalNota(it); if(s&&t<s) return false; if(e&&t>e) return false; return true; }); }

function catatRiwayatNotaLengkap(nota, aksi, alasan){ var now=new Date(); riwayatNotaData.unshift({id:'riwayat-'+Date.now(), notaId:nota.id, nota:nota.nota||'-', namaPelanggan:nota.namaPelanggan||'-', aksi:aksi, alasan:alasan||'-', tanggal:now.toISOString(), outletId: nota.outletId|| getActiveOutlet().id, kasir: getActiveKaryawan()?getActiveKaryawan().nama:'Kasir'}); }
var _origCatat = window.catatRiwayatNota;
window.catatRiwayatNota = function(nota, pesan){
  if(_origCatat) _origCatat(nota,pesan);
  var aksi='Aktivitas'; var pl=pesan.toLowerCase(); if(pl.includes('hapus')) aksi='Hapus'; else if(pl.includes('edit')||pl.includes('ubah')) aksi='Edit'; else if(pl.includes('buat')) aksi='Buat'; else if(pl.includes('bayar')) aksi='Bayar'; else if(pl.includes('hutang')) aksi='Hutang'; else if(pl.includes('status')) aksi='Status';
  catatRiwayatNotaLengkap(nota, aksi, pesan);
};

function openRiwayatNotaModal(){ var ov=document.getElementById('modalRiwayatNotaOverlay'); if(ov) ov.classList.add('active'); renderRiwayatNotaList(''); }
function closeRiwayatNotaModal(){ var ov=document.getElementById('modalRiwayatNotaOverlay'); if(ov) ov.classList.remove('active'); }
function renderRiwayatNotaList(filterText){ var cont=document.getElementById('riwayatNotaListContainer'); if(!cont) return; var ft=(filterText||'').toLowerCase(); var ao=getActiveOutlet(); var data=riwayatNotaData.filter(function(r){ if(r.outletId!==ao.id&&r.outletId) return false; if(!ft) return true; return (r.nota||'').toLowerCase().includes(ft)||(r.namaPelanggan||'').toLowerCase().includes(ft)||(r.aksi||'').toLowerCase().includes(ft)||(r.alasan||'').toLowerCase().includes(ft); }); if(data.length===0){ cont.innerHTML='<div style="background:rgba(255,255,255,0.7);padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;margin-bottom:6px;">📝</div><div style="font-size:11px;color:#777;">Belum ada riwayat edit/hapus nota</div><div style="font-size:10px;color:#999;margin-top:4px;">Riwayat akan muncul setelah edit/hapus nota dengan alasan</div></div>'; return; } cont.innerHTML=data.map(function(r){ var d=new Date(r.tanggal); function pad(n){return String(n).padStart(2,'0');} var tgl=pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+String(d.getFullYear()).slice(-2)+' '+pad(d.getHours())+':'+pad(d.getMinutes()); var warna=r.aksi==='Hapus'?'#dc2626':r.aksi==='Edit'?'#f59e0b':'#555'; var bg=r.aksi==='Hapus'?'rgba(220,38,38,0.1)':r.aksi==='Edit'?'rgba(245,158,11,0.12)':'rgba(0,0,0,0.06)'; var icon=r.aksi==='Hapus'?'🗑️':r.aksi==='Edit'?'✏️':'📝'; return '<div style="background:rgba(255,255,255,0.85);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.9);box-shadow:0 1px 4px rgba(0,0,0,0.04);"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;display:flex;align-items:center;gap:4px;">'+icon+' '+r.nota+' • '+r.namaPelanggan+'</span><span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:12px;background:'+bg+';color:'+warna+';">'+r.aksi+'</span></div><div style="font-size:10px;color:#444;margin-top:6px;background:rgba(0,0,0,0.03);padding:6px 8px;border-radius:6px;"><strong>Alasan:</strong> '+r.alasan+'</div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:9px;color:#777;"><span>🕒 '+tgl+'</span><span>👤 '+r.kasir+'</span></div></div>'; }).join(''); }

function openLaporanDepositoModal(){ var ov=document.getElementById('modalLaporanDepositoOverlay'); if(ov) ov.classList.add('active'); renderLaporanDepositoList(); }
function closeLaporanDepositoModal(){ var ov=document.getElementById('modalLaporanDepositoOverlay'); if(ov) ov.classList.remove('active'); }
function renderLaporanDepositoList(){ var cont=document.getElementById('laporanDepositoListContainer'); if(!cont) return; var ao=getActiveOutlet(); var data=depositoLogData.filter(function(d){return d.outletId===ao.id||!d.outletId;}); var elT=document.getElementById('depCountTambah'), elE=document.getElementById('depCountEdit'), elH=document.getElementById('depCountHapus'); if(elT) elT.innerText=data.filter(function(d){return d.aksi==='Tambah';}).length; if(elE) elE.innerText=data.filter(function(d){return d.aksi==='Edit';}).length; if(elH) elH.innerText=data.filter(function(d){return d.aksi==='Hapus';}).length; if(data.length===0){ cont.innerHTML='<div style="background:rgba(255,255,255,0.7);padding:16px;border-radius:10px;text-align:center;"><div style="font-size:24px;margin-bottom:6px;">💰</div><div style="font-size:11px;color:#777;">Belum ada aktivitas deposito</div></div>'; return; } cont.innerHTML=data.map(function(r){ var d=new Date(r.tanggal); function pad(n){return String(n).padStart(2,'0');} var tgl=pad(d.getDate())+'-'+pad(d.getMonth()+1)+'-'+String(d.getFullYear()).slice(-2)+' '+pad(d.getHours())+':'+pad(d.getMinutes()); var warna=r.aksi==='Hapus'?'#dc2626':r.aksi==='Edit'?'#f59e0b':'#10b981'; var bg=r.aksi==='Hapus'?'rgba(220,38,38,0.1)':r.aksi==='Edit'?'rgba(245,158,11,0.12)':'rgba(16,185,129,0.12)'; var icon=r.aksi==='Hapus'?'🗑️':r.aksi==='Edit'?'✏️':'💰'; return '<div style="background:rgba(255,255,255,0.85);padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.9);"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;display:flex;align-items:center;gap:4px;">'+icon+' '+r.nama+'</span><span style="font-size:9px;font-weight:800;padding:3px 8px;border-radius:12px;background:'+bg+';color:'+warna+';">'+r.aksi+' Rp '+r.nominal.toLocaleString('id-ID')+'</span></div><div style="font-size:10px;color:#444;margin-top:4px;background:rgba(0,0,0,0.03);padding:4px 8px;border-radius:6px;">Alasan: '+r.alasan+'</div><div style="font-size:9px;color:#777;margin-top:4px;">🕒 '+tgl+'</div></div>'; }).join(''); }
function catatDepositoLog(p, aksi, nominal, alasan){ var now=new Date(); depositoLogData.unshift({id:'dep-log-'+Date.now(), pelangganId:p.id, nama:p.nama, aksi:aksi, nominal:nominal, alasan:alasan||'-', tanggal:now.toISOString(), outletId: p.outletId||'outlet-1'}); }

function openStatistikLayananModal(){ var ov=document.getElementById('modalStatistikLayananOverlay'); if(ov) ov.classList.add('active'); switchStatistikPeriode(activeStatistikPeriode, document.querySelector('#modalStatistikLayananOverlay .badge-status-label.active')); }
function closeStatistikLayananModal(){ var ov=document.getElementById('modalStatistikLayananOverlay'); if(ov) ov.classList.remove('active'); }
function switchStatistikPeriode(type, el){
  activeStatistikPeriode=type;
  document.querySelectorAll('#modalStatistikLayananOverlay .badge-status-label').forEach(function(b){b.classList.remove('active');b.style.background='rgba(0,0,0,0.06)';b.style.color='#555';});
  if(el){ el.classList.add('active'); el.style.background='#111'; el.style.color='#fff'; }
  var now=new Date(); var start=null,end=null; var label='Hari Ini';
  if(type==='Harian'){ start=new Date(now.getFullYear(), now.getMonth(), now.getDate()); end=new Date(now.getFullYear(), now.getMonth(), now.getDate(),23,59,59); label='Hari Ini'; }
  else if(type==='Mingguan'){ start=new Date(now); start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0); end=new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59); label='Minggu Ini'; }
  else if(type==='Bulanan'){ start=new Date(now.getFullYear(), now.getMonth(),1); end=new Date(now.getFullYear(), now.getMonth()+1,0,23,59,59); label='Bulan Ini'; }
  var lab=document.getElementById('statPeriodeLabel'); if(lab) lab.innerText=label;
  renderStatistikLayanan(start,end);
}
function renderStatistikLayanan(startDate, endDate){
  var filtered=antrianData; if(startDate&&endDate){ filtered=filterNotaByOutletAndDate(startDate,endDate); if(filtered.length===0) filtered=antrianData; } else { var ao=getActiveOutlet(); filtered=antrianData.filter(function(n){return n.outletId===ao.id||!n.outletId;}); }
  var totEl=document.getElementById('statTotalTransaksi'); if(totEl) totEl.innerText=filtered.length+' Transaksi';
  var layananCount={}, layananKg={}, layananPcs={};
  filtered.forEach(function(nota){ var items=nota.items||[]; if(items.length>0){ items.forEach(function(it){ var nama=it.nama||'Layanan'; var satuan=(it.satuan||'').toLowerCase(); var qty=parseFloat((it.qtyInput||'0').replace(',','.'))||0; layananCount[nama]=(layananCount[nama]||0)+1; if(satuan.indexOf('kg')>-1) layananKg[nama]=(layananKg[nama]||0)+qty; if(satuan.indexOf('pcs')>-1) layananPcs[nama]=(layananPcs[nama]||0)+qty; }); } else { var nama=nota.layanan||'Layanan Umum'; layananCount[nama]=(layananCount[nama]||0)+1; } });
  function top10(obj){ return Object.entries(obj).sort(function(a,b){return b[1]-a[1];}).slice(0,10); }
  var topCount=top10(layananCount), topKg=top10(layananKg), topPcs=top10(layananPcs);
  var cont1=document.getElementById('statLayananTerbanyakContainer'); if(cont1){ if(topCount.length===0) cont1.innerHTML='<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;">🏆</div><div style="font-size:11px;color:#777;margin-top:4px;">Belum ada data</div></div>'; else cont1.innerHTML=topCount.map(function(e,i){ return '<div style="display:grid;grid-template-columns:1fr 70px;gap:6px;background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);"><div style="display:flex;align-items:center;gap:6px;"><span style="width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;">'+(i+1)+'</span><span style="font-size:11px;font-weight:700;">'+e[0]+'</span></div><span style="font-size:11px;font-weight:800;text-align:right;background:#111;color:#fff;padding:2px 8px;border-radius:12px;">'+e[1]+'x</span></div>'; }).join(''); }
  var cont2=document.getElementById('statQuantityContainer'); if(cont2){ if(topKg.length===0) cont2.innerHTML='<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;">⚖️</div><div style="font-size:11px;color:#777;margin-top:4px;">Belum ada data Kg</div></div>'; else cont2.innerHTML=topKg.map(function(e,i){ return '<div style="display:grid;grid-template-columns:1fr 70px;gap:6px;background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);"><div style="display:flex;align-items:center;gap:6px;"><span style="width:20px;height:20px;border-radius:50%;background:rgba(2,132,199,0.12);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#0284c7;">'+(i+1)+'</span><span style="font-size:11px;font-weight:700;">'+e[0]+'</span></div><span style="font-size:11px;font-weight:800;color:#fff;background:#0284c7;padding:2px 8px;border-radius:12px;text-align:right;">'+e[1].toFixed(1)+' Kg</span></div>'; }).join(''); }
  var cont3=document.getElementById('statSatuanContainer'); if(cont3){ if(topPcs.length===0){ cont3.innerHTML='<div style="background:rgba(255,255,255,0.6);padding:12px;border-radius:8px;text-align:center;"><div style="font-size:20px;">📦</div><div style="font-size:11px;color:#777;margin-top:4px;">Belum ada data Pcs</div><div style="margin-top:8px;display:grid;grid-template-columns:1fr 60px;gap:6px;background:rgba(255,255,255,0.9);padding:6px 8px;border-radius:8px;"><span style="font-size:11px;font-weight:700;">Cuci Kering Karpet</span><span style="font-size:11px;font-weight:800;color:#fff;background:#10b981;padding:2px 6px;border-radius:12px;text-align:right;">12 Pcs</span></div></div>'; } else cont3.innerHTML=topPcs.map(function(e,i){ return '<div style="display:grid;grid-template-columns:1fr 70px;gap:6px;background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);"><div style="display:flex;align-items:center;gap:6px;"><span style="width:20px;height:20px;border-radius:50%;background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#10b981;">'+(i+1)+'</span><span style="font-size:11px;font-weight:700;">'+e[0]+'</span></div><span style="font-size:11px;font-weight:800;color:#fff;background:#10b981;padding:2px 8px;border-radius:12px;text-align:right;">'+e[1]+' Pcs</span></div>'; }).join(''); }
}

function openAlasanModal(title, cb){ var t=document.getElementById('alasanModalTitle'); if(t) t.innerText=title; var inp=document.getElementById('inputAlasan'); if(inp) inp.value=''; pendingAlasanCallback=cb; var ov=document.getElementById('modalAlasanOverlay'); if(ov) ov.classList.add('active'); }
function closeAlasanModal(){ var ov=document.getElementById('modalAlasanOverlay'); if(ov) ov.classList.remove('active'); pendingAlasanCallback=null; }
function simpanAlasanAction(){ var alasan=document.getElementById('inputAlasan').value.trim(); if(!alasan){ showNoticeToast('Alasan wajib diisi'); return; } if(pendingAlasanCallback) pendingAlasanCallback(alasan); closeAlasanModal(); }

window.hapusNotaAktifDetail = function(){
  if(!activeDetailNotaId) return;
  var nota=antrianData.find(function(n){return n.id===activeDetailNotaId;});
  if(!nota) return;
  openAlasanModal('Alasan Hapus Nota '+nota.nota, function(alasan){
    catatRiwayatNotaLengkap(nota,'Hapus', alasan);
    var idx=antrianData.findIndex(function(n){return n.id===activeDetailNotaId;});
    if(idx>-1) antrianData.splice(idx,1);
    closeModalDetailNota();
    renderAntrianList(activeAntrianFilter);
    updateSummaryCounters();
    hitungRingkasanKas();
    showNoticeToast('Nota '+nota.nota+' dihapus. Alasan: '+alasan);
  });
};



// v9 Master Struk Full Connection
var strukLogoBase64 = localStorage.getItem('strukLogoBase64') || '';
var strukPrintMode = localStorage.getItem('strukPrintMode') || 'text';
var strukFontSizes = JSON.parse(localStorage.getItem('strukFontSizes') || '{"namaPelanggan":14,"statusBayar":12,"nominal":16,"estimasi":10}');

function parseChatBold(text){
  if(!text) return '';
  // Escape HTML first
  var esc = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // Parse *bold* -> <strong>bold</strong> (non-greedy, not overlapping)
  esc = esc.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
  // Convert newlines to <br>
  esc = esc.replace(/\n/g, '<br>');
  return esc;
}

function onHeaderInput(el){
  var preview = document.getElementById('headerChatPreview');
  if(preview) preview.innerHTML = parseChatBold(el.value) || '<span style="color:#999;">Preview kosong</span>';
  updateStrukPreview();
}

function onFooterInput(el){
  var preview = document.getElementById('footerChatPreview');
  if(preview) preview.innerHTML = parseChatBold(el.value) || '<span style="color:#999;">Preview kosong</span>';
  updateStrukPreview();
}

function openMasterStrukModal(){
  var ov=document.getElementById('modalMasterStrukOverlay');
  if(ov) ov.classList.add('active');
  loadMasterStrukSettings();
  updateStrukPreview();
  // Init chat previews
  var hEl=document.getElementById('strukHeaderCustom');
  var fEl=document.getElementById('strukFooterCustom');
  if(hEl) onHeaderInput(hEl);
  if(fEl) onFooterInput(fEl);
  // Load logo preview
  if(strukLogoBase64){
    var cont=document.getElementById('logoPreviewContainer');
    if(cont) cont.innerHTML='<img src="'+strukLogoBase64+'" style="width:100%;height:100%;object-fit:contain;">';
  }
  // Load font sizes display
  Object.keys(strukFontSizes).forEach(function(k){
    var el=document.getElementById('fontSize'+k.charAt(0).toUpperCase()+k.slice(1));
    if(el) el.innerText=strukFontSizes[k]+'px';
  });
}

function closeMasterStrukModal(){
  var ov=document.getElementById('modalMasterStrukOverlay');
  if(ov) ov.classList.remove('active');
}

function handleLogoUpload(event){
  var file=event.target.files[0];
  if(!file) return;
  if(file.size>2*1024*1024){ showNoticeToast('Logo max 2MB'); return; }
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      // Compress logo - max 200x200, quality 0.7
      var canvas=document.createElement('canvas');
      var maxW=200, maxH=200;
      var w=img.width, h=img.height;
      if(w>h){ if(w>maxW){ h*=maxW/w; w=maxW; } } else { if(h>maxH){ w*=maxH/h; h=maxH; } }
      canvas.width=w; canvas.height=h;
      var ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      var compressed=canvas.toDataURL('image/jpeg',0.7);
      strukLogoBase64=compressed;
      localStorage.setItem('strukLogoBase64', compressed);
      var cont=document.getElementById('logoPreviewContainer');
      if(cont) cont.innerHTML='<img src="'+compressed+'" style="width:100%;height:100%;object-fit:contain;">';
      showNoticeToast('✅ Logo di-upload & dikompres');
      updateStrukPreview();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeLogo(){
  strukLogoBase64='';
  localStorage.removeItem('strukLogoBase64');
  var cont=document.getElementById('logoPreviewContainer');
  if(cont) cont.innerHTML='<span style="font-size:10px;color:#999;">Belum ada logo</span>';
  var input=document.getElementById('strukLogoUpload');
  if(input) input.value='';
  showNoticeToast('Logo dihapus');
  updateStrukPreview();
}

function openPreviewNotaFromMaster(){
  closeMasterStrukModal();
  setTimeout(function(){
    // Open preview of last nota or dummy
    var lastNota=antrianData[0];
    if(lastNota) openPreviewNotaModal(lastNota.id);
    else showNoticeToast('Belum ada nota untuk preview');
  },200);
}

function changeFontSize(type, delta){
  if(!strukFontSizes[type]) strukFontSizes[type]=12;
  strukFontSizes[type]+=delta;
  if(strukFontSizes[type]<8) strukFontSizes[type]=8;
  if(strukFontSizes[type]>24) strukFontSizes[type]=24;
  localStorage.setItem('strukFontSizes', JSON.stringify(strukFontSizes));
  var el=document.getElementById('fontSize'+type.charAt(0).toUpperCase()+type.slice(1));
  if(el) el.innerText=strukFontSizes[type]+'px';
  updateStrukPreview();
  showNoticeToast('Ukuran '+type+' jadi '+strukFontSizes[type]+'px');
}

function updateStrukPreview(){
  // Update mini preview inside master struk modal
  var mini=document.getElementById('miniPreviewStruk');
  if(!mini) return;
  
  var showEstimasi=document.getElementById('strukShowEstimasi')?.checked;
  var showKasir=document.getElementById('strukShowNamaKasir')?.checked;
  var showAlamat=document.getElementById('strukShowAlamatOutlet')?.checked;
  var showWa=document.getElementById('strukShowWaOutlet')?.checked;
  var showNoNota=document.getElementById('strukShowNoNota')?.checked;
  var showTanggal=document.getElementById('strukShowTanggal')?.checked;
  var showLayanan=document.getElementById('strukShowLayanan')?.checked;
  var showNamaPelanggan=document.getElementById('strukShowNamaPelanggan')?.checked;
  var showStatus=document.getElementById('strukShowStatusBayar')?.checked;
  var showNominal=document.getElementById('strukShowNominal')?.checked;
  var showEstimasiDetail=document.getElementById('strukShowEstimasi')?.checked;
  var showDeposit=document.getElementById('strukShowDepositInfo')?.checked;
  
  var headerEl=document.getElementById('strukHeaderCustom');
  var footerEl=document.getElementById('strukFooterCustom');
  var headerText=headerEl?headerEl.value:'Cabang Utama';
  var footerText=footerEl?footerEl.value:'Terima kasih!';
  
  var logoHtml=strukLogoBase64?'<div style="text-align:center;margin-bottom:4px;background:#f618a9;padding:6px;border-radius:8px;"><img src="'+strukLogoBase64+'" style="max-width:60px;max-height:40px;object-fit:contain;filter:brightness(0) invert(1);"></div>':'';
  
  var html=logoHtml;
  html+='<div style="text-align:center;font-weight:800;">OUTLET LAUNDRY</div>';
  if(showAlamat) html+='<div style="text-align:center;font-size:7px;">Jl. Merdeka No.12</div>';
  if(showWa) html+='<div style="text-align:center;font-size:6px;">WA: 08123456789</div>';
  html+='<div style="font-size:7px;text-align:center;margin:2px 0;">'+parseChatBold(headerText)+'</div>';
  html+='<div style="border-top:1px dashed #000;margin:4px 0;"></div>';
  if(showNoNota) html+='<div>No: #NT-1001</div>';
  if(showTanggal) html+='<div>Tgl: '+new Date().toLocaleDateString('id-ID')+'</div>';
  if(showNamaPelanggan) html+='<div style="font-size:'+strukFontSizes.namaPelanggan+'px;font-weight:800;">Pelanggan: Budi</div>';
  if(showLayanan) html+='<div>Layanan: Cuci Komplit</div>';
  if(showEstimasi && showEstimasiDetail) html+='<div style="font-size:'+strukFontSizes.estimasi+'px;">Estimasi: 04-10-26 21:00</div>';
  if(showKasir) html+='<div>Kasir: Admin</div>';
  if(showDeposit) html+='<div>Deposit: Rp 0</div>';
  html+='<div style="border-top:1px dashed #000;margin:4px 0;"></div>';
  if(showNominal) html+='<div style="font-size:'+strukFontSizes.nominal+'px;font-weight:800;">Total: Rp 30.000</div>';
  if(showStatus) html+='<div style="font-size:'+strukFontSizes.statusBayar+'px;">Status: LUNAS</div>';
  html+='<div style="border-top:1px dashed #000;margin:4px 0;"></div>';
  html+='<div style="font-size:7px;text-align:center;">'+parseChatBold(footerText)+'</div>';
  
  mini.innerHTML=html;
}

function loadMasterStrukSettings(){
  try{
    var headerEl=document.getElementById('strukHeaderCustom');
    var footerEl=document.getElementById('strukFooterCustom');
    if(typeof strukSettings!=='undefined'){
      if(headerEl && strukSettings.headerCustom) headerEl.value=strukSettings.headerCustom;
      if(footerEl && strukSettings.footerCustom) footerEl.value=strukSettings.footerCustom;
      var map={estimasi:'strukShowEstimasi', namaKasir:'strukShowNamaKasir', alamatOutlet:'strukShowAlamatOutlet', waOutlet:'strukShowWaOutlet', noNota:'strukShowNoNota', tanggal:'strukShowTanggal', layanan:'strukShowLayanan', namaPelanggan:'strukShowNamaPelanggan', statusBayar:'strukShowStatusBayar', nominal:'strukShowNominal', estimasiDetail:'strukShowEstimasi', depositInfo:'strukShowDepositInfo'};
      if(strukSettings.show){
        Object.keys(map).forEach(function(key){
          var el=document.getElementById(map[key]);
          if(el && typeof strukSettings.show[key]!=='undefined') el.checked=!!strukSettings.show[key];
        });
      }
    }
    // Load font sizes
    var saved=JSON.parse(localStorage.getItem('strukFontSizes')||'null');
    if(saved) strukFontSizes=saved;
  }catch(e){}
}

function simpanMasterStruk(){
  try{
    if(typeof strukSettings==='undefined') window.strukSettings={show:{}, headerCustom:'', footerCustom:''};
    var headerEl=document.getElementById('strukHeaderCustom');
    var footerEl=document.getElementById('strukFooterCustom');
    if(headerEl) strukSettings.headerCustom=headerEl.value;
    if(footerEl) strukSettings.footerCustom=footerEl.value;
    var map={estimasi:'strukShowEstimasi', namaKasir:'strukShowNamaKasir', alamatOutlet:'strukShowAlamatOutlet', waOutlet:'strukShowWaOutlet', noNota:'strukShowNoNota', tanggal:'strukShowTanggal', layanan:'strukShowLayanan', namaPelanggan:'strukShowNamaPelanggan', statusBayar:'strukShowStatusBayar', nominal:'strukShowNominal', estimasiDetail:'strukShowEstimasi', depositInfo:'strukShowDepositInfo'};
    if(!strukSettings.show) strukSettings.show={};
    Object.keys(map).forEach(function(key){
      var el=document.getElementById(map[key]);
      if(el) strukSettings.show[key]=!!el.checked;
    });
    localStorage.setItem('strukSettings', JSON.stringify(strukSettings));
    localStorage.setItem('strukFontSizes', JSON.stringify(strukFontSizes));
    if(strukLogoBase64) localStorage.setItem('strukLogoBase64', strukLogoBase64);
    if(typeof saveHybridStruk==='function'){
      saveHybridStruk('strukSettings', strukSettings);
      saveHybridStruk('strukFontSizes', strukFontSizes);
    }
    // FIX: Tetap di halaman, jangan close, 1x notice saja
    showNoticeToast('✅ Master Struk disimpan! Preview di bawah sudah update. Geser 2x atau tap X untuk keluar');
    // Update mini preview & preview nota jika ada
    if(typeof updateStrukPreview==='function') updateStrukPreview();
    // Update active preview nota if open
    if(typeof activePreviewNotaObj!=='undefined' && activePreviewNotaObj){
      // re-apply settings to preview modal
      var estRow=document.getElementById('p_estimasi_row');
      if(estRow) estRow.style.display = (strukSettings.show.estimasiDetail===false && strukSettings.show.estimasi===false) ? 'none' : 'flex';
    }
    // JANGAN closeMasterStrukModal() - tetap di halaman sesuai request
  }catch(e){ showNoticeToast('Gagal simpan: '+e.message); }
}

// Swipe 2x untuk keluar - tambah gesture di modal master struk
var masterStrukSwipeCountDisabled=0;
var lastSwipeTime=0;
function /* disabled swipe */ handleMasterStrukSwipeDisabled(){
  var now=Date.now();
  if(now-lastSwipeTime<1000){
    masterStrukSwipeCountDisabled++;
    if(masterStrukSwipeCountDisabled>=2){
      closeMasterStrukModal();
      masterStrukSwipeCountDisabled=0;
      showNoticeToast('Keluar dari Master Struk');
    } else {
      showNoticeToast('Geser 1x lagi untuk keluar');
    }
  } else {
    masterStrukSwipeCountDisabled=1;
    showNoticeToast('Geser 1x lagi untuk keluar (2x swipe)');
  }
  lastSwipeTime=now;
}


// Override openPreviewNotaModal to respect strukSettings
var _origOpenPreviewNotaModal = window.openPreviewNotaModal;
window.openPreviewNotaModal = function(notaId, mode){
  if(_origOpenPreviewNotaModal) _origOpenPreviewNotaModal(notaId, mode);
  // After original, apply strukSettings visibility and font sizes and logo and bold parsing
  setTimeout(function(){
    try{
      var settings=JSON.parse(localStorage.getItem('strukSettings')||'{}');
      var fontSizes=JSON.parse(localStorage.getItem('strukFontSizes')||'{"namaPelanggan":14,"statusBayar":12,"nominal":16,"estimasi":10}');
      var logo=localStorage.getItem('strukLogoBase64')||'';
      
      // Apply show/hide
      var showMap={
        'p_outlet_address': settings.show?.alamatOutlet,
        'p_outlet_wa': settings.show?.waOutlet,
        'p_nota_num': settings.show?.noNota,
        'p_nota_date': settings.show?.tanggal,
        'p_customer_name': settings.show?.namaPelanggan,
        'p_kasir_name': settings.show?.namaKasir,
        'p_items_container': settings.show?.layanan,
        'p_grand_total': settings.show?.nominal,
        'p_status_bayar': settings.show?.statusBayar,
        'p_estimasi_row': settings.show?.estimasiDetail
      };
      Object.keys(showMap).forEach(function(id){
        var el=document.getElementById(id);
        if(el){
          if(showMap[id]===false) el.style.display='none';
          else el.style.display='';
        }
      });
      
      // Apply font sizes
      var custEl=document.getElementById('p_customer_name');
      if(custEl) custEl.style.fontSize=fontSizes.namaPelanggan+'px';
      var statusEl=document.getElementById('p_status_bayar');
      if(statusEl) statusEl.style.fontSize=fontSizes.statusBayar+'px';
      var totalEl=document.getElementById('p_grand_total');
      if(totalEl) totalEl.style.fontSize=fontSizes.nominal+'px';
      var estEl=document.getElementById('p_estimasi_row')||document.getElementById('detailNotaEstimasi');
      if(estEl) estEl.style.fontSize=fontSizes.estimasi+'px';
      
      // Apply logo
      var logoContainer=document.getElementById('p_logo_container');
      if(!logoContainer){
        var outletNameEl=document.getElementById('p_outlet_name');
        if(outletNameEl && outletNameEl.parentElement){
          logoContainer=document.createElement('div');
          logoContainer.id='p_logo_container';
          logoContainer.style.textAlign='center';
          logoContainer.style.marginBottom='6px';
          outletNameEl.parentElement.insertBefore(logoContainer, outletNameEl);
        }
      }
      if(logoContainer){
        if(logo) logoContainer.innerHTML='<div style="background:#f618a9;padding:8px;border-radius:10px;display:inline-block;"><img src="'+logo+'" style="max-width:80px;max-height:60px;object-fit:contain;filter:brightness(0) invert(1);"></div>';
        else logoContainer.innerHTML='';
      }
      
      // Apply chat bold to header/footer custom if exists in nota canvas
      var headerCustomEl=document.getElementById('p_header_custom');
      if(!headerCustomEl){
        var outletAddr=document.getElementById('p_outlet_address');
        if(outletAddr && settings.headerCustom){
          headerCustomEl=document.createElement('div');
          headerCustomEl.id='p_header_custom';
          headerCustomEl.style.textAlign='center';
          headerCustomEl.style.fontSize='9px';
          headerCustomEl.style.margin='4px 0';
          outletAddr.parentElement.insertBefore(headerCustomEl, outletAddr.nextSibling);
        }
      }
      if(headerCustomEl && settings.headerCustom){
        headerCustomEl.innerHTML=parseChatBold(settings.headerCustom);
      }
      
      var footerCustomEl=document.getElementById('p_footer_custom');
      if(!footerCustomEl){
        var canvas=document.getElementById('notaPrintCanvasArea');
        if(canvas && settings.footerCustom){
          footerCustomEl=document.createElement('div');
          footerCustomEl.id='p_footer_custom';
          footerCustomEl.style.textAlign='center';
          footerCustomEl.style.fontSize='9px';
          footerCustomEl.style.marginTop='8px';
          footerCustomEl.style.borderTop='1px dashed #000';
          footerCustomEl.style.paddingTop='6px';
          canvas.appendChild(footerCustomEl);
        }
      }
      if(footerCustomEl && settings.footerCustom){
        footerCustomEl.innerHTML=parseChatBold(settings.footerCustom);
      }
      
    }catch(e){ console.log('apply struk settings error', e); }
  },150);
};



function getTanggalNota(it){ if(it.tanggal) return new Date(it.tanggal); if(it.tglEstimasi) return new Date(it.tglEstimasi); return new Date(); }
function filterNotaByOutletAndDateRange(start, end){
  var ao=getActiveOutlet();
  return antrianData.filter(function(it){
    if(it.outletId!==ao.id && it.outletId) return false;
    var t=getTanggalNota(it);
    if(start && t < start) return false;
    if(end && t > end) return false;
    return true;
  });
}
function sumNota(notas){ return notas.reduce(function(a,c){ return a+(c.totalNota||0); },0); }
function sumPengeluaran(start, end){
  if(typeof pengeluaranKasData==='undefined') return 0;
  var ao=getActiveOutlet();
  var filtered=pengeluaranKasData.filter(function(p){
    if(p.outletId!==ao.id && p.outletId) return false;
    var t=p.tanggal?new Date(p.tanggal):new Date();
    if(start && t < start) return false;
    if(end && t > end) return false;
    return true;
  });
  return filtered.reduce(function(a,c){ return a+(c.nominal||0); },0);
}

// MINGGUAN
function openLaporanMingguanModal(){
  var ov=document.getElementById('modalLaporanMingguanOverlay');
  if(ov) ov.classList.add('active');
  renderLaporanMingguan();
}
function closeLaporanMingguanModal(){ var ov=document.getElementById('modalLaporanMingguanOverlay'); if(ov) ov.classList.remove('active'); }
function renderLaporanMingguan(){
  var now=new Date();
  var start=new Date(now); start.setDate(now.getDate()-6); start.setHours(0,0,0,0);
  var end=new Date(now); end.setHours(23,59,59,999);
  var notas=filterNotaByOutletAndDateRange(start, end);
  var omzet=sumNota(notas.filter(function(n){ return (n.statusBayar||'').toLowerCase()==='lunas'; }));
  var pengeluaran=sumPengeluaran(start, end);
  var laba=omzet-pengeluaran;
  document.getElementById('mingguanOmzet').innerText='Rp '+omzet.toLocaleString('id-ID');
  document.getElementById('mingguanPengeluaran').innerText='Rp '+pengeluaran.toLocaleString('id-ID');
  document.getElementById('mingguanLaba').innerText='Rp '+laba.toLocaleString('id-ID');
  var cont=document.getElementById('mingguanList');
  if(notas.length===0){ cont.innerHTML='<div style="text-align:center;padding:20px;font-size:11px;color:#777;">Belum ada transaksi minggu ini</div>'; return; }
  // Group by day
  var byDay={};
  notas.forEach(function(n){
    var d=getTanggalNota(n); var key=d.toISOString().split('T')[0];
    if(!byDay[key]) byDay[key]=[];
    byDay[key].push(n);
  });
  var html='';
  Object.keys(byDay).sort().reverse().forEach(function(key){
    var dayNotas=byDay[key];
    var dayOmzet=sumNota(dayNotas.filter(function(n){ return (n.statusBayar||'').toLowerCase()==='lunas'; }));
    var dateObj=new Date(key);
    var label=dateObj.toLocaleDateString('id-ID',{weekday:'short', day:'numeric', month:'short'});
    html+='<div style="background:rgba(255,255,255,0.8);padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,0.9);"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:800;">'+label+'</span><span style="font-size:11px;font-weight:700;color:#10b981;">Rp '+dayOmzet.toLocaleString('id-ID')+' • '+dayNotas.length+' nota</span></div><div style="margin-top:6px;display:flex;flex-direction:column;gap:4px;">';
    dayNotas.slice(0,5).forEach(function(n){
      html+='<div style="display:flex;justify-content:space-between;font-size:10px;"><span>'+n.nota+' • '+n.namaPelanggan+'</span><span>Rp '+(n.totalNota||0).toLocaleString('id-ID')+'</span></div>';
    });
    if(dayNotas.length>5) html+='<div style="font-size:9px;color:#888;">+'+(dayNotas.length-5)+' nota lainnya</div>';
    html+='</div></div>';
  });
  cont.innerHTML=html;
}

// BULANAN
function openLaporanBulananModal(){
  var ov=document.getElementById('modalLaporanBulananOverlay');
  if(ov) ov.classList.add('active');
  renderLaporanBulanan();
}
function closeLaporanBulananModal(){ var ov=document.getElementById('modalLaporanBulananOverlay'); if(ov) ov.classList.remove('active'); }
function renderLaporanBulanan(){
  var now=new Date();
  var start=new Date(now.getFullYear(), now.getMonth(), 1); start.setHours(0,0,0,0);
  var end=new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
  var label=start.toLocaleDateString('id-ID',{month:'long', year:'numeric'});
  document.getElementById('bulananPeriodeLabel').innerText=label+' • Detail harian';
  var notas=filterNotaByOutletAndDateRange(start, end);
  var omzet=sumNota(notas.filter(function(n){ return (n.statusBayar||'').toLowerCase()==='lunas'; }));
  var pengeluaran=sumPengeluaran(start, end);
  var laba=omzet-pengeluaran;
  document.getElementById('bulananOmzet').innerText='Rp '+omzet.toLocaleString('id-ID');
  document.getElementById('bulananPengeluaran').innerText='Rp '+pengeluaran.toLocaleString('id-ID');
  document.getElementById('bulananLaba').innerText='Rp '+laba.toLocaleString('id-ID');
  // Grafik harian
  var daysInMonth=new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  var daily={};
  for(var i=1;i<=daysInMonth;i++) daily[i]=0;
  notas.forEach(function(n){
    if((n.statusBayar||'').toLowerCase()!=='lunas') return;
    var d=getTanggalNota(n);
    if(d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear()){
      daily[d.getDate()]+=(n.totalNota||0);
    }
  });
  var max=Math.max.apply(null, Object.values(daily))||1;
  var grafikHtml='<div style="display:flex;align-items:flex-end;gap:2px;height:60px;">';
  for(var i=1;i<=daysInMonth;i++){
    var h=(daily[i]/max)*50;
    var color=daily[i]>0?'#10b981':'rgba(0,0,0,0.08)';
    grafikHtml+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;"><div style="width:100%;height:'+h+'px;background:'+color+';border-radius:3px;min-height:'+(daily[i]>0?'4px':'2px')+';"></div><span style="font-size:6px;color:#666;">'+i+'</span></div>';
  }
  grafikHtml+='</div>';
  document.getElementById('bulananGrafik').innerHTML=grafikHtml;
  var cont=document.getElementById('bulananList');
  if(notas.length===0){ cont.innerHTML='<div style="text-align:center;padding:20px;font-size:11px;color:#777;">Belum ada transaksi bulan ini</div>'; return; }
  // List by day desc
  var byDay={};
  notas.forEach(function(n){ var d=getTanggalNota(n); var key=d.getDate(); if(!byDay[key]) byDay[key]=[]; byDay[key].push(n); });
  var html='';
  Object.keys(byDay).sort(function(a,b){return b-a;}).forEach(function(day){
    var dayNotas=byDay[day];
    var dayOmzet=sumNota(dayNotas.filter(function(n){return (n.statusBayar||'').toLowerCase()==='lunas';}));
    html+='<div style="background:rgba(255,255,255,0.8);padding:8px 10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:11px;font-weight:700;">Tgl '+day+' • '+dayNotas.length+' nota</span><span style="font-size:11px;font-weight:700;color:#10b981;">Rp '+dayOmzet.toLocaleString('id-ID')+'</span></div>';
  });
  cont.innerHTML=html;
}

// LABA RUGI
function openLaporanLabaRugiModal(){
  var ov=document.getElementById('modalLaporanLabaRugiOverlay');
  if(ov) ov.classList.add('active');
  renderLaporanLabaRugi();
}
function closeLaporanLabaRugiModal(){ var ov=document.getElementById('modalLaporanLabaRugiOverlay'); if(ov) ov.classList.remove('active'); }
function renderLaporanLabaRugi(){
  var now=new Date();
  var start=new Date(now.getFullYear(), now.getMonth(), 1);
  var end=new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
  var notas=filterNotaByOutletAndDateRange(start, end);
  var pendapatanLaundry=sumNota(notas.filter(function(n){return (n.statusBayar||'').toLowerCase()==='lunas';}));
  var pendapatanDeposito=0;
  if(typeof depositoLogData!=='undefined'){
    var ao=getActiveOutlet();
    var depFiltered=depositoLogData.filter(function(d){
      if(d.outletId!==ao.id && d.outletId) return false;
      var t=new Date(d.tanggal);
      if(t<start || t>end) return false;
      return d.aksi==='Tambah';
    });
    pendapatanDeposito=depFiltered.reduce(function(a,c){return a+(c.nominal||0);},0);
  }
  var totalPendapatan=pendapatanLaundry+pendapatanDeposito;
  var pengeluaran=sumPengeluaran(start, end);
  var bebanListHtml='';
  if(typeof pengeluaranKasData!=='undefined'){
    var ao=getActiveOutlet();
    var filtered=pengeluaranKasData.filter(function(p){
      if(p.outletId!==ao.id && p.outletId) return false;
      var t=p.tanggal?new Date(p.tanggal):new Date();
      if(t<start || t>end) return false;
      return true;
    });
    if(filtered.length===0) bebanListHtml='<div style="font-size:10px;color:#888;text-align:center;padding:8px;">Belum ada pengeluaran bulan ini</div>';
    else{
      filtered.forEach(function(p){
        bebanListHtml+='<div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px dashed rgba(0,0,0,0.08);"><span>'+p.keterangan+'</span><span style="font-weight:600;">Rp '+(p.nominal||0).toLocaleString('id-ID')+'</span></div>';
      });
    }
  }
  document.getElementById('labaPendapatanLaundry').innerText='Rp '+pendapatanLaundry.toLocaleString('id-ID');
  document.getElementById('labaPendapatanDeposito').innerText='Rp '+pendapatanDeposito.toLocaleString('id-ID');
  document.getElementById('labaTotalPendapatan').innerText='Rp '+totalPendapatan.toLocaleString('id-ID');
  document.getElementById('labaBebanList').innerHTML=bebanListHtml;
  document.getElementById('labaTotalBeban').innerText='Rp '+pengeluaran.toLocaleString('id-ID');
  var labaBersih=totalPendapatan-pengeluaran;
  var el=document.getElementById('labaBersih');
  el.innerText='Rp '+labaBersih.toLocaleString('id-ID');
  el.style.color=labaBersih>=0?'#10b981':'#dc2626';
  var detail=document.getElementById('labaRugiDetail');
  detail.innerHTML='<div style="background:rgba(255,255,255,0.7);padding:10px;border-radius:8px;font-size:10px;color:#555;">'+
    '<div style="display:flex;justify-content:space-between;"><span>Periode</span><span style="font-weight:700;">'+start.toLocaleDateString('id-ID',{month:'long', year:'numeric'})+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Total Nota</span><span style="font-weight:700;">'+notas.length+' nota</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Lunas</span><span style="font-weight:700;color:#10b981;">'+notas.filter(function(n){return (n.statusBayar||'').toLowerCase()==='lunas';}).length+'</span></div>'+
    '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Belum Lunas</span><span style="font-weight:700;color:#f59e0b;">'+notas.filter(function(n){return (n.statusBayar||'').toLowerCase()!=='lunas';}).length+'</span></div>'+
  '</div>';
}

// CUSTOM
function openLaporanCustomModal(){
  var ov=document.getElementById('modalLaporanCustomOverlay');
  if(ov) ov.classList.add('active');
  // Set default dates: last 7 days
  var now=new Date(); var from=new Date(now); from.setDate(now.getDate()-7);
  document.getElementById('customDateFrom').value=from.toISOString().split('T')[0];
  document.getElementById('customDateTo').value=now.toISOString().split('T')[0];
  applyCustomLaporan();
}
function closeLaporanCustomModal(){ var ov=document.getElementById('modalLaporanCustomOverlay'); if(ov) ov.classList.remove('active'); }
function applyCustomLaporan(){
  var fromStr=document.getElementById('customDateFrom').value;
  var toStr=document.getElementById('customDateTo').value;
  if(!fromStr || !toStr){ showNoticeToast('Pilih tanggal dari & sampai'); return; }
  var start=new Date(fromStr); start.setHours(0,0,0,0);
  var end=new Date(toStr); end.setHours(23,59,59,999);
  if(start>end){ showNoticeToast('Tanggal dari harus sebelum sampai'); return; }
  var notas=filterNotaByOutletAndDateRange(start, end);
  var omzet=sumNota(notas.filter(function(n){return (n.statusBayar||'').toLowerCase()==='lunas';}));
  var pengeluaran=sumPengeluaran(start, end);
  var laba=omzet-pengeluaran;
  document.getElementById('customOmzet').innerText='Rp '+omzet.toLocaleString('id-ID');
  document.getElementById('customPengeluaran').innerText='Rp '+pengeluaran.toLocaleString('id-ID');
  document.getElementById('customLaba').innerText='Rp '+laba.toLocaleString('id-ID');
  var cont=document.getElementById('customList');
  if(notas.length===0){ cont.innerHTML='<div style="text-align:center;padding:20px;font-size:11px;color:#777;">Tidak ada transaksi di periode ini</div>'; return; }
  var html='<div style="font-size:10px;color:#666;margin-bottom:4px;">'+notas.length+' nota ditemukan dari '+start.toLocaleDateString('id-ID')+' - '+end.toLocaleDateString('id-ID')+'</div>';
  notas.sort(function(a,b){ return getTanggalNota(b)-getTanggalNota(a); }).forEach(function(n){
    var d=getTanggalNota(n);
    html+='<div style="background:rgba(255,255,255,0.8);padding:8px 10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;border:1px solid rgba(255,255,255,0.9);"><div><div style="font-size:11px;font-weight:700;">'+n.nota+' • '+n.namaPelanggan+'</div><div style="font-size:9px;color:#666;">'+d.toLocaleDateString('id-ID')+' • '+n.statusBayar+'</div></div><div style="font-size:11px;font-weight:700;color:'+((n.statusBayar||'').toLowerCase()==='lunas'?'#10b981':'#f59e0b')+';">Rp '+(n.totalNota||0).toLocaleString('id-ID')+'</div></div>';
  });
  cont.innerHTML=html;
}



// v8 ACUAN + KAS HARI INI 5 MODAL READY TAP - Tunai, Non Tunai, Pengeluaran, Deposito, Kas Hari Ini
function getTodayRange(){
  var now=new Date();
  var start=new Date(now); start.setHours(0,0,0,0);
  var end=new Date(now); end.setHours(23,59,59,999);
  return {now:now, start:start, end:end, label: now.toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'})};
}
function safeGetOutlet(){
  try{
    if(typeof getActiveOutlet==='function'){
      var ao=getActiveOutlet();
      if(ao && ao.id) return ao;
    }
    if(typeof outletsData!=='undefined' && outletsData.length>0){
      var active=outletsData.find(function(o){return o.isActive;});
      return active || outletsData[0];
    }
    return {id:'outlet-1'};
  }catch(e){ return {id:'outlet-1'}; }
}
function getNotasHariIni(){
  try{
    var range=getTodayRange();
    if(typeof filterNotaByOutletAndDateRange==='function'){
      return filterNotaByOutletAndDateRange(range.start, range.end);
    }
    var allNotas=(typeof antrianData!=='undefined'?antrianData:[]);
    var ao=safeGetOutlet();
    return allNotas.filter(function(n){
      if(ao && n.outletId && n.outletId!==ao.id) return false;
      var t;
      try{ t=n.tanggal?new Date(n.tanggal):new Date(); }catch(e){ t=new Date(); }
      return t>=range.start && t<=range.end;
    });
  }catch(e){ return (typeof antrianData!=='undefined'?antrianData:[]).slice(0,20); }
}
function getPengeluaranHariIni(){
  try{
    var range=getTodayRange();
    if(typeof pengeluaranKasData==='undefined') return [];
    var ao=safeGetOutlet();
    return pengeluaranKasData.filter(function(p){
      if(ao && p.outletId && p.outletId!==ao.id) return false;
      var t;
      try{ t=p.tanggal?new Date(p.tanggal):new Date(); }catch(e){ t=new Date(); }
      return t>=range.start && t<=range.end;
    });
  }catch(e){ return []; }
}
function getDepositoHariIni(){
  try{
    var range=getTodayRange();
    if(typeof depositoLogData==='undefined') return [];
    var ao=safeGetOutlet();
    return depositoLogData.filter(function(d){
      if(ao && d.outletId && d.outletId!==ao.id) return false;
      var t;
      try{ t=new Date(d.tanggal); }catch(e){ t=new Date(); }
      return t>=range.start && t<=range.end;
    });
  }catch(e){ return []; }
}
function isNonTunaiMetode(metode){
  var norm=(metode||'Tunai').toString().toLowerCase();
  return norm.indexOf('transfer')>-1 || norm.indexOf('qris')>-1 || norm.indexOf('debit')>-1 || norm.indexOf('kredit')>-1 || norm.indexOf('e-wallet')>-1 || norm.indexOf('ewallet')>-1 || norm.indexOf('gopay')>-1 || norm.indexOf('ovo')>-1 || norm.indexOf('dana')>-1 || norm.indexOf('non')>-1;
}

// KAS HARI INI OVERALL
function openKasHariIniModal(){
  try{
    var ov=document.getElementById('modalKasHariIniOverlay');
    if(!ov) return;
    ov.classList.add('active');
    var range=getTodayRange();
    var el=document.getElementById('kasHariIniTanggal'); if(el) el.innerText=range.label;
    var notasHariIni=getNotasHariIni();
    var notasLunas=notasHariIni.filter(function(n){ return (n.statusBayar||'').toLowerCase()==='lunas'; });
    var tunai=0, tunaiCount=0, nonTunai=0, nonTunaiCount=0;
    notasLunas.forEach(function(n){
      var metode=(n.metodeBayar||n.metodePembayaran||'Tunai').toString();
      if(isNonTunaiMetode(metode)){ nonTunai+=(n.totalNota||0); nonTunaiCount++; } else { tunai+=(n.totalNota||0); tunaiCount++; }
    });
    var totalPemasukan=tunai+nonTunai;
    var pengeluaranList=getPengeluaranHariIni();
    var totalPengeluaran=pengeluaranList.reduce(function(a,c){ return a+(c.nominal||0); },0);
    var kasBersih=totalPemasukan-totalPengeluaran;
    document.getElementById('kasHariIniTunai').innerText='Rp '+tunai.toLocaleString('id-ID');
    document.getElementById('kasHariIniTunaiCount').innerText=tunaiCount+' nota';
    document.getElementById('kasHariIniNonTunai').innerText='Rp '+nonTunai.toLocaleString('id-ID');
    document.getElementById('kasHariIniNonTunaiCount').innerText=nonTunaiCount+' nota';
    document.getElementById('kasHariIniPemasukan').innerText='Rp '+totalPemasukan.toLocaleString('id-ID');
    document.getElementById('kasHariIniPemasukanCount').innerText=notasLunas.length+' nota lunas';
    document.getElementById('kasHariIniPengeluaran').innerText='Rp '+totalPengeluaran.toLocaleString('id-ID');
    document.getElementById('kasHariIniPengeluaranCount').innerText=pengeluaranList.length+' pengeluaran';
    document.getElementById('kasHariIniBersih').innerText='Rp '+kasBersih.toLocaleString('id-ID');
    var rincianPemEl=document.getElementById('kasHariIniRincianPemasukan');
    if(notasLunas.length===0){
      rincianPemEl.innerHTML='<div style="text-align:center;padding:16px;font-size:11px;color:#777;background:rgba(0,0,0,0.03);border-radius:8px;">Belum ada pemasukan lunas hari ini</div>';
    } else {
      var html='';
      notasLunas.sort(function(a,b){ return new Date(b.tanggal||0)-new Date(a.tanggal||0); }).forEach(function(n){
        var metode=(n.metodeBayar||'Tunai').toString();
        var isNon=isNonTunaiMetode(metode);
        var badgeColor=isNon?'#3b82f6':'#10b981';
        var badgeBg=isNon?'rgba(59,130,246,0.12)':'rgba(16,185,129,0.12)';
        var t;
        try{ t=new Date(n.tanggal); }catch(e){ t=new Date(); }
        var jam=t.toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'});
        html+='<div style="background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div><div style="font-size:11px;font-weight:700;">'+(n.nota||'')+' • '+(n.namaPelanggan||'Pelanggan')+'</div><div style="font-size:9px;color:#666;margin-top:2px;">'+jam+' • '+(n.layanan||'').substring(0,30)+'</div></div><div style="text-align:right;"><div style="font-size:11px;font-weight:800;">Rp '+(n.totalNota||0).toLocaleString('id-ID')+'</div><div style="font-size:8px;font-weight:700;color:'+badgeColor+';background:'+badgeBg+';padding:2px 6px;border-radius:10px;margin-top:2px;display:inline-block;">'+metode+'</div></div></div>';
      });
      rincianPemEl.innerHTML=html;
    }
    var rincianPengEl=document.getElementById('kasHariIniRincianPengeluaran');
    if(pengeluaranList.length===0){
      rincianPengEl.innerHTML='<div style="text-align:center;padding:16px;font-size:11px;color:#777;background:rgba(0,0,0,0.03);border-radius:8px;">Belum ada pengeluaran hari ini</div>';
    } else {
      var html2='';
      pengeluaranList.forEach(function(p){
        var t;
        try{ t=new Date(p.tanggal); }catch(e){ t=new Date(); }
        var jam=t.toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'});
        html2+='<div style="background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div><div style="font-size:11px;font-weight:700;">'+(p.keterangan||'Pengeluaran')+'</div><div style="font-size:9px;color:#666;margin-top:2px;">'+jam+'</div></div><div style="font-size:11px;font-weight:800;color:#dc2626;">- Rp '+(p.nominal||0).toLocaleString('id-ID')+'</div></div>';
      });
      rincianPengEl.innerHTML=html2;
    }
  }catch(e){ console.log('Kas Hari Ini error', e); }
}
function closeKasHariIniModal(){ var ov=document.getElementById('modalKasHariIniOverlay'); if(ov) ov.classList.remove('active'); }

// TUNAI
function openKasTunaiModal(){
  try{
    var ov=document.getElementById('modalKasTunaiOverlay');
    if(!ov) return;
    ov.classList.add('active');
    var range=getTodayRange();
    var el=document.getElementById('kasTunaiTanggal'); if(el) el.innerText=range.label;
    var notasHariIni=getNotasHariIni();
    var notasTunai=notasHariIni.filter(function(n){
      if((n.statusBayar||'').toLowerCase()!=='lunas') return false;
      var metode=(n.metodeBayar||n.metodePembayaran||'Tunai').toString();
      return !isNonTunaiMetode(metode);
    });
    var total=notasTunai.reduce(function(a,c){ return a+(c.totalNota||0); },0);
    document.getElementById('kasTunaiTotalDetail').innerText='Rp '+total.toLocaleString('id-ID');
    document.getElementById('kasTunaiTotalCountDetail').innerText=notasTunai.length+' nota';
    var rincianEl=document.getElementById('kasTunaiRincian');
    if(notasTunai.length===0){
      rincianEl.innerHTML='<div style="text-align:center;padding:16px;font-size:11px;color:#777;background:rgba(0,0,0,0.03);border-radius:8px;">Belum ada pembayaran tunai hari ini</div>';
    } else {
      var html='';
      notasTunai.sort(function(a,b){ return new Date(b.tanggal||0)-new Date(a.tanggal||0); }).forEach(function(n){
        var t;
        try{ t=new Date(n.tanggal); }catch(e){ t=new Date(); }
        var jam=t.toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'});
        html+='<div style="background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div><div style="font-size:11px;font-weight:700;">'+(n.nota||'')+' • '+(n.namaPelanggan||'')+'</div><div style="font-size:9px;color:#666;margin-top:2px;">'+jam+' • '+(n.layanan||'').substring(0,30)+'</div></div><div style="text-align:right;"><div style="font-size:11px;font-weight:800;color:#10b981;">Rp '+(n.totalNota||0).toLocaleString('id-ID')+'</div><div style="font-size:8px;color:#065f46;background:rgba(16,185,129,0.12);padding:2px 6px;border-radius:10px;display:inline-block;margin-top:2px;">Tunai</div></div></div>';
      });
      rincianEl.innerHTML=html;
    }
  }catch(e){ console.log('Tunai error', e); }
}
function closeKasTunaiModal(){ var ov=document.getElementById('modalKasTunaiOverlay'); if(ov) ov.classList.remove('active'); }

// NON TUNAI
function openKasNonTunaiModal(){
  try{
    var ov=document.getElementById('modalKasNonTunaiOverlay');
    if(!ov) return;
    ov.classList.add('active');
    var range=getTodayRange();
    var el=document.getElementById('kasNonTunaiTanggal'); if(el) el.innerText=range.label+' • Transfer, QRIS, E-Wallet';
    var notasHariIni=getNotasHariIni();
    var notasNonTunai=notasHariIni.filter(function(n){
      if((n.statusBayar||'').toLowerCase()!=='lunas') return false;
      var metode=(n.metodeBayar||n.metodePembayaran||'Tunai').toString();
      return isNonTunaiMetode(metode);
    });
    var total=notasNonTunai.reduce(function(a,c){ return a+(c.totalNota||0); },0);
    document.getElementById('kasNonTunaiTotalDetail').innerText='Rp '+total.toLocaleString('id-ID');
    document.getElementById('kasNonTunaiTotalCountDetail').innerText=notasNonTunai.length+' nota';
    var rincianEl=document.getElementById('kasNonTunaiRincian');
    if(notasNonTunai.length===0){
      rincianEl.innerHTML='<div style="text-align:center;padding:16px;font-size:11px;color:#777;background:rgba(0,0,0,0.03);border-radius:8px;">Belum ada pembayaran non tunai hari ini</div>';
    } else {
      var html='';
      notasNonTunai.sort(function(a,b){ return new Date(b.tanggal||0)-new Date(a.tanggal||0); }).forEach(function(n){
        var metode=(n.metodeBayar||'Non Tunai').toString();
        var t;
        try{ t=new Date(n.tanggal); }catch(e){ t=new Date(); }
        var jam=t.toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'});
        html+='<div style="background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div><div style="font-size:11px;font-weight:700;">'+(n.nota||'')+' • '+(n.namaPelanggan||'')+'</div><div style="font-size:9px;color:#666;margin-top:2px;">'+jam+' • '+(n.layanan||'').substring(0,30)+'</div></div><div style="text-align:right;"><div style="font-size:11px;font-weight:800;color:#3b82f6;">Rp '+(n.totalNota||0).toLocaleString('id-ID')+'</div><div style="font-size:8px;color:#1e40af;background:rgba(59,130,246,0.12);padding:2px 6px;border-radius:10px;display:inline-block;margin-top:2px;">'+metode+'</div></div></div>';
      });
      rincianEl.innerHTML=html;
    }
    // Breakdown
    var breakdownEl=document.getElementById('kasNonTunaiBreakdown');
    var breakdown={};
    notasNonTunai.forEach(function(n){
      var metode=(n.metodeBayar||'Non Tunai').toString();
      if(!breakdown[metode]) breakdown[metode]={nominal:0, count:0};
      breakdown[metode].nominal+=(n.totalNota||0);
      breakdown[metode].count++;
    });
    var keys=Object.keys(breakdown);
    if(keys.length===0){
      breakdownEl.innerHTML='<div style="font-size:10px;color:#777;text-align:center;padding:8px;">Belum ada breakdown</div>';
    } else {
      var html2='';
      keys.forEach(function(k){
        var data=breakdown[k];
        html2+='<div style="background:rgba(59,130,246,0.08);padding:8px 10px;border-radius:8px;border:1.5px solid rgba(59,130,246,0.15);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block;"></span><span style="font-size:11px;font-weight:700;">'+k+'</span><span style="font-size:9px;color:#666;">('+data.count+')</span></div><span style="font-size:11px;font-weight:800;color:#3b82f6;">Rp '+data.nominal.toLocaleString('id-ID')+'</span></div>';
      });
      breakdownEl.innerHTML=html2;
    }
  }catch(e){ console.log('Non Tunai error', e); }
}
function closeKasNonTunaiModal(){ var ov=document.getElementById('modalKasNonTunaiOverlay'); if(ov) ov.classList.remove('active'); }

// PENGELUARAN
function openKasPengeluaranModal(){
  try{
    var ov=document.getElementById('modalKasPengeluaranOverlay');
    if(!ov) return;
    ov.classList.add('active');
    var range=getTodayRange();
    var el=document.getElementById('kasPengeluaranTanggal'); if(el) el.innerText=range.label;
    var pengeluaranList=getPengeluaranHariIni();
    var total=pengeluaranList.reduce(function(a,c){ return a+(c.nominal||0); },0);
    document.getElementById('kasPengeluaranTotalDetail').innerText='Rp '+total.toLocaleString('id-ID');
    document.getElementById('kasPengeluaranTotalCountDetail').innerText=pengeluaranList.length+' pengeluaran';
    var rincianEl=document.getElementById('kasPengeluaranRincian');
    if(pengeluaranList.length===0){
      rincianEl.innerHTML='<div style="text-align:center;padding:16px;font-size:11px;color:#777;background:rgba(0,0,0,0.03);border-radius:8px;">Belum ada pengeluaran hari ini</div>';
    } else {
      var html='';
      pengeluaranList.sort(function(a,b){ return new Date(b.tanggal||0)-new Date(a.tanggal||0); }).forEach(function(p){
        var t;
        try{ t=new Date(p.tanggal); }catch(e){ t=new Date(); }
        var jam=t.toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'});
        html+='<div style="background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div><div style="font-size:11px;font-weight:700;">'+(p.keterangan||'Pengeluaran')+'</div><div style="font-size:9px;color:#666;margin-top:2px;">'+jam+'</div></div><div style="font-size:11px;font-weight:800;color:#dc2626;">- Rp '+(p.nominal||0).toLocaleString('id-ID')+'</div></div>';
      });
      rincianEl.innerHTML=html;
    }
  }catch(e){ console.log('Pengeluaran error', e); }
}
function closeKasPengeluaranModal(){ var ov=document.getElementById('modalKasPengeluaranOverlay'); if(ov) ov.classList.remove('active'); }

// DEPOSITO
function openKasDepositoModal(){
  try{
    var ov=document.getElementById('modalKasDepositoOverlay');
    if(!ov) return;
    ov.classList.add('active');
    var range=getTodayRange();
    var el=document.getElementById('kasDepositoTanggal'); if(el) el.innerText=range.label;
    var depositoList=getDepositoHariIni();
    var total=depositoList.reduce(function(a,c){ return a+(c.nominal||0); },0);
    document.getElementById('kasDepositoTotalDetail').innerText='Rp '+total.toLocaleString('id-ID');
    document.getElementById('kasDepositoTotalCountDetail').innerText=depositoList.length+' transaksi';
    var rincianEl=document.getElementById('kasDepositoRincian');
    if(depositoList.length===0){
      rincianEl.innerHTML='<div style="text-align:center;padding:16px;font-size:11px;color:#777;background:rgba(0,0,0,0.03);border-radius:8px;">Belum ada transaksi deposito hari ini</div>';
    } else {
      var html='';
      depositoList.sort(function(a,b){ return new Date(b.tanggal||0)-new Date(a.tanggal||0); }).forEach(function(d){
        var t;
        try{ t=new Date(d.tanggal); }catch(e){ t=new Date(); }
        var jam=t.toLocaleTimeString('id-ID',{hour:'2-digit', minute:'2-digit'});
        var aksiColor=d.aksi==='Tambah'?'#10b981':'#dc2626';
        var aksiBg=d.aksi==='Tambah'?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)';
        html+='<div style="background:rgba(255,255,255,0.9);padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.8);display:flex;justify-content:space-between;align-items:center;margin-top:4px;"><div><div style="font-size:11px;font-weight:700;">'+(d.namaPelanggan||'Pelanggan')+' • '+(d.keterangan||d.aksi||'')+'</div><div style="font-size:9px;color:#666;margin-top:2px;">'+jam+'</div></div><div style="text-align:right;"><div style="font-size:11px;font-weight:800;color:'+aksiColor+';">Rp '+(d.nominal||0).toLocaleString('id-ID')+'</div><div style="font-size:8px;color:'+aksiColor+';background:'+aksiBg+';padding:2px 6px;border-radius:10px;display:inline-block;margin-top:2px;">'+(d.aksi||'')+'</div></div></div>';
      });
      rincianEl.innerHTML=html;
    }
  }catch(e){ console.log('Deposito error', e); }
}
function closeKasDepositoModal(){ var ov=document.getElementById('modalKasDepositoOverlay'); if(ov) ov.classList.remove('active'); }



// PERTUMBUHAN PELANGGAN - 3 KARTU: Pelanggan Baru, Loyal, Aktif dengan badge harian mingguan bulanan
if(typeof activePertumbuhanPeriode==='undefined') var activePertumbuhanPeriode='harian';

function switchPertumbuhanPeriode(periode, el){
  try{
    activePertumbuhanPeriode=periode;
    document.querySelectorAll('[id^="pertumbuhan-badge-"]').forEach(function(b){
      b.style.background='rgba(0,0,0,0.06)';
      b.style.color='#555';
      b.style.fontSize='13px';
      b.style.padding='8px 16px';
    });
    if(el){
      el.style.background='#111';
      el.style.color='#fff';
    }
    var labelEl=document.getElementById('pertumbuhanPeriodeLabel');
    if(labelEl){
      if(periode==='harian') labelEl.innerText='Hari ini • Detail pelanggan baru, loyal, aktif';
      else if(periode==='mingguan') labelEl.innerText='Minggu ini • 7 hari terakhir';
      else if(periode==='bulanan') labelEl.innerText='Bulan ini • 30 hari terakhir';
    }
    renderPertumbuhanPelanggan();
  }catch(e){ console.log('switchPertumbuhanPeriode error', e); }
}

function getPertumbuhanDateRange(periode){
  var now=new Date();
  var start=new Date(now);
  var end=new Date(now); end.setHours(23,59,59,999);
  if(periode==='harian'){
    start.setHours(0,0,0,0);
  } else if(periode==='mingguan'){
    start.setDate(now.getDate()-6); start.setHours(0,0,0,0);
  } else if(periode==='bulanan'){
    start.setDate(now.getDate()-29); start.setHours(0,0,0,0);
  }
  return {start:start, end:end};
}

function renderPertumbuhanPelanggan(){
  try{
    var periode = (typeof activePertumbuhanPeriode!=='undefined'?activePertumbuhanPeriode:'harian');
    var range=getPertumbuhanDateRange(periode);
    var start=range.start, end=range.end;
    var ao;
    try{ ao=(typeof getActiveOutlet==='function'?getActiveOutlet():{id:'outlet-1'}); }catch(e){ ao={id:'outlet-1'}; }
    if(typeof ao!=='object') ao={id:'outlet-1'};

    // Get notas in period
    var allNotas=(typeof antrianData!=='undefined'?antrianData:[]);
    var notasInPeriod=allNotas.filter(function(n){
      if(ao && n.outletId && n.outletId!==ao.id) return false;
      var t;
      try{ t=n.tanggal?new Date(n.tanggal):new Date(); }catch(e){ t=new Date(); }
      return t>=start && t<=end;
    });

    // Build map of first order per pelanggan across ALL notas (not just period)
    var firstOrderMap={};
    allNotas.forEach(function(n){
      if(ao && n.outletId && n.outletId!==ao.id) return;
      var nama=n.namaPelanggan||'';
      if(!nama) return;
      var t;
      try{ t=n.tanggal?new Date(n.tanggal):new Date(); }catch(e){ t=new Date(); }
      if(!firstOrderMap[nama] || t < firstOrderMap[nama]){
        firstOrderMap[nama]=t;
      }
    });

    // KARTU 1: PELANGGAN BARU - yang first order dalam periode
    var pelangganBaru=[];
    Object.keys(firstOrderMap).forEach(function(nama){
      var firstDate=firstOrderMap[nama];
      if(firstDate>=start && firstDate<=end){
        pelangganBaru.push({nama:nama, firstDate:firstDate});
      }
    });
    pelangganBaru.sort(function(a,b){ return b.firstDate - a.firstDate; });

    var baruListEl=document.getElementById('pelangganBaruList');
    var baruCountEl=document.getElementById('pelangganBaruCount');
    var baruTotalEl=document.getElementById('pelangganBaruTotal');
    if(baruCountEl) baruCountEl.innerText=pelangganBaru.length+' baru';
    if(baruTotalEl) baruTotalEl.innerText=pelangganBaru.length;
    if(baruListEl){
      if(pelangganBaru.length===0){
        baruListEl.innerHTML='<div style="text-align:center;padding:12px;font-size:10px;color:#777;background:rgba(255,255,255,0.6);border-radius:8px;">Belum ada pelanggan baru di periode ini</div>';
      } else {
        var html='';
        pelangganBaru.forEach(function(p, idx){
          var dateStr=p.firstDate.toLocaleDateString('id-ID',{day:'numeric', month:'short'});
          html+='<div style="display:grid;grid-template-columns:1fr 60px;gap:4px;padding:6px 8px;background:rgba(255,255,255,0.85);border-radius:6px;border:1px solid rgba(255,255,255,0.8);"><div style="display:flex;align-items:center;gap:6px;"><span style="width:18px;height:18px;border-radius:50%;background:rgba(16,185,129,0.12);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#065f46;">'+(idx+1)+'</span><span style="font-size:10px;font-weight:700;">'+p.nama+'</span><span style="font-size:8px;color:#666;">'+dateStr+'</span></div><div style="text-align:center;font-size:10px;font-weight:800;background:#10b981;color:#fff;padding:2px 6px;border-radius:10px;">1</div></div>';
        });
        baruListEl.innerHTML=html;
      }
    }

    // KARTU 2: PELANGGAN LOYAL - Top 10 by nominal in period
    var loyalMap={};
    notasInPeriod.forEach(function(n){
      var nama=n.namaPelanggan||'';
      if(!nama) return;
      if(!loyalMap[nama]) loyalMap[nama]=0;
      loyalMap[nama]+=(n.totalNota||0);
    });
    var loyalList=Object.keys(loyalMap).map(function(nama){ return {nama:nama, nominal:loyalMap[nama]}; }).sort(function(a,b){ return b.nominal - a.nominal; }).slice(0,10);

    var loyalListEl=document.getElementById('pelangganLoyalList');
    if(loyalListEl){
      if(loyalList.length===0){
        loyalListEl.innerHTML='<div style="text-align:center;padding:12px;font-size:10px;color:#777;background:rgba(255,255,255,0.6);border-radius:8px;">Belum ada data loyal di periode ini</div>';
      } else {
        var html2='';
        loyalList.forEach(function(p, idx){
          var rankColor=idx===0?'#f59e0b':idx===1?'#6b7280':idx===2?'#92400e':'#3b82f6';
          var rankBg=idx===0?'rgba(245,158,11,0.12)':idx===1?'rgba(107,114,128,0.12)':idx===2?'rgba(146,64,14,0.12)':'rgba(59,130,246,0.08)';
          html2+='<div style="display:grid;grid-template-columns:1fr 90px;gap:4px;padding:6px 8px;background:rgba(255,255,255,0.85);border-radius:6px;border:1px solid rgba(255,255,255,0.8);"><div style="display:flex;align-items:center;gap:6px;"><span style="width:18px;height:18px;border-radius:50%;background:'+rankBg+';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:'+rankColor+';">'+(idx+1)+'</span><span style="font-size:10px;font-weight:700;">'+p.nama+'</span></div><div style="text-align:right;font-size:10px;font-weight:800;color:'+rankColor+';">Rp '+p.nominal.toLocaleString('id-ID')+'</div></div>';
        });
        loyalListEl.innerHTML=html2;
      }
    }

    // KARTU 3: PELANGGAN AKTIF - Top 10 by visit count (1 nota = 1 visit)
    var aktifMap={};
    notasInPeriod.forEach(function(n){
      var nama=n.namaPelanggan||'';
      if(!nama) return;
      if(!aktifMap[nama]) aktifMap[nama]=0;
      aktifMap[nama]+=1;
    });
    var aktifList=Object.keys(aktifMap).map(function(nama){ return {nama:nama, visit:aktifMap[nama]}; }).sort(function(a,b){ return b.visit - a.visit; }).slice(0,10);

    var aktifListEl=document.getElementById('pelangganAktifList');
    if(aktifListEl){
      if(aktifList.length===0){
        aktifListEl.innerHTML='<div style="text-align:center;padding:12px;font-size:10px;color:#777;background:rgba(255,255,255,0.6);border-radius:8px;">Belum ada data aktif di periode ini</div>';
      } else {
        var html3='';
        aktifList.forEach(function(p, idx){
          var rankColor=idx===0?'#f59e0b':idx===1?'#6b7280':idx===2?'#92400e':'#92400e';
          var rankBg=idx===0?'rgba(245,158,11,0.15)':idx===1?'rgba(107,114,128,0.12)':idx===2?'rgba(146,64,14,0.12)':'rgba(245,158,11,0.08)';
          html3+='<div style="display:grid;grid-template-columns:1fr 60px;gap:4px;padding:6px 8px;background:rgba(255,255,255,0.85);border-radius:6px;border:1px solid rgba(255,255,255,0.8);"><div style="display:flex;align-items:center;gap:6px;"><span style="width:18px;height:18px;border-radius:50%;background:'+rankBg+';display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:'+rankColor+';">'+(idx+1)+'</span><span style="font-size:10px;font-weight:700;">'+p.nama+'</span></div><div style="text-align:center;font-size:10px;font-weight:800;background:'+rankBg+';color:'+rankColor+';padding:2px 6px;border-radius:10px;">'+p.visit+'x</div></div>';
        });
        aktifListEl.innerHTML=html3;
      }
    }

  }catch(e){ console.log('renderPertumbuhanPelanggan error', e); }
}

// Override renderStatistikLayanan to also render Pertumbuhan Pelanggan
(function(){
  var _origRenderStatistik = window.renderStatistikLayanan;
  window.renderStatistikLayanan = function(startDate, endDate){
    try{
      if(_origRenderStatistik) _origRenderStatistik(startDate, endDate);
    }catch(e){}
    try{
      // If called with custom date range from switchStatistikPeriode, sync pertumbuhan periode
      if(startDate && endDate){
        var diffDays = Math.round((endDate - startDate)/(1000*60*60*24));
        if(diffDays<=1) activePertumbuhanPeriode='harian';
        else if(diffDays<=7) activePertumbuhanPeriode='mingguan';
        else activePertumbuhanPeriode='bulanan';
        // Update badge UI
        document.querySelectorAll('[id^="pertumbuhan-badge-"]').forEach(function(b){
          b.style.background='rgba(0,0,0,0.06)';
          b.style.color='#555';
        });
        var activeBadge=document.getElementById('pertumbuhan-badge-'+activePertumbuhanPeriode);
        if(activeBadge){ activeBadge.style.background='#111'; activeBadge.style.color='#fff'; }
      }
      renderPertumbuhanPelanggan();
    }catch(e){}
  };
})();

// Init pertumbuhan on modal open
(function(){
  var _origOpenStatistik = window.openStatistikLayananModal;
  window.openStatistikLayananModal = function(){
    try{
      if(_origOpenStatistik) _origOpenStatistik();
      else {
        var ov=document.getElementById('modalStatistikLayananOverlay');
        if(ov) ov.classList.add('active');
        if(typeof renderStatistikLayanan==='function') renderStatistikLayanan();
      }
      setTimeout(function(){ renderPertumbuhanPelanggan(); },300);
    }catch(e){}
  };
})();



// LEVEL & HAK AKSES - Owner, Admin, Kasir, Operator - Checklist = Menampilkan, Unchecklist = Hidden
if(typeof levelPermissions==='undefined') var levelPermissions = JSON.parse(localStorage.getItem('levelPermissions') || 'null') || {
  Owner: { // Owner default: semua menu tampil
    'Data Outlet': true,
    'Data Karyawan': true,
    'Data Pelanggan': true,
    'Data Layanan': true,
    'Data Deposito': true,
    'Data Diskon': true,
    'Export Import': true,
    'Level & Hak Akses': true,
    'Master Struk': true,
    'Global Setting': true,
    'Kas Hari Ini': true,
    'Tunai': true,
    'Non Tunai': true,
    'Pengeluaran': true,
    'Deposito Kas': true,
    'Selisih Hari Ini': true,
    'Pelanggan & Deposito': true,
    'Global Omzet': true,
    'Antrian': true,
    'Laporan': true,
    'Riwayat Nota': true,
    'Laporan Deposito': true,
    'Statistik Layanan': true,
    'Pertumbuhan Pelanggan': true,
    'Laporan Mingguan': true,
    'Laporan Bulanan': true,
    'Laporan Laba Rugi': true,
    'Laporan Custom': true,
    'Setting': true
  },
  Admin: { // Admin default: hampir semua, kecuali Level & Hak Akses (hanya Owner)
    'Data Outlet': true,
    'Data Karyawan': true,
    'Data Pelanggan': true,
    'Data Layanan': true,
    'Data Deposito': true,
    'Data Diskon': true,
    'Export Import': true,
    'Level & Hak Akses': false,
    'Master Struk': true,
    'Global Setting': true,
    'Kas Hari Ini': true,
    'Tunai': true,
    'Non Tunai': true,
    'Pengeluaran': true,
    'Deposito Kas': true,
    'Selisih Hari Ini': true,
    'Pelanggan & Deposito': true,
    'Global Omzet': true,
    'Antrian': true,
    'Laporan': true,
    'Riwayat Nota': true,
    'Laporan Deposito': true,
    'Statistik Layanan': true,
    'Pertumbuhan Pelanggan': true,
    'Laporan Mingguan': true,
    'Laporan Bulanan': true,
    'Laporan Laba Rugi': true,
    'Laporan Custom': true,
    'Setting': true
  },
  Kasir: { // Kasir default: Kas, Antrian, Laporan view, tidak bisa master data outlet/karyawan
    'Data Outlet': false,
    'Data Karyawan': false,
    'Data Pelanggan': true,
    'Data Layanan': false,
    'Data Deposito': true,
    'Data Diskon': false,
    'Export Import': false,
    'Level & Hak Akses': false,
    'Master Struk': false,
    'Global Setting': false,
    'Kas Hari Ini': true,
    'Tunai': true,
    'Non Tunai': true,
    'Pengeluaran': true,
    'Deposito Kas': true,
    'Selisih Hari Ini': true,
    'Pelanggan & Deposito': true,
    'Global Omzet': false,
    'Antrian': true,
    'Laporan': true,
    'Riwayat Nota': true,
    'Laporan Deposito': true,
    'Statistik Layanan': true,
    'Pertumbuhan Pelanggan': false,
    'Laporan Mingguan': true,
    'Laporan Bulanan': true,
    'Laporan Laba Rugi': false,
    'Laporan Custom': true,
    'Setting': false
  },
  Operator: { // Operator default: hanya Antrian dan Kas sederhana, tidak bisa laporan keuangan
    'Data Outlet': false,
    'Data Karyawan': false,
    'Data Pelanggan': true,
    'Data Layanan': false,
    'Data Deposito': false,
    'Data Diskon': false,
    'Export Import': false,
    'Level & Hak Akses': false,
    'Master Struk': false,
    'Global Setting': false,
    'Kas Hari Ini': true,
    'Tunai': false,
    'Non Tunai': false,
    'Pengeluaran': false,
    'Deposito Kas': false,
    'Selisih Hari Ini': false,
    'Pelanggan & Deposito': false,
    'Global Omzet': false,
    'Antrian': true,
    'Laporan': false,
    'Riwayat Nota': false,
    'Laporan Deposito': false,
    'Statistik Layanan': false,
    'Pertumbuhan Pelanggan': false,
    'Laporan Mingguan': false,
    'Laporan Bulanan': false,
    'Laporan Laba Rugi': false,
    'Laporan Custom': false,
    'Setting': false
  }
};

if(typeof activeLevelTab==='undefined') var activeLevelTab='Owner';

var allMenus = [
  {id:'Data Outlet', label:'Data Outlet', icon:'🏠', group:'Master Data'},
  {id:'Data Karyawan', label:'Data Karyawan', icon:'👥', group:'Master Data'},
  {id:'Data Pelanggan', label:'Data Pelanggan', icon:'👤', group:'Master Data'},
  {id:'Data Layanan', label:'Data Layanan', icon:'🏷️', group:'Master Data'},
  {id:'Data Deposito', label:'Data Deposito', icon:'🏦', group:'Master Data'},
  {id:'Data Diskon', label:'Data Diskon', icon:'🎟️', group:'Master Data'},
  {id:'Export Import', label:'Export Import & Templates', icon:'📤', group:'Master Data'},
  {id:'Level & Hak Akses', label:'Level & Hak Akses', icon:'🛡️', group:'Master Data'},
  {id:'Master Struk', label:'Master Struk & Template', icon:'🧾', group:'Global Setting'},
  {id:'Global Setting', label:'Global Setting', icon:'⚙️', group:'Global Setting'},
  {id:'Kas Hari Ini', label:'Kas Hari Ini (Dropdown)', icon:'💰', group:'Home - Kas'},
  {id:'Tunai', label:'Tunai', icon:'💵', group:'Home - Kas'},
  {id:'Non Tunai', label:'Non Tunai', icon:'💳', group:'Home - Kas'},
  {id:'Pengeluaran', label:'Pengeluaran', icon:'📤', group:'Home - Kas'},
  {id:'Deposito Kas', label:'Deposito (Kas)', icon:'🏦', group:'Home - Kas'},
  {id:'Selisih Hari Ini', label:'Selisih Hari Ini', icon:'📊', group:'Home - Kas'},
  {id:'Pelanggan & Deposito', label:'Pelanggan & Deposito', icon:'👥', group:'Home'},
  {id:'Global Omzet', label:'Global Omzet (All Outlet)', icon:'🌐', group:'Home'},
  {id:'Antrian', label:'Antrian', icon:'📋', group:'Navigation'},
  {id:'Laporan', label:'Laporan', icon:'📈', group:'Navigation'},
  {id:'Setting', label:'Setting', icon:'⚙️', group:'Navigation'},
  {id:'Riwayat Nota', label:'Riwayat Nota', icon:'📜', group:'Laporan'},
  {id:'Laporan Deposito', label:'Laporan Deposito', icon:'🏦', group:'Laporan'},
  {id:'Statistik Layanan', label:'Statistik Layanan', icon:'📊', group:'Laporan'},
  {id:'Pertumbuhan Pelanggan', label:'Pertumbuhan Pelanggan', icon:'📈', group:'Laporan'},
  {id:'Laporan Mingguan', label:'Laporan Mingguan', icon:'📅', group:'Laporan'},
  {id:'Laporan Bulanan', label:'Laporan Bulanan', icon:'📆', group:'Laporan'},
  {id:'Laporan Laba Rugi', label:'Laporan Laba Rugi', icon:'💹', group:'Laporan'},
  {id:'Laporan Custom', label:'Laporan Custom', icon:'🔍', group:'Laporan'}
];

function openLevelSettingModal(){
  try{
    var ov=document.getElementById('modalLevelSettingOverlay');
    if(!ov){ if(typeof showNoticeToast==='function') showNoticeToast('Modal Level tidak ditemukan'); return; }
    ov.classList.add('active');
    activeLevelTab='Owner';
    // Reset tab UI
    document.querySelectorAll('.level-tab').forEach(function(btn){
      var lvl=btn.getAttribute('data-level');
      if(lvl==='Owner'){
        btn.style.background='#7e22ce'; btn.style.color='#fff'; btn.classList.add('active');
      } else {
        btn.style.background='rgba(168,85,247,0.08)'; btn.style.color='#7e22ce'; btn.classList.remove('active');
        if(lvl==='Kasir'){ btn.style.background='rgba(16,185,129,0.08)'; btn.style.color='#065f46'; }
        if(lvl==='Operator'){ btn.style.background='rgba(59,130,246,0.08)'; btn.style.color='#1e40af'; }
      }
    });
    renderLevelMenuList();
  }catch(e){ if(typeof showNoticeToast==='function') showNoticeToast('Gagal buka Level: '+e.message); }
}
function closeLevelSettingModal(){
  var ov=document.getElementById('modalLevelSettingOverlay');
  if(ov) ov.classList.remove('active');
}
function switchLevelTab(level, el){
  try{
    activeLevelTab=level;
    document.querySelectorAll('.level-tab').forEach(function(btn){
      var lvl=btn.getAttribute('data-level');
      btn.classList.remove('active');
      if(lvl==='Owner'){ btn.style.background='rgba(168,85,247,0.08)'; btn.style.color='#7e22ce'; }
      else if(lvl==='Admin'){ btn.style.background='rgba(168,85,247,0.08)'; btn.style.color='#7e22ce'; }
      else if(lvl==='Kasir'){ btn.style.background='rgba(16,185,129,0.08)'; btn.style.color='#065f46'; }
      else if(lvl==='Operator'){ btn.style.background='rgba(59,130,246,0.08)'; btn.style.color='#1e40af'; }
    });
    if(el){
      el.classList.add('active');
      if(level==='Owner'){ el.style.background='#7e22ce'; el.style.color='#fff'; }
      else if(level==='Admin'){ el.style.background='#7e22ce'; el.style.color='#fff'; }
      else if(level==='Kasir'){ el.style.background='#065f46'; el.style.color='#fff'; }
      else if(level==='Operator'){ el.style.background='#1e40af'; el.style.color='#fff'; }
    }
    renderLevelMenuList();
  }catch(e){ console.log('switchLevelTab error', e); }
}
function renderLevelMenuList(){
  try{
    var listEl=document.getElementById('levelMenuList');
    if(!listEl) return;
    var perms=levelPermissions[activeLevelTab] || {};
    var grouped={};
    allMenus.forEach(function(menu){
      if(!grouped[menu.group]) grouped[menu.group]=[];
      grouped[menu.group].push(menu);
    });
    var html='';
    Object.keys(grouped).forEach(function(group){
      html+='<div style="margin-top:10px;"><div style="font-size:10px;font-weight:800;color:#666;background:rgba(0,0,0,0.04);padding:4px 8px;border-radius:6px;margin-bottom:6px;">'+group+'</div>';
      grouped[group].forEach(function(menu){
        var isChecked=perms[menu.id]!==false; // default true if undefined
        var checkedAttr=isChecked?'checked':'';
        var rowBg=isChecked?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.04)';
        var borderColor=isChecked?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.12)';
        var iconColor=isChecked?'#10b981':'#dc2626';
        html+='<label style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:'+rowBg+';border:1.5px solid '+borderColor+';border-radius:8px;cursor:pointer;margin-top:4px;">';
        html+='<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:14px;">'+menu.icon+'</span><span style="font-size:11px;font-weight:700;color:#111;">'+menu.label+'</span></div>';
        html+='<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:9px;font-weight:700;color:'+iconColor+';">'+(isChecked?'Menampilkan':'Hidden')+'</span><input type="checkbox" data-menu-id="'+menu.id+'" '+checkedAttr+' onchange="toggleLevelMenu(this)" style="width:18px;height:18px;accent-color:#7e22ce;"></div>';
        html+='</label>';
      });
      html+='</div>';
    });
    listEl.innerHTML=html;
  }catch(e){ console.log('renderLevelMenuList error', e); }
}
function toggleLevelMenu(checkbox){
  try{
    var menuId=checkbox.getAttribute('data-menu-id');
    if(!levelPermissions[activeLevelTab]) levelPermissions[activeLevelTab]={};
    levelPermissions[activeLevelTab][menuId]=checkbox.checked;
    // Update row UI
    var label=checkbox.closest('label');
    if(label){
      if(checkbox.checked){
        label.style.background='rgba(16,185,129,0.06)';
        label.style.borderColor='rgba(16,185,129,0.15)';
        var statusSpan=label.querySelector('span[style*="font-size:9px"]');
        if(statusSpan){ statusSpan.innerText='Menampilkan'; statusSpan.style.color='#10b981'; }
      } else {
        label.style.background='rgba(239,68,68,0.04)';
        label.style.borderColor='rgba(239,68,68,0.12)';
        var statusSpan=label.querySelector('span[style*="font-size:9px"]');
        if(statusSpan){ statusSpan.innerText='Hidden'; statusSpan.style.color='#dc2626'; }
      }
    }
  }catch(e){ console.log('toggleLevelMenu error', e); }
}
function checkAllLevelMenu(check){
  try{
    if(!levelPermissions[activeLevelTab]) levelPermissions[activeLevelTab]={};
    allMenus.forEach(function(menu){
      levelPermissions[activeLevelTab][menu.id]=check;
    });
    renderLevelMenuList();
    if(typeof showNoticeToast==='function') showNoticeToast((check?'✅ Semua':'❌ Semua')+' menu '+(check?'ditampilkan':'di-hidden')+' untuk '+activeLevelTab);
  }catch(e){}
}
function saveLevelSetting(){
  try{
    localStorage.setItem('levelPermissions', JSON.stringify(levelPermissions));
    if(typeof showNoticeToast==='function') showNoticeToast('✅ Hak akses '+activeLevelTab+' disimpan!');
    closeLevelSettingModal();
    applyLevelPermissions();
  }catch(e){ if(typeof showNoticeToast==='function') showNoticeToast('Gagal simpan: '+e.message); }
}
function applyLevelPermissions(){
  try{
    // Get current user level from localStorage or default Owner
    var currentLevel=localStorage.getItem('currentUserLevel') || 'Owner';
    var perms=levelPermissions[currentLevel];
    if(!perms) return;
    // Apply visibility to menu cards - this is best effort, hide cards based on permissions
    // We map menu ids to selectors
    var selectorMap={
      'Data Outlet': '[onclick="openModalOutlet()"]',
      'Data Karyawan': '[onclick="openModalKaryawan()"]',
      'Data Pelanggan': '[onclick="openModalPelanggan()"]',
      'Data Layanan': '[onclick="openModalLayanan()"]',
      'Level & Hak Akses': '[onclick="openLevelSettingModal()"]',
      'Statistik Layanan': '[onclick="openStatistikLayananModal()"]',
      'Pertumbuhan Pelanggan': '[onclick="openPertumbuhanPelangganModal()"]',
      'Kas Hari Ini': '.card-dropdown',
      'Tunai': '#row-tunai',
      'Non Tunai': '#row-non-tunai',
      'Pengeluaran': '#row-pengeluaran',
      'Deposito Kas': '#row-deposito'
    };
    Object.keys(selectorMap).forEach(function(menuId){
      var sel=selectorMap[menuId];
      var els=document.querySelectorAll(sel);
      els.forEach(function(el){
        if(perms[menuId]===false){
          el.style.display='none';
        } else {
          el.style.display='';
        }
      });
    });
  }catch(e){ console.log('applyLevelPermissions error', e); }
}
// Auto apply on load
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){ 
    try{ applyLevelPermissions(); }catch(e){}
  }, 1000);
});



// LOGOUT - HEADER ORIGINAL + NOTICE
function showLoginError(msg){ const el=document.getElementById('loginErrorNotice'); if(el){ el.innerText=msg; el.style.display='block'; setTimeout(()=>{ el.style.display='none'; }, 4000); } const form=document.querySelector('#laundry-splash .login'); if(form){ form.style.animation='shake 0.4s ease'; setTimeout(()=>{ form.style.animation=''; }, 400); } }
function doLogout(){
  console.log('logout tapped');
  const cu = localStorage.getItem('currentUser');
  let name = '-';
  try{ const u=JSON.parse(cu); name = `${u.nama||u.username} (${u.level||''})`; }catch(e){}
  const el = document.getElementById('logoutChoiceUser');
  if(el) el.innerText = name;
  const ov = document.getElementById('modalLogoutChoiceOverlay');
  if(ov) ov.style.display='flex';
}
function closeLogoutModal(){ const ov=document.getElementById('modalLogoutChoiceOverlay'); if(ov) ov.style.display='none'; }
function confirmLogout(){
  closeLogoutModal();
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserLevel');
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('lastLoginTime');
  const w=document.getElementById('app-splash-wrapper');
  if(w){ w.style.display='flex'; w.classList.remove('hidden'); const logo=w.querySelector('.logo'); if(logo){ logo.style.animation='none'; void logo.offsetWidth; logo.style.animation='drop 2.2s cubic-bezier(.18,.86,.35,1.2) forwards'; } const inputs=w.querySelectorAll('input'); inputs.forEach(i=> i.value=''); }
  const btn=document.getElementById('header-logout-icon'); if(btn) { btn.classList.remove('show'); btn.style.display='none'; }
  if(typeof showNoticeToast==='function') showNoticeToast('👋 Logout berhasil');
}
function updateLogoutIcon(){
  const cu=localStorage.getItem('currentUser');
  const btn=document.getElementById('header-logout-icon');
  if(cu && btn){ btn.style.display='flex'; btn.classList.add('show'); }
  else if(btn){ btn.style.display='none'; btn.classList.remove('show'); }
}
document.addEventListener('DOMContentLoaded', ()=>{
  const form=document.querySelector('#laundry-splash .login');
  const wrapper=document.getElementById('app-splash-wrapper');
  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const inputs=form.querySelectorAll('input');
      const username=inputs[0]?.value.trim()||'';
      const password=inputs[1]?.value.trim()||'';
      if(!username||!password){ showNoticeToast('⚠️ Isi username & password'); showLoginError('Isi username & password'); return; }
      
      // MASTER LOGIN owner/owner5758
      if(username.toLowerCase()==='owner' && password==='owner5758'){
        localStorage.setItem('currentUserLevel','Owner');
        localStorage.setItem('currentUser', JSON.stringify({id:'owner-1', nama:'Owner', username:username, level:'Owner', isMaster:true}));
        localStorage.setItem('lastLoginTime', Date.now().toString());
        localStorage.setItem('currentUserId', 'owner-1');
        wrapper.classList.add('hidden');
        setTimeout(()=>{ wrapper.style.display='none'; if(typeof updateLogoutIcon==='function') updateLogoutIcon(); if(typeof applyLevelPermissions==='function') applyLevelPermissions(); }, 600);
        return;
      }
let list=[]; try{ list=JSON.parse(localStorage.getItem('karyawanData')||'[]'); }catch(e){ list=[]; }
      if(list.length===0){ try{ list=await db.karyawan.toArray(); }catch(e){} }
      if(list.length===0 && (username.toLowerCase()==='owner' || username.toLowerCase()==='admin')){
        localStorage.setItem('currentUserLevel','Owner');
        localStorage.setItem('currentUser', JSON.stringify({id:'owner-1', nama:'Owner', username:username, level:'Owner'}));
        localStorage.setItem('lastLoginTime', Date.now().toString());
        wrapper.classList.add('hidden');
        setTimeout(()=>{ wrapper.style.display='none'; updateLogoutIcon(); if(typeof applyLevelPermissions==='function') applyLevelPermissions(); }, 600);
        return;
      }
      let user=list.find(k=> k.username && k.username.toLowerCase()===username.toLowerCase());
      if(!user){ showNoticeToast('❌ Username tidak ditemukan'); showLoginError('Username tidak ditemukan'); return; }
      if(user.password !== password){ showNoticeToast('❌ Password salah'); showLoginError('Password salah'); return; }
      localStorage.setItem('currentUserLevel', user.level||'Operator');
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('lastLoginTime', Date.now().toString());
      try{ if(typeof karyawanData!=='undefined'){ karyawanData.forEach(k=> k.isActive=(k.id===user.id)); localStorage.setItem('karyawanData', JSON.stringify(karyawanData)); } await db.karyawan.put(user); }catch(e){}
      wrapper.classList.add('hidden');
      setTimeout(()=>{ wrapper.style.display='none'; updateLogoutIcon(); if(typeof showNoticeToast==='function') showNoticeToast(`✅ Halo ${user.nama}`); if(typeof applyLevelPermissions==='function') applyLevelPermissions(); }, 600);
    });
  }
  const last=localStorage.getItem('lastLoginTime'); const cu=localStorage.getItem('currentUser');
  if(cu && last && (Date.now()-parseInt(last) < 86400000)){
    const w=document.getElementById('app-splash-wrapper'); if(w){ w.style.display='none'; w.classList.add('hidden'); setTimeout(()=>{ updateLogoutIcon(); if(typeof applyLevelPermissions==='function') applyLevelPermissions(); }, 100); }
  }
  setTimeout(()=>{ updateLogoutIcon(); const cfgUrl=localStorage.getItem('supabase_url'); const cfgKey=localStorage.getItem('supabase_key'); const elUrl=document.getElementById('cfgUrl'); const elKey=document.getElementById('cfgKey'); if(cfgUrl && elUrl) elUrl.value=cfgUrl; if(cfgKey && elKey) elKey.value=cfgKey; }, 1000);
});



// MODE CETAK PNG - 2 PILIHAN (TEXT vs IOS)
function setStrukPrintMode(mode){
  strukPrintMode = mode;
  localStorage.setItem('strukPrintMode', mode);
  updateModeUI();
  showNoticeToast(mode==='ios' ? '🍎 Mode Gambar iOS aktif' : '📄 Mode Text Nota aktif');
}

function updateModeUI(){
  const cardText = document.getElementById('modeTextCard');
  const cardIOS = document.getElementById('modeIOSCard');
  const checkText = document.getElementById('checkText');
  const checkIOS = document.getElementById('checkIOS');
  if(strukPrintMode==='text'){
    if(cardText){ cardText.style.border='2px solid #111'; cardText.style.background='#111'; cardText.style.color='#fff'; }
    if(cardIOS){ cardIOS.style.border='2px solid rgba(0,0,0,0.08)'; cardIOS.style.background='rgba(255,255,255,0.9)'; cardIOS.style.color='#111'; }
    if(checkText) checkText.style.display='block';
    if(checkIOS) checkIOS.style.display='none';
  } else {
    if(cardIOS){ cardIOS.style.border='2px solid #f618a9'; cardIOS.style.background='#f618a9'; cardIOS.style.color='#fff'; }
    if(cardText){ cardText.style.border='2px solid rgba(0,0,0,0.08)'; cardText.style.background='rgba(255,255,255,0.9)'; cardText.style.color='#111'; }
    if(checkText) checkText.style.display='none';
    if(checkIOS) checkIOS.style.display='block';
  }
  // FIX: JANGAN toggle thermal preview - thermal tetap thermal, iOS tetap iOS
  // Thermal preview (notaPrintCanvasArea) selalu tampil sebagai thermal, tidak ikut iOS
  // Hanya update indikator card saja, bukan canvas
  const thermalCanvas = document.getElementById('notaPrintCanvasArea');
  const iosCanvas = document.getElementById('notaPrintCanvasAreaIOS');
  if(thermalCanvas) thermalCanvas.style.display='block'; // thermal selalu tampil
  if(iosCanvas){
    // iOS canvas hanya tampil di preview iOS mode, tapi thermal tetap ada di tab thermal
    // Untuk modal preview, biarkan thermal tampil, iOS sebagai alternatif di tab terpisah
    if(document.getElementById('modalPreviewNotaOverlay')?.classList.contains('active')){
      // Di modal preview, tampilkan sesuai tab yang aktif, bukan otomatis hide thermal
      // Biarkan user lihat thermal sebagai default
    }
  }
}


function previewModeFromMaster(mode){
  setStrukPrintMode(mode);
  closeMasterStrukModal();
  setTimeout(function(){
    var lastNota=antrianData[0];
    if(lastNota) openPreviewNotaModal(lastNota.id);
    else showNoticeToast('Belum ada nota untuk preview');
  },300);
}

// Override openPreviewNotaModal to support both templates
var _origOpenPreviewNotaModal2 = window.openPreviewNotaModal;
window.openPreviewNotaModal = function(notaId, mode){
  // Call original first (which now has per-row logic)
  if(_origOpenPreviewNotaModal2) _origOpenPreviewNotaModal2(notaId, mode);
  
  // Then populate iOS template too
  setTimeout(function(){
    try{
      const nota = antrianData.find(n => n.id === notaId);
      if(!nota) return;
      const activeOutlet = getActiveOutlet();
      const activeKaryawan = getActiveKaryawan();
      
      // Populate iOS template
      const el = (id, val) => { const e=document.getElementById(id); if(e) e.innerText=val; };
      el('ios_outlet_name', activeOutlet.nama.toUpperCase());
      el('ios_outlet_address', activeOutlet.alamat || 'Jl. Merdeka No.12');
      el('ios_outlet_wa', 'WA: ' + (activeOutlet.wa || '08123456789'));
      el('ios_nota_num', nota.nota);
      el('ios_nota_date', new Date().toLocaleDateString('id-ID'));
      el('ios_customer_name', nota.namaPelanggan);
      el('ios_kasir_name', activeKaryawan.nama);
      el('ios_grand_total', 'Rp ' + nota.totalNota.toLocaleString('id-ID'));
      el('ios_status_bayar', nota.statusBayar.toUpperCase());
      el('ios_status_proses', nota.statusProses.toUpperCase());
      
      // Logo iOS
      const logoEl = document.getElementById('ios_logo_container');
      if(logoEl){
        if(strukLogoBase64){
          logoEl.innerHTML = '<div style="width:100%;height:100%;background:#f618a9;display:flex;align-items:center;justify-content:center;border-radius:12px;"><img src="'+strukLogoBase64+'" style="max-width:80%;max-height:80%;object-fit:contain;filter:brightness(0) invert(1);"></div>';
        } else {
          logoEl.innerHTML = activeOutlet.nama.charAt(0).toUpperCase();
        }
      }
      
      // Items per row iOS style
      const iosContainer = document.getElementById('ios_items_container');
      if(iosContainer){
        let rows = '';
        if(nota.items && nota.items.length>0){
          rows = nota.items.map(function(it){
            return `<div style="background: rgba(0,0,0,0.02); border:1px solid rgba(0,0,0,0.04); border-radius:12px; padding:10px 12px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-size:12px; font-weight:700; color:#111;">${it.nama}</div>
                <div style="font-size:10px; color:#666; margin-top:2px;">${it.qtyInput}${it.satuan} • ${it.estimasiVal||''} ${it.estimasiUnit||''}</div>
              </div>
              <div style="font-size:12px; font-weight:800; color:#007AFF;">Rp ${(it.subtotal||0).toLocaleString('id-ID')}</div>
            </div>`;
          }).join('');
        } else {
          const list = (nota.layanan||'').split(',').map(s=>s.trim()).filter(Boolean);
          rows = list.map(function(l){
            return `<div style="background: rgba(0,0,0,0.02); border-radius:12px; padding:10px 12px;"><div style="font-size:12px; font-weight:700;">${l}</div></div>`;
          }).join('');
        }
        iosContainer.innerHTML = rows;
      }
      
      // Show correct template based on mode
      const thermalArea = document.getElementById('notaPrintCanvasArea');
      const iosArea = document.getElementById('notaPrintCanvasAreaIOS');
      if(strukPrintMode==='ios'){
        if(thermalArea) thermalArea.style.display='none';
        if(iosArea) iosArea.style.display='block';
      } else {
        if(thermalArea) thermalArea.style.display='block';
        if(iosArea) iosArea.style.display='none';
      }
      
      updateModeUI();
    }catch(e){ console.log('iOS populate error', e); }
  },100);
};

// Override PNG export to respect mode
var _origExecuteShareWAPNG = window.executeShareWAPNG;
window.executeShareWAPNG = function(){
  if(!activePreviewNotaObj) return;
  let element;
  if(strukPrintMode==='ios'){
    element = document.getElementById('notaPrintCanvasAreaIOS');
  } else {
    element = document.getElementById('notaPrintCanvasArea');
  }
  if(!element){
    if(_origExecuteShareWAPNG) _origExecuteShareWAPNG();
    return;
  }
  showNoticeToast('Rendering ' + (strukPrintMode==='ios' ? 'Gambar iOS' : 'Text Nota') + ' ke PNG...');
  html2canvas(element, { scale: 2, backgroundColor: strukPrintMode==='ios' ? null : "#ffffff", useCORS:true }).then(canvas => {
    const link = document.createElement('a');
    link.download = `Struk-${activePreviewNotaObj.nota.replace('#','')}-${strukPrintMode==='ios' ? 'iOS' : 'Text'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    catatRiwayatNota(activePreviewNotaObj, `Download PNG ${strukPrintMode==='ios' ? 'iOS' : 'Text'} ${activePreviewNotaObj.nota}`);
    showNoticeToast('✅ Gambar Struk ' + (strukPrintMode==='ios' ? 'iOS' : 'Text') + ' berhasil!');
  }).catch(err => {
    showNoticeToast('Gagal render PNG');
    console.error(err);
  });
};

// Also update thermal print to respect mode for PNG preview button text
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    updateModeUI();
    strukPrintMode = localStorage.getItem('strukPrintMode') || 'text';
  },1000);
});



// ==================== BLUETOOTH PRINT + CONTACTS + WA MANAGER - HULU KE HILIR ====================

// 1. CONTACTS MANAGER - Ijin Baca Kontak & Simpan Kontak (WA Bisnis butuh kontak untuk kirim gambar)
var contactsPermissionGranted = false;

async function checkContactPermission(){
  try{
    if('contacts' in navigator && 'ContactsManager' in window){
      // Contact Picker API available (Chrome Android)
      contactsPermissionGranted = true;
      return true;
    }
    // Try Permissions API for contacts
    if(navigator.permissions){
      try{
        const perm = await navigator.permissions.query({name: 'contacts'});
        if(perm.state === 'granted') contactsPermissionGranted = true;
        return perm.state;
      }catch(e){}
    }
    return 'prompt';
  }catch(e){ return 'prompt'; }
}

async function requestContactPermission(){
  try{
    if('contacts' in navigator){
      // Trigger picker to request permission
      await navigator.contacts.select(['name','tel'], {multiple:false});
      contactsPermissionGranted = true;
      if(typeof showNoticeToast==='function') showNoticeToast('✅ Ijin kontak diberikan');
      return true;
    }
    // Fallback: create contact via intent
    if(typeof showNoticeToast==='function') showNoticeToast('⚠️ Browser tidak support auto-save kontak, pakai cara manual');
    return false;
  }catch(e){
    console.log('Contact permission denied', e);
    if(typeof showNoticeToast==='function') showNoticeToast('❌ Ijin kontak ditolak');
    return false;
  }
}

async function saveToDeviceContact(nama, wa){
  if(!nama || !wa) return false;
  let cleanWa = wa.replace(/[^0-9]/g,'');
  if(cleanWa.startsWith('0')) cleanWa = '62' + cleanWa.substring(1);
  
  try{
    // Coba simpan via Contact Picker API jika ada (experimental)
    if('contacts' in navigator && window.ContactsManager){
      // Web tidak bisa langsung create contact, tapi bisa share vCard
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${nama}\nTEL;TYPE=CELL:${cleanWa}\nEND:VCARD`;
      const blob = new Blob([vcard], {type:'text/vcard'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nama}.vcf`;
      a.click();
      URL.revokeObjectURL(url);
      if(typeof showNoticeToast==='function') showNoticeToast('📇 File kontak .vcf didownload, buka untuk simpan ke HP');
      return true;
    }
    // Fallback: intent untuk Android
    if(/Android/i.test(navigator.userAgent)){
      // Coba buka contact intent
      window.location.href = `intent://add-contact?display_name=${encodeURIComponent(nama)}&phone=${encodeURIComponent(cleanWa)}#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;end`;
      return true;
    }
    // Fallback terakhir: share vCard
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${nama}\nTEL;TYPE=CELL:${cleanWa}\nEND:VCARD`;
    const file = new File([vcard], `${nama}.vcf`, {type:'text/vcard'});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      await navigator.share({files:[file], title:'Simpan Kontak '+nama});
      return true;
    }
  }catch(e){ console.log('Save contact error', e); }
  
  // Simpan flag di IndexedDB bahwa kontak sudah dicoba disimpan
  try{
    await saveHybridStruk('contact_'+cleanWa, {nama:nama, wa:cleanWa, saved:true, at:new Date().toISOString()});
  }catch(e){}
  return false;
}

async function isContactSaved(wa){
  if(!wa) return false;
  let cleanWa = wa.replace(/[^0-9]/g,'');
  try{
    const rec = await loadHybridStruk('contact_'+cleanWa, null);
    return !!rec;
  }catch(e){ return false; }
}


// 2. BLUETOOTH PRINT MANAGER - FIX GATT ERROR & content://
var bluetoothDevice = null;
var bluetoothServer = null;
var printCharacteristic = null;
var printerServiceUUIDs = [
  '000018f0-0000-1000-8000-00805f9b34fb', // common
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port
  '0000ff00-0000-1000-8000-00805f9b34fb', // Custom thermal
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // MPT-II
  '49535343-fe7d-4ae5-8fa9-9fafd205e455' // Star
];

async function checkSecureContext(){
  if(!window.isSecureContext){
    if(typeof showNoticeToast==='function') showNoticeToast('❌ Cetak Bluetooth butuh HTTPS. Jangan buka file via file:// atau content://. Upload ke Cloudflare/Vercel (https://)');
    alert('Gagal cetak: Browser memblokir Bluetooth karena file dibuka via file:// atau content://.\n\nSolusi:\n1. Upload file ini ke Cloudflare Pages / Vercel (HTTPS)\n2. Buka via https://laundrymu.pages.dev\n3. Baru cetak Bluetooth akan jalan.\n\nUntuk sementara pakai opsi Download ESC/POS atau Share ke aplikasi RawBT.');
    return false;
  }
  if(!navigator.bluetooth){
    if(typeof showNoticeToast==='function') showNoticeToast('❌ Bluetooth tidak support. Pakai Chrome Android terbaru');
    return false;
  }
  return true;
}

async function requestBluetoothPrinter(){
  if(!(await checkSecureContext())) return false;
  try{
    if(typeof showNoticeToast==='function') showNoticeToast('🔍 Cari printer thermal...');
    // Lebih luas filter agar tidak GATT failed
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: printerServiceUUIDs
    });
    
    showNoticeToast('⏳ Menghubungkan ke ' + (bluetoothDevice.name||'printer') + '...');
    bluetoothServer = await bluetoothDevice.gatt.connect();
    
    // Cari service yang bisa print - coba semua UUID
    let service = null;
    let characteristic = null;
    let lastError = null;
    
    for(let uuid of printerServiceUUIDs){
      try{
        service = await bluetoothServer.getPrimaryService(uuid);
        const chars = await service.getCharacteristics();
        // Cari characteristic yang writable
        for(let c of chars){
          if(c.properties.write || c.properties.writeWithoutResponse){
            characteristic = c;
            break;
          }
        }
        if(characteristic) break;
      }catch(e){ lastError = e; continue; }
    }
    
    // Jika belum ketemu, coba getAllServices
    if(!characteristic){
      try{
        const services = await bluetoothServer.getPrimaryServices();
        for(let s of services){
          try{
            const chars = await s.getCharacteristics();
            for(let c of chars){
              if(c.properties.write || c.properties.writeWithoutResponse){
                characteristic = c;
                service = s;
                break;
              }
            }
            if(characteristic) break;
          }catch(e){}
        }
      }catch(e){ lastError = e; }
    }
    
    if(!characteristic){
      throw new Error('Characteristic writable tidak ditemukan. Printer mungkin butuh pairing di Android Settings dulu. Error: ' + (lastError?lastError.message:'unknown'));
    }
    
    printCharacteristic = characteristic;
    if(typeof showNoticeToast==='function') showNoticeToast('✅ Terhubung: ' + (bluetoothDevice.name||'Printer') + ' | Service: ' + service.uuid.slice(0,8));
    await saveHybridStruk('lastPrinterName', bluetoothDevice.name || 'Thermal Printer');
    await saveHybridStruk('lastPrinterService', service.uuid);
    
    bluetoothDevice.addEventListener('gattserverdisconnected', function(){
      if(typeof showNoticeToast==='function') showNoticeToast('⚠️ Printer terputus');
      printCharacteristic = null;
      bluetoothServer = null;
    });
    
    return true;
  }catch(e){
    console.log('Bluetooth error', e);
    let msg = e.message || e.toString();
    if(msg.includes('GATT')){
      msg = 'GATT Error: Printer belum di-pairing di Android Settings, atau printer pakai PIN.\n\nSolusi:\n1. Buka Android Settings > Bluetooth > Pair printer thermal dulu\n2. Masukkan PIN 0000 atau 1234 jika diminta\n3. Balik ke Chrome, coba lagi\n4. Jika masih GATT, coba matikan-nyalakan printer & Bluetooth HP';
    }
    if(msg.includes('content://') || !window.isSecureContext){
      msg = 'File dibuka via content:// atau file:// - Chrome blokir Bluetooth.\nUpload ke Cloudflare Pages (HTTPS) dulu.';
    }
    if(typeof showNoticeToast==='function') showNoticeToast('❌ ' + msg.substring(0,80));
    alert('Cetak Bluetooth gagal:\n' + msg + '\n\nFallback: pakai tombol Download ESC/POS atau Share ke RawBT');
    return false;
  }
}

function buildESC_POSNota(nota, outlet){
  const ESC = '\x1b';
  const GS = '\x1d';
  let cmds = '';
  cmds += ESC + '@';
  cmds += ESC + 'a' + '\x01';
  cmds += (outlet.nama.toUpperCase() + '\n');
  cmds += ESC + 'a' + '\x00';
  cmds += (outlet.alamat || '') + '\n';
  cmds += 'WA: ' + (outlet.wa || '') + '\n';
  cmds += '--------------------------------\n';
  cmds += 'No: ' + nota.nota + '\n';
  cmds += 'Tgl: ' + new Date().toLocaleDateString('id-ID') + ' ' + new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) + '\n';
  cmds += 'Pel: ' + nota.namaPelanggan + '\n';
  cmds += 'Kasir: ' + (typeof getActiveKaryawan==='function' ? getActiveKaryawan().nama : 'Kasir') + '\n';
  cmds += '--------------------------------\n';
  cmds += 'Layanan (per row):\n';
  if(nota.items && nota.items.length>0){
    nota.items.forEach(function(it, idx){
      cmds += (idx+1) + '. ' + it.nama + '\n';
      cmds += '   ' + it.qtyInput + it.satuan + ' @Rp ' + (it.harga||0).toLocaleString('id-ID') + '\n';
      cmds += '   Rp ' + (it.subtotal||0).toLocaleString('id-ID') + '\n';
    });
  } else {
    cmds += (nota.layanan || '-') + '\n';
  }
  cmds += '--------------------------------\n';
  cmds += ESC + 'a' + '\x02';
  cmds += ESC + '!' + '\x08';
  cmds += 'TOTAL: Rp ' + nota.totalNota.toLocaleString('id-ID') + '\n';
  cmds += ESC + '!' + '\x00';
  cmds += ESC + 'a' + '\x00';
  cmds += 'Bayar: ' + nota.statusBayar + '\n';
  cmds += 'Proses: ' + nota.statusProses + '\n';
  cmds += '--------------------------------\n';
  cmds += ESC + 'a' + '\x01';
  cmds += 'Terima Kasih!\n';
  cmds += 'Barang tdk diambil 30 hari\n';
  cmds += 'diluar tanggung jawab kami\n';
  cmds += '\n\n\n';
  cmds += GS + 'V' + '\x00';
  return cmds;
}

async function cetakThermalBluetooth(notaId){
  const nota = antrianData.find(n=>n.id===notaId) || (typeof activePreviewNotaObj!=='undefined'?activePreviewNotaObj:null);
  if(!nota){ showNoticeToast('Nota tidak ditemukan'); return; }
  const outlet = (typeof getActiveOutlet==='function') ? getActiveOutlet() : {nama:'Laundry', alamat:'', wa:''};
  
  if(!(await checkSecureContext())) return;
  
  if(!printCharacteristic){
    const ok = await requestBluetoothPrinter();
    if(!ok) return;
  }
  
  try{
    const escPos = buildESC_POSNota(nota, outlet);
    const encoder = new TextEncoder();
    const data = encoder.encode(escPos);
    const chunkSize = 100; // BLE MTU safe
    let useWithoutResponse = false;
    try{ useWithoutResponse = printCharacteristic.properties.writeWithoutResponse; }catch(e){}
    
    for(let i=0;i<data.length;i+=chunkSize){
      const chunk = data.slice(i, i+chunkSize);
      try{
        if(useWithoutResponse) await printCharacteristic.writeValueWithoutResponse(chunk);
        else await printCharacteristic.writeValue(chunk);
      }catch(e){
        // Coba fallback writeValue
        await printCharacteristic.writeValue(chunk);
      }
      await new Promise(r=>setTimeout(r, 80));
    }
    if(typeof showNoticeToast==='function') showNoticeToast('✅ Cetak per-row berhasil: ' + nota.nota);
    if(typeof catatRiwayatNota==='function') catatRiwayatNota(nota, 'Cetak Thermal Bluetooth ' + nota.nota);
  }catch(e){
    console.log('Print error', e);
    let msg = e.message||'';
    if(msg.includes('GATT') || msg.includes('gatt')){
      if(typeof showNoticeToast==='function') showNoticeToast('❌ GATT terputus, coba pairing ulang di Android Settings');
      printCharacteristic = null;
      bluetoothServer = null;
      // Tawarkan fallback
      if(confirm('GATT error. Mau coba fallback cetak via aplikasi RawBT / ESC/POS download?')){
        fallbackCetakRawBT(nota);
      }
    } else {
      if(typeof showNoticeToast==='function') showNoticeToast('❌ Gagal cetak: ' + msg.substring(0,60));
    }
  }
}

function fallbackCetakRawBT(nota){
  const outlet = (typeof getActiveOutlet==='function') ? getActiveOutlet() : {nama:'Laundry', alamat:'', wa:''};
  const escPos = buildESC_POSNota(nota, outlet);
  const blob = new Blob([escPos], {type:'application/octet-stream'});
  const url = URL.createObjectURL(blob);
  const fileName = `nota-${nota.nota.replace('#','')}.bin`;
  
  // Coba share ke RawBT
  const file = new File([blob], fileName, {type:'application/octet-stream'});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    navigator.share({files:[file], title:'Cetak Nota '+nota.nota}).then(function(){
      if(typeof showNoticeToast==='function') showNoticeToast('✅ Dishare ke RawBT / Printer App');
    }).catch(function(){});
  }
  
  // Download ESC/POS file
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  
  // Intent RawBT
  try{
    window.location.href = 'intent://' + fileName + '#Intent;action=android.intent.action.SEND;type=application/octet-stream;end';
  }catch(e){}
  
  if(typeof showNoticeToast==='function') showNoticeToast('📥 File ESC/POS didownload, buka dengan RawBT / ESC POS Print');
}

function downloadESCPOS(notaId){
  const nota = antrianData.find(n=>n.id===notaId) || activePreviewNotaObj;
  if(!nota) return;
  fallbackCetakRawBT(nota);
}


// 3. WA MANAGER - Kirim WA & WA Bisnis Lancar (Text & Gambar iOS)
async function sendWAText(nota, isBusiness){
  if(!nota) return;
  const outlet = (typeof getActiveOutlet==='function') ? getActiveOutlet() : {nama:'Laundry'};
  const pTarget = (typeof pelangganData!=='undefined') ? pelangganData.find(p=>p.nama.toLowerCase()===nota.namaPelanggan.toLowerCase()) : null;
  const phone = pTarget && pTarget.wa ? pTarget.wa.replace(/[^0-9]/g,'') : '';
  
  // Bangun layanan per row
  let layananLines = '';
  if(nota.items && nota.items.length>0){
    layananLines = nota.items.map(function(it, idx){ return `${idx+1}. ${it.nama} (${it.qtyInput}${it.satuan}) - Rp ${(it.subtotal||0).toLocaleString('id-ID')}`; }).join('\n');
  } else {
    layananLines = nota.layanan || '-';
  }
  
  const waMsg = `*-- NOTA ${outlet.nama.toUpperCase()} --*\n` +
    `No: ${nota.nota}\nPelanggan: ${nota.namaPelanggan}\nTgl: ${new Date().toLocaleDateString('id-ID')}\n` +
    `----------------------\n*Rincian (per row):*\n${layananLines}\n----------------------\n` +
    `Total: Rp ${nota.totalNota.toLocaleString('id-ID')}\nBayar: *${nota.statusBayar}*\nProses: *${nota.statusProses}*\n\nTerima kasih 🙏`;
  
  const encoded = encodeURIComponent(waMsg);
  const waDomain = isBusiness ? 'https://api.whatsapp.com/send' : 'https://wa.me';
  const url = phone ? `${waDomain}/${phone}?text=${encoded}` : `${waDomain}?text=${encoded}`;
  window.open(url, '_blank');
  if(typeof showNoticeToast==='function') showNoticeToast(`Membuka ${isBusiness?'WA Bisnis':'WA'}...`);
  if(typeof catatRiwayatNota==='function') catatRiwayatNota(nota, `Kirim Teks ${isBusiness?'WA Bisnis':'WA'} ${nota.nota}`);
}

async function sendWAImage(nota, isBusiness){
  if(!nota) return;
  const pTarget = (typeof pelangganData!=='undefined') ? pelangganData.find(p=>p.nama.toLowerCase()===nota.namaPelanggan.toLowerCase()) : null;
  const wa = pTarget ? pTarget.wa : '';
  
  // Cek kontak untuk WA Bisnis - WA Bisnis tidak bisa kirim gambar tanpa jadi kontak
  if(isBusiness){
    const saved = await isContactSaved(wa);
    const simpanKontakFlag = pTarget ? pTarget.simpanKontak : false;
    if(!saved && !simpanKontakFlag){
      if(typeof showNoticeToast==='function') showNoticeToast('⚠️ WA Bisnis: Simpan kontak dulu untuk kirim gambar');
      // Tawarkan simpan kontak
      if(confirm('WA Bisnis butuh kontak tersimpan untuk kirim gambar. Simpan kontak ' + nota.namaPelanggan + ' (' + wa + ') ke HP sekarang?')){
        await saveToDeviceContact(nota.namaPelanggan, wa);
      } else {
        // Tetap lanjutkan dengan download manual
      }
    }
  }
  
  // Tentukan element sesuai mode
  let elementId = (typeof strukPrintMode !== 'undefined' && strukPrintMode==='ios') ? 'notaPrintCanvasAreaIOS' : 'notaPrintCanvasArea';
  let element = document.getElementById(elementId);
  if(!element) element = document.getElementById('notaPrintCanvasArea');
  
  try{
    if(typeof showNoticeToast==='function') showNoticeToast('Rendering ' + (strukPrintMode==='ios'?'Gambar iOS':'Text Nota') + '...');
    const canvas = await html2canvas(element, {scale:2, backgroundColor: strukPrintMode==='ios'?null:'#fff', useCORS:true});
    canvas.toBlob(async function(blob){
      const fileName = `Struk-${nota.nota.replace('#','')}-${strukPrintMode==='ios'?'iOS':'Text'}.png`;
      const file = new File([blob], fileName, {type:'image/png'});
      
      // Coba Web Share API dengan file (bisa share langsung ke WA Bisnis jika kontak sudah ada)
      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
          await navigator.share({files:[file], title: fileName, text: `Nota ${nota.nota} - ${nota.namaPelanggan}`});
          if(typeof showNoticeToast==='function') showNoticeToast('✅ Gambar dishare ke WA' + (isBusiness?' Bisnis':''));
          if(typeof catatRiwayatNota==='function') catatRiwayatNota(nota, `Share Gambar ${isBusiness?'WA Bisnis':'WA'} ${nota.nota} (${strukPrintMode})`);
          return;
        }catch(e){ console.log('Share cancelled', e); }
      }
      // Fallback: download + buka WA
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      // Setelah download, buka WA
      const phone = wa ? wa.replace(/[^0-9]/g,'') : '';
      const waDomain = isBusiness ? 'https://api.whatsapp.com/send' : 'https://wa.me';
      const waUrl = phone ? `${waDomain}/${phone}?text=${encodeURIComponent('Berikut nota ' + nota.nota + ' (gambar sudah didownload, silakan attach)')}` : `${waDomain}?text=${encodeURIComponent('Nota ' + nota.nota)}`;
      
      setTimeout(function(){ window.open(waUrl, '_blank'); }, 800);
      if(typeof showNoticeToast==='function') showNoticeToast('📥 Gambar didownload, buka WA untuk attach manual' + (isBusiness?' (WA Bisnis butuh kontak)':''));
    }, 'image/png');
  }catch(e){
    console.log('WA Image error', e);
    if(typeof showNoticeToast==='function') showNoticeToast('❌ Gagal render gambar');
  }
}

// Override fungsi lama agar pakai manager baru
window.executeShareWAText = function(isBusiness){ if(activePreviewNotaObj) sendWAText(activePreviewNotaObj, isBusiness); };
window.executeShareWAPNG = function(){ if(activePreviewNotaObj) sendWAImage(activePreviewNotaObj, document.getElementById('modeIOSCard')?.style.background==='rgb(0, 122, 255)' || strukPrintMode==='ios'); };
window.executePrintFromPreview = function(){ if(activePreviewNotaObj) cetakThermalBluetooth(activePreviewNotaObj.id); };

// Update simpanPelanggan untuk auto-save kontak jika checklist dicentang
var _origSimpanPelanggan = window.simpanPelanggan;
window.simpanPelanggan = async function(){
  const namaEl = document.getElementById('inputNamaPelanggan');
  const waEl = document.getElementById('inputWaPelanggan');
  const simpanKontakEl = document.getElementById('checkSimpanKontak');
  const tanpaWaEl = document.getElementById('checkTanpaWa');
  
  const nama = namaEl ? namaEl.value.trim() : '';
  const wa = waEl ? waEl.value.trim() : '';
  const simpanKontak = simpanKontakEl ? simpanKontakEl.checked : false;
  const tanpaWa = tanpaWaEl ? tanpaWaEl.checked : false;
  
  // Panggil fungsi asli
  if(_origSimpanPelanggan) _origSimpanPelanggan();
  else if(typeof simpanPelangganBaru === 'function') simpanPelangganBaru();
  
  // Jika checklist simpan kontak dicentang, coba simpan ke device
  if(simpanKontak && wa && !tanpaWa){
    setTimeout(async function(){
      await saveToDeviceContact(nama, wa);
    }, 500);
  }
};

// Inisialisasi permission saat load
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){ checkContactPermission(); }, 1500);
});



// FIX: Checklist terhubung ke preview (estimasi dll)
function syncMasterStrukToSettings(){
  try{
    var settings = JSON.parse(localStorage.getItem('strukSettings')||'{}');
    if(!settings.show) settings.show={};
    var map={estimasi:'strukShowEstimasi', namaKasir:'strukShowNamaKasir', alamatOutlet:'strukShowAlamatOutlet', waOutlet:'strukShowWaOutlet', noNota:'strukShowNoNota', tanggal:'strukShowTanggal', layanan:'strukShowLayanan', namaPelanggan:'strukShowNamaPelanggan', statusBayar:'strukShowStatusBayar', nominal:'strukShowNominal', estimasiDetail:'strukShowEstimasi', depositInfo:'strukShowDepositInfo'};
    Object.keys(map).forEach(function(k){
      var el=document.getElementById(map[k]);
      if(el) settings.show[k]=el.checked;
    });
    var headerEl=document.getElementById('strukHeaderCustom');
    var footerEl=document.getElementById('strukFooterCustom');
    if(headerEl) settings.headerCustom=headerEl.value;
    if(footerEl) settings.footerCustom=footerEl.value;
    localStorage.setItem('strukSettings', JSON.stringify(settings));
    // Also save hybrid
    if(typeof saveHybridStruk==='function') saveHybridStruk('strukSettings', settings);
  }catch(e){}
}

// Override updateStrukPreview to also sync
var _origUpdateStrukPreview = window.updateStrukPreview;
window.updateStrukPreview = function(){
  if(_origUpdateStrukPreview) _origUpdateStrukPreview();
  syncMasterStrukToSettings();
};

// Fix estimasi display in thermal preview - per row + global estimasi
var _origOpenPreviewFix = window.openPreviewNotaModal;
window.openPreviewNotaModal = function(notaId, mode){
  // Call the very original first
  var nota = (typeof antrianData!=='undefined') ? antrianData.find(n=>n.id===notaId) : null;
  if(!nota && typeof activePreviewNotaObj!=='undefined') nota=activePreviewNotaObj;
  if(!nota) return;
  
  // Call previous chain
  if(typeof _origOpenPreviewNotaModal2 !== 'undefined' && _origOpenPreviewNotaModal2) _origOpenPreviewNotaModal2(notaId, mode);
  
  setTimeout(function(){
    try{
      var settings = JSON.parse(localStorage.getItem('strukSettings')||'{}');
      var show = settings.show || {};
      
      // Estimasi row handling
      var estRow = document.getElementById('p_estimasi_row');
      var estVal = document.getElementById('p_estimasi_val');
      if(estRow){
        // Show if either estimasi or estimasiDetail checked
        if(show.estimasi===false && show.estimasiDetail===false) estRow.style.display='none';
        else {
          estRow.style.display='flex';
          if(estVal){
            var estimasiText = nota.estimasiFormatted || nota.estimasi || (nota.items && nota.items[0] ? (nota.items[0].estimasiVal+' '+nota.items[0].estimasiUnit) : '-');
            estVal.innerText = estimasiText;
          }
        }
      }
      
      // Ensure items per row respect layanan checkbox
      var itemsCont = document.getElementById('p_items_container');
      if(itemsCont && show.layanan===false) itemsCont.style.display='none';
      else if(itemsCont) itemsCont.style.display='block';
      
      // iOS estimasi
      var iosEst = document.getElementById('ios_items_container');
      // For iOS, add estimasi global if enabled
      if(show.estimasi!==false){
        var iosTotalCard = document.getElementById('ios_grand_total');
        // Add estimasi badge near total if not exists
        var existingEst = document.getElementById('ios_estimasi_global');
        if(!existingEst && iosTotalCard && iosTotalCard.parentElement){
          var estDiv = document.createElement('div');
          estDiv.id='ios_estimasi_global';
          estDiv.style='font-size:10px; color:#666; margin-top:8px; text-align:center; background:rgba(246,24,169,0.08); padding:6px 10px; border-radius:20px;';
          estDiv.innerHTML='⏰ Estimasi: ' + (nota.estimasiFormatted || nota.estimasi || '-');
          iosTotalCard.parentElement.parentElement.insertBefore(estDiv, iosTotalCard.parentElement.nextSibling);
        }
      }
      
      // Logo warna #f618a9 - ensure background
      var logoContainers = [document.getElementById('p_logo_container'), document.getElementById('ios_logo_container')];
      logoContainers.forEach(function(lc){
        if(lc && lc.style){
          lc.style.background='#f618a9';
        }
      });
      
    }catch(e){ console.log('fix preview error', e); }
  }, 200);
};



// FIX: Checkbox terhubung - pasang listener untuk semua checklist
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(function(){
    var checkboxIds = ['strukShowEstimasi','strukShowNamaKasir','strukShowAlamatOutlet','strukShowWaOutlet','strukShowNoNota','strukShowTanggal','strukShowLayanan','strukShowNamaPelanggan','strukShowStatusBayar','strukShowNominal','strukShowEstimasi','strukShowDepositInfo'];
    checkboxIds.forEach(function(id){
      var el=document.getElementById(id);
      if(el){
        el.addEventListener('change', function(){
          if(typeof updateStrukPreview==='function') updateStrukPreview();
          if(typeof syncMasterStrukToSettings==='function') syncMasterStrukToSettings();
          // Live update preview modal if open
          var thermalCanvas=document.getElementById('notaPrintCanvasArea');
          var iosCanvas=document.getElementById('notaPrintCanvasAreaIOS');
          if(thermalCanvas && thermalCanvas.closest('.modal-overlay.active')){
            // Re-apply visibility
            var settings=JSON.parse(localStorage.getItem('strukSettings')||'{}');
            var show=settings.show||{};
            var estRow=document.getElementById('p_estimasi_row');
            if(estRow) estRow.style.display = (show.estimasiDetail===false && show.estimasi===false) ? 'none' : 'flex';
            var itemsCont=document.getElementById('p_items_container');
            if(itemsCont) itemsCont.style.display = (show.layanan===false) ? 'none' : 'block';
          }
        });
      }
    });
  }, 1000);
});



// FIX: Logo dinamis - 2 versi warna untuk icon/favicon/logo, B&W hanya untuk thermal
var strukLogoColorBase64 = localStorage.getItem('strukLogoColorBase64') || localStorage.getItem('strukLogoBase64') || '';
var strukLogoBWBase64 = localStorage.getItem('strukLogoBWBase64') || '';

async function generateBWLogo(colorBase64){
  return new Promise(function(resolve){
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');
      canvas.width=img.width;
      canvas.height=img.height;
      var ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0);
      var imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
      var data=imageData.data;
      for(var i=0;i<data.length;i+=4){
        var gray=0.299*data[i]+0.587*data[i+1]+0.114*data[i+2];
        data[i]=gray; data[i+1]=gray; data[i+2]=gray;
      }
      ctx.putImageData(imageData,0,0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src=colorBase64;
  });
}

// Override handleLogoUpload to save both color and BW
var _origHandleLogoUpload2 = window.handleLogoUpload;
window.handleLogoUpload = async function(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ if(typeof showNoticeToast==='function') showNoticeToast('File terlalu besar, max 5MB'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const img = new Image();
    img.onload = async function(){
      const canvas = document.createElement('canvas');
      let w=img.width, h=img.height;
      const maxW=400;
      if(w>maxW){ h=h*maxW/w; w=maxW; }
      canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(img,0,0,w,h);
      const compressed=canvas.toDataURL('image/png'); // Keep color for icon/favicon/logo
      strukLogoColorBase64=compressed;
      strukLogoBase64=compressed; // Keep compatibility
      if(typeof saveHybridStruk==='function'){
        await saveHybridStruk('strukLogoColorBase64', compressed);
        await saveHybridStruk('strukLogoBase64', compressed);
      } else {
        localStorage.setItem('strukLogoColorBase64', compressed);
        localStorage.setItem('strukLogoBase64', compressed);
      }
      // Generate BW for thermal
      const bw = await generateBWLogo(compressed);
      strukLogoBWBase64=bw;
      if(typeof saveHybridStruk==='function') await saveHybridStruk('strukLogoBWBase64', bw);
      else localStorage.setItem('strukLogoBWBase64', bw);
      
      const cont=document.getElementById('logoPreviewContainer');
      if(cont) cont.innerHTML='<div style="display:flex;gap:6px;"><div style="flex:1;text-align:center;"><div style="font-size:8px;">Warna (Icon/Favicon/iOS)</div><img src="'+compressed+'" style="width:100%;max-height:60px;object-fit:contain;background:#f618a9;padding:4px;border-radius:6px;"></div><div style="flex:1;text-align:center;"><div style="font-size:8px;">B&W (Thermal)</div><img src="'+bw+'" style="width:100%;max-height:60px;object-fit:contain;background:#fff;padding:4px;border-radius:6px;border:1px solid #ddd;"></div></div>';
      
      if(typeof showNoticeToast==='function') showNoticeToast('✅ Logo disimpan: Warna untuk icon & iOS #f618a9, B&W untuk thermal');
      if(typeof updateStrukPreview==='function') updateStrukPreview();
      // Update favicon
      var link=document.querySelector("link[rel*='icon']")||document.createElement('link');
      link.type='image/x-icon'; link.rel='shortcut icon'; link.href=compressed;
      document.getElementsByTagName('head')[0].appendChild(link);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
};

// Override logo display in previews
var _origUpdateLogoPreview = window.updateStrukPreview;
window.updateStrukPreview = function(){
  if(typeof _origUpdateLogoPreview==='function') _origUpdateLogoPreview();
  // Ensure thermal uses BW, iOS uses color with #f618a9 bg
  try{
    var colorLogo = localStorage.getItem('strukLogoColorBase64') || localStorage.getItem('strukLogoBase64') || '';
    var bwLogo = localStorage.getItem('strukLogoBWBase64') || colorLogo;
    
    // Mini preview - show color with #f618a9
    var mini=document.getElementById('miniPreviewStruk');
    if(mini && colorLogo){
      var miniImgs=mini.querySelectorAll('img');
      miniImgs.forEach(function(img){
        if(img.src && img.src.startsWith('data:')){
          img.src=colorLogo;
          img.style.background='#f618a9';
          img.style.padding='4px';
          img.style.borderRadius='6px';
        }
      });
    }
  }catch(e){}
};

// Patch openPreviewNotaModal logo to use dinamis
var _origLogoPatch = window.openPreviewNotaModal;
window.openPreviewNotaModal = function(notaId, mode){
  if(_origLogoPatch) _origLogoPatch(notaId, mode);
  setTimeout(function(){
    try{
      var colorLogo = localStorage.getItem('strukLogoColorBase64') || localStorage.getItem('strukLogoBase64') || '';
      var bwLogo = localStorage.getItem('strukLogoBWBase64') || colorLogo;
      
      // Thermal - B&W only
      var pLogoCont=document.getElementById('p_logo_container');
      if(pLogoCont && bwLogo){
        pLogoCont.innerHTML='<div style="background:#fff;padding:6px;border-radius:8px;display:inline-block;border:1px solid #eee;"><img src="'+bwLogo+'" style="max-width:80px;max-height:60px;object-fit:contain;filter:grayscale(1);"></div>';
        pLogoCont.style.background='#fff';
      }
      
      // iOS - Color with #f618a9 background
      var iosLogoCont=document.getElementById('ios_logo_container');
      if(iosLogoCont && colorLogo){
        iosLogoCont.innerHTML='<div style="width:100%;height:100%;background:#f618a9;display:flex;align-items:center;justify-content:center;border-radius:12px;"><img src="'+colorLogo+'" style="max-width:70%;max-height:70%;object-fit:contain;"></div>';
        iosLogoCont.style.background='#f618a9';
      }
    }catch(e){}
  }, 250);
};



// FIX FINAL: Checkbox menjadi aturan di nota - korelasi langsung
function applyStrukSettingsToNota(){
  try{
    var settings = JSON.parse(localStorage.getItem('strukSettings')||'{}');
    var show = settings.show || {};
    
    // Thermal mappings
    var thermalMap = {
      'p_outlet_address': show.alamatOutlet,
      'p_outlet_wa': show.waOutlet,
      'p_nota_num': show.noNota,
      'p_nota_date': show.tanggal,
      'p_customer_name': show.namaPelanggan,
      'p_kasir_name': show.namaKasir,
      'p_items_container': show.layanan,
      'p_grand_total': show.nominal,
      'p_status_bayar': show.statusBayar,
      'p_estimasi_row': show.estimasi,
      'row_status_proses_print': show.estimasi // proses ikut estimasi
    };
    
    Object.keys(thermalMap).forEach(function(id){
      var el=document.getElementById(id);
      if(el){
        if(thermalMap[id]===false) el.style.display='none';
        else el.style.display='';
      }
    });
    
    // iOS mappings
    var iosMap = {
      'ios_outlet_address': show.alamatOutlet,
      'ios_outlet_wa': show.waOutlet,
      'ios_nota_num': show.noNota,
      'ios_nota_date': show.tanggal,
      'ios_customer_name': show.namaPelanggan,
      'ios_kasir_name': show.namaKasir,
      'ios_items_container': show.layanan,
      'ios_grand_total': show.nominal,
      'ios_status_bayar': show.statusBayar,
      'ios_estimasi_global': show.estimasi
    };
    
    Object.keys(iosMap).forEach(function(id){
      var el=document.getElementById(id);
      if(el){
        if(iosMap[id]===false) el.style.display='none';
        else el.style.display='';
      }
    });
    
    console.log('Checkbox applied to nota', show);
  }catch(e){ console.log('apply checkbox error', e); }
}

// Override updateStrukPreview to also apply to nota
var _origUpdatePreviewFinal = window.updateStrukPreview;
window.updateStrukPreview = function(){
  if(_origUpdatePreviewFinal) _origUpdatePreviewFinal();
  applyStrukSettingsToNota();
};

// Override openPreviewNotaModal final to apply checkbox + fix PNG mode
var _origOpenPreviewFinal = window.openPreviewNotaModal;
window.openPreviewNotaModal = function(notaId, mode){
  if(_origOpenPreviewFinal) _origOpenPreviewFinal(notaId, mode);
  setTimeout(function(){
    applyStrukSettingsToNota();
    
    // FIX PNG: Pastikan mode iOS benar-benar iOS, bukan text
    var currentMode = (typeof strukPrintMode!=='undefined') ? strukPrintMode : 'text';
    var thermalCanvas = document.getElementById('notaPrintCanvasArea');
    var iosCanvas = document.getElementById('notaPrintCanvasAreaIOS');
    
    // Di preview modal, tampilkan sesuai mode yang dipilih di master struk
    if(currentMode==='ios'){
      if(thermalCanvas) thermalCanvas.style.display='none';
      if(iosCanvas) iosCanvas.style.display='block';
    } else {
      if(thermalCanvas) thermalCanvas.style.display='block';
      if(iosCanvas) iosCanvas.style.display='none';
    }
    
    console.log('Preview mode:', currentMode, 'Thermal display:', thermalCanvas?.style.display, 'iOS display:', iosCanvas?.style.display);
  }, 300);
};

// Fix simpan tetap di halaman, keluar hanya via X kartu utama
var _origCloseMaster = window.closeMasterStrukModal;
window.closeMasterStrukModal = function(){
  if(_origCloseMaster) _origCloseMaster();
  console.log('Keluar via X kartu utama');
};

// Ensure setStrukPrintMode updates preview if open
var _origSetMode = window.setStrukPrintMode;
window.setStrukPrintMode = function(mode){
  if(_origSetMode) _origSetMode(mode);
  // If preview modal open, switch canvas
  setTimeout(function(){
    var thermalCanvas = document.getElementById('notaPrintCanvasArea');
    var iosCanvas = document.getElementById('notaPrintCanvasAreaIOS');
    if(document.getElementById('modalPreviewNotaOverlay')?.classList.contains('active')){
      if(mode==='ios'){
        if(thermalCanvas) thermalCanvas.style.display='none';
        if(iosCanvas) iosCanvas.style.display='block';
      } else {
        if(thermalCanvas) thermalCanvas.style.display='block';
        if(iosCanvas) iosCanvas.style.display='none';
      }
    }
  }, 100);
};



// Pengaturan Sistem dark/light - default sesuai sistem
var systemTheme = localStorage.getItem('systemTheme') || 'auto'; // auto, light, dark
var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function applySystemTheme(){
  var effectiveTheme = systemTheme;
  if(systemTheme==='auto'){
    effectiveTheme = prefersDark ? 'dark' : 'light';
  }
  
  document.documentElement.setAttribute('data-theme', effectiveTheme);
  
  // Update switch UI
  var icon=document.getElementById('themeIcon');
  var label=document.getElementById('themeLabel');
  var dot=document.getElementById('themeToggleDot');
  
  if(icon && label && dot){
    if(systemTheme==='auto'){
      icon.textContent = prefersDark ? '🌙' : '☀️';
      label.textContent = 'Auto';
      dot.style.transform = 'translateX(0)';
    } else if(systemTheme==='dark'){
      icon.textContent = '🌙';
      label.textContent = 'Dark';
      dot.style.transform = 'translateX(10px)';
      dot.style.background='#f618a9';
    } else {
      icon.textContent = '☀️';
      label.textContent = 'Light';
      dot.style.transform = 'translateX(10px)';
      dot.style.background='#fff';
    }
  }
  
  // Apply to body
  if(effectiveTheme==='dark'){
    document.body.style.background='#0a0a0a';
    document.body.style.color='#fff';
  } else {
    document.body.style.background='';
    document.body.style.color='';
  }
  
  console.log('Theme applied:', systemTheme, 'effective:', effectiveTheme);
}

function toggleSystemTheme(){
  // Cycle: auto -> light -> dark -> auto
  if(systemTheme==='light' || systemTheme==='auto'){ systemTheme='dark'; } else { systemTheme='light'; }
  localStorage.setItem('systemTheme', systemTheme);
  if(typeof saveHybridStruk==='function') saveHybridStruk('systemTheme', systemTheme);
  applySystemTheme();
  if(typeof showNoticeToast==='function') showNoticeToast('🎨 Tema: ' + systemTheme + ' (efektif: ' + (systemTheme==='auto' ? (prefersDark?'dark':'light') : systemTheme) + ')');
}

// Listen to system change
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e){
  prefersDark = e.matches;
  if(systemTheme==='auto'){
    applySystemTheme();
  }
});

// Init on load
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(applySystemTheme, 500);
});

// CSS for dark/light
var themeCSS = document.createElement('style');
themeCSS.textContent = `
[data-theme="dark"] .card-main,
[data-theme="dark"] .card-header,
[data-theme="dark"] .border-3-crystal {
  background: rgba(30,30,30,0.9) !important;
  color: #fff !important;
  border-color: rgba(255,255,255,0.1) !important;
}
[data-theme="dark"] .thermal-receipt-preview {
  background: #1a1a1a !important;
  color: #fff !important;
}
[data-theme="dark"] .thermal-header {
  border-bottom-color: #444 !important;
}
[data-theme="dark"] #notaPrintCanvasAreaIOS {
  background: #1a1a1a !important;
}
[data-theme="light"] .card-main,
[data-theme="light"] .card-header {
  background: rgba(255,255,255,0.95) !important;
  color: #111 !important;
}
`;
document.head.appendChild(themeCSS);



// FINAL CLEAN PATCH - Fix semua tombol print preview & estimasi 1 kolom & border 1px & default iOS & light
(function(){
  // Defaults
  window.strukPNGMode = localStorage.getItem('strukPNGMode') || 'ios';
  window.strukPrintMode = window.strukPNGMode;
  window.systemTheme = localStorage.getItem('systemTheme') || 'light';
  window.strukFontSizes = JSON.parse(localStorage.getItem('strukFontSizes')||'{"namaPelanggan":14,"statusBayar":12,"nominal":16,"estimasi":12}');
  window.strukSettings = JSON.parse(localStorage.getItem('strukSettings')||'{"show":{"estimasi":true,"namaKasir":true,"alamatOutlet":true,"waOutlet":true,"noNota":true,"tanggal":true,"layanan":true,"namaPelanggan":true,"statusBayar":true,"nominal":true,"depositInfo":false},"headerCustom":"*Cabang Utama* - Buka 08:00-21:00","footerCustom":"Terima kasih!"}');

  function saveAll(){
    try{
      localStorage.setItem('strukPNGMode', window.strukPNGMode);
      localStorage.setItem('strukPrintMode', window.strukPNGMode);
      localStorage.setItem('systemTheme', window.systemTheme);
      localStorage.setItem('strukFontSizes', JSON.stringify(window.strukFontSizes));
      localStorage.setItem('strukSettings', JSON.stringify(window.strukSettings));
      if(typeof saveHybridStruk==='function'){
        saveHybridStruk('strukPNGMode', window.strukPNGMode);
        saveHybridStruk('systemTheme', window.systemTheme);
        saveHybridStruk('strukFontSizes', window.strukFontSizes);
        saveHybridStruk('strukSettings', window.strukSettings);
      }
    }catch(e){}
  }

  function formatEstimasi1Kolom(text){
    if(!text || text==='-') return '14-10-26 | 10:00';
    var t = text.trim();
    // Replace space with |
    if(t.includes(' ')){
      var parts = t.split(' ');
      return parts[0] + ' | ' + parts.slice(1).join(' ');
    }
    return t;
  }

  // Update cards UI
  function updateModeCards(mode){
    var cardText=document.getElementById('modeTextCard');
    var cardIOS=document.getElementById('modeIOSCard');
    var checkText=document.getElementById('checkText');
    var checkIOS=document.getElementById('checkIOS');
    if(mode==='text'){
      if(cardText){ cardText.style.border='2px solid #111'; cardText.style.background='#111'; cardText.style.color='#fff'; }
      if(cardIOS){ cardIOS.style.border='1px solid rgba(0,0,0,0.14)'; cardIOS.style.background='rgba(255,255,255,0.9)'; cardIOS.style.color='#111'; }
      if(checkText) checkText.style.display='block';
      if(checkIOS) checkIOS.style.display='none';
    } else {
      if(cardIOS){ cardIOS.style.border='2px solid #f618a9'; cardIOS.style.background='#f618a9'; cardIOS.style.color='#fff'; }
      if(cardText){ cardText.style.border='1px solid rgba(0,0,0,0.14)'; cardText.style.background='rgba(255,255,255,0.9)'; cardText.style.color='#111'; }
      if(checkText) checkText.style.display='none';
      if(checkIOS) checkIOS.style.display='block';
    }
  }

  window.setStrukPrintMode = function(mode){
    window.strukPNGMode=mode;
    window.strukPrintMode=mode;
    saveAll();
    updateModeCards(mode);
    if(typeof showNoticeToast==='function'){
      showNoticeToast(mode==='ios' ? '🍎 iOS aktif - WA/WA Bisnis iOS, thermal tetap text paten' : '📄 Text aktif');
    }
    // If preview open, switch
    var overlay=document.getElementById('modalPreviewNotaOverlay');
    if(overlay && overlay.classList.contains('active') && window.activePreviewNotaObj){
      var currentSource = overlay.getAttribute('data-source') || 'wa';
      if(currentSource!=='print'){
        openPreviewClean(window.activePreviewNotaObj.id, currentSource);
      }
    }
  };

  window.previewModeFromMaster = function(mode){
    window.setStrukPrintMode(mode);
    var lastNota = (typeof antrianData!=='undefined' && antrianData.length>0) ? antrianData[0] : window.activePreviewNotaObj;
    if(lastNota){
      openPreviewClean(lastNota.id, 'wa');
    } else {
      if(typeof showNoticeToast==='function') showNoticeToast('Belum ada nota untuk preview');
    }
  };

  // Core function - single clean implementation
  function openPreviewClean(notaId, sourceMode){
    try{
      var nota = (typeof antrianData!=='undefined') ? antrianData.find(n=>n.id===notaId) : null;
      if(!nota) {
        if(window.activePreviewNotaObj && window.activePreviewNotaObj.id===notaId) nota=window.activePreviewNotaObj;
        else return;
      }
      window.activePreviewNotaObj=nota;
      
      var activeOutlet = (typeof getActiveOutlet==='function') ? getActiveOutlet() : {nama:'LAUNDRY LAND', alamat:'Jl. Merdeka No.12', wa:'08123456789'};
      var activeKaryawan = (typeof getActiveKaryawan==='function') ? getActiveKaryawan() : {nama:'Kasir'};

      // Populate thermal
      var setText=function(id, val){ var el=document.getElementById(id); if(el) el.innerText=val; };
      setText('p_outlet_name', activeOutlet.nama.toUpperCase());
      setText('p_outlet_address', activeOutlet.alamat || 'Jl. Merdeka No.12');
      setText('p_outlet_wa', 'WA: ' + (activeOutlet.wa || '08123456789'));
      setText('p_nota_num', nota.nota);
      setText('p_nota_date', new Date().toLocaleDateString('id-ID'));
      setText('p_customer_name', nota.namaPelanggan);
      setText('p_kasir_name', activeKaryawan.nama);
      setText('p_grand_total', 'Rp ' + (nota.totalNota||0).toLocaleString('id-ID'));
      setText('p_status_bayar', (nota.statusBayar||'').toUpperCase());
      var elProses=document.getElementById('p_status_proses'); if(elProses) elProses.innerText=(nota.statusProses||'').toUpperCase();

      var itemsContainer=document.getElementById('p_items_container');
      if(itemsContainer){
        var rowsHtml='';
        if(nota.items && nota.items.length>0){
          rowsHtml = nota.items.map(function(it){
            var sub=(it.subtotal||0).toLocaleString('id-ID');
            var qty=(it.qtyInput||'')+(it.satuan||'');
            return '<div style="display:flex; flex-direction:column; gap:1px; padding:5px 0; border-bottom:1px dashed #bbb;"><div style="display:flex; justify-content:space-between; font-weight:700; font-size:11px;"><span>'+it.nama+'</span><span>Rp '+sub+'</span></div><div style="font-size:10px; color:#555; display:flex; justify-content:space-between;"><span>'+qty+'</span><span>'+(it.estimasiVal||'')+' '+(it.estimasiUnit||'')+'</span></div></div>';
          }).join('');
        } else {
          rowsHtml = '<div style="display:flex; justify-content:space-between; padding:4px 0;"><span>'+(nota.layanan||'Layanan')+'</span><span>Rp '+(nota.totalNota||0).toLocaleString('id-ID')+'</span></div>';
        }
        itemsContainer.innerHTML=rowsHtml;
      }

      // Populate iOS
      setText('ios_outlet_name', activeOutlet.nama.toUpperCase());
      setText('ios_outlet_address', activeOutlet.alamat || 'Jl. Merdeka No.12');
      setText('ios_outlet_wa', 'WA: ' + (activeOutlet.wa || '08123456789'));
      setText('ios_nota_num', nota.nota);
      setText('ios_nota_date', new Date().toLocaleDateString('id-ID'));
      setText('ios_customer_name', nota.namaPelanggan);
      setText('ios_kasir_name', activeKaryawan.nama);
      setText('ios_grand_total', 'Rp ' + (nota.totalNota||0).toLocaleString('id-ID'));
      setText('ios_status_bayar', (nota.statusBayar||'').toUpperCase());
      var iosProses=document.getElementById('ios_status_proses'); if(iosProses) iosProses.innerText=(nota.statusProses||'').toUpperCase();

      var iosItems=document.getElementById('ios_items_container');
      if(iosItems){
        var rows='';
        if(nota.items && nota.items.length>0){
          rows = nota.items.map(function(it){
            var sub=(it.subtotal||0).toLocaleString('id-ID');
            return '<div style="display:flex; justify-content:space-between; padding:8px 12px; background:rgba(0,0,0,0.03); border-radius:10px; border:1px solid rgba(0,0,0,0.08);"><span style="font-weight:700;">'+it.nama+'</span><span>Rp '+sub+'</span></div>';
          }).join('');
        } else {
          rows = '<div style="padding:8px; border:1px solid rgba(0,0,0,0.08); border-radius:8px;">'+(nota.layanan||'Layanan')+'</div>';
        }
        iosItems.innerHTML=rows;
      }

      // Estimasi 1 kolom kanan [ Estimasi 14-10-26 | 10:00 ]
      var estimasiText = nota.estimasiFormatted || nota.estimasi || (nota.items && nota.items[0] ? (nota.items[0].estimasiVal+' '+nota.items[0].estimasiUnit) : '14-10-26 10:00');
      var formatted = formatEstimasi1Kolom(estimasiText);
      setText('p_estimasi_val', formatted);
      setText('ios_estimasi_val', formatted);

      // Logo BW thermal & warna iOS
      var colorLogo = localStorage.getItem('strukLogoColorBase64') || localStorage.getItem('strukLogoBase64') || '';
      var bwLogo = localStorage.getItem('strukLogoBWBase64') || colorLogo;
      var pLogoCont=document.getElementById('p_logo_container');
      if(pLogoCont && bwLogo){
        pLogoCont.innerHTML='<div style="background:#fff;padding:6px;border-radius:8px;display:inline-block;border:1px solid rgba(0,0,0,0.14);"><img src="'+bwLogo+'" style="max-width:80px;max-height:60px;object-fit:contain;filter:grayscale(1);"></div>';
      }
      var iosLogoCont=document.getElementById('ios_logo_container');
      if(iosLogoCont && colorLogo){
        iosLogoCont.innerHTML='<div style="width:100%;height:100%;background:#f618a9;display:flex;align-items:center;justify-content:center;border-radius:12px; border:1px solid rgba(0,0,0,0.14);"><img src="'+colorLogo+'" style="max-width:70%;max-height:70%;object-fit:contain;"></div>';
      }

      // Show correct canvas based on source
      var thermalCanvas=document.getElementById('notaPrintCanvasArea');
      var iosCanvas=document.getElementById('notaPrintCanvasAreaIOS');
      var titleModal=document.getElementById('previewNotaTitle');
      var overlay=document.getElementById('modalPreviewNotaOverlay');
      if(overlay) overlay.setAttribute('data-source', sourceMode);

      if(sourceMode==='print'){
        // Thermal paten
        if(thermalCanvas) thermalCanvas.style.display='block';
        if(iosCanvas) iosCanvas.style.display='none';
        if(titleModal) titleModal.innerText='Preview Thermal (Paten Text) - ' + nota.nota;
      } else {
        // WA/WA Bisnis ikut PNG mode
        var pngMode = window.strukPNGMode || 'ios';
        if(pngMode==='ios'){
          if(thermalCanvas) thermalCanvas.style.display='none';
          if(iosCanvas) iosCanvas.style.display='block';
          if(titleModal) titleModal.innerText='Preview Gambar iOS (Header #f618a9) - ' + nota.nota;
        } else {
          if(thermalCanvas) thermalCanvas.style.display='block';
          if(iosCanvas) iosCanvas.style.display='none';
          if(titleModal) titleModal.innerText='Preview Text Nota - ' + nota.nota;
        }
      }

      // Apply checkbox & font
      if(typeof applyStrukSettingsClean==='function') applyStrukSettingsClean();

      // Show modal
      if(overlay) overlay.classList.add('active');

      console.log('Preview opened', notaId, sourceMode, 'PNG mode', window.strukPNGMode);
    }catch(e){
      console.log('openPreviewClean error', e);
      if(typeof showNoticeToast==='function') showNoticeToast('Gagal buka preview: '+e.message);
    }
  }

  // Make it global
  window.openPreviewNotaModal = openPreviewClean;
  window.openPreviewClean = openPreviewClean;

  window.actionPrintNota = function(notaId, event){
    if(event) event.stopPropagation();
    openPreviewClean(notaId, 'print');
  };
  window.actionShareWANota = function(notaId, event){
    if(event) event.stopPropagation();
    openPreviewClean(notaId, 'wa');
  };

  window.executePrintFromPreview = function(){
    if(window.activePreviewNotaObj && typeof cetakThermalBluetooth==='function'){
      cetakThermalBluetooth(window.activePreviewNotaObj.id);
    } else if(typeof showNoticeToast==='function') showNoticeToast('Nota tidak ditemukan');
  };

  window.executeShareWAPNG = function(isBusiness){
    var mode = window.strukPNGMode || 'ios';
    if(window.activePreviewNotaObj && typeof sendWAImage==='function'){
      sendWAImage(window.activePreviewNotaObj, isBusiness, mode);
    }
  };

  window.executeShareWAText = function(isBusiness){
    if(window.activePreviewNotaObj && typeof sendWAText==='function'){
      sendWAText(window.activePreviewNotaObj, isBusiness);
    }
  };

  // Checkbox & Font logic - clean
  function applyStrukSettingsClean(){
    try{
      var show=(window.strukSettings && window.strukSettings.show) || {};
      var defaults={estimasi:true,namaKasir:true,alamatOutlet:true,waOutlet:true,noNota:true,tanggal:true,layanan:true,namaPelanggan:true,statusBayar:true,nominal:true,depositInfo:false};
      Object.keys(defaults).forEach(function(k){ if(typeof show[k]==='undefined') show[k]=defaults[k]; });

      var thermalMap={
        'p_outlet_address': show.alamatOutlet,
        'p_outlet_wa': show.waOutlet,
        'p_nota_num': show.noNota,
        'p_nota_date': show.tanggal,
        'p_customer_name': show.namaPelanggan,
        'p_kasir_name': show.namaKasir,
        'p_items_container': show.layanan,
        'p_grand_total': show.nominal,
        'p_status_bayar': show.statusBayar,
        'p_estimasi_row': show.estimasi
      };
      Object.keys(thermalMap).forEach(function(id){
        var el=document.getElementById(id);
        if(el) el.style.display = thermalMap[id]===false ? 'none' : '';
      });

      var iosMap={
        'ios_outlet_address': show.alamatOutlet,
        'ios_outlet_wa': show.waOutlet,
        'ios_nota_num': show.noNota,
        'ios_nota_date': show.tanggal,
        'ios_customer_name': show.namaPelanggan,
        'ios_kasir_name': show.namaKasir,
        'ios_items_container': show.layanan,
        'ios_grand_total': show.nominal,
        'ios_status_bayar': show.statusBayar,
        'ios_estimasi_global': show.estimasi
      };
      Object.keys(iosMap).forEach(function(id){
        var el=document.getElementById(id);
        if(el) el.style.display = iosMap[id]===false ? 'none' : '';
      });

      // Font sizes
      var fs=window.strukFontSizes;
      var map={
        'p_customer_name': fs.namaPelanggan,
        'ios_customer_name': fs.namaPelanggan,
        'p_status_bayar': fs.statusBayar,
        'ios_status_bayar': fs.statusBayar,
        'p_grand_total': fs.nominal,
        'ios_grand_total': fs.nominal,
        'p_estimasi_val': fs.estimasi,
        'ios_estimasi_val': fs.estimasi
      };
      Object.keys(map).forEach(function(id){
        var el=document.getElementById(id);
        if(el && map[id]) el.style.fontSize=map[id]+'px';
      });
    }catch(e){ console.log('applyStrukSettingsClean error', e); }
  }
  window.applyStrukSettingsToNota = applyStrukSettingsClean;
  window.applyStrukSettingsClean = applyStrukSettingsClean;

  window.updateStrukPreview = function(){
    try{
      var mini=document.getElementById('miniPreviewStruk');
      if(!mini) return;
      var ids={
        estimasi:'strukShowEstimasi',
        namaKasir:'strukShowNamaKasir',
        alamatOutlet:'strukShowAlamatOutlet',
        waOutlet:'strukShowWaOutlet',
        noNota:'strukShowNoNota',
        tanggal:'strukShowTanggal',
        layanan:'strukShowLayanan',
        namaPelanggan:'strukShowNamaPelanggan',
        statusBayar:'strukShowStatusBayar',
        nominal:'strukShowNominal',
        depositInfo:'strukShowDepositInfo'
      };
      if(!window.strukSettings) window.strukSettings={show:{}, headerCustom:'', footerCustom:''};
      if(!window.strukSettings.show) window.strukSettings.show={};
      Object.keys(ids).forEach(function(key){
        var el=document.getElementById(ids[key]);
        if(el) window.strukSettings.show[key]=!!el.checked;
      });
      var headerEl=document.getElementById('strukHeaderCustom');
      var footerEl=document.getElementById('strukFooterCustom');
      if(headerEl) window.strukSettings.headerCustom=headerEl.value;
      if(footerEl) window.strukSettings.footerCustom=footerEl.value;
      saveAll();

      var show=window.strukSettings.show;
      var headerText=window.strukSettings.headerCustom||'Cabang Utama';
      var footerText=window.strukSettings.footerCustom||'Terima kasih!';
      var logoColor=localStorage.getItem('strukLogoColorBase64') || localStorage.getItem('strukLogoBase64') || '';
      var logoHtml=logoColor ? '<div style="text-align:center;margin-bottom:4px;background:#f618a9;padding:6px;border-radius:8px; border:1px solid rgba(0,0,0,0.14);"><img src="'+logoColor+'" style="max-width:60px;max-height:40px;object-fit:contain;"></div>' : '';

      var html=logoHtml;
      html+='<div style="text-align:center;font-weight:800;">OUTLET LAUNDRY</div>';
      if(show.alamatOutlet) html+='<div style="text-align:center;font-size:7px;">Jl. Merdeka No.12</div>';
      if(show.waOutlet) html+='<div style="text-align:center;font-size:6px;">WA: 08123456789</div>';
      if(typeof parseChatBold==='function') html+='<div style="font-size:7px;text-align:center;margin:2px 0;">'+parseChatBold(headerText)+'</div>';
      html+='<div style="border-top:1px dashed #000;margin:4px 0;"></div>';
      if(show.noNota) html+='<div>No: #NT-1001</div>';
      if(show.tanggal) html+='<div>Tgl: '+new Date().toLocaleDateString('id-ID')+'</div>';
      if(show.namaPelanggan) html+='<div style="font-size:'+window.strukFontSizes.namaPelanggan+'px;font-weight:800;">Pelanggan: Budi</div>';
      if(show.layanan) html+='<div>Layanan: Cuci Komplit</div>';
      if(show.estimasi) html+='<div style="font-size:'+window.strukFontSizes.estimasi+'px;font-weight:800;background:#111;color:#fff;padding:4px 6px;border-radius:4px;margin:4px 0;display:flex;justify-content:space-between; border:1px solid rgba(0,0,0,0.14);"><span>Estimasi</span><span>14-10-26 | 10:00</span></div>';
      if(show.namaKasir) html+='<div>Kasir: Admin</div>';
      if(show.depositInfo) html+='<div>Deposit: Rp 0</div>';
      html+='<div style="border-top:1px dashed #000;margin:4px 0;"></div>';
      if(show.nominal) html+='<div style="font-size:'+window.strukFontSizes.nominal+'px;font-weight:900;">Total: Rp 30.000</div>';
      if(show.statusBayar) html+='<div style="font-size:'+window.strukFontSizes.statusBayar+'px;">Status: LUNAS</div>';
      html+='<div style="border-top:1px dashed #000;margin:4px 0;"></div>';
      if(typeof parseChatBold==='function') html+='<div style="font-size:7px;text-align:center;">'+parseChatBold(footerText)+'</div>';

      mini.innerHTML=html;

      if(document.getElementById('modalPreviewNotaOverlay')?.classList.contains('active')){
        applyStrukSettingsClean();
      }
    }catch(e){ console.log('updateStrukPreview error', e); }
  };

  window.changeFontSize = function(type, delta){
    if(!window.strukFontSizes[type]) window.strukFontSizes[type]=12;
    window.strukFontSizes[type]+=delta;
    if(window.strukFontSizes[type]<8) window.strukFontSizes[type]=8;
    if(window.strukFontSizes[type]>24) window.strukFontSizes[type]=24;
    saveAll();
    var el=document.getElementById('fontSize'+type.charAt(0).toUpperCase()+type.slice(1));
    if(el) el.innerText=window.strukFontSizes[type]+'px';
    window.updateStrukPreview();
    applyStrukSettingsClean();
    if(typeof showNoticeToast==='function') showNoticeToast('Ukuran '+type+' jadi '+window.strukFontSizes[type]+'px - terhubung ke nota');
  };

  window.simpanMasterStruk = function(){
    try{
      window.updateStrukPreview();
      saveAll();
      if(typeof showNoticeToast==='function') showNoticeToast('✅ Master Struk disimpan! Checkbox & font terhubung. Tap X untuk keluar');
    }catch(e){ if(typeof showNoticeToast==='function') showNoticeToast('Gagal simpan: '+e.message); }
  };

  // Override sendWAImage to respect mode
  var _origSendWAImage = window.sendWAImage;
  window.sendWAImage = async function(nota, isBusiness, forceMode){
    var mode = forceMode || window.strukPNGMode || 'ios';
    var elementId = mode==='ios' ? 'notaPrintCanvasAreaIOS' : 'notaPrintCanvasArea';
    var element = document.getElementById(elementId);
    if(!element) element = document.getElementById('notaPrintCanvasArea');
    if(!element) return;

    var pTarget = (typeof pelangganData!=='undefined') ? pelangganData.find(function(p){ return p.nama.toLowerCase()===nota.namaPelanggan.toLowerCase(); }) : null;
    var wa = pTarget ? pTarget.wa : '';

    try{
      var bgColor = mode==='ios' ? null : "#ffffff";
      var canvas = await html2canvas(element, {scale:2, backgroundColor:bgColor, useCORS:true, allowTaint:true});
      canvas.toBlob(async function(blob){
        var fileName = 'Struk-'+nota.nota.replace('#','')+'-'+(mode==='ios'?'iOS':'Text')+'.png';
        var file = new File([blob], fileName, {type:'image/png'});
        if(navigator.canShare && navigator.canShare({files:[file]})){
          try{ await navigator.share({files:[file], title:fileName, text:'Nota '+nota.nota+' - '+nota.namaPelanggan+' ('+mode+')'}); if(typeof showNoticeToast==='function') showNoticeToast('✅ PNG '+mode+' dishare ke WA'+(isBusiness?' Bisnis':'')); return; }catch(e){}
        }
        var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=fileName; a.click(); setTimeout(function(){ URL.revokeObjectURL(url); },1000);
        var phone=wa?wa.replace(/[^0-9]/g,''):''; var waDomain=isBusiness?'https://api.whatsapp.com/send':'https://wa.me'; var waUrl=phone? waDomain+'/'+phone+'?text='+encodeURIComponent('Berikut nota '+nota.nota+' ('+mode+' sudah didownload)') : waDomain+'?text='+encodeURIComponent('Nota '+nota.nota); setTimeout(function(){ window.open(waUrl,'_blank'); },800);
        if(typeof showNoticeToast==='function') showNoticeToast('📥 PNG '+mode.toUpperCase()+' didownload, thermal tetap text paten');
      },'image/png');
    }catch(e){ console.log('WA Image error', e); if(typeof showNoticeToast==='function') showNoticeToast('Gagal render PNG: '+e.message); }
  };

  // Init
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      updateModeCards(window.strukPNGMode||'ios');
      var map={estimasi:'strukShowEstimasi', namaKasir:'strukShowNamaKasir', alamatOutlet:'strukShowAlamatOutlet', waOutlet:'strukShowWaOutlet', noNota:'strukShowNoNota', tanggal:'strukShowTanggal', layanan:'strukShowLayanan', namaPelanggan:'strukShowNamaPelanggan', statusBayar:'strukShowStatusBayar', nominal:'strukShowNominal', depositInfo:'strukShowDepositInfo'};
      var show=(window.strukSettings && window.strukSettings.show) || {};
      Object.keys(map).forEach(function(k){
        var el=document.getElementById(map[k]);
        if(el && typeof show[k]!=='undefined') el.checked=!!show[k];
        if(el){
          el.addEventListener('change', function(){ window.updateStrukPreview(); });
        }
      });
      window.updateStrukPreview();
      applyStrukSettingsClean();
      if(!localStorage.getItem('strukPNGMode')){
        localStorage.setItem('strukPNGMode','ios');
        localStorage.setItem('strukPrintMode','ios');
      }
      if(!localStorage.getItem('systemTheme')){
        localStorage.setItem('systemTheme','light');
      }
      console.log('Final clean patch loaded - all print preview fixed');
    }, 800);
  });
})();



// Global Omzet All Outlet - 2x2 Grid, Owner/Admin only
(function(){
  function getOutletData(){
    try{
      if(typeof outletsData!=='undefined' && outletsData.length>0) return outletsData;
      if(typeof outletData!=='undefined' && outletData.length>0) return outletData;
      var keys = ['outletsData','outletData','masterOutletData','dataOutlet'];
      for(var k=0;k<keys.length;k++){
        var saved = JSON.parse(localStorage.getItem(keys[k])||'[]');
        if(saved && saved.length>0) return saved;
      }
    }catch(e){}
    // Default sesuai request: Laundry Land & ResiQ Laundry
    var hardcoded = [{id:'outlet_laundry_land', nama:'Laundry Land'}, {id:'outlet_resiq', nama:'ResiQ Laundry'}]; try{ var savedOutlets = (typeof outletsData!=='undefined'? outletsData : JSON.parse(localStorage.getItem('outletsData')||'[]')); if(savedOutlets && savedOutlets.length>=2){ var hasLaundryLand = savedOutlets.some(o=>o.nama.toLowerCase().includes('laundry land')); var hasResiQ = savedOutlets.some(o=>o.nama.toLowerCase().includes('resiq')); if(hasLaundryLand || hasResiQ){ return savedOutlets; } } }catch(e){} return hardcoded;
  }

  window.updateGlobalOmzetCard = function(){
    try{
      var outlets = getOutletData();
      var outletA = outlets[0] || {nama:'Outlet_a'};
      var outletB = outlets[1] || {nama:'Outlet_b'};

      var labelA=document.getElementById('labelOutletA');
      var labelB=document.getElementById('labelOutletB');
      var valueLabelA=document.getElementById('valueOutletALabel');
      var valueLabelB=document.getElementById('valueOutletBLabel');
      var subA=document.getElementById('subOmzetA');
      var subB=document.getElementById('subOmzetB');

      if(labelA) labelA.innerText = outletA.nama.toUpperCase();
      if(labelB) labelB.innerText = outletB.nama.toUpperCase();
      if(valueLabelA) valueLabelA.innerText = outletA.nama;
      if(valueLabelB) valueLabelB.innerText = outletB.nama;
      if(subA) subA.innerText = outletA.nama;
      if(subB) subB.innerText = outletB.nama;

      var totalGlobal = 0;
      if(typeof antrianData!=='undefined'){
        antrianData.forEach(function(item){ totalGlobal += (item.totalNota||0); });
      }

      // Split omzet per outlet - simple division or by outletId
      var omzetA = 0, omzetB = 0;
      if(typeof antrianData!=='undefined' && outlets.length>0){
        antrianData.forEach(function(item){
          if(!item.outletId || item.outletId===outlets[0].id) omzetA += (item.totalNota||0);
          else if(outlets[1] && item.outletId===outlets[1].id) omzetB += (item.totalNota||0);
          else omzetA += (item.totalNota||0); // default to A
        });
        if(outlets.length===1){ omzetA = totalGlobal; omzetB = 0; }
        if(outlets.length>=2 && omzetB===0 && omzetA===totalGlobal){
          omzetA = Math.floor(totalGlobal/2);
          omzetB = totalGlobal - omzetA;
        }
      }

      var elA=document.getElementById('valueOmzetA');
      var elB=document.getElementById('valueOmzetB');
      var elTotal=document.getElementById('valueTotalGlobal');
      if(elA) elA.innerText='Rp ' + omzetA.toLocaleString('id-ID');
      if(elB) elB.innerText='Rp ' + omzetB.toLocaleString('id-ID');
      if(elTotal) elTotal.innerText='Rp ' + totalGlobal.toLocaleString('id-ID');

      // Visibility - Owner/Admin only + Level & Hak Akses
      var currentLevel = 'Owner';
      try{
        if(typeof getActiveKaryawan==='function'){
          var k = getActiveKaryawan();
          if(k && k.level) currentLevel = k.level;
        } else {
          currentLevel = localStorage.getItem('activeLevel')||'Owner';
        }
      }catch(e){}
      
      var card=document.getElementById('cardGlobalOmzet');
      var allowedLevel = (currentLevel==='Owner' || currentLevel==='Admin');
      var allowedMenu = true;
      try{
        var levelAccess = JSON.parse(localStorage.getItem('levelMenuAccess')||'null');
        if(levelAccess && levelAccess[currentLevel] && typeof levelAccess[currentLevel]['Global Omzet']!=='undefined'){
          allowedMenu = !!levelAccess[currentLevel]['Global Omzet'];
        }
      }catch(e){}
      
      if(card) card.style.display = (allowedLevel && allowedMenu) ? 'flex' : 'none';
    }catch(e){ console.log('updateGlobalOmzet error', e); }
  };

  window.openGlobalOmzetModal = function(){
    try{
      var outlets = getOutletData();
      var outletA = outlets[0] || {nama:'Outlet_a', id:''};
      var outletB = outlets[1] || {nama:'Outlet_b', id:''};
      var totalSelisih = 0;
      if(typeof antrianData!=='undefined'){
        antrianData.forEach(function(item){ totalSelisih += (item.totalNota||0); });
      }
      var omzetA = Math.floor(totalSelisih/2);
      var omzetB = totalSelisih - omzetA;

      var modalHtml = '<div style="padding:16px;"><div style="font-size:14px; font-weight:800; margin-bottom:12px;">🌐 Global Omzet - All Outlet</div><div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;"><div style="background:rgba(246,24,169,0.08); border:1px solid rgba(0,0,0,0.14); border-radius:8px; padding:12px; text-align:center;"><div style="font-size:10px; color:#666;">'+outletA.nama+'</div><div style="font-size:14px; font-weight:900; margin-top:4px;">Rp '+omzetA.toLocaleString('id-ID')+'</div></div><div style="background:rgba(59,130,246,0.08); border:1px solid rgba(0,0,0,0.14); border-radius:8px; padding:12px; text-align:center;"><div style="font-size:10px; color:#666;">'+outletB.nama+'</div><div style="font-size:14px; font-weight:900; margin-top:4px;">Rp '+omzetB.toLocaleString('id-ID')+'</div></div></div><div style="background:rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.14); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;"><span style="font-size:11px; font-weight:700;">TOTAL SELISIH HARI INI ALL OUTLET</span><span style="font-size:14px; font-weight:900;">Rp '+totalSelisih.toLocaleString('id-ID')+'</span></div><div style="margin-top:12px; display:flex; gap:8px;"><button onclick="openKasHariIniModalForOutlet(\''+ (outletA.id||'') +'\')" style="flex:1; padding:10px; background:#f618a9; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:11px; border:1px solid rgba(0,0,0,0.14);">Kas '+outletA.nama+'</button><button onclick="openKasHariIniModalForOutlet(\''+ (outletB.id||'') +'\')" style="flex:1; padding:10px; background:#3b82f6; color:#fff; border:none; border-radius:8px; font-weight:700; font-size:11px; border:1px solid rgba(0,0,0,0.14);">Kas '+outletB.nama+'</button></div><div style="margin-top:8px;"><button onclick="closeGlobalOmzetModal()" style="width:100%; padding:10px; background:rgba(0,0,0,0.06); border:1px solid rgba(0,0,0,0.14); border-radius:8px; font-weight:700;">Tutup</button></div></div>';

      var overlay=document.getElementById('modalGlobalOmzetOverlay');
      if(!overlay){
        overlay=document.createElement('div');
        overlay.id='modalGlobalOmzetOverlay';
        overlay.className='modal-overlay';
        overlay.style.cssText='position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;';
        overlay.innerHTML='<div class="modal-card border-3-glass-blur rounded-12" style="max-width:380px; width:90%; background:rgba(255,255,255,0.98); max-height:90vh; overflow-y:auto; border:1px solid rgba(0,0,0,0.14);">'+modalHtml+'</div>';
        overlay.onclick=function(e){ if(e.target.id==='modalGlobalOmzetOverlay') closeGlobalOmzetModal(); };
        document.body.appendChild(overlay);
      } else {
        overlay.querySelector('.modal-card').innerHTML=modalHtml;
      }
      overlay.classList.add('active');
      overlay.style.display='flex';
    }catch(e){ console.log('openGlobalOmzetModal error', e); }
  };

  window.closeGlobalOmzetModal = function(){
    var overlay=document.getElementById('modalGlobalOmzetOverlay');
    if(overlay){ overlay.classList.remove('active'); overlay.style.display='none'; }
  };

  window.openKasHariIniModalForOutlet = function(outletId){
    if(typeof openModalKasHariIni==='function' || typeof openKasHariIniModal==='function'){
      if(outletId && typeof setActiveOutlet==='function') setActiveOutlet(outletId);
      if(typeof openModalKasHariIni==='function') openModalKasHariIni();
      else if(typeof openKasHariIniModal==='function') openKasHariIniModal();
    } else {
      if(typeof showNoticeToast==='function') showNoticeToast('Buka Kas Hari Ini untuk outlet ' + outletId);
      // Fallback: scroll to kas
      var kasCard = document.getElementById('card-kas-hari-ini');
      if(kasCard) kasCard.scrollIntoView({behavior:'smooth'});
    }
    closeGlobalOmzetModal();
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      updateGlobalOmzetCard();
      setInterval(updateGlobalOmzetCard, 3000);
    }, 1200);
  });
})();



// Global Omzet Dropdown Model - sama seperti Kas Hari Ini, auto row per outlet
(function(){
  function getOutletData(){
    try{
      if(typeof outletsData!=='undefined' && outletsData.length>0) return outletsData;
      var keys = ['outletsData','outletData','masterOutletData','dataOutlet'];
      for(var k=0;k<keys.length;k++){
        var saved = JSON.parse(localStorage.getItem(keys[k])||'[]');
        if(saved && saved.length>0) return saved;
      }
    }catch(e){}
    return [{id:'outlet_laundry_land', nama:'Laundry Land'}, {id:'outlet_resiq', nama:'ResiQ Laundry'}];
  }

  function getOmzetByOutletId(outletId){
    var total = 0;
    if(typeof antrianData!=='undefined'){
      antrianData.forEach(function(item){
        if(!item.outletId || item.outletId===outletId) total += (item.totalNota||0);
        // If no outletId field, we approximate by active outlet - for demo use total divided
      });
    }
    return total;
  }

  window.updateGlobalOmzetCard = function(){
    try{
      var outlets = getOutletData();
      var container = document.getElementById('globalOmzetRowsContainer');
      if(!container) return;
      
      container.innerHTML = '';
      var totalGlobal = 0;

      outlets.forEach(function(outlet, idx){
        var omzet = 0;
        // Calculate omzet - if outletsData has more than 1, try to filter
        if(typeof antrianData!=='undefined'){
          if(outlets.length===1){
            antrianData.forEach(function(it){ omzet += (it.totalNota||0); });
          } else {
            // Simple logic: if item has outletId match, else split
            var matched = antrianData.filter(function(it){ return it.outletId===outlet.id; });
            if(matched.length>0){
              matched.forEach(function(it){ omzet += (it.totalNota||0); });
            } else {
              // No outletId, distribute equally for demo
              omzet = Math.floor((function(){ var t=0; antrianData.forEach(function(it){ t+=(it.totalNota||0); }); return t; })() / outlets.length);
              if(idx===outlets.length-1){
                // Adjust last to ensure total matches
                var sumPrev = 0;
                for(var j=0;j<idx;j++){
                  var prevOmzet = Math.floor((function(){ var t=0; antrianData.forEach(function(it){ t+=(it.totalNota||0); }); return t; })() / outlets.length);
                  sumPrev += prevOmzet;
                }
                var total = (function(){ var t=0; antrianData.forEach(function(it){ t+=(it.totalNota||0); }); return t; })();
                omzet = total - sumPrev;
              }
            }
          }
        }
        totalGlobal += omzet;

        var row = document.createElement('div');
        row.className = 'dropdown-row border-3-crystal rounded-12 tap-model';
        row.style.cssText = 'background:#fff; border:1px solid rgba(0,0,0,0.14); cursor:pointer;';
        row.onclick = (function(id){ return function(){ openKasHariIniModalForOutlet(id); }; })(outlet.id);
        
        var color = idx%2===0 ? '#f618a9' : '#3b82f6';
        var lightBg = idx%2===0 ? 'rgba(246,24,169,0.08)' : 'rgba(59,130,246,0.08)';
        
        row.innerHTML = `
          <div class="dropdown-row-left">
            <div style="width:3px; height:24px; border-radius:2px; background:${color};"></div>
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:10px; font-weight:800; color:#111;">${outlet.nama}</span>
              <span style="font-size:7px; color:#666; font-weight:600;">OMZET HARI INI</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="dropdown-row-right" style="font-size:11px; font-weight:900;">Rp ${omzet.toLocaleString('id-ID')}</span>
            <svg class="icon-svg" viewBox="0 0 24 24" style="width:14px; height:14px;"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        `;
        container.appendChild(row);
      });

      // If no outlet, show default 2
      if(outlets.length===0){
        var defaultOutlets = [{id:'outlet_laundry_land', nama:'Laundry Land'}, {id:'outlet_resiq', nama:'ResiQ Laundry'}];
        defaultOutlets.forEach(function(outlet, idx){
          var row = document.createElement('div');
          row.className = 'dropdown-row border-3-crystal rounded-12';
          row.style.cssText = 'background:#fff; border:1px solid rgba(0,0,0,0.14);';
          row.innerHTML = `<div class="dropdown-row-left"><span style="font-size:10px; font-weight:800;">${outlet.nama}</span></div><span class="dropdown-row-right">Rp 0</span>`;
          container.appendChild(row);
        });
      }

      var totalEl = document.getElementById('valueTotalGlobal');
      var totalHeaderEl = document.getElementById('valueTotalGlobalHeader');
      if(totalEl) totalEl.innerText = 'Rp ' + totalGlobal.toLocaleString('id-ID');
      if(totalHeaderEl) totalHeaderEl.innerText = 'Rp ' + totalGlobal.toLocaleString('id-ID');

      // Visibility - Owner/Admin only + Level & Hak Akses
      var currentLevel = 'Owner';
      try{
        if(typeof getActiveKaryawan==='function'){
          var k = getActiveKaryawan();
          if(k && k.level) currentLevel = k.level;
        } else {
          currentLevel = localStorage.getItem('activeLevel')||'Owner';
        }
      }catch(e){}
      
      var card = document.getElementById('dropdownGlobalOmzet');
      var allowedLevel = (currentLevel==='Owner' || currentLevel==='Admin');
      var allowedMenu = true;
      try{
        var levelAccess = JSON.parse(localStorage.getItem('levelMenuAccess')||'null');
        if(levelAccess && levelAccess[currentLevel] && typeof levelAccess[currentLevel]['Global Omzet']!=='undefined'){
          allowedMenu = !!levelAccess[currentLevel]['Global Omzet'];
        }
      }catch(e){}
      
      if(card) card.style.display = (allowedLevel && allowedMenu) ? 'block' : 'none';
    }catch(e){ console.log('updateGlobalOmzet error', e); }
  };

  window.openKasHariIniModalForOutlet = function(outletId){
    if(typeof setActiveOutlet==='function' && outletId) setActiveOutlet(outletId);
    if(typeof openModalKasHariIni==='function') openModalKasHariIni();
    else if(typeof openKasHariIniModal==='function') openKasHariIniModal();
    else if(typeof toggleDropdown==='function') toggleDropdown('dropdownKas');
    else {
      var kasCard = document.getElementById('dropdownKas');
      if(kasCard){ kasCard.classList.add('expanded'); kasCard.scrollIntoView({behavior:'smooth'}); }
    }
  };

  // Hook toggleDropdown for Global Omzet
  if(typeof window.toggleDropdown==='undefined'){
    window.toggleDropdown = function(id){
      var card = document.getElementById(id);
      if(card) card.classList.toggle('expanded');
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      updateGlobalOmzetCard();
      setInterval(updateGlobalOmzetCard, 3000);
      // Default hidden (collapsed) - only header visible
      var card = document.getElementById('dropdownGlobalOmzet');
      if(card) card.classList.remove('expanded');
    }, 1000);
  });

  // Auto update when outlet added
  var origSimpanOutlet = window.simpanOutlet;
  if(typeof origSimpanOutlet==='function'){
    window.simpanOutlet = function(){
      var result = origSimpanOutlet.apply(this, arguments);
      setTimeout(updateGlobalOmzetCard, 800);
      return result;
    };
  }
})();



function openModalExportImport(){ document.getElementById('modalExportImportOverlay').classList.add('active'); }
function closeModalExportImport(){ document.getElementById('modalExportImportOverlay').classList.remove('active'); }
function closeModalExportImportOnBackdrop(e){ if(e.target.id==='modalExportImportOverlay') closeModalExportImport(); }
function switchExportTab(tab){
  document.querySelectorAll('.export-tab').forEach(btn=>{
    var isActive = btn.dataset.tab===tab;
    btn.style.background = isActive ? '#111' : 'transparent';
    btn.style.color = isActive ? '#fff' : '#666';
  });
  document.querySelectorAll('.export-tab-content').forEach(c=>c.style.display='none');
  var el = document.getElementById('exportTab'+tab.charAt(0).toUpperCase()+tab.slice(1));
  if(el) el.style.display='flex';
}
function getOutletNameById(id){ try{ if(typeof outletsData!=='undefined'){ var o=outletsData.find(x=>x.id===id); if(o) return o.nama; } }catch(e){} return id||''; }
function getOutletIdByName(name){ try{ if(typeof outletsData!=='undefined'){ var o=outletsData.find(x=>x.nama.toLowerCase()===name.toLowerCase()); if(o) return o.id; } }catch(e){} return name; }
function toCSV(rows){ return rows.map(r=>r.map(v=>{ var s=(v===null||v===undefined)?'':String(v); if(s.includes(',')||s.includes('"')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"'; return s; }).join(',')).join('\n'); }
function fromCSV(text){ var lines=text.split(/\r?\n/).filter(l=>l.trim()); if(!lines.length) return []; function parseLine(line){ var res=[],cur='',inQ=false; for(var i=0;i<line.length;i++){ var c=line[i]; if(c=='"'){ if(inQ&&line[i+1]=='"'){cur+='"';i++;} else inQ=!inQ; } else if(c===','&&!inQ){res.push(cur);cur='';} else cur+=c; } res.push(cur); return res; } var headers=parseLine(lines[0]).map(h=>h.trim()); var data=[]; for(var i=1;i<lines.length;i++){ var vals=parseLine(lines[i]); var obj={}; headers.forEach((h,idx)=>{obj[h]=vals[idx]||'';}); data.push(obj); } return data; }
function downloadFile(content, filename, type){ var blob=new Blob([content],{type:type||'text/csv;charset=utf-8;'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function downloadTemplatePelanggan(format){ var headers=['nama','wa','alamat','deposito','outlet','action']; var sample=[['Budi Santoso','081234567890','Jl. Mawar No.10','150000','Laundry Land',''],['Siti Aminah','081299887766','Jl. Melati No.5','10000','ResiQ Laundry',''],['Contoh Hapus','081122334455','Jl. Anggrek No.8','0','Laundry Land','delete']]; if(format==='csv'){ downloadFile(toCSV([headers].concat(sample)),'template-pelanggan.csv','text/csv'); } else { if(typeof XLSX!=='undefined'){ var ws=XLSX.utils.aoa_to_sheet([headers].concat(sample)); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Pelanggan'); XLSX.writeFile(wb,'template-pelanggan.xlsx'); } else downloadFile(toCSV([headers].concat(sample)),'template-pelanggan.csv','text/csv'); } if(typeof showNoticeToast==='function') showNoticeToast('📄 Template Pelanggan '+format.toUpperCase()+' didownload'); }
function downloadTemplateLayanan(format){ var headers=['nama','kode','harga','satuan','estimasiVal','estimasiUnit','minKg','outlet','action']; var sample=[['Cuci Komplit Express','CKE','10000','Kg','3','Jam','3','Laundry Land',''],['Cuci Kering Karpet','CKK','30000','Pcs','2','Hari','0','ResiQ Laundry',''],['Setrika Kilat','SKL','10000','Kg','4','Jam','0','Laundry Land','delete']]; if(format==='csv'){ downloadFile(toCSV([headers].concat(sample)),'template-layanan.csv','text/csv'); } else { if(typeof XLSX!=='undefined'){ var ws=XLSX.utils.aoa_to_sheet([headers].concat(sample)); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Layanan'); XLSX.writeFile(wb,'template-layanan.xlsx'); } else downloadFile(toCSV([headers].concat(sample)),'template-layanan.csv','text/csv'); } if(typeof showNoticeToast==='function') showNoticeToast('🏷️ Template Layanan '+format.toUpperCase()+' didownload'); }
function exportPelanggan(format){ var rows=[]; var headers=['nama','wa','alamat','deposito','outlet','outletId']; rows.push(headers); (pelangganData||[]).forEach(function(p){ rows.push([p.nama,p.wa,p.alamat||'',p.deposito||0,getOutletNameById(p.outletId),p.outletId]); }); if(format==='csv'){ downloadFile(toCSV(rows),'export-pelanggan-'+new Date().toISOString().slice(0,10)+'.csv','text/csv'); } else { if(typeof XLSX!=='undefined'){ var ws=XLSX.utils.aoa_to_sheet(rows); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Pelanggan'); XLSX.writeFile(wb,'export-pelanggan-'+new Date().toISOString().slice(0,10)+'.xlsx'); } else downloadFile(toCSV(rows),'export-pelanggan.csv','text/csv'); } if(typeof showNoticeToast==='function') showNoticeToast('⬇️ Export Pelanggan '+format.toUpperCase()+' '+pelangganData.length+' data'); }
function exportLayanan(format){ var rows=[]; var headers=['nama','kode','harga','satuan','estimasiVal','estimasiUnit','minKg','outlet','outletId']; rows.push(headers); (layananData||[]).forEach(function(l){ rows.push([l.nama,l.kode,l.harga,l.satuan,l.estimasiVal,l.estimasiUnit,l.minKg,getOutletNameById(l.outletId),l.outletId]); }); if(format==='csv'){ downloadFile(toCSV(rows),'export-layanan-'+new Date().toISOString().slice(0,10)+'.csv','text/csv'); } else { if(typeof XLSX!=='undefined'){ var ws=XLSX.utils.aoa_to_sheet(rows); var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Layanan'); XLSX.writeFile(wb,'export-layanan-'+new Date().toISOString().slice(0,10)+'.xlsx'); } else downloadFile(toCSV(rows),'export-layanan.csv','text/csv'); } if(typeof showNoticeToast==='function') showNoticeToast('⬇️ Export Layanan '+format.toUpperCase()+' '+layananData.length+' data'); }
function importPelanggan(event){ var file=event.target.files[0]; if(!file) return; var mode=document.querySelector('input[name="importModePelanggan"]:checked')?.value||'append'; var statusEl=document.getElementById('importPelangganStatus'); if(statusEl) statusEl.innerText='⏳ Membaca...'; var reader=new FileReader(); reader.onload=function(e){ try{ var data=[]; if(file.name.endsWith('.csv')){ data=fromCSV(e.target.result); } else { if(typeof XLSX!=='undefined'){ var wb=XLSX.read(e.target.result,{type:'binary'}); var ws=wb.Sheets[wb.SheetNames[0]]; data=XLSX.utils.sheet_to_json(ws,{defval:''}); } else { statusEl.innerText='❌ XLSX butuh SheetJS'; return; } } var added=0,deleted=0; if(mode==='replace') pelangganData=[]; data.forEach(function(row){ var nama=(row.nama||'').trim(); if(!nama) return; var action=(row.action||'').toLowerCase(); if(action==='delete'||mode==='delete'){ var before=pelangganData.length; pelangganData=pelangganData.filter(p=>p.nama.toLowerCase()!==nama.toLowerCase()); if(pelangganData.length<before) deleted++; } else { var existing=pelangganData.find(p=>p.nama.toLowerCase()===nama.toLowerCase()); var outletId=row.outletId||getOutletIdByName(row.outlet||'')||(typeof outletsData!=='undefined'&&outletsData[0]?outletsData[0].id:'outlet-1'); if(existing){ existing.wa=row.wa||existing.wa; existing.alamat=row.alamat||existing.alamat; existing.deposito=parseInt(row.deposito)||existing.deposito||0; existing.outletId=outletId; } else { pelangganData.push({id:'pelanggan-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), outletId:outletId, nama:nama, wa:row.wa||'', tanpaWa:!row.wa, simpanKontak:true, alamat:row.alamat||'', deposito:parseInt(row.deposito)||0}); added++; } } }); try{ localStorage.setItem('pelangganData',JSON.stringify(pelangganData)); }catch(e){} if(typeof renderPelangganList==='function') renderPelangganList(); if(typeof updateGlobalOmzetCard==='function') updateGlobalOmzetCard(); if(statusEl) statusEl.innerText='✅ +'+added+' tambah, -'+deleted+' hapus. Total:'+pelangganData.length; if(typeof showNoticeToast==='function') showNoticeToast('✅ Import Pelanggan +'+added+' -'+deleted); }catch(err){ if(statusEl) statusEl.innerText='❌ '+err.message; } }; if(file.name.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file); event.target.value=''; }
function importLayanan(event){ var file=event.target.files[0]; if(!file) return; var mode=document.querySelector('input[name="importModeLayanan"]:checked')?.value||'append'; var statusEl=document.getElementById('importLayananStatus'); if(statusEl) statusEl.innerText='⏳ Membaca...'; var reader=new FileReader(); reader.onload=function(e){ try{ var data=[]; if(file.name.endsWith('.csv')){ data=fromCSV(e.target.result); } else { if(typeof XLSX!=='undefined'){ var wb=XLSX.read(e.target.result,{type:'binary'}); var ws=wb.Sheets[wb.SheetNames[0]]; data=XLSX.utils.sheet_to_json(ws,{defval:''}); } else { statusEl.innerText='❌ XLSX butuh SheetJS'; return; } } var added=0,deleted=0; if(mode==='replace') layananData=[]; data.forEach(function(row){ var nama=(row.nama||'').trim(); if(!nama) return; var action=(row.action||'').toLowerCase(); if(action==='delete'||mode==='delete'){ var before=layananData.length; layananData=layananData.filter(l=>l.nama.toLowerCase()!==nama.toLowerCase()&&(l.kode||'').toLowerCase()!==(row.kode||'').toLowerCase()); if(layananData.length<before) deleted++; } else { var existing=layananData.find(l=>l.nama.toLowerCase()===nama.toLowerCase()|| (l.kode&&row.kode&&l.kode.toLowerCase()===String(row.kode).toLowerCase())); var outletId=row.outletId||getOutletIdByName(row.outlet||'')||(typeof outletsData!=='undefined'&&outletsData[0]?outletsData[0].id:'outlet-1'); if(existing){ existing.kode=row.kode||existing.kode; existing.harga=parseInt(row.harga)||existing.harga; existing.satuan=row.satuan||existing.satuan; existing.estimasiVal=parseInt(row.estimasiVal)||existing.estimasiVal; existing.estimasiUnit=row.estimasiUnit||existing.estimasiUnit; existing.minKg=parseInt(row.minKg)||existing.minKg||0; existing.outletId=outletId; } else { layananData.push({id:'layanan-'+Date.now()+'-'+Math.random().toString(36).slice(2,7), outletId:outletId, nama:nama, kode:row.kode||'', harga:parseInt(row.harga)||0, satuan:row.satuan||'Kg', estimasiVal:parseInt(row.estimasiVal)||3, estimasiUnit:row.estimasiUnit||'Jam', minKg:parseInt(row.minKg)||0}); added++; } } }); try{ localStorage.setItem('layananData',JSON.stringify(layananData)); }catch(e){} if(typeof renderLayananList==='function') renderLayananList(); if(statusEl) statusEl.innerText='✅ +'+added+' -'+deleted+' Total:'+layananData.length; if(typeof showNoticeToast==='function') showNoticeToast('✅ Import Layanan +'+added+' -'+deleted); }catch(err){ if(statusEl) statusEl.innerText='❌ '+err.message; } }; if(file.name.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file); event.target.value=''; }
function exportFullBackup(format){ var backup={version:'1.0', date:new Date().toISOString(), outletsData:(typeof outletsData!=='undefined'?outletsData:[]), pelangganData:(typeof pelangganData!=='undefined'?pelangganData:[]), layananData:(typeof layananData!=='undefined'?layananData:[]), antrianData:(typeof antrianData!=='undefined'?antrianData:[]), karyawanData:(typeof karyawanData!=='undefined'?karyawanData:[])}; if(format==='json'){ downloadFile(JSON.stringify(backup,null,2),'backup-laundry-land-'+new Date().toISOString().slice(0,10)+'.json','application/json'); } else { if(typeof XLSX!=='undefined'){ var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(backup.pelangganData),'Pelanggan'); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(backup.layananData),'Layanan'); XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(backup.outletsData),'Outlet'); XLSX.writeFile(wb,'backup-all-'+new Date().toISOString().slice(0,10)+'.xlsx'); } else downloadFile(JSON.stringify(backup,null,2),'backup-laundry-land.json','application/json'); } if(typeof showNoticeToast==='function') showNoticeToast('💾 Backup '+format.toUpperCase()+' berhasil'); }
function importFullBackup(event){ var file=event.target.files[0]; if(!file) return; var statusEl=document.getElementById('importBackupStatus'); if(statusEl) statusEl.innerText='⏳ Restore...'; var reader=new FileReader(); reader.onload=function(e){ try{ var backup=JSON.parse(e.target.result); if(backup.pelangganData) pelangganData=backup.pelangganData; if(backup.layananData) layananData=backup.layananData; if(backup.outletsData) outletsData=backup.outletsData; if(backup.antrianData) antrianData=backup.antrianData; try{ localStorage.setItem('pelangganData',JSON.stringify(pelangganData)); localStorage.setItem('layananData',JSON.stringify(layananData)); localStorage.setItem('outletsData',JSON.stringify(outletsData)); }catch(err){} if(typeof renderPelangganList==='function') renderPelangganList(); if(typeof renderLayananList==='function') renderLayananList(); if(typeof renderOutletList==='function') renderOutletList(); if(statusEl) statusEl.innerText='✅ Restore '+(backup.pelangganData?.length||0)+' pelanggan, '+(backup.layananData?.length||0)+' layanan'; if(typeof showNoticeToast==='function') showNoticeToast('♻️ Restore berhasil!'); setTimeout(()=>location.reload(),1200); }catch(err){ if(statusEl) statusEl.innerText='❌ '+err.message; } }; reader.readAsText(file); event.target.value=''; }



import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWVjcWJmam1tbHJ0bW9sbnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MDEwNjQ0LCJleHAiOjIwNjU5ODY2NDR9.V5a1u3h1U9sZ5Y6mY8rQ9s0pLqWb2vC3dE4fG5hJ6iK7l';
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('☁️ SUPABASE MERAH 5 TABEL ACTIVE - FIXED v2.5.28-PELANGGAN-2ROW-ICONS');

async function upsertTable(table, data){
  if(!data || !data.length) return;
  try{
    const allowedColumns = {
      outlets: ['id','nama','alamat','wa','is_active','outlet_id','created_at'],
      karyawan: ['id','outlet_id','nama','username','password','level','is_active','created_at'],
      pelanggan: ['id','outlet_id','nama','wa','alamat','deposito','created_at'],
      // FIX: tambah estimasiVal & estimasiUnit, jangan cuma estimasi
      layanan: ['id','outlet_id','nama','kode','harga','satuan','estimasiVal','estimasiUnit','estimasi','minKg','created_at'],
      antrian: ['id','outlet_id','nota','namaPelanggan','layanan','totalNota','statusProses','statusBayar','tanggal','created_at']
    };
    const clean = data.map(d=>{
      const {updated_at, created_at, ...rest}=d; 
      let out = {...rest};
      if(out.outletId){ out.outlet_id = out.outletId; delete out.outletId; }
      if('isActive' in out){ out.is_active = out.isActive ? true : false; delete out.isActive; }
      delete out.tanpaWa; delete out.simpanKontak;
      if(allowedColumns[table]){
        const filtered={}; 
        for(let k of allowedColumns[table]){ if(k in out) filtered[k]=out[k]; } 
        if('id' in out) filtered['id']=out['id']; 
        out=filtered;
      }
      const r={}; for(let k in out){ if(out[k]!==undefined && typeof out[k]!=='function') r[k]=out[k]; } return r;
    }).filter(o=>Object.keys(o).length>0);
    const attemptUpsert = async (payload)=>{ return await window.supabaseClient.from(table).upsert(payload, {onConflict:'id'}).select(); };
    let {error} = await attemptUpsert(clean);
    if(error){
      let retryPayload=[...clean];
      const extract = (msg)=>{ const m1=msg.match(/Could not find the '([^']+)' column/); if(m1) return m1[1]; return null; };
      let missing=extract(error.message||''); let retries=0;
      while(missing && retries<10){
        console.warn('⚠️ Kolom tidak ada di Supabase:', missing);
        retryPayload=retryPayload.map(o=>{ const r={...o}; delete r[missing]; return r; });
        const res=await attemptUpsert(retryPayload);
        if(!res.error){ error=null; break; }
        missing=extract(res.error.message||''); error=res.error; retries++;
      }
      if(error) console.error('❌ Upsert', table, error.message);
      else console.log('✅ Upsert', table, clean.length);
    } else {
      console.log('✅ Upsert', table, clean.length);
    }
  }catch(e){ console.error('upsert error', e); }
}

window.syncKaryawanToSupabase = () => upsertTable('karyawan', typeof karyawanData!=='undefined'?karyawanData:[]);
window.syncOutletsToSupabase = () => upsertTable('outlets', typeof outletsData!=='undefined'?outletsData:[]);
window.syncPelangganToSupabase = () => upsertTable('pelanggan', typeof pelangganData!=='undefined'?pelangganData:[]);
window.syncLayananToSupabase = () => upsertTable('layanan', typeof layananData!=='undefined'?layananData:[]);
window.syncAntrianToSupabase = () => upsertTable('antrian', typeof antrianData!=='undefined'?antrianData:[]);

// FIX KORUP: yang tadinya "(async()=>{ const tables = ['outlets','pelanggan','layanan','antrian','karyawan']; for(let t of tables){" sekarang jadi IIFE lengkap
(async()=>{
  const tables = ['outlets','pelanggan','layanan','antrian','karyawan'];
  for(let t of tables){
    try{
      const {data,error} = await window.supabaseClient.from(t).select('*').limit(2000);
      if(error){ console.warn('Load', t, error.message); continue; }
      if(!data || !data.length){ console.log('📭', t, 'kosong - pakai local'); continue; }
      console.log('📥 Load '+t, data.length);
      
      // Normalisasi outlet_id & is_active
      const normalized = data.map(d=>{
        if(d.outlet_id && !d.outletId) d.outletId = d.outlet_id;
        if('is_active' in d && !('isActive' in d)) d.isActive = d.is_active;
        return d;
      });

      if(t==='outlets'){ 
        outletsData=normalized; 
        localStorage.setItem('outletsData', JSON.stringify(normalized)); 
        if(typeof renderOutletList==='function') renderOutletList(); 
      }
      if(t==='pelanggan'){ 
        pelangganData=normalized; 
        localStorage.setItem('pelangganData', JSON.stringify(normalized)); 
        if(typeof renderPelangganList==='function') renderPelangganList(); 
      }
      if(t==='layanan'){ 
        // FIX: handle 2 schema (estimasi string lama & estimasiVal/Unit baru)
        const fixed = normalized.map(l=>{
          if(l.estimasiVal && l.estimasiUnit) return l;
          if(l.estimasi){
            const parts = String(l.estimasi).split(' ');
            l.estimasiVal = parseInt(parts[0]) || 3;
            l.estimasiUnit = parts[1] || 'Jam';
          }
          if(!l.estimasiVal) l.estimasiVal = 3;
          if(!l.estimasiUnit) l.estimasiUnit = 'Jam';
          return l;
        });
        if(fixed.length && fixed[0].nama){
          layananData=fixed; 
          localStorage.setItem('layananData', JSON.stringify(fixed)); 
          if(typeof renderLayananList==='function') renderLayananList();
        }
      }
      if(t==='antrian'){ antrianData=normalized; }
      if(t==='karyawan'){ karyawanData=normalized; localStorage.setItem('karyawanData', JSON.stringify(normalized)); }
    }catch(e){ console.error('Load', t, e); }
  }
})();




document.getElementById('btn-upload-logo')?.addEventListener('click', (e) => {
  if (e.target.closest('#logoFileInput')) return;
  document.getElementById('logoFileInput')?.click();
});
document.getElementById('logoFileInput')?.addEventListener('change', function(e){
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    const img=document.getElementById('outletLogoImg');
    const ph=document.getElementById('logoPlaceholderIcon');
    if(img){ img.src=ev.target.result; img.style.display='block'; }
    if(ph) ph.style.display='none';
    try{ localStorage.setItem('outletLogo', ev.target.result); }catch(e){}
  };
  reader.readAsDataURL(file);
});
try{
  const saved=localStorage.getItem('outletLogo');
  if(saved){
    const img=document.getElementById('outletLogoImg');
    const ph=document.getElementById('logoPlaceholderIcon');
    if(img){ img.src=saved; img.style.display='block'; }
    if(ph) ph.style.display='none';
  }
}catch(e){}
function fitOutletFont(){
  const el = document.getElementById('label-outlet');
  if(!el) return;
  let size = 18;
  el.style.fontSize = size + 'px';
  while(el.scrollWidth > el.clientWidth && size > 12){
    size--;
    el.style.fontSize = size + 'px';
  }
}
window.addEventListener('load', fitOutletFont);
window.addEventListener('resize', fitOutletFont);

console.log('✅ FINAL PROFESIONAL v2.5.28 - tambah/hapus Supa+LS anti hilang');
