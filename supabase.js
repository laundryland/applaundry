// js/core/supabase.js - FINAL FIX - supports sb_publishable_
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY } from './config.js?v=final2024';

const url = SUPABASE_URL;
const key = SUPABASE_KEY || SUPABASE_ANON_KEY;

console.log('[Supabase] Init with:', url, key ? key.slice(0,25)+'...' : 'MISSING KEY');

if(!url || !key){
  console.error('[Supabase] Config missing! Check js/core/config.js');
}

export const supabaseClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// For backward compat
window.supabaseClient = supabaseClient;
export const supabase = supabaseClient;

export const upsertTable = async (t,d) => {
  if(!d?.length) return;
  try{
    let clean = d.map(o=>{
      let c={...o};
      if(c.id && String(c.id).length<20) delete c.id;
      return c;
    });
    const {error} = await supabaseClient.from(t).upsert(clean,{onConflict:'id'});
    if(error) console.error('[upsert]', t, error.message);
  }catch(e){ console.error(e); }
};

export const loadAll = async () => {
  for(let t of ['outlets','pelanggan','layanan','antrian','karyawan']){
    try{
      const {data} = await supabaseClient.from(t).select('*').limit(2000);
      if(data?.length) localStorage.setItem(t+'Data', JSON.stringify(data));
    }catch(e){}
  }
};
