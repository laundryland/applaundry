# Applaundry - Laundry Management PWA

Laundry Management PWA dengan Supabase sync - 5 tabel aktif, export import CSV/XLSX, multi-outlet.

## 🚀 Live Demo
Deploy di Vercel - static hosting.

## 📦 Struktur
- `FIX-ALL-SETTING.html` - Main app (single file PWA)
- `vercel.json` - Vercel config (static)
- `package.json` - Project meta

## 🔧 Setup Supabase

Project ID: `nniecqbfjmmlrtmolnrt` (applaundry)

### 1. Buat tabel di Supabase Dashboard → SQL Editor:

```sql
-- Outlets
create table outlets (
  id text primary key,
  nama text,
  alamat text,
  wa text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Karyawan
create table karyawan (
  id text primary key,
  outlet_id text,
  nama text,
  wa text,
  alamat text,
  username text,
  password text,
  level text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Pelanggan (fix nama tercantum)
create table pelanggan (
  id text primary key,
  outlet_id text,
  nama text,
  wa text,
  alamat text,
  deposito int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Layanan
create table layanan (
  id text primary key,
  outlet_id text,
  nama text,
  kode text,
  harga int,
  satuan text,
  estimasiVal int,
  estimasiUnit text,
  minKg int,
  created_at timestamptz default now()
);

-- Antrian / Nota
create table antrian (
  id text primary key,
  outlet_id text,
  nota text,
  namaPelanggan text,
  layanan text,
  totalNota int,
  statusProses text,
  statusBayar text,
  tanggal date,
  created_at timestamptz default now()
);

-- RLS - allow all untuk anon publishable key (ganti dengan policy yang lebih ketat untuk production)
alter table outlets enable row level security;
alter table karyawan enable row level security;
alter table pelanggan enable row level security;
alter table layanan enable row level security;
alter table antrian enable row level security;

create policy "Allow all for anon" on outlets for all using (true) with check (true);
create policy "Allow all for anon" on karyawan for all using (true) with check (true);
create policy "Allow all for anon" on pelanggan for all using (true) with check (true);
create policy "Allow all for anon" on layanan for all using (true) with check (true);
create policy "Allow all for anon" on antrian for all using (true) with check (true);
```

### 2. Set Env di Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://nniecqbfjmmlrtmolnrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV
```

Atau isi di file utama `FIX-ALL-SETTING.html`:

```javascript
// === CONFIG PUBLISH - APPLAUDNRY ===
const PUBLISH_SUPABASE_URL = 'https://nniecqbfjmmlrtmolnrt.supabase.co';
const PUBLISH_SUPABASE_ANON_KEY = 'sb_publishable_JNkBb7xwGqYwyL6s11ffdw_DfV9dSPV';
```

## 📤 Deploy ke Vercel

### Via GitHub:
1. Push repo ini ke GitHub (pastikan `.env` tidak ikut - sudah di `.gitignore`)
2. Vercel → New Project → Import GitHub repo
3. Framework preset: `Other`
4. Add Environment Variables (2 key di atas)
5. Deploy

### Via CLI:
```bash
vercel --prod
```

### Via drag & drop:
- Buka vercel.com/new → Browse → upload `FIX-ALL-SETTING.html` + `vercel.json`

## 📋 Features

- ✅ 5 tabel Supabase aktif: outlets, pelanggan, layanan, antrian, karyawan
- ✅ Export Import CSV/XLSX: pelanggan & layanan
- ✅ Backup Full JSON
- ✅ Multi-outlet filter
- ✅ Deposito pelanggan
- ✅ PWA ready

## 🔒 Security

- `.env` tidak di-push (di `.gitignore`)
- `supabase-config.json` tidak di-push
- Publishable key aman untuk public (bukan secret key)
- Untuk production, ganti RLS policy jadi lebih ketat

## 📝 License
MIT
