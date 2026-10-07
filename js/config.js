export const SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWVjcWJmam1tbHJ0bW9sbnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMDg0MDcsImV4cCI6MjEwNjc4NDQwN30.aUXMtZN9SVb5Qgj7pA6Ur5hwKDhwDPokFCrQhONSWqE'];
export const TABLES = ['outlets','karyawan','pelanggan','layanan','antrian'];

// JIKA 401 Invalid API key:
// 1. Buka Supabase Dashboard -> Project Settings -> API
// 2. Copy anon public key yang baru
// 3. Ganti SUPABASE_KEY di atas
// 4. Atau biarkan LS fallback (offline mode) - data dari localStorage tetap jalan
