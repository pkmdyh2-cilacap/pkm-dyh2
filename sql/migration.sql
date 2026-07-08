-- ==============================
-- MIGRATION: Buat tabel untuk aplikasi Pralokmin
-- Jalankan di Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================

-- Tabel Units (Unit Pelayanan)
CREATE TABLE IF NOT EXISTS units (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  klaster BIGINT NOT NULL DEFAULT 5,
  nama TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Indicators (Indikator)
CREATE TABLE IF NOT EXISTS indicators (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  klaster BIGINT NOT NULL DEFAULT 5,
  unit TEXT NOT NULL,
  nama TEXT NOT NULL,
  target TEXT NOT NULL,
  satuan TEXT DEFAULT 'persen',
  mode_bulanan TEXT DEFAULT 'bagi12',
  bor BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Entries (Data Capaian)
CREATE TABLE IF NOT EXISTS entries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  klaster BIGINT NOT NULL DEFAULT 5,
  indikator_id BIGINT NOT NULL,
  petugas TEXT NOT NULL,
  unit TEXT NOT NULL,
  bulan TEXT NOT NULL,
  tahun TEXT NOT NULL,
  periode TEXT NOT NULL,
  indikator_nama TEXT NOT NULL,
  target_tahunan TEXT,
  mode_bulanan TEXT DEFAULT 'bagi12',
  target_bulanan DOUBLE PRECISION,
  aktual TEXT,
  satuan TEXT DEFAULT 'persen',
  status_capaian TEXT,
  analisa TEXT,
  rtl TEXT,
  bor BOOLEAN DEFAULT FALSE,
  bor_hari_rawat DOUBLE PRECISION DEFAULT 0,
  bor_tt DOUBLE PRECISION DEFAULT 0,
  bor_hari_periode DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Pralokmin Files (file uploads)
-- NOTE: Jika tabel sudah ada dengan schema berbeda (misal id uuid),
-- jalankan: DROP TABLE IF EXISTS pralokmin_files CASCADE;
-- lalu jalankan ulang script ini.
CREATE TABLE IF NOT EXISTS pralokmin_files (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bulan TEXT NOT NULL,
  klaster BIGINT NOT NULL,
  jenis TEXT NOT NULL,
  nama_file TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  ukuran BIGINT NOT NULL DEFAULT 0,
  diupload_pada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_bulan_klaster_jenis UNIQUE (bulan, klaster, jenis)
);

-- Tambahkan unique constraint jika tabel sudah ada tapi tanpa constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_bulan_klaster_jenis'
  ) THEN
    ALTER TABLE pralokmin_files ADD CONSTRAINT unique_bulan_klaster_jenis UNIQUE (bulan, klaster, jenis);
  END IF;
END $$;

-- Aktifkan Row Level Security
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pralokmin_files ENABLE ROW LEVEL SECURITY;

-- Izinkan akses publik (anon)
DROP POLICY IF EXISTS "Akses publik units" ON units;
CREATE POLICY "Akses publik units" ON units FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik indicators" ON indicators;
CREATE POLICY "Akses publik indicators" ON indicators FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik entries" ON entries;
CREATE POLICY "Akses publik entries" ON entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses publik pralokmin_files" ON pralokmin_files;
CREATE POLICY "Akses publik pralokmin_files" ON pralokmin_files FOR ALL USING (true) WITH CHECK (true);
