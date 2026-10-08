import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
window.supabaseClient = supabaseClient;
export const supabase = supabaseClient;

export const upsertTable = async (t,d) => {
  if(!d?.length) return;
  try{
    let clean = d.map(o=>{ let c={...o}; if(c.id && String(c.id).length<20) delete c.id; return c; });
    const {error} = await supabaseClient.from(t).upsert(clean,{onConflict:'id'});
    if(error) console.error(t, error.message);
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
