// supabase.js - v5 fix double declare + 401
(function(){
if(window.__supabase_loaded) { console.log("supabase.js already loaded, skip"); return; }
window.__supabase_loaded = true;

var SUPABASE_URL = "https://nniecqbfjmmlrtmolnrt.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV";

var supabaseClient = null;
var lastSyncAt = null;
var syncStatus = "idle";
var realtimeChannel = null;

function log(msg){ console.log("[Supabase]", msg); }
function updateBadge(){}

function hitungKomisi(totalKg){
  var n = parseFloat(Number(totalKg).toFixed(1));
  if(n<=50) return 0;
  var t=0;
  if(n>50) t+=(Math.min(n,70)-50)*1250;
  if(n>70) t+=(n-70)*1500;
  return Math.round(t);
}
function todayLocal(){
  var d=new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function makeKey(customer, kg, date){
  return String(customer).toLowerCase().trim()+"|"+parseFloat(Number(kg).toFixed(1))+"|"+date;
}

function initSupabase(){
  try{
    if(window.supabase && window.supabase.createClient){
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      syncStatus="connected"; log("Connected applaundry");
      setupRealtime();
      return true;
    }
  }catch(e){ console.error(e); syncStatus="error"; }
  return false;
}

function setupRealtime(){
  if(!supabaseClient || realtimeChannel) return;
  try{
    realtimeChannel = supabaseClient.channel("nota-realtime")
      .on("postgres_changes", {event:"*", schema:"public", table:"nota_backup"}, function(){
        log("Update HP lain, load...");
        setTimeout(function(){ loadFromSupabase(true); }, 1000);
      })
      .subscribe();
  }catch(e){ console.warn("Realtime fail", e.message); }
}

async function syncToSupabase(){
  if(!supabaseClient && !initSupabase()){
    syncStatus="offline"; log("Client belum ready - cek RLS / anon key");
    return {ok:false};
  }
  if(syncStatus==="syncing") return {ok:false};
  syncStatus="syncing";
  try{
    var db = new Dexie("setrika_db");
    db.version(10).stores({nota:"++id, customer, kg, date, createdAt", backup_harian:"date"});
    await db.open();
    var all = await db.nota.toArray();
    if(all.length===0){ syncStatus="connected"; log("Dexie kosong"); return {ok:true, empty:true}; }

    var localDedup = new Map();
    all.forEach(function(r){ localDedup.set(makeKey(r.customer, r.kg, r.date), r); });
    var deduped = Array.from(localDedup.values());

    var byDate = new Map();
    deduped.forEach(function(r){ var d = r.date || todayLocal(); if(!byDate.has(d)) byDate.set(d, []); byDate.get(d).push(r); });

    for(var entry of byDate.entries()){
      var date = entry[0]; var entries = entry[1];
      var totalKg = parseFloat(entries.reduce(function(s,e){return s+(e.kg||0)},0).toFixed(1));
      var totalKom = hitungKomisi(totalKg);
      var payload = {date: date, total_kg: totalKg, total_komisi: totalKom, entries: entries, updated_at: new Date().toISOString()};
      var res = await supabaseClient.from("nota_backup").upsert(payload, {onConflict:"date"});
      if(res.error) throw res.error;
    }

    if(deduped.length < all.length){
      await db.nota.clear();
      await db.nota.bulkAdd(deduped);
    }

    lastSyncAt=new Date();
    syncStatus="connected";
    log("Sync OK "+deduped.length+" nota, "+byDate.size+" hari - "+lastSyncAt.toLocaleTimeString("id-ID"));
    window.dispatchEvent(new CustomEvent("supabase-synced", {detail:{count:deduped.length}}));
    return {ok:true, count: deduped.length};
  }catch(err){
    console.error("[Supabase sync error]", err);
    syncStatus = err.message && (err.message.includes("fetch") || err.message.includes("Failed to fetch")) ? "offline" : "error";
    log("Sync fail: " + err.message + " - Jalankan SQL fix RLS!");
    return {ok:false, error: err.message};
  }
}

async function loadFromSupabase(silent){
  if(!supabaseClient && !initSupabase()) return {ok:false};
  try{
    var db = new Dexie("setrika_db");
    db.version(10).stores({nota:"++id, customer, kg, date, createdAt", backup_harian:"date"});
    await db.open();
    var localAll = await db.nota.toArray();
    var localKeys = new Set(localAll.map(function(r){return makeKey(r.customer, r.kg, r.date)}));

    var res = await supabaseClient.from("nota_backup").select("*").order("date",{ascending:false}).limit(30);
    if(res.error) throw res.error;
    var data = res.data;

    var imported=0;
    for(var row of data||[]){
      for(var e of row.entries||[]){
        var k = makeKey(e.customer, e.kg, e.date || row.date);
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

    syncStatus="connected";
    if(imported>0){ log("Load "+imported+" baru dari Supabase"); if(!silent) setTimeout(function(){ location.reload(); }, 800); }
    return {ok:true, imported: imported};
  }catch(err){
    syncStatus="error"; log("Load fail: "+err.message+" (401 = RLS belum Allow anon)");
    return {ok:false, error: err.message};
  }
}

window.SupabaseSync = {init:initSupabase, sync:syncToSupabase, load:loadFromSupabase, getStatus:function(){return {status:syncStatus, lastSyncAt:lastSyncAt}}, client:function(){return supabaseClient}};

var retry=0;
var t=setInterval(function(){
  if(initSupabase()){
    clearInterval(t);
    setTimeout(function(){ loadFromSupabase(true); }, 1000);
    setTimeout(function(){ syncToSupabase(); }, 2500);
  } else if(retry++>15){
    clearInterval(t);
    syncStatus="offline"; log("Gagal konek Supabase");
  }
}, 1000);

setInterval(function(){ if(document.visibilityState==="visible") syncToSupabase(); }, 30000);
document.addEventListener("visibilitychange", function(){ if(document.visibilityState==="visible") loadFromSupabase(true); });
window.addEventListener("nota-updated", function(){ setTimeout(function(){ syncToSupabase(); }, 800); });

console.log("supabase.js v5 fix double declare + 401 loaded");
})();
