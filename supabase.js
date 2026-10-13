// supabase.js - Multi-HP Anti Dobel - External No Build
// Project: applaundry https://nniecqbfjmmlrtmolnrt.supabase.co
// Semua HP buka URL Vercel yang sama -> otomatis konek Supabase yang sama, tanpa setting per HP

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

function updateBadge(){ const b = document.getElementById("supabase-badge"); if(!b) return; /* hidden mode - no UI bocor */ return; // original code below disabled
 const _orig_b=b; if(true){return;} // 
  const b = document.getElementById("supabase-badge");
  if(!b) return;
  const map = {
    idle: ["Supabase: Idle","bg-gray-100 text-gray-600"],
    syncing: ["Supabase: Syncing...","bg-yellow-100 text-yellow-700 animate-pulse"],
    connected: ["Supabase: Connected","bg-green-100 text-green-700"],
    offline: ["Supabase: Offline - lokal aman","bg-gray-100 text-gray-500"],
    error: ["Supabase: Error","bg-red-100 text-red-600"]
  };
  const [txt, cls] = map[syncStatus] || map.idle;
  b.textContent = txt;
  b.className = "text-[10px] px-2 py-1 rounded-full font-bold fixed bottom-[76px] right-3 z-50 " + cls;
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

// Key anti dobel: customer|kg|date (kg 1 desimal)
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

// REALTIME: kalau HP lain nambah data, semua HP auto refresh
function setupRealtime(){
  if(!supabaseClient || realtimeChannel) return;
  try{
    realtimeChannel = supabaseClient.channel("nota-realtime")
      .on("postgres_changes", {event:"*", schema:"public", table:"nota_backup"}, (payload)=>{
        console.log("Realtime update", payload);
        log("Update dari HP lain, load...");
        setTimeout(()=> loadFromSupabase(true), 1000); // silent load
      })
      .subscribe((status)=>{
        console.log("Realtime status", status);
      });
  }catch(e){ console.warn("Realtime fail", e.message); }
}

// SYNC KE SUPABASE - dengan anti dobel
async function syncToSupabase(){
  if(!supabaseClient && !initSupabase()) return {ok:false, error:"client not ready"};
  if(syncStatus==="syncing") return {ok:false};
  syncStatus="syncing"; updateBadge();
  try{
    const db = new Dexie("setrika_db");
    db.version(10).stores({nota:"++id, customer, kg, date, createdAt", backup_harian:"date"});
    await db.open();
    const all = await db.nota.toArray();
    if(all.length===0){ syncStatus="connected"; updateBadge(); return {ok:true, empty:true}; }

    // Dedup lokal dulu sebelum upload: Map key -> keep latest
    const localDedup = new Map();
    all.forEach(r=>{
      const k = makeKey(r.customer, r.kg, r.date);
      localDedup.set(k, r); // overwrite duplikat lokal dengan yang terbaru
    });
    const deduped = Array.from(localDedup.values());

    // Group per tanggal
    const byDate = new Map();
    deduped.forEach(r=>{
      const d = r.date || todayLocal();
      if(!byDate.has(d)) byDate.set(d, []);
      byDate.get(d).push(r);
    });

    // Upsert per tanggal ke nota_backup (source of truth)
    for(const [date, entries] of byDate.entries()){
      const totalKg = parseFloat(entries.reduce((s,e)=>s+(e.kg||0),0).toFixed(1));
      const totalKom = hitungKomisi(totalKg);
      const payload = {date, total_kg: totalKg, total_komisi: totalKom, entries, updated_at: new Date().toISOString()};
      const {error} = await supabaseClient.from("nota_backup").upsert(payload, {onConflict:"date"});
      if(error) throw error;
    }

    // Hapus duplikat lokal yang ketahuan (kalau ada)
    if(deduped.length < all.length){
      await db.nota.clear();
      await db.nota.bulkAdd(deduped);
      log(`Dedup lokal: ${all.length} -> ${deduped.length}`);
    }

    lastSyncAt=new Date();
    syncStatus="connected"; updateBadge();
    log(`Sync OK ${deduped.length} nota unik, ${byDate.size} hari - ${lastSyncAt.toLocaleTimeString("id-ID")}`);
    return {ok:true, count: deduped.length};

  }catch(err){
    console.error(err);
    syncStatus = err.message?.includes("fetch") ? "offline" : "error";
    updateBadge(); log("Sync fail: "+err.message);
    return {ok:false, error: err.message};
  }
}

// LOAD DARI SUPABASE - anti dobel merge
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
    if(imported>0){
      log(`Load ${imported} nota baru dari Supabase (HP lain)`);
      if(!silent) setTimeout(()=> location.reload(), 800);
    } else if(!silent){
      log("Sudah sinkron, tidak ada duplikat");
    }
    return {ok:true, imported};

  }catch(err){
    syncStatus="error"; updateBadge(); log("Load fail: "+err.message);
    return {ok:false, error: err.message};
  }
}

// Global API
window.SupabaseSync = {init:initSupabase, sync:syncToSupabase, load:loadFromSupabase, getStatus:()=>({status:syncStatus, lastSyncAt}), client:()=>supabaseClient};

// Auto init + auto sync
let retry=0;
const t=setInterval(()=>{
  if(initSupabase() || retry++>10) clearInterval(t);
  if(retry===1) setTimeout(()=> loadFromSupabase(true), 1500); // load dulu biar tidak dobel
}, 1000);

setInterval(()=>{ if(document.visibilityState==="visible") syncToSupabase(); }, 60000);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") loadFromSupabase(true); });
window.addEventListener("nota-updated", ()=> setTimeout(()=> syncToSupabase(), 800));

console.log("supabase.js multi-HP anti dobel loaded");
