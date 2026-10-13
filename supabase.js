// supabase.js - External Supabase sync for applaundry - NO BUILD
// Loaded after Dexie and Supabase UMD CDN

const SUPABASE_URL = "https://nniecqbfjmmlrtmolnrt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV";

let supabaseClient = null;
let lastSyncAt = null;
let syncStatus = "idle"; // idle | syncing | offline | connected | error

function logSupabase(msg) {
  console.log("[Supabase]", msg);
  const el = document.getElementById("supabase-status");
  if (el) el.textContent = msg;
}

// Init Supabase client - tunggu window.supabase dari CDN UMD
function initSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      logSupabase("Connected - applaundry");
      syncStatus = "connected";
      updateStatusBadge();
      return true;
    }
  } catch (e) {
    console.error("Supabase init fail", e);
    syncStatus = "error";
    updateStatusBadge();
  }
  return false;
}

function updateStatusBadge() {
  const badge = document.getElementById("supabase-badge");
  if (!badge) return;
  const map = {
    idle: {text: "Supabase: Idle", cls: "bg-gray-100 text-gray-600"},
    syncing: {text: "Supabase: Syncing...", cls: "bg-yellow-100 text-yellow-700"},
    connected: {text: "Supabase: Connected", cls: "bg-green-100 text-green-700"},
    offline: {text: "Supabase: Offline", cls: "bg-gray-100 text-gray-500"},
    error: {text: "Supabase: Error", cls: "bg-red-100 text-red-600"}
  };
  const s = map[syncStatus] || map.idle;
  badge.textContent = s.text;
  badge.className = "text-[10px] px-2 py-1 rounded-full font-bold " + s.cls;
}

// Fungsi hitung komisi sama kayak di index.html
function hitungKomisi(totalKg) {
  let n = parseFloat(Number(totalKg).toFixed(1));
  if (n <= 50) return 0;
  let t = 0;
  if (n > 50) t += (Math.min(n, 70) - 50) * 1250;
  if (n > 70) t += (n - 70) * 1500;
  return Math.round(t);
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

// Core sync: baca Dexie dan upsert ke Supabase
async function syncToSupabase() {
  if (!supabaseClient) {
    if (!initSupabase()) {
      logSupabase("Supabase CDN belum ready");
      return {ok:false, error:"client not ready"};
    }
  }
  if (syncStatus === "syncing") return {ok:false, error:"already syncing"};
  
  syncStatus = "syncing";
  updateStatusBadge();
  
  try {
    // Buka Dexie DB yang sama dengan index.html
    const db = new Dexie("setrika_db");
    db.version(1).stores({ nota: "++id, customer, kg, date, createdAt", backup_harian: "date" });
    await db.open();
    const allNota = await db.nota.toArray();
    
    if (allNota.length === 0) {
      logSupabase("Dexie kosong, skip sync");
      syncStatus = "connected";
      updateStatusBadge();
      return {ok:true, empty:true};
    }

    // Group per tanggal lokal
    const map = new Map();
    allNota.forEach(row => {
      const date = row.date || todayLocal();
      if (!map.has(date)) map.set(date, []);
      map.get(date).push(row);
    });

    // Upsert per tanggal ke nota_backup
    for (const [date, entries] of map.entries()) {
      const totalKg = parseFloat(entries.reduce((s,e)=>s+(e.kg||0),0).toFixed(1));
      const totalKomisi = hitungKomisi(totalKg);
      
      const payload = {
        date: date,
        total_kg: totalKg,
        total_komisi: totalKomisi,
        entries: entries, // jsonb
        updated_at: new Date().toISOString()
      };

      const { error } = await supabaseClient.from("nota_backup").upsert(payload, {onConflict: "date"});
      if (error) throw error;
    }

    // Optional: sync per baris ke tabel nota (kalau ada)
    // Batch upsert - jangan spam kalau data banyak, cukup 100 terbaru
    const recent = allNota.slice(-100);
    for (const n of recent) {
      const { error } = await supabaseClient.from("nota").upsert({
        customer: n.customer,
        kg: n.kg,
        date: n.date,
        created_at: n.createdAt || new Date().toISOString()
      }, {onConflict: "customer,kg,date,created_at"});
      if (error) console.warn("nota upsert warn", error.message);
    }

    lastSyncAt = new Date();
    syncStatus = "connected";
    updateStatusBadge();
    logSupabase(`Sync OK ${allNota.length} nota, ${map.size} hari - ${lastSyncAt.toLocaleTimeString("id-ID")}`);
    
    const el = document.getElementById("supabase-last-sync");
    if (el) el.textContent = `Last sync: ${lastSyncAt.toLocaleString("id-ID")}`;
    
    return {ok:true, count: allNota.length};

  } catch (err) {
    console.error("[Supabase sync error]", err);
    syncStatus = err.message?.includes("fetch") ? "offline" : "error";
    updateStatusBadge();
    logSupabase("Sync fail: " + (err.message || "unknown"));
    return {ok:false, error: err.message};
  }
}

async function loadFromSupabase() {
  if (!supabaseClient && !initSupabase()) return {ok:false, error:"client not ready"};
  syncStatus = "syncing";
  updateStatusBadge();
  try {
    const db = new Dexie("setrika_db");
    db.version(1).stores({ nota: "++id, customer, kg, date, createdAt", backup_harian: "date" });
    await db.open();

    const { data, error } = await supabaseClient.from("nota_backup").select("*").order("date", {ascending:false}).limit(30);
    if (error) throw error;

    let imported = 0;
    for (const row of data || []) {
      const entries = row.entries || [];
      for (const e of entries) {
        // cek duplikat sederhana
        const exists = await db.nota.where("customer").equals(e.customer).and(x => Math.abs(x.kg - e.kg) < 0.01 && x.date === e.date).count();
        if (exists === 0) {
          await db.nota.add({
            customer: e.customer,
            kg: parseFloat(Number(e.kg).toFixed(1)),
            date: e.date || row.date,
            createdAt: e.createdAt || new Date().toISOString()
          });
          imported++;
        }
      }
    }

    syncStatus = "connected";
    updateStatusBadge();
    logSupabase(`Load OK, imported ${imported} nota dari Supabase`);
    // reload page biar React baca ulang Dexie
    setTimeout(()=> location.reload(), 800);
    return {ok:true, imported};

  } catch (err) {
    syncStatus = "error";
    updateStatusBadge();
    logSupabase("Load fail: " + err.message);
    return {ok:false, error: err.message};
  }
}

// Auto-init
window.SupabaseSync = {
  init: initSupabase,
  sync: syncToSupabase,
  load: loadFromSupabase,
  getStatus: () => ({status: syncStatus, lastSyncAt}),
  client: () => supabaseClient
};

// Coba init setelah load, retry 3x
let retry = 0;
const timer = setInterval(()=>{
  if (initSupabase() || retry++ > 10) clearInterval(timer);
  if (retry === 1) {
    // auto sync pertama setelah 2 detik
    setTimeout(()=> syncToSupabase(), 2000);
  }
}, 1000);

// Sync tiap 60 detik + saat tab visible kembali
setInterval(()=> { if (document.visibilityState === "visible") syncToSupabase(); }, 60000);
document.addEventListener("visibilitychange", ()=> { if (document.visibilityState === "visible") syncToSupabase(); });

// Hook storage event dari index.html (kalau index.html dispatch custom event)
window.addEventListener("nota-updated", ()=> {
  setTimeout(()=> syncToSupabase(), 1000);
});

logSupabase("supabase.js loaded - external no build");
