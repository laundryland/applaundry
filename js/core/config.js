// config.js - Final Clean A + Vercel Env Support + Aman tidak hardcode

// 1. Coba baca dari Vercel Env (di-inject via window.__ENV__ atau import.meta.env)
const getEnv = (key, fallback) => {
  try {
    // Vercel inject via window.__ENV__
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) return window.__ENV__[key];
    // Vite style VITE_*
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env['VITE_' + key]) return import.meta.env['VITE_' + key];
    // Process env (Node/Vercel)
    if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
    if (typeof process !== 'undefined' && process.env && process.env['VITE_' + key]) return process.env['VITE_' + key];
  } catch {}
  return fallback;
};

// Fallback ke hardcode untuk local dev (jika tidak ada env)
const FALLBACK_URL = 'https://your-project.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.placeholder';

export const SUPABASE_URL = getEnv('SUPABASE_URL', getEnv('VITE_SUPABASE_URL', FALLBACK_URL));
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', getEnv('VITE_SUPABASE_ANON_KEY', FALLBACK_KEY));

// Cek apakah masih pakai fallback (belum di-set di Vercel)
export const isUsingFallback = SUPABASE_URL === FALLBACK_URL || SUPABASE_URL.includes('your-project');

export const TABLES = {
  outlets: 'outlets',
  pelanggan: 'pelanggan',
  layanan: 'layanan',
  antrian: 'antrian',
  karyawan: 'karyawan'
};

if (isUsingFallback) {
  console.warn('⚠️ applaundry: Masih pakai FALLBACK Supabase URL - Set di Vercel Env Variables untuk production');
} else {
  console.log('✅ applaundry: Supabase connected via Env Variables');
}
