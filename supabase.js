// supabase.js - Auto Sync LocalFirst System - 10 TABEL - extracted from tester + 3 laporan
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
      if(error.code==='42P01'){
        console.log('📭 Tabel '+table+' belum ada di Supabase - pakai local')
        return []
      }
      throw error
    }
    if(!data) return []
    var normalized = data.map(function(d){
      if('is_active' in d && !('isActive' in d)) d.isActive = d.is_active
      if('outlet_id' in d && !('outletId' in d)) d.outletId = d.outlet_id
      if('karyawan_id' in d && !('karyawanId' in d)) d.karyawanId = d.karyawan_id
      return d
    })
    setLocal(table, normalized)
    console.log('📥 Auto fetch '+table+' '+normalized.length+' dari Supabase')
    return normalized
  }catch(e){
    console.warn('syncFromSupabase '+table+' fail', e.message)
    return []
  }
}

export async function syncToSupabase(table){
  try{
    var local = getLocal(table)
    if(!local || local.length===0) return
    var clean = local.map(function(item){
      var copy = Object.assign({}, item)
      if('isActive' in copy){ copy.is_active = copy.isActive; }
      if('outletId' in copy && !('outlet_id' in copy)){ copy.outlet_id = copy.outletId; }
      if('karyawanId' in copy && !('karyawan_id' in copy)){ copy.karyawan_id = copy.karyawanId; }
      return copy
    })
    const {error} = await supabase.from(table).upsert(clean, {onConflict:'id'})
    if(error){
      if(error.code==='42P01'){
        console.log('📭 Tabel '+table+' belum ada di Supabase - skip push')
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
  console.log('🔄 Init Auto Sync LocalFirst - 10 TABEL')
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
