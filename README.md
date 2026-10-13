# Nota Setrika PWA - Dexie + Supabase (applaundry)

PWA Nota Setrika tahan reload, parser WA bersih, laporan harian progresif tier reset 00:00 WIB, auto-backup Dexie IndexedDB + sync Supabase.

**Project Supabase:** applaundry `https://nniecqbfjmmlrtmolnrt.supabase.co`

## Fitur
- **Parser WA bersih:** Buang `[timestamp]` + `Rahma:` + panggilan `p/b/mb/bu/pak/mas` → `dwi bantengan 2.8kg`
- **Dexie IndexedDB:** Tahan `F5` & `Ctrl+Shift+F5`, kapasitas 500MB+, async no lag, no build
- **Tier harian reset 00:00 WIB:** 0-50kg=0, 51-70kg=1250, 71+kg=1500 cumulative, per hari riset ke tier 1
- **Laporan Level 2:** 3 kolom Timestamps | Satuan kg harian (1 desimal) | Jumlah komisi harian, tab Harian/Mingguan/Bulanan
- **Supabase external:** `supabase.js` external no build, auto-sync tiap 60 detik + saat tab aktif
- **PWA external:** `manifest.json` + `sw.js` external, no bundler

## Struktur No Build (Vercel friendly)

```
/
├── index.html        # PWA final (React artifact + Dexie)
├── supabase.js       # External Supabase sync applaundry - no build
├── manifest.json     # External PWA manifest
├── sw.js             # External Service Worker (skip supabase.co)
├── icon-32.png
├── icon-192.png
├── icon-512.png
├── favicon.png
├── vercel.json       # optional header config
└── README.md
```

> Semua external, tidak perlu `npm run build`. Vercel serve static.

## Setup Supabase (sekali)

Jalankan di SQL Editor Supabase applaundry:

```sql
create table public.nota (
  id bigserial primary key,
  customer text not null,
  kg numeric(5,1) check (kg > 0 and kg < 100),
  date text not null,
  created_at timestamptz default now()
);

create table public.nota_backup (
  date text primary key,
  total_kg numeric(6,1) default 0,
  total_komisi integer default 0,
  entries jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.nota enable row level security;
alter table public.nota_backup enable row level security;

create policy "Allow anon" on public.nota for all using (true) with check (true);
create policy "Allow anon" on public.nota_backup for all using (true) with check (true);

create index idx_nota_date on public.nota(date);
```

## Deploy GitHub → Vercel

1. Push repo ini ke GitHub
2. Vercel → New Project → Import GitHub repo
3. Framework Preset: **Other**
4. Build Command: kosongkan, Output Directory: `./`
5. Deploy

PWA butuh HTTPS, Vercel sudah HTTPS otomatis.

Supabase config ada di `supabase.js`:
```js
const SUPABASE_URL = "https://nniecqbfjmmlrtmolnrt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_...";
```

Publishable key aman untuk frontend. Kalau mau pakai ENV Vercel, ganti jadi `import.meta.env` atau `process.env` dan set di Vercel Environment Variables.

## Cara pakai

1. Buka PWA, paste chat WA: `[10:30] Rahma: b dwi bantengan 2.8`
2. Klik Proses → Dexie → auto-sync Supabase (badge kanan bawah)
3. Laporan → cek Timestamps | Kg | Komisi harian
4. Export WA Bisnis

## Tier harian

- `Ri(totalKgDay)` per tanggal lokal `bn() = Fn(new Date)` → `YYYY-MM-DD` WIB
- Reset jam 00:00 WIB otomatis masuk key tanggal baru
- Contoh: 13/10 71kg = komisi 26.500, 14/10 10kg = komisi 0 (balik tier 1)

## Supabase quota

Free tier per proyek 500MB DB + 1GB Storage, bukan total gabungan. 2 proyek gratis = 1GB DB.

## License

Internal - applaundry
