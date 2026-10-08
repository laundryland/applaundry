import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
window.supabaseClient = supabaseClient;
export const supabase = supabaseClient;

export const upsertTable = async (t,d) => {
  if(!d?.length) return;
  const allowed = {
    outlets: ['id','nama','alamat','wa','is_active','outlet_id'],
    pelanggan: ['id','outlet_id','nama','wa','alamat','deposito'],
    layanan: ['id','outlet_id','nama','kode','harga','satuan','estimasiVal','estimasiUnit','estimasi','minKg'],
    antrian: ['id','outlet_id','nota','namaPelanggan','layanan','totalNota','statusProses','statusBayar','tanggal'],
    karyawan: ['id','outlet_id','nama','username','password','level','is_active'],
    deposito_logs: ['id','pelangganId','nama','aksi','nominal','alasan','tanggal','outletId'],
    riwayat_nota: ['id','nota','namaPelanggan','aksi','alasan','kasir','tanggal','outletId']
  };
  try{
    let cols = allowed[t] || [];
    let clean = d.map(o=>{
      let c={};
      for(let k of cols){ if(o[k]!==undefined) c[k]=o[k]; }
      if(o.outletId && !c.outlet_id && cols.includes('outlet_id')) c.outlet_id=o.outletId;
      if('isActive' in o && !('is_active' in c) && cols.includes('is_active')) c.is_active=o.isActive;
      // FIX UUID: hapus id yang bukan UUID valid (outlet-xxx, karyawan-xxx)
      if(c.id){
        const idStr = String(c.id);
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);
        const isBadId = idStr.startsWith('outlet-') || idStr.startsWith('karyawan-') || idStr.startsWith('pelanggan-') || idStr.startsWith('layanan-') || idStr.startsWith('antrian-') || !isUUID && idStr.length < 36;
        if(!isUUID || isBadId) delete c.id;
      }
      return c;
    }).filter(c=>Object.keys(c).length>0);
    if(!clean.length) return;
    const {error} = await supabaseClient.from(t).upsert(clean,{onConflict:'id'});
    if(error) console.error(t, error.message, '-> RUN SQL RESET-SUPA-BIKIN-BARU.sql!');
    else console.log('✅ Upsert', t, clean.length);
  }catch(e){ console.error(e); }
};
export const loadAll = async () => {
  for(let t of ['outlets','pelanggan','layanan','antrian','karyawan','deposito_logs','riwayat_nota']){
    try{
      const {data} = await supabaseClient.from(t).select('*').limit(2000);
      if(data?.length) localStorage.setItem(t+'Data', JSON.stringify(data));
    }catch(e){}
  }
};
