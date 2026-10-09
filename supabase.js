// supabase.js - Auto Sync LocalFirst System - 10 TABEL - FIXED v2.5.28
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV'
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
  'pendapatan': 'pendapatanData',
  'outlet': 'outletsData',
  'pegawai': 'karyawanData'
}

// Whitelist kolom yang ada di Supabase (snake_case only)
const ALLOWED_COLUMNS = {
  'outlets': ['id','nama','alamat','wa','is_active','created_at','updated_at'],
  'karyawan': ['id','outlet_id','nama','username','password','level','is_active','wa','alamat','created_at','updated_at'],
  'pelanggan': ['id','outlet_id','nama','wa','alamat','deposito','is_active','created_at','updated_at','tanpaWa','simpanKontak'],
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
    var parsed = JSON.parse(raw)
    return Array.isArray(parsed)?parsed:[]
  }catch(e){ return [] }
}

export function setLocal(table, data){
  try{
    var key = KEY_MAP[table] || (table+'Data')
    localStorage.setItem(key, JSON.stringify(data||[]))
  }catch(e){}
}

export async function syncFromSupabase(table){
  try{
    var supaTable = table
    const {data, error} = await supabase.from(supaTable).select('*')
    if(error){
      if(error.code==='42P01' || error.message?.includes('permission denied') || error.code==='42501'){
        console.log('📭 Tabel '+table+' belum ada / no RLS - pakai local, skip fetch')
        return getLocal(table)
      }
      throw error
    }
    if(!data) return []
    if(data.length===0){
      console.log('📭 Tabel '+table+' kosong di Supabase - pakai local')
      return []
    }
    var normalized = data.map(function(d){
      if('is_active' in d && !('isActive' in d)) d.isActive = d.is_active
      if('outlet_id' in d && !('outletId' in d)) d.outletId = d.outlet_id
      if('karyawan_id' in d && !('karyawanId' in d)) d.karyawanId = d.karyawan_id
      if('pelanggan_id' in d && !('pelangganId' in d)) d.pelangganId = d.pelanggan_id
      if('layanan_id' in d && !('layananId' in d)) d.layananId = d.layanan_id
      return d
    })
    // FIX: Jangan overwrite local jika Supabase lebih sedikit (hindari hardreset hilang)
    var local = getLocal(table)
    if(local.length > normalized.length){
      console.log('⚠ Supabase '+table+' lebih sedikit ('+normalized.length+') dari local ('+local.length+') - pakai local, sync balik ke Supabase')
      await syncToSupabase(table)
      return local
    }
    setLocal(table, normalized)
    console.log('📥 Auto fetch '+table+' '+normalized.length+' dari Supabase')
    return normalized
  }catch(e){
    console.warn('syncFromSupabase '+table+' fail', e.message)
    return getLocal(table)
  }
}

export async function syncToSupabase(table){
  try{
    var local = getLocal(table)
    if(!local || local.length===0) return
    var allowed = ALLOWED_COLUMNS[table] || null
    var clean = local.map(function(item){
      var copy = Object.assign({}, item)
      // Map camelCase -> snake_case
      if('isActive' in copy){ if(!('is_active' in copy)) copy.is_active = copy.isActive; delete copy.isActive; }
      if('outletId' in copy){ if(!('outlet_id' in copy)) copy.outlet_id = copy.outletId; delete copy.outletId; }
      if('karyawanId' in copy){ if(!('karyawan_id' in copy)) copy.karyawan_id = copy.karyawanId; delete copy.karyawanId; }
      if('pelangganId' in copy){ if(!('pelanggan_id' in copy)) copy.pelanggan_id = copy.pelangganId; delete copy.pelangganId; }
      if('layananId' in copy){ if(!('layanan_id' in copy)) copy.layanan_id = copy.layananId; delete copy.layananId; }
      // Hapus field yang tidak ada di DB (camelCase sisa)
      delete copy.isActive
      delete copy.outletId
      delete copy.karyawanId
      delete copy.pelangganId
      delete copy.layananId
      // Jika ada whitelist, filter
      if(allowed){
        var filtered={}
        allowed.forEach(function(col){ if(col in copy) filtered[col]=copy[col] })
        // Selalu sertakan id
        if(!('id' in filtered) && 'id' in copy) filtered.id=copy.id
        return filtered
      }
      return copy
    })
    const {error} = await supabase.from(table).upsert(clean, {onConflict:'id'})
    if(error){
      if(error.code==='42P01'){
        console.log('📭 Tabel '+table+' belum ada di Supabase - skip push')
        return
      }
      if(error.code==='42501' || error.message?.includes('permission denied')){
        console.warn('🔒 RLS block '+table+' - perlu buat policy di Supabase SQL')
        return
      }
      throw error
    }
    console.log('📤 Auto push '+table+' '+clean.length+' ke Supabase')
  }catch(e){
    console.warn('syncToSupabase '+table+' fail', e.message)
  }
}

export async function initAutoSync(){
  console.log('🔄 Init Auto Sync LocalFirst - 10 TABEL - FIXED')
  var totalFetched=0
  var results={}
  for(var i=0;i<TABLES.length;i++){
    var t=TABLES[i]
    var local=getLocal(t)
    if(local.length===0){
      var data=await syncFromSupabase(t)
      totalFetched+=data.length
      results[t]=data.length
    } else {
      await syncToSupabase(t)
      results[t]=local.length+' local'
    }
  }
  console.log('✅ Auto Sync selesai', results, 'total fetch '+totalFetched)
  return {totalFetched, results}
}
