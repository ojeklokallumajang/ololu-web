-- =========================================================================
-- SKEMA DATABASE SQL LENGKAP (VERSI TERBARU) - APLIKASI OLOLU LUMAJANG
-- =========================================================================
-- Berkas ini mencakup semua tabel yang diperlukan untuk pendaftaran 1-langkah,
-- otentikasi kata sandi, tempat tanggal lahir, dan sistem admin.
--
-- CARA PENGGUNAAN:
-- 1. Buka Dashboard Supabase -> SQL Editor -> New Query.
-- 2. Hapus semua isi query lama (jika ada).
-- 3. Tempelkan seluruh kode di bawah ini, lalu klik "Run".
-- =========================================================================

-- Aktifkan ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL: PROFIL PENGGUNA (Utama)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Terhubung dengan ID di aplikasi
    nama TEXT NOT NULL,
    nomor_hp TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- Menyimpan kata sandi (plain text untuk simulasi, gunakan hash untuk produksi)
    peran TEXT NOT NULL CHECK (peran IN ('penumpang', 'sopir', 'admin')),
    terverifikasi BOOLEAN DEFAULT FALSE,
    foto_profil TEXT, -- Base64 atau URL
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    is_sub_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: DETAIL RIDER/DRIVER
CREATE TABLE IF NOT EXISTS public.driver_details (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    plat_nomor TEXT,
    jenis_motor TEXT,
    bisa_barang_besar BOOLEAN DEFAULT FALSE,
    disetujui_admin BOOLEAN DEFAULT FALSE,
    ditolak_admin BOOLEAN DEFAULT FALSE,
    alasan_ditolak TEXT,
    status_online BOOLEAN DEFAULT FALSE,
    saldo_dompet NUMERIC DEFAULT 0,
    rating_rata_rata NUMERIC(2,1) DEFAULT 5.0,
    jumlah_pesanan_selesai INTEGER DEFAULT 0,
    lat_sekarang NUMERIC,
    lng_sekarang NUMERIC,
    ktp_url TEXT,
    sim_url TEXT,
    stnk_url TEXT,
    kendaraan_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: PESANAN UTAMA (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomor_pesanan TEXT UNIQUE NOT NULL,
    jenis_layanan TEXT NOT NULL CHECK (jenis_layanan IN ('ojek', 'makanan', 'paket', 'barang_besar')),
    id_penumpang UUID REFERENCES public.profiles(id) NOT NULL,
    id_sopir UUID REFERENCES public.profiles(id),
    asal_alamat TEXT NOT NULL,
    asal_lat NUMERIC NOT NULL,
    asal_lng NUMERIC NOT NULL,
    jarak_km NUMERIC NOT NULL,
    tarif_perjalanan_murni NUMERIC NOT NULL,
    biaya_parkir_total NUMERIC DEFAULT 0,
    biaya_nota_total NUMERIC DEFAULT 0,
    total_bayar_akhir NUMERIC NOT NULL,
    pembayaran_tunai BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'mencari_sopir' CHECK (status IN ('mencari_sopir', 'sopir_ditemukan', 'diproses', 'dalam_perjalanan', 'selesai', 'dibatalkan')),
    waktu_dibuat TIMESTAMPTZ DEFAULT NOW(),
    waktu_selesai TIMESTAMPTZ
);

-- 4. TABEL: DETAIL STOP-OVER (Multi-tujuan)
CREATE TABLE IF NOT EXISTS public.order_stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    alamat TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    urutan INTEGER NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- 5. TABEL: PENGATURAN SISTEM
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 6. TABEL: LOG AUDIT (Pertanggungjawaban)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id),
    admin_nama TEXT,
    aksi TEXT NOT NULL,
    detail TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TRIGGER: OTOMATIS BUAT DETAIL RIDER SAAT DAFTAR PERAN SOPIR
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_rider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.peran = 'sopir' THEN
    INSERT INTO public.driver_details (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_rider();

-- Berikan izin akses publik (RLS dimatikan untuk kemudahan tahap awal pengembangan)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Driver" ON public.driver_details FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.order_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Stops" ON public.order_stops FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik Logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
