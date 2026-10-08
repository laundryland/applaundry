// supabase.js - ROOT VERSION - Final
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

export const TABLES = ['outlet','pegawai','pelanggan','deposito','nota'];

export const getLocal = (t) => {
  try { return JSON.parse(localStorage.getItem(t) || '[]'); } catch { return [] }
};
export const setLocal = (t, data) => localStorage.setItem(t, JSON.stringify(data));

export const syncFromSupabase = async (table) => {
  const { data, error } = await supabase.from(table).select('*').limit(2000);
  if (error) throw error;
  if (data) setLocal(table, data);
  return data || [];
};

export const syncToSupabase = async (table, row) => {
  const clean = { ...row };
  if (clean.id && String(clean.id).startsWith('id_')) delete clean.id;
  const { error } = await supabase.from(table).upsert(clean, { onConflict: 'id' });
  if (error) throw error;
};
