import { supa } from './supabase.js';
export const safeLS = {
  get(k,d=null){ try{ const v=localStorage.getItem(k); if(v===null) return d; try{return JSON.parse(v)}catch(e){return v} }catch(e){return d} },
  set(k,val){ try{ localStorage.setItem(k, typeof val==='object'?JSON.stringify(val):val); return true; }catch(e){ return false; } },
  remove(k){ try{localStorage.removeItem(k)}catch(e){} }
};
let dbInstance=null;
try{
  if(window.Dexie){
    dbInstance=new Dexie('LaundryPWA_Clean_v28');
    dbInstance.version(1).stores({
      outlets:'id', karyawan:'id', pelanggan:'id', layanan:'id', antrian:'id, outlet_id, tanggal',
      sync_queue:'++qid, table_name', struk_settings:'id'
    });
    window.db=dbInstance;
  }
}catch(e){}

export const StorageManager={
  async fetchSupabaseFirst(table,limit=2000){
    try{
      const {data,error}=await supa.from(table).select('*').limit(limit);
      if(error) throw error;
      // FIX ANTI HILANG: jangan timpa LS kalo supa kosong
      if(data && data.length > 0){
        safeLS.set(table+'Data', data);
        console.log(`✅ ${table} Supa ${data.length} -> simpan LS`);
        return data;
      }
      if(data && data.length === 0){
        console.log(`📭 ${table} Supa kosong 0 - JANGAN timpa LS, pakai LS dulu`);
        return null; // trigger fallback ke LS
      }
      return null;
    }catch(e){
      console.warn(`⚠️ Supa fail ${table}:`, e.message, '- fallback LS');
      return null;
    }
  },
  loadLocalStorage(table){
    const d=safeLS.get(table+'Data');
    if(d && Array.isArray(d) && d.length > 0){
      console.log(`💾 ${table} LS ${d.length} - ANTI HILANG`);
      return d;
    }
    return null;
  },
  async getData(table){
    console.log(`📥 getData ${table} - 1.Supa(jika ada) -> 2.LS(anti hilang) -> 3.[]`);
    let data = await this.fetchSupabaseFirst(table);
    if(data && data.length > 0){
      return data;
    }
    data = this.loadLocalStorage(table);
    if(data && data.length > 0){
      return data;
    }
    console.log(`⚠️ ${table} kosong semua - pakai []`);
    return [];
  },
  async saveToSupaAndLS(table, payload){
    // Simpan LS dulu biar anti hilang
    const existing = safeLS.get(table+'Data', []);
    let arr = Array.isArray(existing) ? existing : [];
    // upsert logic
    const idx = arr.findIndex(x=>x.id===payload.id);
    if(idx>=0) arr[idx]=payload;
    else arr.push(payload);
    safeLS.set(table+'Data', arr);
    console.log(`💾 ${table} LS saved ${arr.length}`);
    
    // Coba Supa (jika RLS blok, tetap ada di LS)
    try{
      const {error} = await supa.from(table).upsert(payload, {onConflict:'id'});
      if(error) throw error;
      console.log(`✅ ${table} Supa upsert ${payload.id}`);
      return {ok:true};
    }catch(e){
      console.warn(`⚠️ ${table} Supa fail (RLS?), tapi LS aman:`, e.message);
      return {ok:false, ls:true, error:e};
    }
  },
  async deleteFromSupaAndLS(table, id){
    // LS dulu
    const existing = safeLS.get(table+'Data', []);
    let arr = Array.isArray(existing) ? existing.filter(x=>x.id!==id) : [];
    safeLS.set(table+'Data', arr);
    console.log(`💾 ${table} LS delete ${id} -> ${arr.length} left`);
    
    // Supa
    try{
      const {error} = await supa.from(table).delete().eq('id', id);
      if(error) throw error;
      console.log(`✅ ${table} Supa delete ${id}`);
      return {ok:true};
    }catch(e){
      console.warn(`⚠️ ${table} Supa delete fail, LS tetap kehapus:`, e.message);
      return {ok:false, ls:true};
    }
  }
};

export async function purgeLegacyCache(){
  // JANGAN hapus Data - hanya hapus cache supabaseUrl lama
  ['supabaseUrl','supabaseKey','cfgUrl','cfgKey'].forEach(k=>safeLS.remove(k));
  console.log('🧹 Legacy cache purged - Data AMAN tidak dihapus');
}
