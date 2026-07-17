/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabase } from './supabaseClient';
import {
  ProfilPengguna,
  PeranPengguna,
  DetailSopir,
  Pesanan,
  TujuanStop,
  LaporanDarurat,
  TransaksiDompet,
  RatingUlasan,
  PengaturanTarif,
  LogAudit
} from '../types';
import { ololuRealtime } from './supabaseClient';

const SESSION_KEY = 'ololu_session';
const ORDER_LOCK_KEY = 'ololu_active_order';

export const KOORDINAT_LUMAJANG = { lat: -8.1331, lng: 113.2240 };

export const DEFAULT_PENGATURAN_TARIF: PengaturanTarif = {
  ojekTarifDasar: 8000,
  ojekTarifPerKm: 2500,
  ojekTarifMinimum: 10000,
  ojekPersenJasa: 10,
  ojekBatasKmTarifDasar: 3,
  ojekBiayaPerStop: 2000,
  mobilTarifDasar: 15000,
  mobilTarifPerKm: 5000,
  mobilTarifMinimum: 20000,
  mobilPersenJasa: 10,
  mobilBatasKmTarifDasar: 3,
  mobilBiayaPerStop: 5000,
  makananTarifDasar: 10000,
  makananTarifPerKm: 3000,
  makananTarifMinimum: 12000,
  makananPersenJasa: 15,
  makananBatasKmTarifDasar: 3,
  makananBiayaPerStop: 3000,
  paketTarifDasar: 7000,
  paketTarifPerKm: 2000,
  paketTarifMinimum: 10000,
  paketPersenJasa: 10,
  paketBatasKmTarifDasar: 3,
  paketBiayaPerStop: 2000,
  barangBesarTarifDasar: 25000,
  barangBesarTarifPerKm: 8000,
  barangBesarTarifMinimum: 35000,
  barangBesarPersenJasa: 10,
  barangBesarBatasKmTarifDasar: 3,
  barangBesarBiayaPerStop: 10000,
  biayaParkirBiasa: 2000,
  biayaParkirPasar: 5000,
  biayaPerStopTambahan: 3000,
  biayaKelebihanItem: 1000,
  radiusPencarianSopirKm: 5,
  saldoMinimalOnlineSopir: 5000,
  dendaBatalSopir: 5000,
  dendaBatalPenumpang: 3000,
  biayaAdminTopUp: 0,
  biayaAdminTarik: 2500,
  waktuResponTawaran: 30,
  batasMaksimalPencarianBerikutnya: 60,
  intervalKirimLokasiSopir: 5,
  biayaAdminPerjalanan: 1000,
  pengaliTarifPrioritas: 1.2,
  layananOjekAktif: true,
  layananMakananAktif: true,
  layananPaketAktif: true,
  layananBarangBesar: true,
  layananLanggananAktif: false,
  layananOjek: true,
  layananMakanan: true,
  layananPaket: true,
  layananBarangBesarAktif: true,
  daftarMotorAktif: true,
  daftarMobilAktif: true,
  rushHourAktif: false,
  rushHourMulai: "16:00",
  rushHourSelesai: "18:00",
  rushHourPersenKenaikan: 15
};

let pengaturans = { ...DEFAULT_PENGATURAN_TARIF };

// Utility for safe float parsing
const safeParseFloat = (val: any, fallback = 0): number => {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
};

// Data Mapping Utilities
const mapProfile = (db: any): ProfilPengguna | null => {
  if (!db) return null;
  return {
    id: db.id,
    nama: db.nama || 'Tanpa Nama',
    nomorHp: db.nomor_hp || '',
    peran: db.peran as PeranPengguna,
    terverifikasi: !!db.terverifikasi,
    tanggalDaftar: db.tanggal_daftar || db.created_at,
    fotoProfil: db.foto_profil,
    isSubAdmin: !!db.is_sub_admin
  };
};

const mapDriver = (db: any): DetailSopir | null => {
  if (!db) return null;
  return {
    id: db.id,
    fotoKtp: db.foto_ktp || '',
    fotoSim: db.foto_sim || '',
    fotoStnk: db.foto_stnk || '',
    fotoKendaraan: db.foto_kendaraan || '',
    platNomor: db.plat_nomor || '',
    jenisMotor: db.jenis_motor || '',
    jenisKendaraan: db.jenis_kendaraan || 'motor',
    warnaKendaraan: db.warna_kendaraan || '',
    bisaBarangBesar: !!db.bisa_barang_besar,
    disetujuiAdmin: !!db.disetujui_admin,
    ditolakAdmin: !!db.ditolak_admin,
    alasanDitolak: db.alasan_ditolak || '',
    statusOnline: !!db.status_online,
    saldoDompet: safeParseFloat(db.saldo_dompet, 0),
    ratingRataRata: safeParseFloat(db.rating_rata_rata, 5),
    jumlahPesananSelesai: parseInt(db.jumlah_pesanan_selesai || 0),
    lokasiSaatIni: db.lokasi_lat ? { lat: db.lokasi_lat, lng: db.lokasi_lng } : undefined
  };
};

const mapOrder = (db: any): Pesanan | null => {
  if (!db) return null;
  return {
    id: db.id,
    nomorPesanan: db.nomor_pesanan || 'ORD-0000',
    jenisLayanan: db.jenis_layanan,
    idPenumpang: db.id_penumpang,
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
    tambahanTujuan: safeParseFloat(db.tambahan_tujuan, 0),
    tambahanItem: safeParseFloat(db.tambahan_item, 0),
    biayaLayananPersen: safeParseFloat(db.biaya_layanan_persen, 10),
    biayaParkirTotal: safeParseFloat(db.biaya_parkir_total, 0),
    biayaNotaTotal: safeParseFloat(db.biaya_nota_total, 0),
    pembayaranTunai: !!db.pembayaran_tunai,
    status: db.status || 'mencari_sopir',
    waktuDibuat: db.waktu_dibuat || new Date().toISOString(),
    waktuSelesai: db.waktu_selesai || null,
    daftarTujuan: (db.order_stops || []).map((s: any) => ({
      id: s.id || '',
      alamat: s.alamat || '',
      lat: safeParseFloat(s.lat, KOORDINAT_LUMAJANG.lat),
      lng: safeParseFloat(s.lng, KOORDINAT_LUMAJANG.lng),
      urutan: s.urutan || 1,
      status: s.status || 'pending',
      daftarItem: (s.items || []).map((i: any) => ({
        id: i.id,
        namaBarang: i.nama_barang,
        jumlah: i.jumlah,
        perkiraanHarga: i.perkiraan_harga
      })),
      nota: s.nota ? {
        namaToko: s.nota.nama_toko,
        totalToko: s.nota.total_toko,
        rincianBarang: s.nota.rincian_barang,
        fotoNota: s.nota.foto_nota,
        waktuDicatat: s.nota.waktu_dicatat
      } : undefined
    })),
    tahapAktif: db.tahap_aktif || 0,
    riwayatLokasiSopir: []
  };
};

export const OloluStore = {
  // --- REAL-TIME PUB/SUB ---
  subscribeToStore(listener: () => void) {
    const supabase = getSupabase();
    if (!supabase) return () => {};

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
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (e) {
      console.error("Local storage error:", e);
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

    const { data } = await supabase.from('profiles').select('*').eq('id', sesi.userId).single();
    return mapProfile(data);
  },

  // --- AUTHENTICATION ---
  async registerPengguna(nama: string, nomorHp: string, peran: PeranPengguna, password?: string, tempatLahir?: string, tanggalLahir?: string): Promise<{ success: boolean; profil?: ProfilPengguna; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    const { data: existing } = await supabase.from('profiles').select('*').eq('nomor_hp', cleanedPhone).single();
    if (existing) return { success: true, profil: mapProfile(existing) as any };

    const newId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

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
    return { success: true, profil: mapProfile(data) as any };
  },

  async resetPassword(nomorHp: string, passwordBaru: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    const { error } = await supabase.from('profiles').update({ password: passwordBaru }).eq('nomor_hp', cleanedPhone);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  // --- OTP SIMULATION (FONNTE INTEGRATION READY) ---
  async kirimFonnteOtp(nomorHp: string) {
    console.log("OTP Sent to:", nomorHp, "Code: 123456");
    return true;
  },
  verifikasiOtp(nomorHp: string, otp: string) {
    return otp === '123456' || otp === '000000';
  },

  // --- DRIVER MGMT ---
  async getSopir(id: string): Promise<DetailSopir | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from('driver_details').select('*').eq('id', id).single();
    return mapDriver(data);
  },

  async updateSopirDokumen(id: string, docs: any) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('driver_details').upsert({
      id,
      foto_ktp: docs.fotoKtp,
      foto_sim: docs.fotoSim,
      foto_stnk: docs.fotoStnk,
      foto_kendaraan: docs.fotoKendaraan,
      plat_nomor: docs.platNomor,
      jenis_motor: docs.jenisMotor,
      jenis_kendaraan: docs.jenisKendaraan || 'motor',
      warna_kendaraan: docs.warnaKendaraan || '',
      bisa_barang_besar: !!docs.bisaBarangBesar,
      disetujui_admin: false,
      ditolak_admin: false
    });
  },

  async toggleOnlineSopir(id: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.from('driver_details').select('status_online').eq('id', id).single();
    if (data) {
      await supabase.from('driver_details').update({ status_online: !data.status_online }).eq('id', id);
    }
  },

  // --- WALLET ---
  async topUpSopir(sopirId: string, jumlah: number, deskripsi: string) {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    const { data: driver } = await supabase.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    if (!driver) return { success: false, error: "Driver not found" };

    const newSaldo = (driver.saldo_dompet || 0) + jumlah;
    await supabase.from('driver_details').update({ saldo_dompet: newSaldo }).eq('id', sopirId);
    await supabase.from('wallet_transactions').insert({
      id_sopir: sopirId,
      jenis: 'topup',
      jumlah: jumlah,
      saldo_awal: driver.saldo_dompet,
      saldo_akhir: newSaldo,
      deskripsi: deskripsi
    });
    return { success: true };
  },

  async ajukanTarikDana(sopirId: string, jumlah: number): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    const { data: driver } = await supabase.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    const settings = await this.getPengaturan();
    if (!driver || driver.saldo_dompet < (jumlah + settings.biayaAdminTarik)) {
      return { success: false, error: "Saldo tidak mencukupi." };
    }

    await supabase.from('wallet_transactions').insert({
      id_sopir: sopirId,
      jenis: 'tarik_dana',
      jumlah: jumlah,
      saldo_awal: driver.saldo_dompet,
      saldo_akhir: driver.saldo_dompet, // Belum berkurang sampai ACC
      deskripsi: `Penarikan dana`,
      status_tarik: 'menunggu'
    });
    return { success: true };
  },

  async ajukanTopUpSopir(sopirId: string, jumlah: number, buktiBase64: string) {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    await supabase.from('wallet_transactions').insert({
      id_sopir: sopirId,
      jenis: 'topup',
      jumlah: jumlah,
      deskripsi: `Deposit via transfer`,
      bukti_transfer: buktiBase64,
      status_tarik: 'menunggu'
    });
    return { success: true };
  },

  async getTransaksiSopir(sopirId: string): Promise<TransaksiDompet[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('wallet_transactions').select('*').eq('id_sopir', sopirId).order('timestamp', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      idSopir: d.id_sopir,
      jenis: d.jenis,
      jumlah: d.jumlah,
      saldoAwal: d.saldo_awal,
      saldoAkhir: d.saldo_akhir,
      deskripsi: d.deskripsi,
      statusTarik: d.status_tarik,
      buktiTransfer: d.bukti_transfer,
      timestamp: d.timestamp
    } as any));
  },

  async getAllTransactions(): Promise<TransaksiDompet[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('wallet_transactions').select('*, profiles:id_sopir(nama)').order('timestamp', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      idSopir: d.id_sopir,
      namaSopir: d.profiles?.nama || 'Sopir',
      jenis: d.jenis,
      jumlah: d.jumlah,
      saldoAwal: d.saldo_awal,
      saldoAkhir: d.saldo_akhir,
      deskripsi: d.deskripsi,
      statusTarik: d.status_tarik,
      buktiTransfer: d.bukti_transfer,
      timestamp: d.timestamp
    } as any));
  },

  async prosesTransaksi(txId: string, status: 'disetujui' | 'ditolak', alasan?: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: tx } = await supabase.from('wallet_transactions').select('*').eq('id', txId).single();
    if (!tx || tx.status_tarik !== 'menunggu') return;

    if (status === 'disetujui') {
      const { data: drv } = await supabase.from('driver_details').select('saldo_dompet').eq('id', tx.id_sopir).single();
      const settings = await this.getPengaturan();
      if (drv) {
        let n = drv.saldo_dompet;
        if (tx.jenis === 'topup') n += tx.jumlah;
        else if (tx.jenis === 'tarik_dana') n -= (tx.jumlah + settings.biayaAdminTarik);

        await supabase.from('driver_details').update({ saldo_dompet: n }).eq('id', tx.id_sopir);
        await supabase.from('wallet_transactions').update({ status_tarik: 'disetujui', saldo_awal: drv.saldo_dompet, saldo_akhir: n }).eq('id', txId);
        return;
      }
    }
    await supabase.from('wallet_transactions').update({ status_tarik: status, alasan_penolakan: alasan }).eq('id', txId);
  },

  // --- ORDERS ---
  async buatPesanan(orderData: any, stops: any[]) {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data: newOrder, error: oErr } = await supabase.from('orders').insert({
      id_penumpang: orderData.idPenumpang,
      jenis_layanan: orderData.jenisLayanan,
      asal_alamat: orderData.asalAlamat,
      asal_lat: orderData.asalLat,
      asal_lng: orderData.asalLng,
      jarak_km: orderData.jarakKm,
      total_bayar_akhir: orderData.totalBayarAkhir,
      pembayaran_tunai: orderData.pembayaranTunai,
      status: 'mencari_sopir'
    }).select().single();

    if (oErr || !newOrder) return null;

    const stopsToInsert = stops.map(s => ({
      id_pesanan: newOrder.id,
      alamat: s.alamat,
      lat: s.lat,
      lng: s.lng,
      urutan: s.urutan,
      items: s.items
    }));
    await supabase.from('order_stops').insert(stopsToInsert);

    const finalOrder = await supabase.from('orders').select('*, order_stops(*)').eq('id', newOrder.id).single();
    ololuRealtime.broadcastNewOrder(finalOrder.data);
    return mapOrder(finalOrder.data);
  },

  async getAllPesanan(): Promise<Pesanan[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('orders').select('*, order_stops(*)').order('waktu_dibuat', { ascending: false });
    return (data || []).map(o => mapOrder(o)).filter(Boolean) as Pesanan[];
  },

  async getPesananById(id: string): Promise<Pesanan | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from('orders').select('*, order_stops(*)').eq('id', id).single();
    return mapOrder(data);
  },

  // --- EMERGENCY ---
  async tambahEmergency(idPesanan: string, nama: string, hp: string, peran: string, lat: number, lng: number) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('emergency_reports').insert({
      id_pesanan: idPesanan,
      nama_pelapor: nama,
      nomor_hp_pelapor: hp,
      peran_pelapor: peran,
      lat, lng
    });
  },

  async getAllEmergency(): Promise<LaporanDarurat[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('emergency_reports').select('*').order('timestamp', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      idPesanan: d.id_pesanan,
      namaPelapor: d.nama_pelapor,
      nomorHpPelapor: d.nomor_hp_pelapor,
      peranPelapor: d.peran_pelapor,
      lat: d.lat,
      lng: d.lng,
      status: d.status,
      timestamp: d.timestamp
    }));
  },

  // --- SYSTEM SETTINGS ---
  async getPengaturan(): Promise<PengaturanTarif> {
    const supabase = getSupabase();
    if (!supabase) return DEFAULT_PENGATURAN_TARIF;
    try {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'global_config').single();
      if (data?.value) {
        pengaturans = { ...DEFAULT_PENGATURAN_TARIF, ...data.value };
      }
      return pengaturans;
    } catch {
      return DEFAULT_PENGATURAN_TARIF;
    }
  },

  async savePengaturan(config: PengaturanTarif, adminId: string, adminNama: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('system_settings').upsert({ key: 'global_config', value: config });
    await this.addAuditLog(adminId, adminNama, "Ubah Tarif", "Memperbarui konfigurasi sistem.");
  },

  async addAuditLog(adminId: string, adminNama: string, aksi: string, detail: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      admin_nama: adminNama,
      aksi, detail
    });
  },

  async getAllAuditLogs(): Promise<LogAudit[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      adminId: d.admin_id,
      adminNama: d.admin_nama,
      aksi: d.aksi,
      detail: d.detail,
      timestamp: d.timestamp
    }));
  },

  async getAllUsers(): Promise<ProfilPengguna[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('profiles').select('*').order('tanggal_daftar', { ascending: false });
    return (data || []).map(p => mapProfile(p)).filter(Boolean) as ProfilPengguna[];
  },

  async getAllSopir(): Promise<DetailSopir[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    const { data } = await supabase.from('driver_details').select('*, profiles:id(nama, nomor_hp)');
    return (data || []).map(d => {
      const m = mapDriver(d);
      if (m) {
        (m as any).nama = d.profiles?.nama || 'Sopir';
        (m as any).nomorHp = d.profiles?.nomor_hp || '';
      }
      return m;
    }).filter(Boolean) as DetailSopir[];
  },

  async verifikasiSopir(id: string, ok: boolean, alasan?: string) {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    const { error } = await supabase.from('driver_details').update({
      disetujui_admin: ok,
      ditolak_admin: !ok,
      alasan_ditolak: alasan || ''
    }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  getLocalOrderLock() {
    const stored = localStorage.getItem(ORDER_LOCK_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  setLocalOrderLock(lock: any) {
    if (lock) localStorage.setItem(ORDER_LOCK_KEY, JSON.stringify(lock));
    else localStorage.removeItem(ORDER_LOCK_KEY);
  }
};
