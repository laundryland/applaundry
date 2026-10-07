import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supa = createClient(SUPABASE_URL, SUPABASE_KEY);
window.supabaseClient = supa;
window.supa = supa;

console.log('✅ Single Supabase client initialized - order 1');
