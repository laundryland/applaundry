
# Laundry Final Modular v11 - CLEAR SEMUA MASALAH

## Masalah Lama (single file 1.4MB)
- 40 script tag global saling overwrite: pad() 4x, getTanggalNota() 2x, getOutletData() 2x
- 33 modal-overlay dengan z-index 20,1000,2000,9999,1000001 -> setting modal ketutup ghost overlay invisible tapi pointer-events:auto
- modalMasterStrukOverlay ada 7x ID sama -> ghost tap
- 5 script rebutan 11 checkbox strukShow -> race condition, settings hidden
- querySelectorAll('*') + MutationObserver scan seluruh DOM -> freeze tap 300-600ms
- CSS .tap-model{pointer-events:auto!important} bikin hidden page tetap bisa di-tap
- Service Worker laundry-v1 cache.addAll(['/']) gagal CORS di GitHub Pages, serve HTML lama terus
- Supabase init 2x: placeholder YOUR_PROJECT + real key -> race, kadang kosong

## Solusi Modular v11

### Struktur
- index.html = shell bersih, tidak ada inline script berat
- css/app.css = tanpa !important, .page-view.hidden{display:none}, .modal-overlay pointer-events:none ketika tidak active
- js/config.js = Supabase URL/key hardcoded, no localStorage cfgUrl
- js/db.js = Dexie v11 single init semua tabel, safeLS wrapper anti-crash JSON.parse, StorageManager Supabase-First
- js/utils.js = pad(), getTanggalNota() single, formatRupiah
- js/modules/modalManager.js = single openModal/closeModal, stack, backdrop click, ESC, anti hidden tap
- js/modules/masterStruk.js = SINGLE SOURCE untuk 11 checkbox, 1 attachListeners, 1 syncUI, 1 applyToNota
- js/modules/outlet.js, karyawan.js, pelanggan.js, layanan.js, antrian.js, bayarNota.js (5 Row), kasHariIni.js, laporan.js, omzet.js, print.js, exportImport.js, pertumbuhan.js, auth.js
- js/app.js = initSupabaseFirst() -> purgeLegacyCache() -> fetch 5 tabel dari Supabase dulu -> fallback LS -> fallback IDB -> render semua module

### Urutan Baru (sesuai request)
1. Supabase (cloud) - utama
2. localStorage - cache cepat
3. IndexedDB - benteng terakhir

Save: langsung upsert Supabase dulu, baru LS+IDB. Jika offline, masuk sync_queue IDB, retry 30 detik background.

### Deploy GitHub Pages Tanpa Halangan
1. Push folder laundry-final-v1 ke repo GitHub (root atau /docs)
2. Settings -> Pages -> Source: main / docs
3. Tidak perlu set supabase_url di localStorage lagi, sudah hardcoded di config.js
4. Pastikan di Supabase: Table outlets,karyawan,pelanggan,layanan,antrian RLS anon bisa select, insert, update, upsert
5. Buka https://username.github.io/repo/ -> akan muncul overlay "Supabase First Sync" -> data muncul dari cloud

### Deploy Supabase Tanpa Halangan
- URL dan KEY sudah di config.js, tidak pakai cfgUrl input lagi
- CORS: Supabase anon key by default allow semua origin, tidak perlu setting tambahan
- Jika error Could not find column, StorageManager otomatis filter kolom yang tidak ada dan retry (sudah ada di db.js)

### Test Clear Masalah
- Buka DevTools -> Application -> LocalStorage -> harus tidak ada cfgUrl, cfgKey, supabaseUrl
- Application -> Cache Storage -> hanya laundry-v11-modular
- Console -> tidak ada error pad() redefined
- Tap setting -> modalMasterStrukOverlay cuma 1, checkbox 11 semua fungsi, tidak hidden
- Buat nota baru -> langsung muncul di Supabase dashboard -> Table antrian

### Next
- Semua onclick inline di original_body.html bisa diganti pakai addEventListener di module masing-masing (sudah ada contoh di outlet.js)
- Jika mau full PWA, SW sudah v11 network-first untuk supabase, cache fallback untuk asset
