// supabase.js - Modul Koneksi Supabase
// Project ID: nniecqbfjmmlrtmolnrt
// Publishable Key: sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co'
const SUPABASE_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// --- CORE: LocalFirst Logic ---
export const TABLES = ['pegawai', 'outlet', 'deposito', 'pelanggan', 'nota']
const LS_PREFIX = 'app_'

// Ambil dari localhost
export function getLocal(table) {
  try {
    return JSON.parse(localStorage.getItem(LS_PREFIX + table) || '[]')
  } catch { return [] }
}

// Simpan ke localhost
export function setLocal(table, data) {
  localStorage.setItem(LS_PREFIX + table, JSON.stringify(data))
}

// Jika localhost kosong -> ambil dari Supabase (LOGIC UTAMA KAMU)
export async function initAutoSync() {
  for (const table of TABLES) {
    const localData = getLocal(table)
    if (localData.length === 0) {
      console.log(`[SYNC] Local ${table} kosong, fetching dari Supabase...`)
      const { data, error } = await supabase.from(table).select('*')
      if (!error && data) {
        setLocal(table, data)
        console.log(`[SYNC] ${data.length} data ${table} dari Supabase -> Local`)
      } else {
        console.warn(`[SYNC] Gagal fetch ${table}:`, error?.message)
      }
    }
  }
}

// Sync localhost -> Supabase (upsert)
export async function syncToSupabase(table) {
  const localData = getLocal(table)
  if (localData.length === 0) return { ok: false, msg: 'Local kosong' }
  
  // Bersihkan id temp (id_xxx) biar Supabase generate uuid
  const clean = localData.map(({ id, ...rest }) => {
    if (String(id).startsWith('id_')) return rest
    return { id, ...rest }
  })

  const { error } = await supabase.from(table).upsert(clean, { onConflict: 'id' })
  if (error) return { ok: false, msg: error.message }
  return { ok: true, count: clean.length }
}

// Sync Supabase -> Localhost
export async function syncFromSupabase(table) {
  const { data, error } = await supabase.from(table).select('*')
  if (error) throw error
  setLocal(table, data)
  return data
}

// Tester Otomatis
export async function runTester(logFn = console.log) {
  const logs = []
  const push = (m) => { logs.push(m); logFn(m) }
  
  const start = performance.now()
  try {
    const { data, error } = await supabase.from('outlet').select('id').limit(1)
    const latency = Math.round(performance.now() - start)
    if (error) throw error
    push(`✅ Koneksi OK - Latency ${latency}ms`)
  } catch (e) {
    push(`❌ Koneksi GAGAL: ${e.message}`)
    return logs
  }

  for (const t of TABLES) {
    try {
      const { error } = await supabase.from(t).select('id').limit(1)
      if (error) {
        if (error.code === '42P01') push(`⚠️ Tabel ${t} BELUM ADA`)
        else if (error.code === '42501') push(`🔒 Tabel ${t} kena RLS (aktifkan RLS OFF)`)
        else push(`❌ Tabel ${t}: ${error.message}`)
      } else {
        push(`✅ Tabel ${t} siap`)
      }
    } catch (e) { push(`❌ Tabel ${t} error: ${e.message}`) }
  }
  return logs
}

// Export / Import
export function exportAll() {
  const all = {}
  TABLES.forEach(t => all[t] = getLocal(t))
  return JSON.stringify(all, null, 2)
}

export function importAll(jsonString) {
  const parsed = JSON.parse(jsonString)
  Object.keys(parsed).forEach(t => {
    if (TABLES.includes(t)) setLocal(t, parsed[t])
  })
}
