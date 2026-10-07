import { supa } from './supabase.js';
import { TABLES } from './config.js';

export const safeLS = {
  get(k,d=null){ try{ const v=localStorage.getItem(k); if(v===null) return d; try{return JSON.parse(v)}catch(e){return v} }catch(e){return d} },
  set(k,val){ try{ if(typeof val==='object') localStorage.setItem(k,JSON.stringify(val)); else localStorage.setItem(k,val); return true }catch(e){return false} },
  remove(k){ try{localStorage.removeItem(k)}catch(e){} }
};

// IndexedDB - order 3 (backup large files)
let dbInstance = null;
try{
  if(window.Dexie){
    dbInstance = new Dexie('LaundryPWA_Clean_v28');
    dbInstance.version(1).stores({
      outlets: 'id, outlet_id',
      karyawan: 'id, outlet_id',
      pelanggan: 'id, outlet_id',
      layanan: 'id, outlet_id',
      antrian: 'id, outlet_id, tanggal',
      sync_queue: '++qid, table_name, created_at',
      struk_settings: 'id, outletId, key'
    });
    window.db = dbInstance;
  }
}catch(e){}

export const StorageManager = {
  // URUTAN 1: SUPABASE (cloud primary) - with 3s timeout
  async fetchSupabaseFirst(table, limit=2000){
    try{
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout 3s')), 3000));
      const fetchP = supa.from(table).select('*').limit(limit);
      const {data,error} = await Promise.race([fetchP, timeout]);
      if(error) throw error;
      if(data){ safeLS.set(table+'Data', data); return data; }
      return [];
    }catch(e){ 
      console.warn('Supabase fetch fail', table, e.message); 
      // If 401 Invalid API key, skip Supabase entirely for this session
      if(e.message.includes('401') || e.message.includes('Invalid API key')){
        console.warn('⚠️ API key invalid - pakai LS/IDB saja, cek js/config.js');
      }
      return null; 
    }
  },
  loadLocalStorage(table){
    const d=safeLS.get(table+'Data');
    if(d&&Array.isArray(d)&&d.length){ console.log('💾 LS fallback', table, d.length); return d; }
    return null;
  },
  async loadIndexedDB(table){
    try{ if(window.db && window.db[table]){ const all=await window.db[table].toArray(); if(all&&all.length) return all; } }catch(e){}
    return null;
  },
  async getData(table){
    console.log(`📥 getData ${table} - URUTAN: 1.Supabase(3s timeout) -> 2.LS -> 3.IDB`);
    let data = await this.fetchSupabaseFirst(table);
    if(data && data.length) { console.log(`✅ ${table} dari Supabase (order 1) - ${data.length}`); return data; }
    data = this.loadLocalStorage(table);
    if(data) { console.log(`✅ ${table} dari LS (order 2) - ${data.length}`); return data; }
    data = await this.loadIndexedDB(table);
    if(data && data.length) { console.log(`✅ ${table} dari IDB (order 3) - ${data.length}`); return data; }
    console.log(`⚠️ ${table} kosong, pakai []`);
    return [];
  },
  async saveSupabaseFirst(table, payloadArray){
    if(!payloadArray||!payloadArray.length) return {ok:false};
    try{
      const {data,error}=await supa.from(table).upsert(payloadArray,{onConflict:'id'}).select();
      if(error) throw error;
      safeLS.set(table+'Data', payloadArray);
      return {ok:true,data};
    }catch(e){
      safeLS.set(table+'Data', payloadArray);
      console.warn('Supabase save fail, LS only', e.message);
      return {ok:false, error:e};
    }
  }
};

export async function purgeLegacyCache(){
  const legacy = ['supabaseUrl','supabaseKey','cfgUrl','cfgKey','supabase_url','supabase_key'];
  legacy.forEach(k=>safeLS.remove(k));
  console.log('🧹 Legacy cache purged');
}
