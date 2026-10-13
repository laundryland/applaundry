-- FIX 401 Unauthorized + permission denied for nota_backup
-- Jalankan di Supabase SQL Editor applaundry

-- 1. Pastikan tabel ada (kalau belum)
CREATE TABLE IF NOT EXISTS public.nota_backup (
  date text PRIMARY KEY,
  total_kg numeric(6,1) DEFAULT 0,
  total_komisi integer DEFAULT 0,
  entries jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- 2. Matikan RLS sementara, bersihkan policy lama
ALTER TABLE public.nota_backup DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all anon" ON public.nota_backup;
DROP POLICY IF EXISTS "Allow all for anon" ON public.nota_backup;
DROP POLICY IF EXISTS "Allow anon all" ON public.nota_backup;
DROP POLICY IF EXISTS "Enable all for anon" ON public.nota_backup;

-- 3. Aktifkan lagi RLS + buat policy baru yang benar untuk anon + authenticated
ALTER TABLE public.nota_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all anon" ON public.nota_backup FOR ALL USING (true) WITH CHECK (true);
-- Alternatif kalau pakai role anon spesifik:
-- CREATE POLICY "Allow anon all" ON public.nota_backup FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Grant usage
GRANT ALL ON public.nota_backup TO anon;
GRANT ALL ON public.nota_backup TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 5. Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='nota_backup') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.nota_backup;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- publication sudah ada atau error lain, ignore
  NULL;
END $$;

-- 6. Cek
SELECT 'nota_backup RLS fixed' as status, count(*) as rows FROM public.nota_backup;
SELECT * FROM pg_policies WHERE tablename='nota_backup';
