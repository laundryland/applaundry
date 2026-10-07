import { supa } from './supabase.js';
export const safeLS = {
  get(k,d=null){ try{ const v=localStorage.getItem(k); if(v===null) return d; try{return JSON.parse(v)}catch(e){return v} }catch(e){return d} },
  set(k,val){ try{ localStorage.setItem(k, typeof val==='object'?JSON.stringify(val):val); }catch(e){} },
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
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout 3s')),3000));
      const {data,error}=await Promise.race([supa.from(table).select('*').limit(limit), timeout]);
      if(error) throw error;
      if(data){ safeLS.set(table+'Data', data); return data; }
      return [];
    }catch(e){
      console.warn('Supabase fetch fail',table,e.message);
      if(e.message.includes('401')||e.message.includes('Invalid API key')){
        console.error('❌ 401 Invalid API key - buka Supabase Dashboard > Settings > API > copy anon key baru, ganti di js/config.js');
      }
      return null;
    }
  },
  loadLocalStorage(table){
    const d=safeLS.get(table+'Data');
    if(d&&Array.isArray(d)&&d.length){ console.log('💾 LS',table,d.length); return d; }
    return null;
  },
  async loadIndexedDB(table){
    try{ if(window.db&&window.db[table]){ const all=await window.db[table].toArray(); if(all&&all.length) return all; } }catch(e){}
    return null;
  },
  async getData(table){
    console.log(`📥 getData ${table} - 1.Supabase(3s) -> 2.LS -> 3.IDB`);
    let data=await this.fetchSupabaseFirst(table);
    if(data&&data.length){ console.log(`✅ ${table} Supabase ${data.length}`); return data; }
    if(data&&data.length===0){ console.log(`✅ ${table} Supabase kosong 0`); return data; }
    data=this.loadLocalStorage(table);
    if(data){ console.log(`✅ ${table} LS ${data.length}`); return data; }
    data=await this.loadIndexedDB(table);
    if(data&&data.length){ console.log(`✅ ${table} IDB ${data.length}`); return data; }
    console.log(`⚠️ ${table} kosong semua [] - cek 401 di atas`);
    return [];
  }
};
export async function purgeLegacyCache(){
  ['supabaseUrl','supabaseKey','cfgUrl','cfgKey'].forEach(k=>safeLS.remove(k));
  console.log('🧹 Legacy purged - data outletsData dll tetap');
}
