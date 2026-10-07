
import { safeLS, StorageManager } from '../db.js';

const CHECKBOX_IDS = ['strukShowEstimasi','strukShowNamaKasir','strukShowAlamatOutlet','strukShowWaOutlet','strukShowNoNota','strukShowTanggal','strukShowLayanan','strukShowNamaPelanggan','strukShowStatusBayar','strukShowNominal','strukShowDepositInfo'];
const DEFAULT_SHOW = {estimasi:true,namaKasir:true,alamatOutlet:true,waOutlet:true,noNota:true,tanggal:true,layanan:true,namaPelanggan:true,statusBayar:true,nominal:true,depositInfo:true};

export function getStrukSettings(){
  try{
    const raw = localStorage.getItem('strukSettings');
    if(!raw) return {show:{...DEFAULT_SHOW}};
    const parsed = JSON.parse(raw);
    if(!parsed.show) parsed.show={...DEFAULT_SHOW};
    for(let k in DEFAULT_SHOW){ if(!(k in parsed.show)) parsed.show[k]=DEFAULT_SHOW[k]; }
    return parsed;
  }catch(e){ return {show:{...DEFAULT_SHOW}}; }
}

export function saveStrukSettings(settings){
  safeLS.set('strukSettings', settings);
  try{ StorageManager.saveSupabaseFirst('struk_settings', [{id:'default_settings', outlet_id: 'default', key:'strukSettings', value: settings}]); }catch(e){}
}

export function applyToNota(settings){
  const show = settings.show||DEFAULT_SHOW;
  const map = {
    'p_outlet_address': show.alamatOutlet, 'p_outlet_wa': show.waOutlet, 'p_nota_num': show.noNota,
    'p_nota_date': show.tanggal, 'p_customer_name': show.namaPelanggan, 'p_kasir_name': show.namaKasir,
    'p_items_container': show.layanan, 'p_grand_total': show.nominal, 'p_status_bayar': show.statusBayar,
    'p_estimasi_row': show.estimasi, 'row_status_proses_print': show.estimasi,
    'ios_outlet_address': show.alamatOutlet, 'ios_outlet_wa': show.waOutlet, 'ios_nota_num': show.noNota,
    'ios_nota_date': show.tanggal, 'ios_customer_name': show.namaPelanggan, 'ios_kasir_name': show.namaKasir,
    'ios_items_container': show.layanan, 'ios_grand_total': show.nominal, 'ios_status_bayar': show.statusBayar,
    'ios_estimasi_global': show.estimasi
  };
  for(let [id,vis] of Object.entries(map)){ const el=document.getElementById(id); if(el) el.style.display = vis===false ? 'none' : ''; }
}

let attached=false;
export function attachListeners(){
  if(attached) return; attached=true;
  const idMap = {
    'strukShowEstimasi':'estimasi','strukShowNamaKasir':'namaKasir','strukShowAlamatOutlet':'alamatOutlet','strukShowWaOutlet':'waOutlet',
    'strukShowNoNota':'noNota','strukShowTanggal':'tanggal','strukShowLayanan':'layanan','strukShowNamaPelanggan':'namaPelanggan',
    'strukShowStatusBayar':'statusBayar','strukShowNominal':'nominal','strukShowDepositInfo':'depositInfo'
  };
  CHECKBOX_IDS.forEach(id=>{
    const el=document.getElementById(id); if(!el) return;
    el.addEventListener('change', ()=>{
      const settings=getStrukSettings(); const key=idMap[id]; if(key){ settings.show[key]=el.checked; saveStrukSettings(settings); applyToNota(settings); if(typeof window.updateStrukPreview==='function') try{window.updateStrukPreview()}catch(e){} }
    });
  });
}

export function syncUI(){
  const settings=getStrukSettings();
  const idMap = {
    'strukShowEstimasi':'estimasi','strukShowNamaKasir':'namaKasir','strukShowAlamatOutlet':'alamatOutlet','strukShowWaOutlet':'waOutlet',
    'strukShowNoNota':'noNota','strukShowTanggal':'tanggal','strukShowLayanan':'layanan','strukShowNamaPelanggan':'namaPelanggan',
    'strukShowStatusBayar':'statusBayar','strukShowNominal':'nominal','strukShowDepositInfo':'depositInfo'
  };
  for(let [id,key] of Object.entries(idMap)){ const el=document.getElementById(id); if(el) el.checked=!!settings.show[key]; }
  applyToNota(settings);
}

window.MasterStruk = { get: getStrukSettings, save: saveStrukSettings, sync: syncUI, attach: attachListeners, apply: applyToNota };
