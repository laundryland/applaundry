(function(){
if(window.__supabase_loaded) return; window.__supabase_loaded=true;
var SUPABASE_URL="https://nniecqbfjmmlrtmolnrt.supabase.co";
var SUPABASE_ANON_KEY="sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV";
var supabaseClient=null, realtimeChannel=null;
var LS_KEY="nota_data";
var LS_UANG_KEY="uang_hadir_data";
var LS_BATCH_KEY="batch_meta";
function log(m){console.log("[Supabase LS v16]",m);}
function todayLocal(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function makeKey(c,k,d,batch){ return String(c).toLowerCase().trim()+"|"+parseFloat(Number(k).toFixed(1))+"|"+d+"|"+(batch||""); }
function getAll(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }catch{ return []; } }
function getUangAll(){ try{ return JSON.parse(localStorage.getItem(LS_UANG_KEY)||"{}"); }catch{ return {}; } }
function getBatchMeta(){ try{ return JSON.parse(localStorage.getItem(LS_BATCH_KEY)||"{}"); }catch{ return {}; } }
function saveAll(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
function saveUangAll(o){ localStorage.setItem(LS_UANG_KEY, JSON.stringify(o)); }
function saveBatchMeta(o){ localStorage.setItem(LS_BATCH_KEY, JSON.stringify(o)); }
function hitungKomisi(t){ var n=parseFloat(Number(t).toFixed(1)); if(n<=50) return 0; var r=0; if(n>50) r+=(Math.min(n,70)-50)*1250; if(n>70) r+=(n-70)*1500; return Math.round(r); }
function initSupabase(){ try{ if(window.supabase&&window.supabase.createClient){ supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY); log("Connected LS+SUPA v16"); try{ realtimeChannel=supabaseClient.channel("nota-ls-v16").on("postgres_changes",{event:"*",schema:"public",table:"nota_backup"},function(){ log("Update HP lain"); setTimeout(()=>loadFromSupabase(true),800); }).subscribe(); }catch(e){} return true; } }catch(e){} return false; }
async function syncToSupabase(){
 if(!supabaseClient && !initSupabase()) return {ok:false};
 try{
  var all=getAll(); if(all.length===0) return {ok:true, empty:true};
  // dedup dengan batchId juga
  var map=new Map(); all.forEach(r=>map.set(makeKey(r.customer,r.kg,r.date,r.batchId), r)); var deduped=Array.from(map.values());
  var uangAll=getUangAll();
  var batchMeta=getBatchMeta();
  var byDate=new Map(); deduped.forEach(r=>{ var d=r.date||todayLocal(); if(!byDate.has(d)) byDate.set(d,[]); byDate.get(d).push(r); });
  for(var entry of byDate.entries()){ 
    var date=entry[0]; 
    var entries=entry[1]; 
    var totalKg=parseFloat(entries.reduce((s,e)=>s+(e.kg||0),0).toFixed(1)); 
    var batchIds=[...new Set(entries.map(e=>e.batchId||date+"_1"))];
    var totalTier=0;
    var totalHadir=0;
    batchIds.forEach(function(bid){
      var bEntries=entries.filter(e=>(e.batchId||date+"_1")===bid);
      var bKg=bEntries.reduce((s,e)=>s+e.kg,0);
      totalTier+=hitungKomisi(bKg);
      var meta=batchMeta[bid];
      if(meta && meta.uangHadir!==undefined) totalHadir+=parseInt(meta.uangHadir);
      else totalHadir+=parseInt(uangAll[date]!==undefined?uangAll[date]:7500);
    });
    // jika cuma 1 batch tanpa meta, hadir 1x
    if(batchIds.length===1 && totalHadir>7500){
      // cek apakah memang nota baru atau susulan, kalau susulan harus 1x
      var singleMeta=batchMeta[batchIds[0]];
      if(!singleMeta || singleMeta.type!=="nota_baru"){
        totalHadir=parseInt(uangAll[date]!==undefined?uangAll[date]:7500);
      }
    }
    var totalJumlah=totalTier+totalHadir;
    var payload={date, total_kg:totalKg, total_komisi:totalJumlah, total_tier:totalTier, total_hadir:totalHadir, entries, uang_hadir:uangAll[date]!==undefined?uangAll[date]:7500, batch_meta:batchMeta, updated_at:new Date().toISOString()}; 
    var res=await supabaseClient.from("nota_backup").upsert(payload,{onConflict:"date"}); if(res.error) throw res.error; 
  }
  if(deduped.length < all.length){ saveAll(deduped); window.dispatchEvent(new Event("storage")); }
  log("Sync OK "+deduped.length+" dates "+byDate.size); return {ok:true};
 }catch(err){ log("Sync fail: "+err.message); return {ok:false}; }
}
async function loadFromSupabase(silent){
 if(!supabaseClient && !initSupabase()) return {ok:false};
 try{
  var localAll=getAll(); 
  var localKeys=new Set(localAll.map(r=>makeKey(r.customer,r.kg,r.date,r.batchId)));
  var uangAll=getUangAll();
  var batchMeta=getBatchMeta();
  var res=await supabaseClient.from("nota_backup").select("*").order("date",{ascending:false}).limit(90); if(res.error) throw res.error;
  var imported=0; var newAll=localAll.slice();
  var uangChanged=false; var batchChanged=false;
  for(var row of res.data||[]){
    var rowDate=row.date;
    // migrasi uang hadir dari row
    if(row.uang_hadir!==undefined && uangAll[rowDate]===undefined){
      uangAll[rowDate]=parseInt(row.uang_hadir);
      uangChanged=true;
    }else if(row.total_hadir!==undefined && uangAll[rowDate]===undefined){
      // fallback: jika ada total_hadir, simpan sebagai uang hadir per tanggal (minimal 7500)
      uangAll[rowDate]=7500;
      uangChanged=true;
    }
    // migrasi batch_meta dari row
    if(row.batch_meta){
      for(var bid in row.batch_meta){
        if(!batchMeta[bid]){
          batchMeta[bid]=row.batch_meta[bid];
          batchChanged=true;
        }
      }
    }
    for(var e of row.entries||[]){
      var batchId=e.batchId||rowDate+"_1";
      // buat batch meta kalau belum ada untuk data lama
      if(!batchMeta[batchId]){
        batchMeta[batchId]={type:"utama", uangHadir: uangAll[rowDate]!==undefined?uangAll[rowDate]:7500, totalKg:0, komisi:0};
        batchChanged=true;
      }
      var k=makeKey(e.customer,e.kg,e.date||rowDate,batchId);
      if(!localKeys.has(k)){
        newAll.push({
          customer:String(e.customer), 
          kg:parseFloat(Number(e.kg).toFixed(1)), 
          date:e.date||rowDate, 
          batchId:batchId,
          createdAt:e.createdAt||new Date().toISOString(), 
          _key:k+"|"+Math.random().toString(36).slice(2,5)
        });
        localKeys.add(k);
        imported++;
      }
    }
  }
  if(imported>0){ saveAll(newAll); log("Load "+imported+" entries from Supabase"); window.dispatchEvent(new Event("storage")); }
  if(uangChanged){ saveUangAll(uangAll); log("Migrasi uang hadir "+Object.keys(uangAll).length+" tanggal"); }
  if(batchChanged){ saveBatchMeta(batchMeta); log("Migrasi batch_meta "+Object.keys(batchMeta).length+" batch"); }
  if(imported>0 || uangChanged || batchChanged){ window.dispatchEvent(new Event("storage")); }
  return {ok:true, imported};
 }catch(err){ log("Load fail: "+err.message); return {ok:false}; }
}
window.SupabaseSync={init:initSupabase, sync:syncToSupabase, load:loadFromSupabase};
var retry=0; var t=setInterval(function(){ if(initSupabase()){ clearInterval(t); setTimeout(()=>loadFromSupabase(true),1000); setTimeout(()=>syncToSupabase(),2000); }else if(retry++>15){ clearInterval(t); } },1000);
setInterval(()=>{ if(document.visibilityState==="visible") syncToSupabase(); },30000);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") loadFromSupabase(true); });
window.addEventListener("nota-updated", ()=>{ setTimeout(()=>syncToSupabase(),600); });
})();
