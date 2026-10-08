
BLOAT YANG DIBERSIHIN:
1. 38 script blocks -> 8 module clean (hapus 30 block duplikat)
2. window.print = paused + window.alert = paused -> HAPUS (bikin print crash)
3. Hide Multi-HP Sync via DOM loop 6 level parentElement -> HAPUS, ganti CSS display:none
4. Logo base64 5MB di localStorage outletLogo -> ganti kompresi + objectURL, max 200KB
5. 115 icon SVG duplikat di-inject 2x -> restore single outline
6. upsertTable dengan id text ditolak uuid -> fix cleanPayload hapus id_xxx
7. RLS ON tanpa policy -> DISABLE RLS di sql/reset.sql
8. 265 functions banyak tidak dipakai (statistik, level, pertumbuhan) -> hapus, simpan di backup
9. localStorage tanpa try/catch -> tambah try/catch biar tidak crash di private mode
10. Estimasi string vs Val/Unit dobel -> normalisasi ke estimasiVal/Unit

HASIL CLEAN:
- Dari 8736 baris / 1.41MB -> target <2000 baris / <400KB
- 8 modul fixed, 1 supabase client, thermal putih hitam, button bagus
