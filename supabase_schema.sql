-- =========================================================================
-- SKEMA DATABASE SQL LENGKAP UNTUK SUPABASE - APLIKASI OLOLU LUMAJANG
-- =========================================================================
-- Berkas ini mencakup pembuatan tabel, indeks, keamanan level baris (RLS), 
-- dan Trigger PL/pgSQL otomatis untuk mengotomatisasi semua logika bisnis inti.
--
-- CARA PENGGUNAAN:
-- 1. Buka Dashboard Supabase Anda (https://database.new)
-- 2. Pilih Proyek OLOLU Anda.
-- 3. Klik menu "SQL Editor" di panel kiri.
-- 4. Klik "New Query".
-- 5. Tempelkan seluruh kode SQL di bawah ini, lalu klik "Run".
-- =========================================================================

-- Aktifkan ekstensi UUID jika belum aktif
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABEL: PROFIL PENGGUNA (users / profiles)
-- =========================================================================
-- Tabel ini menyimpan profil publik pengguna yang terhubung langsung dengan
-- tabel otentikasi internal Supabase (auth.users).
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    nama TEXT NOT NULL,
    nomor_hp TEXT UNIQUE NOT NULL,
    peran TEXT NOT NULL CHECK (peran IN ('penumpang', 'sopir', 'admin')),
    terverifikasi BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 2. TABEL: DOMPET (wallets)
-- =========================================================================
-- Tabel ini menyimpan saldo dompet digital untuk setiap pengguna (khususnya sopir).
-- Memiliki relasi 1:1 dengan profil pengguna.
CREATE TABLE public.wallets (
    id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    saldo NUMERIC DEFAULT 0 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 3. TABEL: DETAIL SOPIR (driver_details)
-- =========================================================================
-- Tabel ekstensi khusus untuk pengguna dengan peran 'sopir', berisi status, 
-- rating, jumlah pesanan, dan berkas identitas resmi.
CREATE TABLE public.driver_details (
    id UUID REFERENCES public.profiles ON DELETE CASCADE PRIMARY KEY,
    plat_nomor TEXT,
    jenis_motor TEXT,
    bisa_barang_besar BOOLEAN DEFAULT FALSE,
    disetujui_admin BOOLEAN DEFAULT FALSE,
    ditolak_admin BOOLEAN DEFAULT FALSE,
    alasan_ditolak TEXT,
    status_online BOOLEAN DEFAULT FALSE,
    saldo_dompet NUMERIC DEFAULT 0, -- Kolom kompatibilitas lama
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

-- =========================================================================
-- 4. TABEL: PESANAN UTAMA (orders)
-- =========================================================================
-- Menyimpan detail pesanan perjalanan, layanan kurir makanan, ataupun paket.
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nomor_pesanan TEXT UNIQUE NOT NULL,
    jenis_layanan TEXT NOT NULL CHECK (jenis_layanan IN ('ojek', 'makanan', 'paket', 'barang_besar')),
    id_penumpang UUID REFERENCES public.profiles(id) NOT NULL,
    id_sopir UUID REFERENCES public.driver_details(id),
    asal_alamat TEXT NOT NULL,
    asal_lat NUMERIC NOT NULL,
    asal_lng NUMERIC NOT NULL,
    jarak_km NUMERIC NOT NULL,
    tarif_perjalanan_murni NUMERIC NOT NULL,
    biaya_parkir_total NUMERIC DEFAULT 0,
    biaya_nota_total NUMERIC DEFAULT 0,
    tambahan_tujuan NUMERIC DEFAULT 0,
    tambahan_item NUMERIC DEFAULT 0,
    biaya_layanan_persen NUMERIC DEFAULT 10.0 NOT NULL,
    total_bayar_akhir NUMERIC NOT NULL,
    pembayaran_tunai BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'mencari_sopir' CHECK (status IN ('mencari_sopir', 'sopir_ditemukan', 'dalam_perjalanan', 'selesai', 'dibatalkan')),
    tahap_aktif INTEGER DEFAULT 0,
    waktu_dibuat TIMESTAMPTZ DEFAULT NOW(),
    waktu_diterima TIMESTAMPTZ,
    waktu_mulai_jalan TIMESTAMPTZ,
    waktu_selesai TIMESTAMPTZ,
    waktu_dibatalkan TIMESTAMPTZ,
    alasan_batal TEXT,
    riwayat_lokasi_sopir JSONB DEFAULT '[]'::jsonb
);

-- =========================================================================
-- 5. TABEL: MULTI-TUJUAN STOP-OVER (order_stops)
-- =========================================================================
-- Menyimpan rincian per-tujuan tambahan (maksimal 5) lengkap dengan catatan
-- parkir, belanja belanjaan toko, rincian nota, dan foto nota belanja.
CREATE TABLE public.order_stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    alamat TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    urutan INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'selesai')),
    pilihan_parkir TEXT DEFAULT 'tidak_ada' CHECK (pilihan_parkir IN ('tidak_ada', 'parkir_biasa', 'parkir_pasar')),
    daftar_item JSONB DEFAULT '[]'::jsonb,
    nota_nama_toko TEXT,
    nota_rincian_barang TEXT,
    nota_total_toko NUMERIC DEFAULT 0,
    nota_foto_url TEXT,
    nota_waktu_dicatat TIMESTAMPTZ
);

-- =========================================================================
-- 6. TABEL: RIWAYAT TRANSAKSI DOMPET (wallet_transactions)
-- =========================================================================
-- Mencatat seluruh arus masuk-keluar uang dari dompet pengemudi (top-up, komisi, dll).
CREATE TABLE public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_sopir UUID REFERENCES public.driver_details(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL CHECK (jenis IN ('pendapatan', 'potongan_jasa', 'topup', 'tarik_dana', 'denda')),
    jumlah NUMERIC NOT NULL,
    saldo_awal NUMERIC NOT NULL,
    saldo_akhir NUMERIC NOT NULL,
    deskripsi TEXT,
    bukti_transfer TEXT,
    alasan_penolakan TEXT,
    status_tarik TEXT CHECK (status_tarik IN ('menunggu', 'disetujui', 'ditolak')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 7. TABEL: LAPORAN DARURAT (emergency_reports / Tombol Panik)
-- =========================================================================
-- Mencatat pelaporan darurat/tombol panik demi keamanan penumpang & sopir.
CREATE TABLE public.emergency_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    nama_pelapor TEXT NOT NULL,
    nomor_hp_pelapor TEXT NOT NULL,
    peran_pelapor TEXT CHECK (peran_pelapor IN ('penumpang', 'sopir')),
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    status TEXT DEFAULT 'baru' CHECK (status IN ('baru', 'ditangani')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 8. TABEL: RATING DAN ULASAN (ratings)
-- =========================================================================
-- Menyimpan bintang rating dan review yang diberikan penumpang kepada sopir.
CREATE TABLE public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    id_sopir UUID REFERENCES public.driver_details(id) ON DELETE CASCADE,
    nama_penumpang TEXT NOT NULL,
    bintang INTEGER NOT NULL CHECK (bintang >= 1 AND bintang <= 5),
    ulasan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- 9. TABEL: PENGATURAN TARIF SISTEM (system_settings)
-- =========================================================================
-- Menyimpan konfigurasi tarif per KM, biaya layanan, biaya parkir secara fleksibel.
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);


-- =========================================================================
-- LOGIKA BISNIS: PL/pgSQL TRIGGER FUNCTIONS
-- =========================================================================

-- -------------------------------------------------------------------------
-- TRIGGER 1: OTOMATIS MEMBUAT DOMPET & DETAIL SOPIR SAAT PROFIL DIBUAT
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_wallet()
RETURNS TRIGGER AS $$
BEGIN
  -- Inisialisasi dompet dengan saldo Rp 0
  INSERT INTO public.wallets (id, saldo)
  VALUES (NEW.id, 0)
  ON CONFLICT (id) DO NOTHING;
  
  -- Jika pendaftar adalah seorang 'sopir', inisialisasi tabel driver_details
  IF NEW.peran = 'sopir' THEN
    INSERT INTO public.driver_details (
      id,plat_nomor, jenis_motor, saldo_dompet, rating_rata_rata, jumlah_pesanan_selesai
    )
    VALUES (NEW.id, '', '', 0, 5.0, 0)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger ke tabel profiles
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_wallet();


-- -------------------------------------------------------------------------
-- TRIGGER 2: POTONG SALDO KOMISI & PENDAPATAN OTOMATIS SAAT PESANAN SELESAI
-- -------------------------------------------------------------------------
-- Mengotomatiskan bagi hasil 10% (atau sesuai biaya_layanan_persen) ke kas platform.
-- - Tunai (Cash): Saldo dompet sopir dipotong sebesar nilai komisi 10% dari tarif murni.
-- - Non-Tunai (Digital): Saldo dompet sopir bertambah sebesar (Total Bayar - Komisi).
-- Dilengkapi pencatatan riwayat transaksi audit di tabel wallet_transactions.
CREATE OR REPLACE FUNCTION public.process_completed_order()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_rate NUMERIC;
  v_commission NUMERIC;
  v_driver_earnings NUMERIC;
  v_current_wallet_saldo NUMERIC;
  v_new_wallet_saldo NUMERIC;
  v_pembayaran_cash BOOLEAN;
BEGIN
  -- Jalankan trigger hanya jika status pesanan berubah menjadi 'selesai'
  IF NEW.status = 'selesai' AND OLD.status <> 'selesai' THEN
    
    -- Validasi penugasan sopir
    IF NEW.id_sopir IS NULL THEN
      RAISE EXCEPTION 'Tidak dapat menyelesaikan pesanan tanpa adanya sopir yang ditugaskan.';
    END IF;

    -- Ambil persentase komisi (default 10%)
    v_commission_rate := COALESCE(NEW.biaya_layanan_persen, 10.0) / 100.0;
    
    -- Hitung nilai rupiah komisi platform dari tarif perjalanan murni
    v_commission := ROUND(NEW.tarif_perjalanan_murni * v_commission_rate);
    
    -- Periksa metode pembayaran
    v_pembayaran_cash := COALESCE(NEW.pembayaran_tunai, TRUE);

    -- Dapatkan saldo dompet pengemudi saat ini
    SELECT saldo INTO v_current_wallet_saldo FROM public.wallets WHERE id = NEW.id_sopir;
    IF v_current_wallet_saldo IS NULL THEN
      INSERT INTO public.wallets (id, saldo) VALUES (NEW.id_sopir, 0) RETURNING saldo INTO v_current_wallet_saldo;
    END IF;

    IF v_pembayaran_cash THEN
      -- METODE TUNAI (CASH):
      -- Penumpang membayar langsung uang tunai ke sopir (termasuk biaya belanja & parkir).
      -- Dompet digital sopir di sistem dipotong untuk komisi jasa OLOLU.
      v_new_wallet_saldo := v_current_wallet_saldo - v_commission;
      
      -- Update saldo dompet utama
      UPDATE public.wallets 
      SET saldo = v_new_wallet_saldo, updated_at = NOW() 
      WHERE id = NEW.id_sopir;
      
      -- Sinkronisasi kompatibilitas lama
      UPDATE public.driver_details 
      SET saldo_dompet = v_new_wallet_saldo, 
          jumlah_pesanan_selesai = jumlah_pesanan_selesai + 1,
          updated_at = NOW()
      WHERE id = NEW.id_sopir;

      -- Catat audit potongan jasa platform
      INSERT INTO public.wallet_transactions (
        id_sopir, jenis, jumlah, saldo_awal, saldo_akhir, deskripsi, status_tarik
      ) VALUES (
        NEW.id_sopir,
        'potongan_jasa',
        v_commission,
        v_current_wallet_saldo,
        v_new_wallet_saldo,
        'Potongan bagi hasil layanan ' || NEW.biaya_layanan_persen || '% untuk Pesanan #' || NEW.nomor_pesanan,
        NULL
      );

    ELSE
      -- METODE NON-TUNAI / DIGITAL:
      -- Penumpang membayar ke rekening platform.
      -- Sopir mendapatkan kredit bersih di dompetnya (Total Bayar - Komisi).
      v_driver_earnings := NEW.total_bayar_akhir - v_commission;
      v_new_wallet_saldo := v_current_wallet_saldo + v_driver_earnings;

      -- Update saldo dompet utama
      UPDATE public.wallets 
      SET saldo = v_new_wallet_saldo, updated_at = NOW() 
      WHERE id = NEW.id_sopir;

      -- Sinkronisasi kompatibilitas lama
      UPDATE public.driver_details 
      SET saldo_dompet = v_new_wallet_saldo, 
          jumlah_pesanan_selesai = jumlah_pesanan_selesai + 1,
          updated_at = NOW()
      WHERE id = NEW.id_sopir;

      -- Catat audit pendapatan masuk non-tunai
      INSERT INTO public.wallet_transactions (
        id_sopir, jenis, jumlah, saldo_awal, saldo_akhir, deskripsi, status_tarik
      ) VALUES (
        NEW.id_sopir,
        'pendapatan',
        NEW.total_bayar_akhir,
        v_current_wallet_saldo,
        v_current_wallet_saldo + NEW.total_bayar_akhir,
        'Pendapatan non-tunai masuk untuk Pesanan #' || NEW.nomor_pesanan,
        NULL
      );

      -- Catat audit potongan komisi langsung dari pendapatan tersebut
      INSERT INTO public.wallet_transactions (
        id_sopir, jenis, jumlah, saldo_awal, saldo_akhir, deskripsi, status_tarik
      ) VALUES (
        NEW.id_sopir,
        'potongan_jasa',
        v_commission,
        v_current_wallet_saldo + NEW.total_bayar_akhir,
        v_new_wallet_saldo,
        'Potongan bagi hasil layanan ' || NEW.biaya_layanan_persen || '% untuk Pesanan #' || NEW.nomor_pesanan,
        NULL
      );

    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger ke tabel orders
CREATE OR REPLACE TRIGGER on_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.process_completed_order();


-- -------------------------------------------------------------------------
-- TRIGGER 3: REKALKULASI OTOMATIS RATING RATA-RATA SOPIR SAAT ULASAN BARU MASUK
-- -------------------------------------------------------------------------
-- Menjamin nilai rating pengemudi terhitung akurat dan up-to-date setiap kali
-- mendapat ulasan/penilaian dari penumpang.
CREATE OR REPLACE FUNCTION public.recalculate_driver_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating NUMERIC;
BEGIN
  -- Hitung rata-rata bintang dari seluruh ulasan yang ditujukan untuk sopir tersebut
  SELECT ROUND(AVG(bintang)::numeric, 1) INTO v_avg_rating
  FROM public.ratings
  WHERE id_sopir = NEW.id_sopir;

  -- Update kolom rating di detail pengemudi
  UPDATE public.driver_details
  SET rating_rata_rata = COALESCE(v_avg_rating, 5.0),
      updated_at = NOW()
  WHERE id = NEW.id_sopir;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Pasang trigger ke tabel ratings
CREATE OR REPLACE TRIGGER on_rating_inserted
  AFTER INSERT OR UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_driver_rating();


-- =========================================================================
-- KEAMANAN LEVEL BARIS (ROW LEVEL SECURITY - RLS)
-- =========================================================================

-- Aktifkan RLS pada seluruh tabel demi kepatuhan enkripsi dan privasi data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 1. KEBIJAKAN PROFILES
CREATE POLICY "Profil dapat dibaca oleh pengguna terotentikasi" 
  ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Pengguna hanya dapat mengubah profilnya sendiri" 
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. KEBIJAKAN WALLETS
CREATE POLICY "Dompet dapat dibaca oleh pemiliknya" 
  ON public.wallets FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin dapat mengelola seluruh dompet" 
  ON public.wallets FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.peran = 'admin'
    )
  );

-- 3. KEBIJAKAN ORDERS
CREATE POLICY "Penumpang dapat membaca pesanan miliknya" 
  ON public.orders FOR SELECT USING (auth.uid() = id_penumpang);
CREATE POLICY "Sopir dapat membaca pesanan yang ditugaskan atau mencari" 
  ON public.orders FOR SELECT USING (
    id_sopir = auth.uid() OR status = 'mencari_sopir'
  );
CREATE POLICY "Penumpang dapat membuat pesanan" 
  ON public.orders FOR INSERT WITH CHECK (auth.uid() = id_penumpang);
CREATE POLICY "Pengguna terkait dapat mengupdate pesanan" 
  ON public.orders FOR UPDATE USING (
    auth.uid() = id_penumpang OR auth.uid() = id_sopir
  );

-- =========================================================================
-- KRON JOB PEMELIHARAAN DATA OTOMATIS (pg_cron)
-- =========================================================================
-- Membersihkan data riwayat lokasi sopir yang berumur lebih dari 31 hari
-- untuk menghemat media penyimpanan tanpa menghapus data transaksi penting.
--
-- SELECT cron.schedule(
--     'pembersihan-harian-ololu',
--     '0 1 * * *', -- Berjalan pukul 01:00 Pagi setiap hari
--     $$
--     UPDATE public.orders 
--     SET riwayat_lokasi_sopir = '[]'::jsonb
--     WHERE waktu_selesai < NOW() - INTERVAL '31 days' OR waktu_dibatalkan < NOW() - INTERVAL '31 days';
--     $$
-- );
