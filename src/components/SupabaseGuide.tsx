/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, Database, Code, Shield, Cloud, Plus } from 'lucide-react';

export default function SupabaseGuide() {
  const [activeTab, setActiveTab] = useState<'panduan' | 'sql' | 'edge' | 'migrasi'>('panduan');
  const [copied, setCopied] = useState<string | null>(null);

  const migrationSql = `-- =========================================================================
-- SQL PEMBARUAN (MIGRATION) - JALANKAN INI JIKA ADA FITUR BARU
-- =========================================================================

-- 1. Lengkapi Tabel PROFILES (Fix error pendaftaran & detail)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS foto_profil TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tempat_lahir TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tanggal_lahir TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_sub_admin BOOLEAN DEFAULT FALSE;

-- 2. Lengkapi Tabel DRIVER_DETAILS (Fix pendaftaran)
ALTER TABLE public.driver_details ADD COLUMN IF NOT EXISTS warna_kendaraan TEXT DEFAULT '';

-- 2. Lengkapi Tabel ORDERS (Fix error rute & nota & keuangan)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items_awal JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nota_awal_nama_toko TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nota_awal_total_toko NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nota_awal_rincian_barang TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nota_awal_foto_url TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nota_awal_waktu_dicatat TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waktu_diterima TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waktu_mulai_jalan TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waktu_selesai TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS waktu_dibatalkan TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alasan_batal TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tarif_dasar NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tarif_per_km NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tarif_minimum NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tambahan_item NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS biaya_parkir_total NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS biaya_nota_total NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tambahan_tujuan NUMERIC DEFAULT 0;

-- 3. Lengkapi Tabel ORDER_STOPS (Fix detail belanja & parkir)
ALTER TABLE public.order_stops ADD COLUMN IF NOT EXISTS daftar_item JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.order_stops ADD COLUMN IF NOT EXISTS nota_nama_toko TEXT;
ALTER TABLE public.order_stops ADD COLUMN IF NOT EXISTS nota_total_toko NUMERIC DEFAULT 0;
ALTER TABLE public.order_stops ADD COLUMN IF NOT EXISTS nota_rincian_barang TEXT;
ALTER TABLE public.order_stops ADD COLUMN IF NOT EXISTS nota_foto_url TEXT;
ALTER TABLE public.order_stops ADD COLUMN IF NOT EXISTS nota_waktu_dicatat TIMESTAMPTZ;

-- 4. Lengkapi Tabel WALLET_TRANSACTIONS (Fix topup & tarik)
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS bukti_transfer TEXT;
ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS alasan_penolakan TEXT;

-- 5. Buat Tabel AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_admin UUID REFERENCES public.profiles(id),
    nama_admin TEXT,
    aksi TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Publik Audit" ON public.audit_logs;
CREATE POLICY "Akses Publik Audit" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 6. Buat Tabel Penyimpanan OTP (Anti-Refresh)
CREATE TABLE IF NOT EXISTS public.otps (
    phone_number TEXT PRIMARY KEY,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Akses Publik OTP" ON public.otps;
CREATE POLICY "Akses Publik OTP" ON public.otps FOR ALL USING (true) WITH CHECK (true);

-- 5. Perbarui Trigger Potong Saldo (Versi Dinamis Sesuai Pengaturan)
CREATE OR REPLACE FUNCTION public.process_completed_order()
RETURNS TRIGGER AS $$
DECLARE
  v_comm_rate NUMERIC;
  v_comm NUMERIC;
  v_cur_saldo NUMERIC;
BEGIN
  IF NEW.status = 'selesai' AND (OLD.status IS NULL OR OLD.status <> 'selesai') THEN
    -- Mengambil persentase yang tersimpan di pesanan (default 10% jika null)
    v_comm_rate := COALESCE(NEW.biaya_layanan_persen, 10.0) / 100.0;
    v_comm := ROUND(NEW.tarif_perjalanan_murni * v_comm_rate);

    UPDATE public.driver_details
    SET saldo_dompet = COALESCE(saldo_dompet, 0) - v_comm,
        jumlah_pesanan_selesai = COALESCE(jumlah_pesanan_selesai, 0) + 1
    WHERE id = NEW.id_sopir
    RETURNING saldo_dompet INTO v_cur_saldo;

    INSERT INTO public.wallet_transactions (id_sopir, jenis, jumlah, saldo_awal, saldo_akhir, deskripsi, status_tarik)
    VALUES (NEW.id_sopir, 'potongan_jasa', v_comm, v_cur_saldo + v_comm, v_cur_saldo,
            'Bagi hasil Ololu ' || (v_comm_rate * 100)::text || '% - Order #' || NEW.nomor_pesanan, 'disetujui');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_finished ON public.orders;
CREATE TRIGGER on_order_finished AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.process_completed_order();`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sqlSchema = `-- =========================================================================
-- SKEMA DATABASE SQL LENGKAP (VERSI FRESH START) - APLIKASI OLOLU LUMAJANG
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABEL: PROFIL
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    nomor_hp TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT 'ololu123',
    peran TEXT NOT NULL CHECK (peran IN ('penumpang', 'sopir', 'admin')),
    terverifikasi BOOLEAN DEFAULT FALSE,
    is_suspended BOOLEAN DEFAULT FALSE,
    is_sub_admin BOOLEAN DEFAULT FALSE,
    foto_profil TEXT,
    tempat_lahir TEXT,
    tanggal_lahir TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL: DETAIL SOPIR
CREATE TABLE public.driver_details (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    plat_nomor TEXT,
    jenis_motor TEXT,
    jenis_kendaraan TEXT DEFAULT 'motor',
    bisa_barang_besar BOOLEAN DEFAULT FALSE,
    disetujui_admin BOOLEAN DEFAULT FALSE,
    ditolak_admin BOOLEAN DEFAULT FALSE,
    status_online BOOLEAN DEFAULT FALSE,
    warna_kendaraan TEXT DEFAULT '',
    saldo_dompet NUMERIC DEFAULT 0,
    rating_rata_rata NUMERIC(2,1) DEFAULT 5.0,
    jumlah_pesanan_selesai INTEGER DEFAULT 0,
    lat_sekarang NUMERIC,
    lng_sekarang NUMERIC,
    foto_ktp TEXT,
    foto_sim TEXT,
    foto_stnk TEXT,
    foto_kendaraan TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: PESANAN (ORDERS)
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_pesanan TEXT UNIQUE NOT NULL,
    jenis_layanan TEXT NOT NULL,
    id_penumpang UUID REFERENCES public.profiles(id) NOT NULL,
    id_sopir UUID REFERENCES public.driver_details(id),
    asal_alamat TEXT NOT NULL,
    asal_lat NUMERIC NOT NULL,
    asal_lng NUMERIC NOT NULL,
    jarak_km NUMERIC NOT NULL,
    -- Rincian Tarif (Penting untuk Invoice)
    tarif_dasar NUMERIC DEFAULT 0,
    tarif_per_km NUMERIC DEFAULT 0,
    tarif_minimum NUMERIC DEFAULT 0,
    tarif_perjalanan_murni NUMERIC NOT NULL,
    -- Biaya Tambahan
    biaya_parkir_total NUMERIC DEFAULT 0,
    biaya_nota_total NUMERIC DEFAULT 0,
    tambahan_tujuan NUMERIC DEFAULT 0,
    tambahan_item NUMERIC DEFAULT 0,
    biaya_layanan_persen NUMERIC DEFAULT 10.0,
    -- Final
    total_bayar_akhir NUMERIC NOT NULL,
    pembayaran_tunai BOOLEAN DEFAULT TRUE,
    status TEXT DEFAULT 'mencari_sopir',
    tahap_aktif INTEGER DEFAULT 0,
    -- Items & Nota Awal
    items_awal JSONB DEFAULT '[]'::jsonb,
    nota_awal_nama_toko TEXT,
    nota_awal_total_toko NUMERIC DEFAULT 0,
    nota_awal_rincian_barang TEXT,
    nota_awal_foto_url TEXT,
    nota_awal_waktu_dicatat TIMESTAMPTZ,
    -- Timeline
    waktu_dibuat TIMESTAMPTZ DEFAULT NOW(),
    waktu_diterima TIMESTAMPTZ,
    waktu_mulai_jalan TIMESTAMPTZ,
    waktu_selesai TIMESTAMPTZ,
    waktu_dibatalkan TIMESTAMPTZ,
    alasan_batal TEXT
);

-- 4. TABEL: DETAIL STOP (ORDER_STOPS)
CREATE TABLE public.order_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    alamat TEXT NOT NULL,
    lat NUMERIC NOT NULL,
    lng NUMERIC NOT NULL,
    urutan INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    pilihan_parkir TEXT DEFAULT 'tidak_ada',
    daftar_item JSONB DEFAULT '[]'::jsonb,
    nota_nama_toko TEXT,
    nota_total_toko NUMERIC DEFAULT 0,
    nota_rincian_barang TEXT,
    nota_foto_url TEXT,
    nota_waktu_dicatat TIMESTAMPTZ
);

-- 5. TABEL: TRANSAKSI DOMPET
CREATE TABLE public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sopir UUID REFERENCES public.driver_details(id) ON DELETE CASCADE,
    jenis TEXT NOT NULL,
    jumlah NUMERIC NOT NULL,
    saldo_awal NUMERIC NOT NULL,
    saldo_akhir NUMERIC NOT NULL,
    deskripsi TEXT,
    bukti_transfer TEXT, -- Kolom baru untuk bukti pendaftaran/topup
    alasan_penolakan TEXT, -- Kolom baru untuk penolakan admin
    status_tarik TEXT DEFAULT 'disetujui',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL: BRANKAS OTP
CREATE TABLE public.otps (
    phone_number TEXT PRIMARY KEY,
    otp_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL: AUDIT LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_admin UUID REFERENCES public.profiles(id),
    nama_admin TEXT,
    aksi TEXT NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL: SYSTEM SETTINGS
CREATE TABLE public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- 8. DAFTARKAN ADMIN UTAMA (Ganti ID jika diperlukan)
INSERT INTO public.profiles (id, nama, nomor_hp, password, peran, terverifikasi)
VALUES ('00000000-0000-0000-0000-000000000000', 'ADMIN UTAMA', '6285156766317', '125758', 'admin', true)
ON CONFLICT (nomor_hp) DO NOTHING;

-- 9. KEAMANAN AKSES (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.driver_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.driver_details FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.orders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.order_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.order_stops FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.otps FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Akses Publik" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);
`;

  const edgeCode = `// =========================================================================
// SUPABASE EDGE FUNCTION - VERIFIKASI OTP WHATSAPP VIA FONNTE
// Deploy ke Supabase CLI: supabase functions deploy kirim-otp
// =========================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN") || "EMTbGPgY8zfmrVGs3idM";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { nomorHp, action } = await req.json()
    if (!nomorHp) return new Response(JSON.stringify({ error: 'Nomor HP wajib' }), { headers: corsHeaders, status: 400 })

    if (action === "kirim") {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { "Authorization": FONNTE_TOKEN },
        body: new URLSearchParams({
          "target": nomorHp,
          "message": \`[OLOLU OTP] Kode verifikasi: \${otp}\`,
          "countryCode": "62"
        })
      });
      const resData = await response.json();
      return new Response(JSON.stringify({ success: true, fonnteResponse: resData }), { headers: corsHeaders, status: 200 })
    }
    return new Response(JSON.stringify({ error: 'Aksi tidak dikenal' }), { headers: corsHeaders, status: 400 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 })
  }
})
`;

  return (
    <div id="supabase-guide" className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      
      {/* HEADER MANUAL */}
      <div className="bg-[#E6F4EC] p-6 border-b border-[#E5E7EB]">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-[#046A38] p-2 rounded-xl text-white">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#046A38] font-sans">
              Backend Production
            </h1>
            <p className="text-xs text-[#6B7280]">
              OLOLU Ojek & Pengantaran - Versi Fresh Start 1.6
            </p>
          </div>
        </div>
      </div>

      {/* SUB NAV TAB */}
      <div className="flex border-b border-[#E5E7EB] bg-white sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setActiveTab('panduan')}
          className={`flex-1 py-3 text-[10px] font-black uppercase text-center flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
            activeTab === 'panduan' ? 'border-[#046A38] text-[#046A38]' : 'border-transparent text-gray-400'
          }`}
        >
          <Cloud size={12} />
          <span>Panduan</span>
        </button>
        <button
          onClick={() => setActiveTab('sql')}
          className={`flex-1 py-3 text-[10px] font-black uppercase text-center flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
            activeTab === 'sql' ? 'border-[#046A38] text-[#046A38]' : 'border-transparent text-gray-400'
          }`}
        >
          <Shield size={12} />
          <span>Skema SQL</span>
        </button>
        <button
          onClick={() => setActiveTab('migrasi')}
          className={`flex-1 py-3 text-[10px] font-black uppercase text-center flex items-center justify-center space-x-1.5 border-b-2 transition-all ${
            activeTab === 'migrasi' ? 'border-[#B8941F] text-[#B8941F]' : 'border-transparent text-gray-400'
          }`}
        >
          <Plus size={12} />
          <span>Migrasi</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'migrasi' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
               <h3 className="text-xs font-black text-amber-800 uppercase flex items-center space-x-2">
                 <Shield size={16} /> <span>Perbaikan Patch SQL</span>
               </h3>
               <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                 Gunakan kode di bawah ini jika aplikasi mengeluh kolom tidak ditemukan atau butuh update fitur terbaru secara instan.
               </p>
             </div>

             <div className="bg-slate-900 rounded-2xl p-4 relative group">
                <button onClick={() => handleCopy(migrationSql, 'mig')} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">
                  {copied === 'mig' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
                <pre className="text-[9px] text-emerald-400 font-mono overflow-x-auto whitespace-pre leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                  {migrationSql}
                </pre>
             </div>
          </div>
        )}

        {activeTab === 'panduan' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-xs border-t-2 border-[#D4AF37]">
              <span className="bg-[#F5E6A8] text-[#B8941F] font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">Langkah 1</span>
              <h3 className="font-bold text-sm text-[#1A1A1A] mt-2 mb-1">Inisialisasi Database</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">Copy kode di tab <strong>Skema SQL</strong> dan Run di SQL Editor Supabase untuk membangun ulang pondasi aplikasi yang bersih.</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-xs border-t-2 border-[#D4AF37]">
              <span className="bg-[#F5E6A8] text-[#B8941F] font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">Langkah 2</span>
              <h3 className="font-bold text-sm text-[#1A1A1A] mt-2 mb-1">Kredensial Admin</h3>
              <p className="text-xs text-[#6B7280] leading-relaxed">Setelah SQL sukses, Anda bisa langsung Login Admin dengan: <br/><strong>HP: 6285156766317</strong><br/><strong>Pass: 125758</strong></p>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-[#E6F4EC] p-3 rounded-xl border border-[#E5E7EB]">
              <span className="text-[10px] font-black text-[#046A38] uppercase">Full Master Schema</span>
              <button onClick={() => handleCopy(sqlSchema, 'sql')} className="flex items-center space-x-1 text-[10px] bg-[#046A38] text-white px-3 py-1.5 rounded-lg hover:bg-[#034F2A] transition-all font-black uppercase">
                {copied === 'sql' ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied === 'sql' ? 'Disalin' : 'Salin SQL'}</span>
              </button>
            </div>
            <pre className="bg-gray-900 text-emerald-400 p-3 rounded-xl text-[9px] overflow-x-auto font-mono max-h-[400px] leading-normal whitespace-pre">
              {sqlSchema}
            </pre>
          </div>
        )}

        {activeTab === 'edge' && (
          <div className="space-y-3">
             <div className="bg-white p-4 rounded-xl shadow-xs border-t-2 border-emerald-500">
                <h3 className="font-bold text-sm">Edge Function Code</h3>
                <p className="text-xs text-gray-500 mt-1">Gunakan ini untuk pengiriman OTP WhatsApp yang 100% aman.</p>
             </div>
             <pre className="bg-gray-900 text-emerald-400 p-3 rounded-xl text-[9px] overflow-x-auto font-mono max-h-96 whitespace-pre">
               {edgeCode}
             </pre>
          </div>
        )}
      </div>

    </div>
  );
}
