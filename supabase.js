(function(){
if(window.__supabase_loaded) return; window.__supabase_loaded=true;
var SUPABASE_URL="https://nniecqbfjmmlrtmolnrt.supabase.co";
var SUPABASE_ANON_KEY="sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV";
var supabaseClient=null, realtimeChannel=null;
var LS_KEY="nota_data";
function log(m){console.log("[Supabase LS]",m);}
function todayLocal(){ var d=new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function makeKey(c,k,d){ return String(c).toLowerCase().trim()+"|"+parseFloat(Number(k).toFixed(1))+"|"+d; }
function getAll(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"[]"); }catch{ return []; } }
function saveAll(arr){ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }
function hitungKomisi(t){ var n=parseFloat(Number(t).toFixed(1)); if(n<=50) return 0; var r=0; if(n>50) r+=(Math.min(n,70)-50)*1250; if(n>70) r+=(n-70)*1500; return Math.round(r); }
function initSupabase(){ try{ if(window.supabase&&window.supabase.createClient){ supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY); log("Connected LS+SUPA"); try{ realtimeChannel=supabaseClient.channel("nota-ls").on("postgres_changes",{event:"*",schema:"public",table:"nota_backup"},function(){ log("Update HP lain"); setTimeout(()=>loadFromSupabase(true),800); }).subscribe(); }catch(e){} return true; } }catch(e){} return false; }
async function syncToSupabase(){
 if(!supabaseClient && !initSupabase()) return {ok:false};
 try{
  var all=getAll(); if(all.length===0) return {ok:true, empty:true};
  var map=new Map(); all.forEach(r=>map.set(makeKey(r.customer,r.kg,r.date), r)); var deduped=Array.from(map.values());
  var byDate=new Map(); deduped.forEach(r=>{ var d=r.date||todayLocal(); if(!byDate.has(d)) byDate.set(d,[]); byDate.get(d).push(r); });
  for(var entry of byDate.entries()){ var date=entry[0]; var entries=entry[1]; var totalKg=parseFloat(entries.reduce((s,e)=>s+(e.kg||0),0).toFixed(1)); var totalKom=hitungKomisi(totalKg); var payload={date, total_kg:totalKg, total_komisi:totalKom, entries, updated_at:new Date().toISOString()}; var res=await supabaseClient.from("nota_backup").upsert(payload,{onConflict:"date"}); if(res.error) throw res.error; }
  if(deduped.length < all.length){ saveAll(deduped); window.dispatchEvent(new Event("storage")); }
  log("Sync OK "+deduped.length); return {ok:true};
 }catch(err){ log("Sync fail: "+err.message); return {ok:false}; }
}
async function loadFromSupabase(silent){
 if(!supabaseClient && !initSupabase()) return {ok:false};
 try{
  var localAll=getAll(); var localKeys=new Set(localAll.map(r=>makeKey(r.customer,r.kg,r.date)));
  var res=await supabaseClient.from("nota_backup").select("*").order("date",{ascending:false}).limit(30); if(res.error) throw res.error;
  var imported=0; var newAll=localAll.slice();
  for(var row of res.data||[]){ for(var e of row.entries||[]){ var k=makeKey(e.customer,e.kg,e.date||row.date); if(!localKeys.has(k)){ newAll.push({customer:String(e.customer), kg:parseFloat(Number(e.kg).toFixed(1)), date:e.date||row.date, createdAt:e.createdAt||new Date().toISOString(), _key:k+"|"+Math.random().toString(36).slice(2,5)}); localKeys.add(k); imported++; } } }
  if(imported>0){ saveAll(newAll); log("Load "+imported); window.dispatchEvent(new Event("storage")); }
  return {ok:true, imported};
 }catch(err){ log("Load fail: "+err.message); return {ok:false}; }
}
window.SupabaseSync={init:initSupabase, sync:syncToSupabase, load:loadFromSupabase};
var retry=0; var t=setInterval(function(){ if(initSupabase()){ clearInterval(t); setTimeout(()=>loadFromSupabase(true),1000); setTimeout(()=>syncToSupabase(),2000); }else if(retry++>15){ clearInterval(t); } },1000);
setInterval(()=>{ if(document.visibilityState==="visible") syncToSupabase(); },30000);
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") loadFromSupabase(true); });
window.addEventListener("nota-updated", ()=>{ setTimeout(()=>syncToSupabase(),600); });
})();
