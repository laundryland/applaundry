(function(){
if(window.__supabase_loaded){return;}
window.__supabase_loaded=true;

var SUPABASE_URL="https://nniecqbfjmmlrtmolnrt.supabase.co";
var SUPABASE_ANON_KEY="sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV";
var supabaseClient=null;
var lastSyncAt=null;
var syncStatus="idle";
var realtimeChannel=null;

function log(m){console.log("[Supabase]",m);}
function hitungKomisi(t){var n=parseFloat(Number(t).toFixed(1));if(n<=50)return 0;var r=0;if(n>50)r+=(Math.min(n,70)-50)*1250;if(n>70)r+=(n-70)*1500;return Math.round(r);}
function todayLocal(){var d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function makeKey(c,k,d){return String(c).toLowerCase().trim()+"|"+parseFloat(Number(k).toFixed(1))+"|"+d;}

function initSupabase(){
 try{
  if(window.supabase&&window.supabase.createClient){
   supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
   syncStatus="connected";log("Connected applaundry");
   try{
    realtimeChannel=supabaseClient.channel("nota-realtime").on("postgres_changes",{event:"*",schema:"public",table:"nota_backup"},function(){log("Update HP lain");setTimeout(function(){loadFromSupabase(true);},1000);}).subscribe();
   }catch(e){}
   return true;
  }
 }catch(e){console.error(e);syncStatus="error";}
 return false;
}

async function getDexie(){
  // Final fix: lock version di 10000, auto reset kalau masih ada versi lebih tinggi nyangkut
  var DB_VER=10000;
  var STORES={nota:"++id, customer, kg, date, createdAt",backup_harian:"date"};
  try{
    var db=new Dexie("setrika_db");
    db.version(DB_VER).stores(STORES);
    await db.open();
    return db;
  }catch(e){
    var msg=String(e);
    if(msg.includes("less than the existing") || msg.includes("VersionError") || msg.includes("version")){
      console.warn("Dexie version mismatch, force reset DB", e);
      try{ await Dexie.delete("setrika_db"); }catch(_){}
      try{ indexedDB.deleteDatabase("setrika_db"); }catch(_){}
      var db2=new Dexie("setrika_db");
      db2.version(DB_VER).stores(STORES);
      await db2.open();
      return db2;
    }
    throw e;
  }
}

async function syncToSupabase(){
 if(!supabaseClient&&!initSupabase()){syncStatus="offline";log("Client belum ready");return{ok:false};}
 if(syncStatus==="syncing")return{ok:false};
 syncStatus="syncing";
 try{
  var db=await getDexie();
  var all=await db.nota.toArray();
  if(all.length===0){syncStatus="connected";log("Dexie kosong");return{ok:true,empty:true};}
  var map=new Map();
  all.forEach(function(r){map.set(makeKey(r.customer,r.kg,r.date),r);});
  var deduped=Array.from(map.values());
  var byDate=new Map();
  deduped.forEach(function(r){var d=r.date||todayLocal();if(!byDate.has(d))byDate.set(d,[]);byDate.get(d).push(r);});
  for(var entry of byDate.entries()){
   var date=entry[0];var entries=entry[1];
   var totalKg=parseFloat(entries.reduce(function(s,e){return s+(e.kg||0)},0).toFixed(1));
   var totalKom=hitungKomisi(totalKg);
   var payload={date:date,total_kg:totalKg,total_komisi:totalKom,entries:entries,updated_at:new Date().toISOString()};
   var res=await supabaseClient.from("nota_backup").upsert(payload,{onConflict:"date"});
   if(res.error)throw res.error;
  }
  if(deduped.length<all.length){await db.nota.clear();await db.nota.bulkAdd(deduped);}
  lastSyncAt=new Date();
  syncStatus="connected";
  log("Sync OK "+deduped.length+" nota");
  return{ok:true};
 }catch(err){
  console.error(err);
  syncStatus="error";
  log("Sync fail: "+err.message);
  return{ok:false,error:err.message};
 }
}

async function loadFromSupabase(silent){
 if(!supabaseClient&&!initSupabase())return{ok:false};
 try{
  var db=await getDexie();
  var localAll=await db.nota.toArray();
  var localKeys=new Set(localAll.map(function(r){return makeKey(r.customer,r.kg,r.date)}));
  var res=await supabaseClient.from("nota_backup").select("*").order("date",{ascending:false}).limit(30);
  if(res.error)throw res.error;
  var imported=0;
  for(var row of res.data||[]){
   for(var e of row.entries||[]){
    var k=makeKey(e.customer,e.kg,e.date||row.date);
    if(!localKeys.has(k)){
     await db.nota.add({customer:String(e.customer),kg:parseFloat(Number(e.kg).toFixed(1)),date:e.date||row.date,createdAt:e.createdAt||new Date().toISOString()});
     localKeys.add(k);imported++;
    }
   }
  }
  syncStatus="connected";
  if(imported>0){log("Load "+imported+" baru");if(!silent)setTimeout(function(){location.reload();},800);}
  return{ok:true,imported:imported};
 }catch(err){log("Load fail: "+err.message);return{ok:false};}
}

window.SupabaseSync={init:initSupabase,sync:syncToSupabase,load:loadFromSupabase};

var retry=0;
var t=setInterval(function(){
 if(initSupabase()){clearInterval(t);setTimeout(function(){loadFromSupabase(true);},1000);setTimeout(function(){syncToSupabase();},2500);}
 else if(retry++>15){clearInterval(t);log("Gagal konek");}
},1000);

setInterval(function(){if(document.visibilityState==="visible")syncToSupabase();},30000);
document.addEventListener("visibilitychange",function(){if(document.visibilityState==="visible")loadFromSupabase(true);});
window.addEventListener("nota-updated",function(){setTimeout(function(){syncToSupabase();},800);});
console.log("supabase v6 loaded");
})();
