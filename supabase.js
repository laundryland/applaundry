// supabase.js - FAST EXPORT v2.5.28-FINAL - No .select() + Chunking
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
})

export const TABLES = ['outlets','karyawan','pelanggan','layanan','antrian','pengeluaran_kas','riwayat_nota','riwayat_laporan','omzet','pendapatan']

const KEY_MAP = {
  'outlets': 'outletsData',
  'karyawan': 'karyawanData',
  'pelanggan': 'pelangganData',
  'layanan': 'layananData',
  'antrian': 'antrianData',
  'pengeluaran_kas': 'pengeluaranKasData',
  'riwayat_nota': 'riwayatNotaData',
  'riwayat_laporan': 'riwayatLaporanData',
  'omzet': 'omzetData',
  'pendapatan': 'pendapatanData'
}

const ALLOWED_COLUMNS = {
  'outlets': ['id','nama','alamat','wa','is_active','created_at','updated_at'],
  'karyawan': ['id','outlet_id','nama','username','password','level','is_active','wa','alamat','created_at','updated_at'],
  'pelanggan': ['id','outlet_id','nama','wa','alamat','deposito','is_active','created_at','updated_at'],
  'layanan': ['id','outlet_id','nama','kode','harga','satuan','estimasi','estimasiUnit','minKg','is_active','created_at','updated_at'],
  'antrian': ['id','outlet_id','pelanggan_id','layanan_id','karyawan_id','nama','layanan','status','total','total_bayar','metode_bayar','estimasi','created_at','updated_at','tanggal_selesai'],
  'pengeluaran_kas': ['id','outlet_id','karyawan_id','jumlah','kategori','keterangan','tanggal','created_at'],
  'riwayat_nota': ['id','outlet_id','pelanggan_id','total','created_at','detail'],
  'riwayat_laporan': ['id','outlet_id','karyawan_id','jenis','judul','total_transaksi','total_omzet','total_pendapatan','total_pengeluaran','laba_bersih','periode_awal','periode_akhir','detail','is_active','created_at','updated_at'],
  'omzet': ['id','outlet_id','tanggal','total_nota','total_omzet','tunai','non_tunai','deposito','is_active','created_at'],
  'pendapatan': ['id','outlet_id','tanggal','sumber','jumlah','keterangan','metode','is_active','created_at']
}

export function getLocal(table){
  try{
    var key = KEY_MAP[table] || (table+'Data')
    var raw = localStorage.getItem(key)
    if(!raw) return []
    return JSON.parse(raw)||[]
  }catch(e){ return [] }
}

export function setLocal(table, data){
  try{
    var key = KEY_MAP[table] || (table+'Data')
    localStorage.setItem(key, JSON.stringify(data||[]))
  }catch(e){}
}

function cleanRow(table, item){
  var copy = Object.assign({}, item)
  if('isActive' in copy){ if(!('is_active' in copy)) copy.is_active = copy.isActive; }
  if('outletId' in copy){ if(!('outlet_id' in copy)) copy.outlet_id = copy.outletId; }
  if('karyawanId' in copy){ if(!('karyawan_id' in copy)) copy.karyawan_id = copy.karyawanId; }
  if('pelangganId' in copy){ if(!('pelanggan_id' in copy)) copy.pelanggan_id = copy.pelangganId; }
  if('layananId' in copy){ if(!('layanan_id' in copy)) copy.layanan_id = copy.layananId; }
  delete copy.isActive; delete copy.outletId; delete copy.karyawanId; delete copy.pelangganId; delete copy.layananId;
  delete copy.tanpaWa; delete copy.simpanKontak; delete copy.hp;
  delete copy.outlet_id_id; delete copy.is_active_active;
  var allowed = ALLOWED_COLUMNS[table]
  if(allowed){
    var f={}
    allowed.forEach(function(col){ if(col in copy) f[col]=copy[col] })
    if(!('id' in f) && 'id' in copy) f.id=copy.id
    return f
  }
  return copy
}

// FAST: chunk + no .select() = 3x lebih cepat
async function upsertFast(table, clean){
  const CHUNK = 150 // 150 rows per request = optimal Supabase free
  if(!clean.length) return
  for(let i=0;i<clean.length;i+=CHUNK){
    const chunk = clean.slice(i, i+CHUNK)
    try{
      const {error} = await supabase.from(table).upsert(chunk, {onConflict:'id'})
      if(error){
        let msg = error.message||''
        let m1 = msg.match(/Could not find the '([^']+)' column/)
        let m2 = msg.match(/column "([^"]+)"/)
        let missing = m1 ? m1[1] : (m2 ? m2[1] : null)
        if(missing){
          console.warn('⚠️ Hapus kolom '+missing+' retry chunk '+table)
          const fixed = chunk.map(o=>{ const r={...o}; delete r[missing]; return r; })
          const {error:e2} = await supabase.from(table).upsert(fixed, {onConflict:'id'})
          if(e2) throw e2
        } else {
          throw error
        }
      }
      console.log('📤 '+table+' chunk '+(i/CHUNK+1)+'/'+Math.ceil(clean.length/CHUNK)+' - '+chunk.length+' OK')
      if(window.showNoticeToast && table==='pelanggan'){
        window.showNoticeToast('☁️ Export '+Math.min(i+CHUNK, clean.length)+'/'+clean.length+'...')
      }
    }catch(e){
      if(e.code==='42P01' || e.code==='42501' || (e.message||'').includes('permission denied')){
        console.warn('🔒 Skip '+table+' - RLS / belum ada tabel')
        return
      }
      console.warn('upsertFast '+table+' chunk fail', e.message)
    }
  }
}

export async function syncFromSupabase(table){
  try{
    const {data, error} = await supabase.from(table).select('*')
    if(error) throw error
    if(!data || !data.length) return []
    var normalized = data.map(function(d){
      if('is_active' in d && !('isActive' in d)) d.isActive = d.is_active
      if('outlet_id' in d && !('outletId' in d)) d.outletId = d.outlet_id
      return d
    })
    var local = getLocal(table)
    if(local.length > normalized.length && local.length>3){
      console.log('⚠ Supabase '+table+' lebih sedikit - pakai local, push balik')
      await syncToSupabase(table)
      return local
    }
    setLocal(table, normalized)
    return normalized
  }catch(e){
    if(e.code==='42P01' || e.code==='42501' || (e.message||'').includes('permission denied')){
      return getLocal(table)
    }
    return getLocal(table)
  }
}

export async function syncToSupabase(table){
  try{
    var local = getLocal(table)
    if(!local || local.length===0) return
    var clean = local.map(function(item){ return cleanRow(table, item) })
    await upsertFast(table, clean)
  }catch(e){
    console.warn('syncToSupabase '+table+' outer fail', e.message)
  }
}

export async function initAutoSync(){
  console.log('🔄 Init Auto Sync FAST - 10 TABEL')
  var results={}
  // PARALEL untuk fetch awal biar tidak lambat berurutan
  var promises = TABLES.map(async function(t){
    var local=getLocal(t)
    if(local.length===0){
      var data=await syncFromSupabase(t)
      results[t]=data.length
    } else {
      // Jangan sync semua sekaligus di init - cuma sync yang penting dulu (pelanggan, outlet)
      if(['outlets','pelanggan','karyawan','layanan'].includes(t)){
        await syncToSupabase(t)
      }
      results[t]=local.length+' local'
    }
  })
  await Promise.all(promises)
  console.log('✅ Auto Sync FAST selesai', results)
  // Sync sisa di background tanpa blokir UI
  setTimeout(async function(){
    for(let t of ['antrian','pengeluaran_kas','riwayat_nota','riwayat_laporan','omzet','pendapatan']){
      await syncToSupabase(t)
    }
    console.log('✅ Background sync sisa tabel selesai')
  }, 2000)
  return results
}

// EXPORT KHUSUS PELANGGAN - FASTEST
export async function exportPelangganKeSupa(){
  try{
    var data = getLocal('pelanggan')
    if(!data.length) return {ok:false, msg:'kosong'}
    var t0 = Date.now()
    var clean = data.map(function(item){ return cleanRow('pelanggan', item) })
    await upsertFast('pelanggan', clean)
    var dt = ((Date.now()-t0)/1000).toFixed(1)
    console.log('✅ Export pelanggan FAST '+data.length+' rows in '+dt+'s')
    if(window.showNoticeToast) window.showNoticeToast('✅ Export '+data.length+' pelanggan '+dt+'s - FAST')
    return {ok:true, count:data.length, seconds:dt}
  }catch(e){
    console.error('exportPelangganKeSupa fail', e)
    if(window.showNoticeToast) window.showNoticeToast('❌ Export gagal: '+e.message)
    return {ok:false, msg:e.message}
  }
}

// Export semua - untuk testing data tester
export async function exportAllFast(){
  for(let t of TABLES){
    await syncToSupabase(t)
  }
  if(window.showNoticeToast) window.showNoticeToast('✅ Semua tabel export FAST selesai')
}
