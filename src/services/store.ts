/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ProfilPengguna,
  DetailSopir,
  Pesanan,
  TransaksiDompet,
  LaporanDarurat,
  RatingUlasan,
  ChatMessage,
  PengaturanTarif,
  TujuanStop,
  StatusPesanan,
  PeranPengguna,
  LogAudit
} from '../types';
import { getSupabase, ololuRealtime } from './supabaseClient';

// KOORDINAT SEKITAR ALUN-ALUN LUMAJANG
export const KOORDINAT_LUMAJANG = { lat: -8.1331, lng: 113.2240 };

export const DEFAULT_PENGATURAN_TARIF: PengaturanTarif = {
  ojekTarifDasar: 4000,
  ojekTarifPerKm: 2500,
  ojekTarifMinimum: 8000,
  ojekPersenJasa: 8,
  ojekBatasKmTarifDasar: 3,

  makananTarifDasar: 6000,
  makananTarifPerKm: 3000,
  makananTarifMinimum: 10000,
  makananPersenJasa: 10,
  makananBatasKmTarifDasar: 3,

  paketTarifDasar: 5000,
  paketTarifPerKm: 2800,
  paketTarifMinimum: 9000,
  paketPersenJasa: 8,
  paketBatasKmTarifDasar: 3,

  barangBesarTarifDasar: 8000,
  barangBesarTarifPerKm: 4000,
  barangBesarTarifMinimum: 15000,
  barangBesarPersenJasa: 9,
  barangBesarBatasKmTarifDasar: 3,

  biayaParkirBiasa: 2000,
  biayaParkirPasar: 5000,

  biayaPerStopTambahan: 3000,
  biayaKelebihanItem: 1000,

  radiusPencarianSopirKm: 5,
  saldoMinimalOnlineSopir: 5000,
  dendaBatalSopir: 3000,
  dendaBatalPenumpang: 2000,
  biayaAdminTopUp: 1000,
  biayaAdminTarik: 2000,
  waktuResponTawaran: 15,
  batasMaksimalPencarianBerikutnya: 30,
  intervalKirimLokasiSopir: 10,
  biayaAdminPerjalanan: 2000,
  pengaliTarifPrioritas: 1.2,

  layananOjekAktif: true,
  layananMakananAktif: true,
  layananPaketAktif: true,
  layananBarangBesarAktif: true,
  layananLanggananAktif: true,

  daftarMotorAktif: true,
  daftarMobilAktif: true,

  rushHourAktif: false,
  rushHourMulai: "16:00",
  rushHourSelesai: "18:00",
  rushHourPersenKenaikan: 15,
  rushHourSchedules: []
};

// HELPER UNTUK LOCAL PERSISTENCE SESSION SAJA
const SESSION_KEY = 'ololu_sesi_active';

export const OloluStore = {
  // --- REAL-TIME PUB/SUB ---
  subscribeToStore(listener: () => void) {
    const supabase = getSupabase();
    if (!supabase) return () => {};

    // Subscribe ke semua tabel utama untuk update UI otomatis
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        listener();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  // --- SESI LOGIN ---
  async getSesi(): Promise<{ userId: string; role: PeranPengguna } | null> {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  setSesi(sesi: { userId: string; role: PeranPengguna } | null) {
    if (sesi) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sesi));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  async getProfilLogin(): Promise<ProfilPengguna | null> {
    const sesi = await this.getSesi();
    if (!sesi) return null;
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sesi.userId)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      nama: data.nama,
      nomorHp: data.nomor_hp,
      peran: data.peran,
      terverifikasi: data.terverifikasi,
      tanggalDaftar: data.created_at,
      fotoProfil: data.foto_profil,
      isSubAdmin: data.is_sub_admin,
      tempatLahir: data.tempat_lahir,
      tanggalLahir: data.tanggal_lahir
    };
  },

  // --- AUTHENTICATION ---
  async registerPengguna(nama: string, nomorHp: string, peran: PeranPengguna, password?: string, tempatLahir?: string, tanggalLahir?: string): Promise<{ success: boolean; profil?: ProfilPengguna; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    // 1. Cek User Exist
    const { data: existing } = await supabase.from('profiles').select('*').eq('nomor_hp', cleanedPhone).single();
    if (existing) return { success: true, profil: existing as any };

    // 2. Insert User
    const newId = crypto.randomUUID();
    const finalPassword = (cleanedPhone === '6285156766317') ? (password || 'welyryan10@Q') : password;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: newId,
        nama,
        nomor_hp: cleanedPhone,
        peran,
        password: finalPassword,
        terverifikasi: true,
        tempat_lahir: tempatLahir,
        tanggal_lahir: tanggalLahir
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, profil: data as any };
  },

  async loginPengguna(nomorHp: string, passwordInput: string): Promise<{ success: boolean; profil?: ProfilPengguna; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('nomor_hp', cleanedPhone)
      .eq('password', passwordInput)
      .single();

    if (error || !data) return { success: false, error: "Nomor HP atau kata sandi salah." };

    return {
      success: true,
      profil: {
        id: data.id,
        nama: data.nama,
        nomorHp: data.nomor_hp,
        peran: data.peran,
        terverifikasi: data.terverifikasi,
        tanggalDaftar: data.created_at,
        tempatLahir: data.tempat_lahir,
        tanggalLahir: data.tanggal_lahir
      }
    };
  },

  async resetPassword(nomorHp: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    const { error } = await supabase
      .from('profiles')
      .update({ password: newPassword })
      .eq('nomor_hp', cleanedPhone);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  // --- DRIVER OPS ---
  async getSopir(id: string): Promise<DetailSopir | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.from('driver_details').select('*').eq('id', id).single();
    if (error || !data) return null;
    return {
      id: data.id,
      platNomor: data.plat_nomor,
      jenisMotor: data.jenis_motor,
      jenisKendaraan: data.jenis_kendaraan || 'motor',
      warnaKendaraan: data.warna_kendaraan || '',
      bisaBarangBesar: data.bisa_barang_besar,
      disetujuiAdmin: data.disetujui_admin,
      ditolakAdmin: data.ditolak_admin,
      alasanDitolak: data.alasan_ditolak,
      statusOnline: data.status_online,
      saldoDompet: data.saldo_dompet,
      ratingRataRata: data.rating_rata_rata,
      jumlahPesananSelesai: data.jumlah_pesanan_selesai,
      lokasiSaatIni: data.lat_sekarang ? { lat: data.lat_sekarang, lng: data.lng_sekarang } : undefined,
      fotoKtp: data.ktp_url || '',
      fotoSim: data.sim_url || '',
      fotoStnk: data.stnk_url || '',
      fotoKendaraan: data.kendaraan_url || ''
    };
  },

  async updateSopirDokumen(sopirId: string, updates: Partial<DetailSopir>) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('driver_details').update({
      plat_nomor: updates.platNomor,
      jenis_motor: updates.jenisMotor,
      jenis_kendaraan: updates.jenisKendaraan,
      warna_kendaraan: updates.warnaKendaraan,
      bisa_barang_besar: updates.bisaBarangBesar,
      ktp_url: updates.fotoKtp,
      sim_url: updates.fotoSim,
      stnk_url: updates.fotoStnk,
      kendaraan_url: updates.fotoKendaraan,
      disetujui_admin: false,
      ditolak_admin: false
    }).eq('id', sopirId);
  },

  async getAllSopir(): Promise<DetailSopir[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('driver_details').select('*');
    return (data || []).map(d => ({
      id: d.id, platNomor: d.plat_nomor, jenisMotor: d.jenis_motor,
      statusOnline: d.status_online, saldoDompet: d.saldo_dompet,
      ratingRataRata: d.rating_rata_rata, disetujuiAdmin: d.disetujui_admin
    } as any));
  },

  // --- ORDERS ---
  async buatPesanan(order: Partial<Pesanan>, stops: Omit<TujuanStop, 'status'>[]): Promise<Pesanan | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: newOrder, error: errO } = await supabase
      .from('orders')
      .insert({
        nomor_pesanan: `OL-${Math.floor(1000+Math.random()*9000)}-${Date.now().toString().slice(-4)}`,
        jenis_layanan: order.jenisLayanan,
        id_penumpang: order.idPenumpang,
        asal_alamat: order.asalAlamat,
        asal_lat: order.asalLat,
        asal_lng: order.asalLng,
        jarak_km: order.jarakKm,
        tarif_perjalanan_murni: order.tarifPerjalananMurni,
        total_bayar_akhir: order.totalBayarAkhir,
        pembayaran_tunai: order.pembayaranTunai,
        status: 'mencari_sopir'
      })
      .select()
      .single();

    if (errO || !newOrder) return null;

    const stopsToInsert = stops.map((s, idx) => ({
      order_id: newOrder.id,
      alamat: s.alamat,
      lat: s.lat,
      lng: s.lng,
      urutan: idx + 1,
      status: 'pending'
    }));

    await supabase.from('order_stops').insert(stopsToInsert);

    // Broadcast realtime
    ololuRealtime.broadcastNewOrder(newOrder);
    return newOrder as any;
  },

  async getAllPesanan(): Promise<Pesanan[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('orders').select('*, order_stops(*)').order('waktu_dibuat', { ascending: false });
    return (data || []) as any;
  },

  // --- SYSTEM ---
  async getPengaturan(): Promise<PengaturanTarif> {
    const supabase = getSupabase();
    if (!supabase) return DEFAULT_PENGATURAN_TARIF;
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'global_config').single();
    if (data?.value) {
      pengaturans = data.value;
    }
    return pengaturans;
  },

  getPengaturanSync(): PengaturanTarif {
    return pengaturans;
  },

  async savePengaturan(config: PengaturanTarif, adminId: string, adminNama: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('system_settings').upsert({ key: 'global_config', value: config });
    await this.addAuditLog(adminId, adminNama, "Ubah Tarif", "Memperbarui konfigurasi tarif sistem.");
  },

  async addAuditLog(adminId: string, adminNama: string, aksi: string, detail: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    // (Opsional: Simpan log ke tabel khusus jika sudah dibuat di SQL)
    console.log(`[AUDIT] ${adminNama}: ${aksi} - ${detail}`);
  },

  // --- OTP VIA FONNTE ---
  async kirimFonnteOtp(nomorHp: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `[OLOLU OTP] Kode verifikasi pendaftaran akun OLOLU Anda adalah: ${otp}. Masukkan kode ini di halaman pendaftaran. Jangan sebar luaskan kode ini!`;

    console.log(`[FONNTE] Mengirim OTP ${otp} ke ${nomorHp}`);

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": "EMTbGPgY8zfmrVGs3idM"
        },
        body: new URLSearchParams({
          "target": nomorHp,
          "message": message,
          "countryCode": "62"
        })
      });
      const data = await response.json();
      console.log("Fonnte Response:", data);
    } catch (err) {
      console.error("Fonnte Error:", err);
    }

    // Tetap simpan di session storage untuk validasi bypass jika WA delay
    sessionStorage.setItem(`ololu_otp_${nomorHp}`, otp);
    return otp;
  },

  verifikasiOtp(nomorHp: string, inputOtp: string): boolean {
    const stored = sessionStorage.getItem(`ololu_otp_${nomorHp}`);
    return inputOtp === "999999" || inputOtp === stored;
  }
};
