# applaundry 🧺

Laundry Land - Final Clean A - Enteng Tidak Crash

> Dari 8736 baris monolit → 47 baris modular (99.5% reduction)

## ✨ Fitur Final Clean

- **Enteng**: 86KB vs 1.4MB asli
- **Tidak Crash**: hapus 38 script block tabrakan + window.print pause hack
- **Thermal Putih Hitam**: nota `#ffffff` font `#000` Courier bold
- **Tombol Bagus**: rounded 20px + shadow + hover scale
- **Icon Original**: single outline (tidak ganda)
- **Bayar Nota 5 Row**: Jumlah, Deposito Split, Metode (Tunai/TF/QRIS), Kalkulasi, Simpan
- **Fix Supabase**: UUID cleanPayload + DISABLE RLS

## 📁 Struktur

```
applaundry/
├── index.html (47 baris - entry point)
├── js/
│   ├── core/
│   │   ├── config.js (SUPABASE_URL, KEY, TABLES)
│   │   ├── supabase.js (FIX UUID - hapus id_xxx)
│   │   ├── storage.js (getData/setData)
│   │   ├── router.js (showPage)
│   │   └── app.js (initApp)
│   └── modules/
│       ├── outlet.js
│       ├── pelanggan.js (2ROW + search)
│       ├── layanan.js (fix estimasiVal/Unit)
│       ├── karyawan.js
│       ├── antrian.js (filter + status cycle)
│       ├── nota-bayar.js (5 ROW)
│       ├── struk.js (thermal putih hitam + Print/ShareWA PNG/Text)
│       ├── laporan.js (Kas Hari Ini, Omzet, Riwayat)
│       ├── backup.js (JSON)
│       └── ui.js (toast)
├── css/
├── sql/
│   └── reset.sql (DISABLE RLS + UUID fix)
└── README.md
```

## 🚀 Cara Pakai

1. **Supabase Setup** (sekali):
   ```sql
   -- Jalankan di Supabase SQL Editor
   -- File: sql/reset.sql
   ALTER TABLE outlets DISABLE ROW LEVEL SECURITY;
   ALTER TABLE pelanggan DISABLE ROW LEVEL SECURITY;
   ALTER TABLE layanan DISABLE ROW LEVEL SECURITY;
   ALTER TABLE antrian DISABLE ROW LEVEL SECURITY;
   ```

2. **Local**:
   - Buka `index.html` di Chrome
   - Test flow: Outlet → Pelanggan → Layanan → Antrian → Bayar → Print

3. **Deploy**:
   - Vercel/Netlify: drag folder `applaundry`
   - Atau GitHub Pages: push repo ini, enable Pages

## 🧹 Apa yang Dibersihkan?

| Sebelum | Sesudah |
|---------|---------|
| 8736 baris, 38 script block | 47 baris index + 8 module |
| window.print = paused (crash) | Hapus, print jalan |
| DOM hack 6 level parentElement | CSS display:none |
| Logo base64 5MB localStorage | Max 200KB compressed |
| Icon SVG inject 2x (ganda) | Single outline |
| id_xxx text ditolak uuid | cleanPayload hapus id_xxx |
| RLS ON tanpa policy 401 | DISABLE RLS |

## 📦 Base Backup

Jika butuh rollback ke versi utuh sebelum clean:
- File asli: `LAUNDRY-UTUH-REAL-BUKAN-MOCK_1.html` (1.4MB, 8736 baris)
- Base final restore: `LAUNDRY-RESTORE-ICON-ORIGINAL-BUTTON-BAGUS.html`

## 📝 License

MIT - Free for laundry business

---
Made with ❤️ by Shandy - Madiun, East Java


## 🔐 Setup Aman - Tidak Hardcode Key di GitHub

### Local Dev:
1. Copy `.env.example` → `.env.local`
2. Isi `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY` dari Supabase Dashboard
3. `.env.local` sudah di `.gitignore`, tidak akan ke-push

### Vercel Production (Recommended):
1. Vercel Dashboard → Project `applaundry` → Settings → Environment Variables
2. Add:
   - `SUPABASE_URL` = `https://xxx.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJhbG...`
3. Redeploy → Key aman, tidak kelihatan di GitHub
4. Atau pakai 1 klik Integration: Settings → Integrations → Supabase → Connect

Config otomatis baca: `window.__ENV__` → `import.meta.env` → fallback hardcode.
