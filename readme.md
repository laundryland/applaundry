# Laundry Land - Modular v2.5.28 Clean

POS Laundry Land - Supabase First (Order 1) → localStorage (Order 2) → IndexedDB (Order 3)

## Fix X Merah 08 Oct 2026
- `sw.js` - cache.addAll icon 404 dihapus, pakai add safe
- `manifest.json` - icons 404 dihapus
- `index.html` - icon link 404 dihapus, SW disabled temp
- `config.js` - anon key baru exp 2106784407 (fix 401)
- `core-functions.js` - duplicate supabase client + db.version removed
- `header-home.js` - render outlets real dari Supabase
- `readme.md` - clean

## Struktur
```
├── index.html
├── readme.md
├── manifest.json
├── sw.js
├── original-body.html
├── css/app.css
└── js/
    ├── config.js (SUPABASE_KEY baru)
    ├── supabase.js
    ├── db.js
    └── modules/
        ├── core-functions.js (306KB Level unlocked)
        ├── header-home.js
        ├── master-pelanggan.js
        ├── print-thermal.js
        └── wa-share.js
```

## Deploy GitHub Pages
1. Upload semua file (jangan double push)
2. Settings → Pages → Source: GitHub Actions
3. Tunggu Actions hijau, jangan cancel

## Supabase
URL: https://nniecqbfjmmlrtmolnrt.supabase.co
Key: anon baru 2106784407 - jika 401 ganti di js/config.js
Tables: outlets, karyawan, pelanggan, layanan, antrian
