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
      if(data && data.length>0){
        safeLS.set(table+'Data', data);
        console.log(`✅ ${table} Supa ${data.length}`);
        return data;
      }
      console.log(`📭 ${table} Supa kosong - fallback LS anti hilang`);
      return null;
    }catch(e){
      console.warn(`⚠️ ${table} Supa fail ${e.message} - LS`);
      return null;
    }
  },
  loadLocalStorage(table){
    const d=safeLS.get(table+'Data');
    if(d && Array.isArray(d) && d.length>0) return d;
    return null;
  },
  async getData(table){
    let data = await this.fetchSupabaseFirst(table);
    if(data && data.length>0) return data;
    data = this.loadLocalStorage(table);
    if(data && data.length>0){ console.log(`💾 ${table} LS ${data.length} anti hilang`); return data; }
    return [];
  },
  async saveToSupaAndLS(table, payload){
    const existing = safeLS.get(table+'Data', []);
    let arr = Array.isArray(existing)?existing:[];
    const idx = arr.findIndex(x=>x.id===payload.id);
    if(idx>=0) arr[idx]=payload; else arr.push(payload);
    safeLS.set(table+'Data', arr);
    try{
      const {error}=await supa.from(table).upsert(payload,{onConflict:'id'});
      if(error) throw error;
      console.log(`✅ ${table} Supa upsert ${payload.id}`);
      return {ok:true};
    }catch(e){
      console.warn(`⚠️ ${table} Supa fail RLS? LS aman`, e.message);
      return {ok:false, error:e, ls:true};
    }
  },
  async deleteFromSupaAndLS(table, id){
    const existing = safeLS.get(table+'Data', []);
    let arr = Array.isArray(existing)?existing.filter(x=>x.id!==id):[];
    safeLS.set(table+'Data', arr);
    try{
      const {error}=await supa.from(table).delete().eq('id', id);
      if(error) throw error;
      console.log(`✅ ${table} Supa delete ${id}`);
      return {ok:true};
    }catch(e){
      console.warn(`⚠️ ${table} Supa delete fail, LS aman`, e.message);
      return {ok:false, ls:true};
    }
  }
};
export async function purgeLegacyCache(){
  ['supabaseUrl','supabaseKey','cfgUrl','cfgKey'].forEach(k=>safeLS.remove(k));
}
