RESTORE POINT v13 FINAL - 3 Kolom Rapi
Tanggal: 2026-10-14 04:03 WIB
Tag: nota-ls-supa-exact-v13 + 3kolom + harian/mingguan/bulanan + share WA
Status: FINAL STABLE - LS+SUPA ONLY, NO DEXIE

File yang di-restore
index.html (max-w-[390px] min-h-[1028px] border-[3px] #e2e8f0 p-5 bg-[#f8fafc] rounded-[16px])
manifest.json (WA Nota Setrika - LS+SUPA only)
supabase.js (LS_KEY=nota_data ↔ nota_backup realtime, dedup makeKey(customer|kg|date))
sw.js (CACHE_NAME=nota-ls-supa-exact-v13)
Fitur yang sudah FINAL di restore point ini
Tampilan exact upload Index_10.html - style inline dari upload + tailwind CDN, container 390px
Parser bersih - ^\[.*?\]\s*, ^\d{1,2}[/\-].*?-\s*, ^[^:]{1,25}:\s*, ^(p|b|mb|bu|pak|mas)\s+ aman karakter [ ]
Logika penyimpanan baru LS+SUPA ONLY - NO DEXIE, tahan F5, multi-HP realtime via supabase channel nota-ls
Tombol WA balik semua - Proses → LS+SUPA, Bersihkan, Edit/Hapus
Share WA Laporan + WA Bisnis - Bi(m) https://wa.me/?text= + Xc() Export Laporan ke WA Bisnis + Salin Laporan (Clipboard)
Laporan Harian/Mingguan/Bulanan - tabs grid 3, grouping:
Harian: Fn(L)=YYYY-MM-DD, label Ui=dd/mm/yy
Mingguan: Lv(L)=Senin start, Fn(monday), label dd/mm/yy - dd/mm/yy
Bulanan: YYYY-MM, label MM/YYYY
Desc: 3 kolom Timestamps | Satuan | Jumlah
3 Kolom Rapi - Nota Setrika + share WA:
UI: Customer col-span-6, Satuan col-span-3, Komisi col-span-3
Share WA monospace: ``` Customer(18) + Satuan(7) + Komisi(10) + Total + Rincian progresif 50×0 + 20×1250 + ×1500 • 1 desimal
Cara Restore
git checkout main
cp restore_point_v13_final_3kolom/* ./
git add index.html manifest.json supabase.js sw.js
git commit -m "restore v13 final 3kolom harian/mingguan/bulanan"
git push
# Clear cache HP sekali untuk hapus setrika_db Dexie lama
Cache Key
LocalStorage: nota_data
Supabase: nota_backup table date PK, total_kg, total_komisi, entries JSON, updated_at
ServiceWorker: nota-ls-supa-exact-v13
Progresif
0-50kg = 0
51-70kg = 1250/kg
71+ = 1500/kg
1 desimal, Math.round
