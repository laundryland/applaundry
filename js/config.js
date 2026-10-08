// js/core/config.js - FINAL FIX - supports sb_publishable_ + Vercel ENV
const ENV = (typeof window !== 'undefined' && window.__ENV__) ? window.__ENV__ : {};

function getMeta(name){
  try{
    const el = document.querySelector(`meta[name="${name}"]`);
    return el ? el.content : '';
  }catch{ return '' }
}

export const SUPABASE_URL = ENV.SUPABASE_URL || getMeta('supabase-url') || 'https://nniecqbfjmmlrtmolnrt.supabase.co';
export const SUPABASE_KEY = ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_PUBLISHABLE_KEY || ENV.SUPABASE_KEY || getMeta('supabase-anon-key') || 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV';
export const SUPABASE_ANON_KEY = SUPABASE_KEY;

// Legacy VITE_ support
export const VITE_SUPABASE_URL = SUPABASE_URL;
export const VITE_SUPABASE_ANON_KEY = SUPABASE_KEY;
export const VITE_SUPABASE_PUBLISHABLE_KEY = SUPABASE_KEY;

export default {
  SUPABASE_URL,
  SUPABASE_KEY,
  SUPABASE_ANON_KEY
};

console.log('[Config] Loaded:', SUPABASE_URL, SUPABASE_KEY.slice(0,20)+'...');
