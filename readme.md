# Laundry Land - Modular Clean

## Apa fungsi README.md?

`readme.md` adalah file dokumentasi yang otomatis jadi halaman depan repo GitHub lu.

Fungsinya:
1. **Jelaskan aplikasi** - Orang buka repo langsung tau ini POS Laundry Land v2.5.28 modular
2. **Panduan upload** - File mana yang wajib upload, mana yang jangan (hindari ganda kayak kemarin 6x SUPABASE_URL)
3. **Cara install** - Enable GitHub Pages biar bisa diakses online
4. **Urutan penyimpanan** - Catat Supabase order 1, LS order 2, IDB order 3

Tanpa readme.md, repo lu di GitHub keliatan kosong, cuma list file doang.

## Struktur Lengkap (kecil semua huruf)

```
laundry-land/
├── index.html
├── readme.md  <-- file ini, di root, wajib ada
├── manifest.json
├── original-body.html
├── css/
│   └── app.css
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── js/
    ├── config.js
    ├── supabase.js
    ├── db.js
    └── modules/
        ├── header-home.js
        ├── master-pelanggan.js
        ├── master-struk.js
        └── modal-manager.js
```

## File readme.md harus ada di root

Nama file harus persis `readme.md` (kecil semua huruf), bukan `readmi.md` atau `README.md` kapital.

Letaknya di root sejajar dengan `index.html`, bukan di dalam folder `js/` atau `css/`.

## Cara cek di GitHub

Setelah upload, buka repo lu di GitHub, di bawah list file harusnya muncul isi file readme.md ini otomatis.

Kalo belum ada, berarti file belum ke-upload atau namanya salah ketik jadi `readmi.md`.

## Urutan Penyimpanan

1. Order 1 - Supabase (js/supabase.js) - cloud primary
2. Order 2 - localStorage - fast cache
3. Order 3 - IndexedDB/Dexie - backup large
