
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, LEGACY_KEYS, CACHE_NAME } from './config.js';

export const supa = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supa;

export const safeLS = {
  get(k,d=null){ try{ const v=localStorage.getItem(k); if(v===null) return d; try{return JSON.parse(v)}catch(e){return v} }catch(e){return d} },
  set(k,val){ try{ if(typeof val==='object') localStorage.setItem(k,JSON.stringify(val)); else localStorage.setItem(k,val); return true }catch(e){ return false} },
  remove(k){ try{localStorage.removeItem(k)}catch(e){} }
};

let dbInstance = null;
try{
  if(window.Dexie){
    dbInstance = new Dexie('LaundryModular_v11');
    dbInstance.version(11).stores({
      outlets: 'id, outlet_id',
      karyawan: 'id, outlet_id',
      pelanggan: 'id, outlet_id',
      layanan: 'id, outlet_id',
      antrian: 'id, outlet_id, tanggal',
      pengeluaran_kas: 'id, outlet_id',
      riwayat_nota: 'id, outlet_id',
      sync_queue: '++qid, table_name, created_at',
      struk_settings: 'id, outletId, key'
    });
    window.db = dbInstance;
  }
}catch(e){ console.warn('Dexie init', e); }

export const StorageManager = {
  async fetchSupabaseFirst(table, limit=2000){
    try{
      const {data,error} = await supa.from(table).select('*').limit(limit);
      if(error) throw error;
      if(data){ safeLS.set(table+'Data', data); try{ if(window.db && window.db[table]) await window.db[table].bulkPut(data); }catch(e){} return data; }
      return [];
    }catch(e){ console.warn('Supabase fetch fail', table, e.message); return null; }
  },
  loadLocalStorage(table){
    const d=safeLS.get(table+'Data');
    if(d && Array.isArray(d) && d.length){ return d; }
    return null;
  },
  async loadIndexedDB(table){
    try{ if(window.db && window.db[table]){ const all=await window.db[table].toArray(); if(all&&all.length) return all; } }catch(e){}
    return null;
  },
  async getData(table){
    let data = await this.fetchSupabaseFirst(table);
    if(data && data.length) return data;
    data = this.loadLocalStorage(table);
    if(data) return data;
    data = await this.loadIndexedDB(table);
    return data||[];
  },
  async saveSupabaseFirst(table, payloadArray){
    if(!payloadArray||!payloadArray.length) return {ok:false};
    const normalized = payloadArray.map(o=>{
      const c={...o};
      if(c.outletId && !c.outlet_id) c.outlet_id=c.outletId;
      if('isActive' in c) c.is_active=!!c.isActive;
      delete c.tanpaWa; delete c.simpanKontak; delete c.outletId;
      const clean={}; for(let k in c){ if(typeof c[k]!=='function' && c[k]!==undefined) clean[k]=c[k]; }
      return clean;
    });
    try{
      const {data,error}=await supa.from(table).upsert(normalized,{onConflict:'id'}).select();
      if(error) throw error;
      safeLS.set(table+'Data', payloadArray);
      try{ if(window.db && window.db[table]) await window.db[table].bulkPut(payloadArray); }catch(e){}
      return {ok:true,data};
    }catch(e){
      safeLS.set(table+'Data', payloadArray);
      try{ if(window.db && window.db.sync_queue) await window.db.sync_queue.add({table_name:table,action:'upsert',data:payloadArray,created_at:new Date().toISOString()}); }catch(_){}
      return {ok:false,error:e,queued:true};
    }
  }
};

export async function purgeLegacyCache(){
  LEGACY_KEYS.forEach(k=>safeLS.remove(k));
  try{ localStorage.removeItem('strukLogoBase64'); }catch(e){}
  if('caches' in window){
    const keys = await caches.keys();
    for(let k of keys){ if(k!==CACHE_NAME) await caches.delete(k); }
  }
}

export function initServiceWorker(){
  if(!('serviceWorker' in navigator)) return;
  const swCode = `const CACHE_NAME='${CACHE_NAME}';self.addEventListener('install',e=>{self.skipWaiting();});self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>{ if(k!==CACHE_NAME) return caches.delete(k); }))).then(()=>self.clients.claim()));});self.addEventListener('fetch',e=>{if(e.request.url.includes('supabase.co')){e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));return;}e.respondWith(fetch(e.request).then(r=>{return r;}).catch(()=>caches.match(e.request)));});`;
  try{
    const blob = new Blob([swCode], {type:'application/javascript'});
    const swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl).then(()=>console.log('SW v11 registered')).catch(()=>{});
  }catch(e){}
}

window.StorageManager = StorageManager;
window.safeLS = safeLS;
