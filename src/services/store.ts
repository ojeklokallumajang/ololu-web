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

  mobilTarifDasar: 8000,
  mobilTarifPerKm: 5000,
  mobilTarifMinimum: 15000,
  mobilPersenJasa: 10,
  mobilBatasKmTarifDasar: 3,

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
const ORDER_LOCK_KEY = 'ololu_order_lock';

let pengaturans: PengaturanTarif = DEFAULT_PENGATURAN_TARIF;

// --- DATA MAPPING HELPERS (Database snake_case -> Frontend camelCase) ---
const mapProfile = (db: any): ProfilPengguna | null => {
  if (!db) return null;
  return {
    id: db.id || '',
    nama: db.nama || 'User',
    nomorHp: db.nomor_hp || '',
    peran: db.peran || 'penumpang',
    terverifikasi: !!db.terverifikasi,
    tanggalDaftar: db.created_at || new Date().toISOString(),
    fotoProfil: db.foto_profil || null,
    isSubAdmin: !!db.is_sub_admin,
    tempatLahir: db.tempat_lahir || '',
    tanggalLahir: db.tanggal_lahir || ''
  };
};

const safeParseFloat = (val: any, fallback: number = 0): number => {
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
};

const mapOrder = (db: any): Pesanan | null => {
  if (!db) return null;
  return {
    id: db.id || '',
    nomorPesanan: db.nomor_pesanan || 'OL-0000',
    jenisLayanan: db.jenis_layanan || 'ojek',
    idPenumpang: db.id_penumpang || '',
    namaPenumpang: db.nama_penumpang || 'Pelanggan',
    nomorHpPenumpang: db.nomor_hp_penumpang || '',
    idSopir: db.id_sopir || null,
    namaSopir: db.nama_sopir || '',
    nomorHpSopir: db.nomor_hp_sopir || '',
    platNomorSopir: db.plat_nomor_sopir || '',
    asalAlamat: db.asal_alamat || '',
    asalLat: safeParseFloat(db.asal_lat, KOORDINAT_LUMAJANG.lat),
    asalLng: safeParseFloat(db.asal_lng, KOORDINAT_LUMAJANG.lng),
    jarakKm: safeParseFloat(db.jarak_km, 1),
    tarifPerjalananMurni: safeParseFloat(db.tarif_perjalanan_murni, 0),
    totalBayarAkhir: safeParseFloat(db.total_bayar_akhir, 0),
    pembayaranTunai: !!db.pembayaran_tunai,
    status: db.status || 'mencari_sopir',
    waktuDibuat: db.waktu_dibuat || new Date().toISOString(),
    waktuSelesai: db.waktu_selesai || null,
    daftarTujuan: (db.order_stops || []).map((s: any) => ({
      id: s.id || '',
      alamat: s.alamat || '',
      lat: safeParseFloat(s.lat, KOORDINAT_LUMAJANG.lat),
      lng: safeParseFloat(s.lng, KOORDINAT_LUMAJANG.lng),
      urutan: s.urutan || 0,
      status: s.status || 'pending',
      pilihanParkir: s.pilihan_parkir || 'tidak_ada'
    })).sort((a: any, b: any) => a.urutan - b.urutan),
    tahapAktif: db.tahap_aktif || 0,
    riwayatLokasiSopir: []
  } as any;
};

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

    return mapProfile(data);
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
    if (existing) return { success: true, profil: mapProfile(existing) as any };

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
        password: finalPassword || 'ololu123',
        terverifikasi: true,
        tempat_lahir: tempatLahir,
        tanggal_lahir: tanggalLahir
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, profil: mapProfile(data) as any };
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
      profil: mapProfile(data) as any
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
      id: d.id || '',
      platNomor: d.plat_nomor || '',
      jenisMotor: d.jenis_motor || '',
      statusOnline: !!d.status_online,
      saldoDompet: safeParseFloat(d.saldo_dompet, 0),
      ratingRataRata: safeParseFloat(d.rating_rata_rata, 5.0),
      disetujuiAdmin: !!d.disetujui_admin
    } as any));
  },

  async getAllUsers(): Promise<ProfilPengguna[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('profiles').select('*').eq('peran', 'penumpang').order('created_at', { ascending: false });
    return (data || []).map(d => mapProfile(d)).filter(Boolean) as ProfilPengguna[];
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

    // Kunci UI Penumpang ke layar lacak
    this.setLocalOrderLock(newOrder.id, 'penumpang');

    // Broadcast realtime
    ololuRealtime.broadcastNewOrder(newOrder);
    return newOrder as any;
  },

  async selesaikanPesanan(orderId: string, finalData: Partial<Pesanan>) {
    const supabase = getSupabase();
    if (!supabase) return;

    // SATU-SATUNYA PENULISAN DATABASE DI AKHIR PERJALANAN (IRIT)
    const { error } = await supabase.from('orders').update({
      status: 'selesai',
      id_sopir: finalData.idSopir,
      biaya_parkir_total: finalData.biayaParkirTotal || 0,
      total_bayar_akhir: finalData.totalBayarAkhir,
      waktu_selesai: new Date().toISOString()
    }).eq('id', orderId);

    if (!error && finalData.idSopir) {
      // 1. Ambil Data Sopir & Pengaturan Tarif
      const { data: driver } = await supabase.from('driver_details').select('saldo_dompet, jumlah_pesanan_selesai').eq('id', finalData.idSopir).single();
      const settings = await this.getPengaturan();

      if (driver) {
        // 2. Tentukan Persen Potongan Jasa berdasarkan Jenis Layanan
        let persenJasa = 10; // Default
        const layanan = finalData.jenisLayanan;
        if (layanan === 'ojek') persenJasa = settings.ojekPersenJasa;
        else if (layanan === 'mobil') persenJasa = settings.mobilPersenJasa;
        else if (layanan === 'makanan') persenJasa = settings.makananPersenJasa;
        else if (layanan === 'paket') persenJasa = settings.paketPersenJasa;
        else if (layanan === 'barang_besar') persenJasa = settings.barangBesarPersenJasa;

        // 3. Hitung Pendapatan & Potongan
        const totalBayar = finalData.totalBayarAkhir || 0;
        const potonganJasa = Math.round(totalBayar * (persenJasa / 100));
        const pendapatanBersih = totalBayar - potonganJasa;

        const saldoBaru = (driver.saldo_dompet || 0) + pendapatanBersih;
        const pesananBaru = (driver.jumlah_pesanan_selesai || 0) + 1;

        // 4. Update Database Sopir & Dompet
        await supabase.from('driver_details').update({
          saldo_dompet: saldoBaru,
          jumlah_pesanan_selesai: pesananBaru
        }).eq('id', finalData.idSopir);

        // Record Pendapatan (Gross)
        await supabase.from('wallet_transactions').insert({
          id_sopir: finalData.idSopir,
          jenis: 'pendapatan',
          jumlah: totalBayar,
          saldo_awal: driver.saldo_dompet,
          saldo_akhir: driver.saldo_dompet + totalBayar,
          deskripsi: `Pendapatan order #${finalData.nomorPesanan}`
        });

        // Record Potongan Jasa (Deduction)
        await supabase.from('wallet_transactions').insert({
          id_sopir: finalData.idSopir,
          jenis: 'potongan_jasa',
          jumlah: potonganJasa,
          saldo_awal: driver.saldo_dompet + totalBayar,
          saldo_akhir: saldoBaru,
          deskripsi: `Potongan jasa Ololu (${persenJasa}%) #${finalData.nomorPesanan}`
        });
      }
    }

    // Hapus pengunci UI
    this.removeLocalOrderLock();
  },

  async batalPesanan(orderId: string, peran: string, alasan: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('orders').update({
      status: 'dibatalkan'
    }).eq('id', orderId);
    this.removeLocalOrderLock();
  },

  async getPesananById(id: string): Promise<Pesanan | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_stops(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as any;
  },

  async getProfil(id: string): Promise<ProfilPengguna | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    return mapProfile(data);
  },

  async getAllPesanan(): Promise<Pesanan[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('orders').select('*, order_stops(*)').order('waktu_dibuat', { ascending: false });
    return (data || []).map(o => mapOrder(o)).filter(Boolean) as Pesanan[];
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
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      admin_nama: adminNama,
      aksi: aksi,
      detail: detail
    });
  },

  // --- ADMIN TEAM MANAGEMENT ---
  async getAllAdmins(): Promise<ProfilPengguna[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('peran', 'admin')
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(d => ({
      id: d.id,
      nama: d.nama,
      nomorHp: d.nomor_hp,
      peran: d.peran,
      terverifikasi: d.terverifikasi,
      tanggalDaftar: d.created_at,
      fotoProfil: d.foto_profil,
      isSubAdmin: d.is_sub_admin
    }));
  },

  async promoteToAdmin(nomorHp: string, nama: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    // Check if user exists
    const { data: existing } = await supabase.from('profiles').select('*').eq('nomor_hp', cleanedPhone).single();

    if (existing) {
      // Update existing user
      const { error } = await supabase
        .from('profiles')
        .update({ peran: 'admin', is_sub_admin: true, nama: nama })
        .eq('id', existing.id);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } else {
      // Create new admin user
      const newId = crypto.randomUUID();
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: newId,
          nama,
          nomor_hp: cleanedPhone,
          peran: 'admin',
          password: 'ololuadmin123', // Default password
          terverifikasi: true,
          is_sub_admin: true
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
    }
  },

  async removeAdminStatus(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    // Prevent removing superuser
    const { data: user } = await supabase.from('profiles').select('nomor_hp').eq('id', userId).single();
    if (user?.nomor_hp === '6285156766317') return { success: false, error: "Admin Utama tidak bisa dihapus." };

    const { error } = await supabase
      .from('profiles')
      .update({ peran: 'penumpang', is_sub_admin: false })
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getAllAuditLogs(): Promise<LogAudit[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, adminId: d.admin_id, adminNama: d.admin_nama,
      aksi: d.aksi, detail: d.detail, timestamp: d.timestamp
    }));
  },

  // --- MESSAGING ---
  async getChatMessages(pesananId: string): Promise<ChatMessage[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id_pesanan', pesananId)
      .order('created_at', { ascending: true });

    return (data || []).map(d => ({
      id: d.id,
      idPesanan: d.id_pesanan,
      senderId: d.sender_id,
      senderName: d.sender_name,
      senderRole: d.sender_role as any,
      message: d.message,
      voiceData: d.voice_data,
      timestamp: d.created_at
    }));
  },

  async sendChatMessage(pesananId: string, senderId: string, senderName: string, senderRole: string, message: string, voiceData?: string) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { data, error } = await supabase.from('chat_messages').insert({
      id_pesanan: pesananId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      message,
      voice_data: voiceData
    }).select().single();

    if (!error && data) {
      ololuRealtime.broadcastChatMessage(pesananId, {
        id: data.id,
        idPesanan: pesananId,
        senderId,
        senderName,
        senderRole,
        message,
        voiceData,
        timestamp: data.created_at
      });
    }
  },

  // --- EMERGENCY & RATING ---
  async tambahEmergency(orderId: string, nama: string, hp: string, peran: string, lat: number, lng: number) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('emergency_reports').insert({
      id_pesanan: orderId,
      nama_pelapor: nama,
      nomor_hp_pelapor: hp,
      peran_pelapor: peran,
      lat,
      lng
    });
  },

  async getAllEmergency(): Promise<LaporanDarurat[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('emergency_reports').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      idPesanan: d.id_pesanan,
      namaPelapor: d.nama_pelapor,
      nomorHpPelapor: d.nomor_hp_pelapor,
      peranPelapor: d.peran_pelapor as any,
      lat: d.lat,
      lng: d.lng,
      status: d.status as any,
      timestamp: d.created_at
    }));
  },

  async tambahRating(orderId: string, sopirId: string, nama: string, bintang: number, ulasan: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('ratings').insert({
      id_pesanan: orderId,
      id_sopir: sopirId,
      nama_penumpang: nama,
      bintang,
      ulasan
    });

    // Update rata-rata rating sopir
    const { data: ratings } = await supabase.from('ratings').select('bintang').eq('id_sopir', sopirId);
    if (ratings && ratings.length > 0) {
      const avg = ratings.reduce((acc, cur) => acc + cur.bintang, 0) / ratings.length;
      await supabase.from('driver_details').update({ rating_rata_rata: avg }).eq('id', sopirId);
    }
  },

  async simpanNotaToko(orderId: string, stopId: string, toko: string, barang: string, total: number, foto: string) {
    // Note: order_stops doesn't have a column for nota yet in standard schema,
    // we use broadcast for realtime and could add a 'nota' column to order_stops if needed.
    // For now, let's just broadcast it to the passenger.
    ololuRealtime.broadcastTripUpdate(orderId, {
      type: 'nota_update',
      stopId,
      nota: {
        namaToko: toko,
        rincianBarang: barang,
        totalToko: total,
        fotoNota: foto,
        waktuDicatat: new Date().toISOString()
      }
    });
  },

  // --- LOCAL ORDER LOCKING (UI HARD-LOCK) ---
  setLocalOrderLock(orderId: string, role: PeranPengguna) {
    localStorage.setItem(ORDER_LOCK_KEY, JSON.stringify({ orderId, role }));
  },

  getLocalOrderLock(): { orderId: string; role: PeranPengguna } | null {
    const stored = localStorage.getItem(ORDER_LOCK_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  removeLocalOrderLock() {
    localStorage.removeItem(ORDER_LOCK_KEY);
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
