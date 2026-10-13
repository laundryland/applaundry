// supabase.js - Multi-HP Anti Dobel - External No Build - V3 visible badge
const SUPABASE_URL = "https://nniecqbfjmmlrtmolnrt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV";

let supabaseClient = null;
let lastSyncAt = null;
let syncStatus = "idle";
let realtimeChannel = null;

function log(msg){
  console.log("[Supabase]", msg);
  const el = document.getElementById("supabase-last-sync");
  if(el) el.textContent = msg;
}

function updateBadge(){
  const b = document.getElementById("supabase-badge");
  if(!b) return;
  const map = {
    idle: ["Supabase: Idle","background:#e5e7eb;color:#4b5563"],
    syncing: ["Supabase: Syncing...","background:#fef3c7;color:#92400e"],
    connected: ["Supabase: Connected ✓","background:#d1fae5;color:#065f46"],
    offline: ["Supabase: Offline","background:#fee2e2;color:#991b1b"], // label merah
    error: ["Supabase: Error","background:#fee2e2;color:#991b1b;border:1px solid #ef4444"] // label merah
  };
  const [txt, style] = map[syncStatus] || map.idle;
  b.textContent = txt + (lastSyncAt ? " " + lastSyncAt.toLocaleTimeString("id-ID") : "");
  b.setAttribute("style", "position:fixed;bottom:8px;left:8px;z-index:9999;font-size:10px;padding:4px 8px;border-radius:999px;font-weight:700;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,0.15);" + style);
}

function hitungKomisi(totalKg){
  let n = parseFloat(Number(totalKg).toFixed(1));
  if(n<=50) return 0;
  let t=0;
  if(n>50) t+=(Math.min(n,70)-50)*1250;
  if(n>70) t+=(n-70)*1500;
  return Math.round(t);
}
function todayLocal(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function makeKey(customer, kg, date){
  return `${String(customer).toLowerCase().trim()}|${parseFloat(Number(kg).toFixed(1))}|${date}`;
}

function initSupabase(){
  try{
    if(window.supabase?.createClient){
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      syncStatus="connected"; updateBadge(); log("Connected applaundry - multi HP ready");
      setupRealtime();
      return true;
    }
  }catch(e){ console.error(e); syncStatus="error"; updateBadge(); }
  return false;
}

function setupRealtime(){
  if(!supabaseClient || realtimeChannel) return;
  try{
    realtimeChannel = supabaseClient.channel("nota-realtime")
      .on("postgres_changes", {event:"*", schema:"public", table:"nota_backup"}, ()=>{
        log("Update dari HP lain, load...");
        setTimeout(()=> loadFromSupabase(true), 1000);
      })
      .subscribe();
  }catch(e){ console.warn("Realtime fail", e.message); }
}

async function syncToSupabase(){
  if(!supabaseClient && !initSupabase()){
    syncStatus="offline"; updateBadge(); log("Supabase client belum ready - cek internet");
    return {ok:false, error:"client not ready"};
  }
  if(syncStatus==="syncing") return {ok:false};
  syncStatus="syncing"; updateBadge();
  try{
    const db = new Dexie("setrika_db");
    db.version(10).stores({nota:"++id, customer, kg, date, createdAt", backup_harian:"date"});
    await db.open();
    const all = await db.nota.toArray();
    if(all.length===0){ syncStatus="connected"; updateBadge(); log("Dexie kosong, belum ada nota"); return {ok:true, empty:true}; }

    const localDedup = new Map();
    all.forEach(r=>{ const k = makeKey(r.customer, r.kg, r.date); localDedup.set(k, r); });
    const deduped = Array.from(localDedup.values());

    const byDate = new Map();
    deduped.forEach(r=>{ const d = r.date || todayLocal(); if(!byDate.has(d)) byDate.set(d, []); byDate.get(d).push(r); });

    for(const [date, entries] of byDate.entries()){
      const totalKg = parseFloat(entries.reduce((s,e)=>s+(e.kg||0),0).toFixed(1));
      const totalKom = hitungKomisi(totalKg);
      const payload = {date, total_kg: totalKg, total_komisi: totalKom, entries, updated_at: new Date().toISOString()};
      const {error} = await supabaseClient.from("nota_backup").upsert(payload, {onConflict:"date"});
      if(error) throw error;
    }

    if(deduped.length < all.length){
      await db.nota.clear();
      await db.nota.bulkAdd(deduped);
    }

    lastSyncAt=new Date();
    syncStatus="connected"; updateBadge();
    log(`Sync OK ${deduped.length} nota, ${byDate.size} hari`);
    
    // Trigger event biar UI tau
    window.dispatchEvent(new CustomEvent("supabase-synced", {detail:{count:deduped.length}}));
    
    return {ok:true, count: deduped.length};
  }catch(err){
    console.error("[Supabase sync error]", err);
    syncStatus = err.message?.includes("fetch") || err.message?.includes("Failed to fetch") ? "offline" : "error";
    updateBadge();
    log("Sync fail: " + err.message + " - cek tabel & RLS di Supabase");
    return {ok:false, error: err.message};
  }
}

async function loadFromSupabase(silent=false){
  if(!supabaseClient && !initSupabase()) return {ok:false};
  if(!silent){ syncStatus="syncing"; updateBadge(); }
  try{
    const db = new Dexie("setrika_db");
    db.version(10).stores({nota:"++id, customer, kg, date, createdAt", backup_harian:"date"});
    await db.open();
    const localAll = await db.nota.toArray();
    const localKeys = new Set(localAll.map(r=>makeKey(r.customer, r.kg, r.date)));

    const {data, error} = await supabaseClient.from("nota_backup").select("*").order("date",{ascending:false}).limit(30);
    if(error) throw error;

    let imported=0;
    for(const row of data||[]){
      for(const e of row.entries||[]){
        const k = makeKey(e.customer, e.kg, e.date || row.date);
        if(!localKeys.has(k)){
          await db.nota.add({
            customer: String(e.customer),
            kg: parseFloat(Number(e.kg).toFixed(1)),
            date: e.date || row.date,
            createdAt: e.createdAt || new Date().toISOString()
          });
          localKeys.add(k);
          imported++;
        }
      }
    }

    syncStatus="connected"; updateBadge();
    if(imported>0){ log(`Load ${imported} baru dari Supabase`); if(!silent) setTimeout(()=> location.reload(), 800); }
    return {ok:true, imported};
  }catch(err){
    syncStatus="error"; updateBadge(); log("Load fail: "+err.message);
    return {ok:false, error: err.message};
  }
}

window.SupabaseSync = {init:initSupabase, sync:syncToSupabase, load:loadFromSupabase, getStatus:()=>({status:syncStatus, lastSyncAt}), client:()=>supabaseClient};

// Auto init
let retry=0;
const t=setInterval(()=>{
  if(initSupabase()){
    clearInterval(t);
    setTimeout(()=> loadFromSupabase(true), 1000);
    setTimeout(()=> syncToSupabase(), 2500);
  } else if(retry++>15){
    clearInterval(t);
    syncStatus="offline"; updateBadge(); log("Gagal konek Supabase - cek internet / tabel");
  }
}, 1000);

setInterval(()=>{ if(document.visibilityState==="visible") syncToSupabase(); }, 30000);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") loadFromSupabase(true); });

// Hook: tiap kali nota ditambah di Dexie (dari paste), auto sync
window.addEventListener("nota-updated", ()=> setTimeout(()=> syncToSupabase(), 800));

// Hook manual: kalau React app selesai simpan, panggil sync
const origLog = console.log;
console.log = function(...args){
  origLog.apply(console, args);
  if(args[0]?.includes?.("Dexie:") || args[0]?.includes?.("Nota tersimpan")){
    setTimeout(()=> syncToSupabase(), 500);
  }
};

console.log("supabase.js v3 visible badge + auto sync loaded");
