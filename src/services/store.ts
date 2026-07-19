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
  LaporanDarurat,
  TransaksiDompet,
  LogAudit,
  PengaturanTarif,
  ChatMessage,
  StatusPesanan
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
  layananMobilAktif: true,
  layananMakananAktif: true,
  layananPaketAktif: true,
  layananBarangBesarAktif: true,
  layananLanggananAktif: false,
  daftarMotorAktif: true,
  daftarMobilAktif: true,
  rushHourAktif: false,
  rushHourMulai: "16:00",
  rushHourSelesai: "18:00",
  rushHourPersenKenaikan: 15,
  mapProvider: 'google',
  googleApiLimit: 25000, // Amannya 25rb load per bulan (limit gratis 28rb)
  googleApiUsageCount: 0
};

let pengaturans = { ...DEFAULT_PENGATURAN_TARIF };
// sessionOtp dihapus karena sekarang pakai Database (otps table)

const safeParseFloat = (val: any, fallback = 0): number => {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
};

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
    isSubAdmin: !!db.is_sub_admin,
    isSuspended: !!db.is_suspended
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
    lokasiSaatIni: db.lat_sekarang ? { lat: db.lat_sekarang, lng: db.lng_sekarang } : undefined
  };
};

const mapOrder = (db: any): Pesanan | null => {
  if (!db) return null;

  // Extract Passenger Info (Standard Supabase join format, handling possible array return)
  const passenger = Array.isArray(db.profiles) ? db.profiles[0] : (db.profiles || {});

  // Extract Driver Info (Standard Supabase join format, handling possible array return)
  const driverDetail = Array.isArray(db.driver_details) ? db.driver_details[0] : (db.driver_details || {});
  const driverProfile = Array.isArray(driverDetail.profiles) ? driverDetail.profiles[0] : (driverDetail.profiles || {});

  return {
    id: db.id,
    nomorPesanan: db.nomor_pesanan || 'ORD-0000',
    jenisLayanan: db.jenis_layanan,
    idPenumpang: db.id_penumpang,
    namaPenumpang: passenger.nama || db.nama_penumpang || 'Pelanggan',
    nomorHpPenumpang: passenger.nomor_hp || db.nomor_hp_penumpang || '',
    idSopir: db.id_sopir || null,
    namaSopir: driverProfile.nama || db.nama_sopir || '',
    nomorHpSopir: driverProfile.nomor_hp || db.nomor_hp_sopir || '',
    platNomorSopir: driverDetail.plat_nomor || db.plat_nomor_sopir || '',
    asalAlamat: db.asal_alamat || '',
    asalLat: safeParseFloat(db.asal_lat, KOORDINAT_LUMAJANG.lat),
    asalLng: safeParseFloat(db.asal_lng, KOORDINAT_LUMAJANG.lng),
    jarakKm: Math.ceil(safeParseFloat(db.jarak_km, 1)),
    itemsAwal: (db.items_awal || []).map((i: any) => ({
      id: i.id,
      namaBarang: i.namaBarang || i.nama_barang || 'Barang',
      jumlah: i.jumlah || 1,
      perkiraanHarga: i.perkiraanHarga || i.perkiraan_harga || 0
    })),
    notaAwal: db.nota_awal_nama_toko ? {
      namaToko: db.nota_awal_nama_toko,
      totalToko: safeParseFloat(db.nota_awal_total_toko, 0),
      rincianBarang: db.nota_awal_rincian_barang,
      fotoNota: db.nota_awal_foto_url,
      waktuDicatat: db.nota_awal_waktu_dicatat
    } : undefined,
    tarifDasar: safeParseFloat(db.tarif_dasar, 0),
    tarifPerKm: safeParseFloat(db.tarif_per_km, 0),
    tarifMinimum: safeParseFloat(db.tarif_minimum, 0),
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
      daftarItem: (s.daftar_item || []).map((i: any) => ({
        id: i.id,
        namaBarang: i.namaBarang || i.nama_barang || 'Barang',
        jumlah: i.jumlah || 1,
        perkiraanHarga: i.perkiraanHarga || i.perkiraan_harga || 0
      })),
      pilihanParkir: s.pilihan_parkir || 'tidak_ada',
      nota: s.nota_nama_toko ? {
        namaToko: s.nota_nama_toko,
        totalToko: s.nota_total_toko,
        rincianBarang: s.nota_rincian_barang,
        fotoNota: s.nota_foto_url,
        waktuDicatat: s.nota_waktu_dicatat
      } : undefined
    })),
    tahapAktif: db.tahap_aktif || 0,
    riwayatLokasiSopir: []
  };
};

export const OloluStore = {
  subscribeToStore(listener: () => void) {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    // Gunakan nama channel unik agar tidak bertabrakan (Fix crash "cannot add callbacks")
    const channelId = `schema-sync-${Math.random().toString(36).substring(7)}`;
    const channel = supabase.channel(channelId).on('postgres_changes', { event: '*', schema: 'public' }, () => { listener(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  },

  async getSesi(): Promise<{ userId: string; role: PeranPengguna } | null> {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch { return null; }
  },

  setSesi(sesi: { userId: string; role: PeranPengguna } | null) {
    if (sesi) localStorage.setItem(SESSION_KEY, JSON.stringify(sesi));
    else localStorage.removeItem(SESSION_KEY);
  },

  async getProfilLogin(): Promise<ProfilPengguna | null> {
    const sesi = await this.getSesi();
    if (!sesi) return null;
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', sesi.userId).single();
    return mapProfile(data);
  },

  async registerPengguna(nama: string, nomorHp: string, peran: PeranPengguna, password?: string, tempatLahir?: string, tanggalLahir?: string, fotoProfil?: string): Promise<{ success: boolean; profil?: ProfilPengguna; error?: string }> {
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
    const finalPassword = (cleanedPhone === '6285156766317') ? (password || '125758') : password;
    const { data, error } = await supabase.from('profiles').insert({
      id: newId, nama, nomor_hp: cleanedPhone, peran, password: finalPassword || 'ololu123',
      terverifikasi: true, tempat_lahir: tempatLahir, tanggal_lahir: tanggalLahir, foto_profil: fotoProfil
    }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, profil: mapProfile(data) as any };
  },

  async loginPengguna(nomorHp: string, passwordInput: string): Promise<{ success: boolean; profil?: ProfilPengguna; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    const { data, error } = await supabase.from('profiles').select('*').eq('nomor_hp', cleanedPhone).eq('password', passwordInput).single();
    if (error || !data) return { success: false, error: "HP/Sandi salah." };
    if (data.is_suspended) return { success: false, error: "Akun Anda ditangguhkan. Silakan hubungi Admin." };
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

  async kirimFonnteOtp(nomorHp: string) {
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Simpan ke database (otps table) agar kebal refresh
    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('otps').upsert({
        phone_number: cleanedPhone,
        otp_code: otp,
        created_at: new Date().toISOString()
      });
    }

    console.log(`[OTP DEBUG] Mengirim ${otp} ke ${cleanedPhone}`);

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": "EMTbGPgY8zfmrVGs3idM"
        },
        body: new URLSearchParams({
          "target": cleanedPhone,
          "message": `[OLOLU OTP] Kode verifikasi pendaftaran akun OLOLU Anda adalah: ${otp}. Masukkan kode ini di aplikasi. Jangan sebar luaskan kode ini!`,
          "countryCode": "62"
        })
      });
      const data = await response.json();
      return data.status === true;
    } catch (err) {
      console.error("Gagal kirim OTP:", err);
      return false;
    }
  },

  async verifikasiOtp(nomorHp: string, otpInput: string) {
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    else if (cleanedPhone.startsWith('8')) cleanedPhone = '62' + cleanedPhone;

    const supabase = getSupabase();
    if (!supabase) return false;

    // Cek kode di database
    const { data } = await supabase.from('otps').select('otp_code').eq('phone_number', cleanedPhone).single();
    return data?.otp_code === otpInput;
  },

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
      id, foto_ktp: docs.fotoKtp, foto_sim: docs.fotoSim, foto_stnk: docs.fotoStnk, foto_kendaraan: docs.fotoKendaraan,
      plat_nomor: docs.platNomor, jenis_motor: docs.jenisMotor, jenis_kendaraan: docs.jenisKendaraan || 'motor',
      warna_kendaraan: docs.warnaKendaraan || '', bisa_barang_besar: !!docs.bisaBarangBesar,
      disetujui_admin: false, ditolak_admin: false
    });
  },

  async toggleOnlineSopir(id: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    try {
      const { data, error: fetchError } = await supabase.from('driver_details').select('status_online').eq('id', id).single();
      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase.from('driver_details').update({ status_online: !data.status_online }).eq('id', id);
      if (updateError) throw updateError;

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async topUpSopir(sopirId: string, jumlah: number, deskripsi: string) {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };
    const { data: drv } = await supabase.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    if (!drv) return { success: false, error: "Driver not found" };
    const ns = (drv.saldo_dompet || 0) + jumlah;
    await supabase.from('driver_details').update({ saldo_dompet: ns }).eq('id', sopirId);
    await supabase.from('wallet_transactions').insert({ id_sopir: sopirId, jenis: 'topup', jumlah, saldo_awal: drv.saldo_dompet, saldo_akhir: ns, deskripsi });
    return { success: true };
  },

  async ajukanTarikDana(sopirId: string, jumlah: number): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabase();
    const { data: drv } = await supabase!.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    const settings = await this.getPengaturan();
    if (!drv || drv.saldo_dompet < (jumlah + settings.biayaAdminTarik)) return { success: false, error: "Saldo kurang." };
    await supabase!.from('wallet_transactions').insert({ id_sopir: sopirId, jenis: 'tarik_dana', jumlah, saldo_awal: drv.saldo_dompet, saldo_akhir: drv.saldo_dompet, deskripsi: `Tarik dana`, status_tarik: 'menunggu' });
    return { success: true };
  },

  async ajukanTopUpSopir(sopirId: string, jumlah: number, buktiBase64: string) {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: "Database offline" };

    const { data: drv } = await supabase.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    const currentSaldo = drv?.saldo_dompet || 0;

    const { error } = await supabase.from('wallet_transactions').insert({
      id_sopir: sopirId,
      jenis: 'topup',
      jumlah,
      saldo_awal: currentSaldo,
      saldo_akhir: currentSaldo, // Belum bertambah
      deskripsi: `Deposit via transfer`,
      bukti_transfer: buktiBase64,
      status_tarik: 'menunggu'
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getTransaksiSopir(sopirId: string): Promise<TransaksiDompet[]> {
    const { data } = await getSupabase()!.from('wallet_transactions').select('*').eq('id_sopir', sopirId).order('created_at', { ascending: false });
    return (data || []).map(d => ({ id: d.id, idSopir: d.id_sopir, jenis: d.jenis, jumlah: d.jumlah, saldoAwal: d.saldo_awal, saldoAkhir: d.saldo_akhir, deskripsi: d.deskripsi, statusTarik: d.status_tarik, buktiTransfer: d.bukti_transfer, timestamp: d.created_at } as any));
  },

  async getAllTransactions(): Promise<TransaksiDompet[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    // Use a simple query first to see if it works, joining manually if needed
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*, profiles:id_sopir(nama)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("❌ ERROR FETCHING TRANSACTIONS:", error.message);
      // Fallback: try without join to at least get the numbers
      const { data: rawData } = await supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false });
      return (rawData || []).map(d => ({
        id: d.id,
        idSopir: d.id_sopir,
        namaSopir: 'Mitra',
        jenis: d.jenis,
        jumlah: d.jumlah,
        saldoAwal: d.saldo_awal,
        saldoAkhir: d.saldo_akhir,
        deskripsi: d.deskripsi,
        statusTarik: d.status_tarik,
        buktiTransfer: d.bukti_transfer,
        timestamp: d.created_at
      } as any));
    }

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
      timestamp: d.created_at
    } as any));
  },

  async prosesTransaksi(txId: string, status: 'disetujui' | 'ditolak', alasan?: string) {
    const supabase = getSupabase();
    const { data: tx } = await supabase!.from('wallet_transactions').select('*').eq('id', txId).single();
    if (!tx || tx.status_tarik !== 'menunggu') return;
    if (status === 'disetujui') {
      const { data: drv } = await supabase!.from('driver_details').select('saldo_dompet').eq('id', tx.id_sopir).single();
      const settings = await this.getPengaturan();
      if (drv) {
        let n = drv.saldo_dompet;
        if (tx.jenis === 'topup') n += tx.jumlah;
        else if (tx.jenis === 'tarik_dana') n -= (tx.jumlah + settings.biayaAdminTarik);
        await supabase!.from('driver_details').update({ saldo_dompet: n }).eq('id', tx.id_sopir);
        await supabase!.from('wallet_transactions').update({ status_tarik: 'disetujui', saldo_awal: drv.saldo_dompet, saldo_akhir: n }).eq('id', txId);
        return;
      }
    }
    await supabase!.from('wallet_transactions').update({ status_tarik: status, alasan_penolakan: alasan }).eq('id', txId);
  },

  async buatPesanan(orderData: any, stops: any[]) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const nomorPesanan = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Create Base Order
    const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
      nomor_pesanan: nomorPesanan,
      id_penumpang: orderData.idPenumpang,
      jenis_layanan: orderData.jenisLayanan,
      asal_alamat: orderData.asalAlamat,
      asal_lat: orderData.asalLat,
      asal_lng: orderData.asalLng,
      items_awal: orderData.itemsAwal || [],
      jarak_km: orderData.jarakKm,
      tarif_perjalanan_murni: orderData.tarifPerjalananMurni || orderData.totalBayarAkhir,
      total_bayar_akhir: orderData.totalBayarAkhir,
      pembayaran_tunai: orderData.pembayaranTunai,
      status: 'mencari_sopir'
    }).select().single();

    if (orderError) {
      console.error("❌ GAGAL BUAT PESANAN (Base):", orderError.message);
      return null;
    }

    if (!newOrder) return null;

    // 2. Insert Stops
    const { error: stopsError } = await supabase.from('order_stops').insert(stops.map(s => ({
      order_id: newOrder.id,
      alamat: s.alamat,
      lat: s.lat,
      lng: s.lng,
      urutan: s.urutan,
      daftar_item: s.items || []
    })));

    if (stopsError) {
      console.error("❌ GAGAL SIMPAN STOPS:", stopsError.message);
    }

    // 3. Fetch Final Order with SAFE LEFT JOINS (Explicit FK names to avoid ambiguity)
    const { data: finalOrder, error: fetchError } = await supabase.from('orders')
      .select(`
        *,
        order_stops(*),
        profiles:id_penumpang(nama, nomor_hp),
        driver_details:id_sopir(plat_nomor, jenis_motor, profiles(nama, nomor_hp))
      `)
      .eq('id', newOrder.id).single();

    if (fetchError) {
      console.error("❌ GAGAL FETCH FINAL ORDER:", fetchError.message);
      // Fallback: use the newOrder directly so the user can see the "Searching" screen
      const fallbackMapped = mapOrder({
        ...newOrder,
        order_stops: stops.map(s => ({
          ...s,
          order_id: newOrder.id,
          daftar_item: s.items || []
        }))
      });
      if (fallbackMapped) ololuRealtime.broadcastNewOrder(fallbackMapped);
      return fallbackMapped;
    }

    const mapped = mapOrder(finalOrder);
    if (mapped) {
      ololuRealtime.broadcastNewOrder(mapped);
    }
    return mapped;
  },

  async getAllPesanan(): Promise<Pesanan[]> {
    const { data, error } = await getSupabase()!.from('orders')
      .select('*, order_stops(*), profiles!id_penumpang(nama, nomor_hp), driver_details!id_sopir(plat_nomor, jenis_motor, profiles(nama, nomor_hp))')
      .order('waktu_dibuat', { ascending: false });

    if (error) {
      console.error("❌ ERROR FETCH ALL PESANAN:", error.message);
      return [];
    }
    return (data || []).map(o => mapOrder(o)).filter(Boolean) as Pesanan[];
  },

  async getPesananById(id: string): Promise<Pesanan | null> {
    const { data, error } = await getSupabase()!.from('orders')
      .select('*, order_stops(*), profiles!id_penumpang(nama, nomor_hp), driver_details!id_sopir(plat_nomor, jenis_motor, profiles(nama, nomor_hp))')
      .eq('id', id).single();

    if (error) {
      console.error(`❌ ERROR FETCH ORDER ${id}:`, error.message);
      return null;
    }
    return mapOrder(data);
  },

  async tambahEmergency(idPesanan: string, nama: string, hp: string, peran: string, lat: number, lng: number) {
    await getSupabase()!.from('emergency_reports').insert({ id_pesanan: idPesanan, nama_pelapor: nama, nomor_hp_pelapor: hp, peran_pelapor: peran, lat, lng });
  },

  async tambahRating(idPesanan: string, idSopir: string, namaPenumpang: string, bintang: number, ulasan: string) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from('ratings').insert({ id_pesanan: idPesanan, id_sopir: idSopir, nama_penumpang: namaPenumpang, bintang, ulasan });
    const { data: ratings } = await supabase.from('ratings').select('bintang').eq('id_sopir', idSopir);
    if (ratings && ratings.length > 0) {
      const avg = ratings.reduce((acc, cur) => acc + cur.bintang, 0) / ratings.length;
      await supabase.from('driver_details').update({ rating_rata_rata: avg }).eq('id', idSopir);
    }
  },

  async getAllEmergency(): Promise<LaporanDarurat[]> {
    const { data } = await getSupabase()!.from('emergency_reports').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({ id: d.id, idPesanan: d.id_pesanan, namaPelapor: d.nama_pelapor, nomorHpPelapor: d.nomor_hp_pelapor, peranPelapor: d.peran_pelapor, lat: d.lat, lng: d.lng, status: d.status, timestamp: d.created_at }));
  },

  async getPengaturan(): Promise<PengaturanTarif> {
    try {
      const { data } = await getSupabase()!.from('system_settings').select('value').eq('key', 'global_config').single();
      if (data?.value) pengaturans = { ...DEFAULT_PENGATURAN_TARIF, ...data.value };
      return pengaturans;
    } catch { return DEFAULT_PENGATURAN_TARIF; }
  },

  async getAllUsers(): Promise<ProfilPengguna[]> {
    const { data } = await getSupabase()!.from('profiles').select('*').order('created_at', { ascending: false });
    return (data || []).map(p => mapProfile(p)).filter(Boolean) as ProfilPengguna[];
  },

  async getAllSopir(): Promise<DetailSopir[]> {
    const { data } = await getSupabase()!.from('driver_details').select('*, profiles:id(nama, nomor_hp)');
    return (data || []).map(d => {
      const m = mapDriver(d);
      if (m) { (m as any).nama = d.profiles?.nama || 'Sopir'; (m as any).nomorHp = d.profiles?.nomor_hp || ''; }
      return m;
    }).filter(Boolean) as DetailSopir[];
  },

  async verifikasiSopir(id: string, ok: boolean, alasan?: string) {
    const { error } = await getSupabase()!.from('driver_details').update({ disetujui_admin: ok, ditolak_admin: !ok, alasan_ditolak: alasan || '' }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async getAllAuditLogs(): Promise<LogAudit[]> {
    const { data } = await getSupabase()!.from('audit_logs').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({ id: d.id, adminId: d.id_admin, adminNama: d.nama_admin, aksi: d.aksi, detail: d.detail, timestamp: d.created_at }));
  },

  async addAuditLog(idAdmin: string, namaAdmin: string, aksi: string, detail: string) {
    await getSupabase()!.from('audit_logs').insert({ id_admin: idAdmin, nama_admin: namaAdmin, aksi, detail });
  },

  async getAllAdmins(): Promise<ProfilPengguna[]> {
    const { data } = await getSupabase()!.from('profiles').select('*').or("peran.eq.admin,is_sub_admin.eq.true");
    return (data || []).map(p => mapProfile(p)).filter(Boolean) as ProfilPengguna[];
  },

  async promoteToAdmin(nomorHp: string, nama: string) {
    const { error } = await getSupabase()!.from('profiles').update({ is_sub_admin: true, peran: 'admin' }).eq('nomor_hp', nomorHp);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async removeAdminStatus(id: string) {
    const { error } = await getSupabase()!.from('profiles').update({ is_sub_admin: false, peran: 'penumpang' }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async toggleSuspendUser(id: string, currentStatus: boolean) {
    const { error } = await getSupabase()!.from('profiles').update({ is_suspended: !currentStatus }).eq('id', id);
    return { success: !error, error: error?.message };
  },

  async forceOfflineDriver(id: string) {
    const { error } = await getSupabase()!.from('driver_details').update({ status_online: false }).eq('id', id);
    return { success: !error, error: error?.message };
  },

  async savePengaturan(newCfg: PengaturanTarif, adminId: string, adminNama: string) {
    await getSupabase()!.from('system_settings').upsert({ key: 'global_config', value: newCfg });
    pengaturans = { ...newCfg };
  },

  async trackGoogleUsage() {
    const supabase = getSupabase();
    if (!supabase) return;

    // 1. Get current config
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'global_config').single();
    if (!data?.value) return;

    const currentCfg = data.value as PengaturanTarif;
    const newCount = (currentCfg.googleApiUsageCount || 0) + 1;

    // 2. Determine if we should switch to OSM automatically
    let newProvider = currentCfg.mapProvider;
    if (newCount >= currentCfg.googleApiLimit && currentCfg.mapProvider === 'google') {
      newProvider = 'osm';
      console.warn("⚠️ GOOGLE API LIMIT REACHED! Switching to OpenStreetMap.");
    }

    // 3. Update DB
    const updatedCfg = { ...currentCfg, googleApiUsageCount: newCount, mapProvider: newProvider };
    await supabase.from('system_settings').update({ value: updatedCfg }).eq('key', 'global_config');
    pengaturans = updatedCfg;
  },

  async getChatMessages(pesananId: string): Promise<ChatMessage[]> {
    const { data } = await getSupabase()!.from('chat_messages').select('*').eq('id_pesanan', pesananId).order('created_at', { ascending: true });
    return (data || []).map(m => ({
      id: m.id,
      idPesanan: m.id_pesanan,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderRole: m.sender_role,
      message: m.message,
      voiceData: m.voice_data,
      photoData: m.photo_data,
      timestamp: m.created_at
    }));
  },

  async sendChatMessage(pesananId: string, senderId: string, senderName: string, senderRole: string, message: string, voiceData?: string, photoData?: string) {
    await getSupabase()!.from('chat_messages').insert({
      id_pesanan: pesananId,
      sender_id: senderId,
      sender_name: senderName,
      sender_role: senderRole,
      message,
      voice_data: voiceData,
      photo_data: photoData
    });
    ololuRealtime.broadcastChatMessage(pesananId, { senderId, senderName, senderRole, message, voiceData, photoData, timestamp: new Date().toISOString() });
  },

  async terimaPesanan(orderId: string, driverId: string) {
    // ATOMIC UPDATE: Only update if status is still 'mencari_sopir'
    const { data, error } = await getSupabase()!.from('orders').update({
      id_sopir: driverId,
      status: 'sopir_ditemukan',
      waktu_diterima: new Date().toISOString()
    })
    .eq('id', orderId)
    .eq('status', 'mencari_sopir')
    .select();

    if (error) {
      console.error("❌ ERROR TERIMA PESANAN:", error.message);
      return { success: false, error: error.message };
    }
    if (!data || data.length === 0) return { success: false, error: "PESANAN_SUDAH_DIAMBIL" };

    return { success: true };
  },

  async updateStatusPesanan(id: string, status: StatusPesanan) {
    await getSupabase()!.from('orders').update({ status }).eq('id', id);
  },

  async updateTahapAktif(id: string, tahap: number) {
    await getSupabase()!.from('orders').update({ tahap_aktif: tahap }).eq('id', id);
  },

  async updateParkirStop(stopId: string, choice: string) {
    await getSupabase()!.from('order_stops').update({ pilihan_parkir: choice }).eq('id', stopId);
  },

  async setStopSelesai(stopId: string) {
    await getSupabase()!.from('order_stops').update({ status: 'selesai' }).eq('id', stopId);
  },

  async simpanNotaAwal(pesananId: string, namaToko: string, rincian: string, total: number, fotoBase64: string) {
    const updateData = {
      nota_awal_nama_toko: namaToko,
      nota_awal_rincian_barang: rincian,
      nota_awal_total_toko: total,
      nota_awal_foto_url: fotoBase64,
      nota_awal_waktu_dicatat: new Date().toISOString()
    };
    await getSupabase()!.from('orders').update(updateData).eq('id', pesananId);

    const notaForUI = {
      namaToko,
      totalToko: total,
      rincianBarang: rincian,
      fotoNota: fotoBase64,
      waktuDicatat: updateData.nota_awal_waktu_dicatat
    };
    ololuRealtime.broadcastTripUpdate(pesananId, { type: 'nota_awal_update', nota: notaForUI });
  },

  async simpanNotaToko(pesananId: string, stopId: string, namaToko: string, rincian: string, total: number, fotoBase64: string) {
    const updateData = {
      nota_nama_toko: namaToko,
      nota_rincian_barang: rincian,
      nota_total_toko: total,
      nota_foto_url: fotoBase64,
      nota_waktu_dicatat: new Date().toISOString()
    };
    await getSupabase()!.from('order_stops').update(updateData).eq('id', stopId);

    // Broadcast for realtime update with mapped keys
    const notaForUI = {
      namaToko,
      totalToko: total,
      rincianBarang: rincian,
      fotoNota: fotoBase64,
      waktuDicatat: updateData.nota_waktu_dicatat
    };
    ololuRealtime.broadcastTripUpdate(pesananId, { type: 'nota_update', stopId, nota: notaForUI });
  },

  async selesaikanPesanan(pesananId: string, finalOrderData: Pesanan) {
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.from('orders').update({
      status: 'selesai',
      waktu_selesai: new Date().toISOString(),
      biaya_parkir_total: finalOrderData.biayaParkirTotal,
      biaya_nota_total: finalOrderData.biayaNotaTotal,
      total_bayar_akhir: finalOrderData.totalBayarAkhir
    }).eq('id', pesananId);

    if (!error) {
      ololuRealtime.broadcastTripUpdate(pesananId, { type: 'status_update', status: 'selesai' });
      this.setLocalOrderLock(null);
    }
  },

  async batalPesanan(pesananId: string, peran: string, alasan: string) {
    await getSupabase()!.from('orders').update({ status: 'dibatalkan', waktu_dibatalkan: new Date().toISOString(), alasan_batal: alasan }).eq('id', pesananId);
    ololuRealtime.broadcastTripUpdate(pesananId, { type: 'status_update', status: 'dibatalkan' });
    this.setLocalOrderLock(null);
  },

  async getSopirLogin(): Promise<DetailSopir | null> {
    const sesi = await this.getSesi();
    if (!sesi) return null;
    return this.getSopir(sesi.userId);
  },

  getLocalOrderLock() { const stored = localStorage.getItem(ORDER_LOCK_KEY); return stored ? JSON.parse(stored) : null; },
  setLocalOrderLock(lock: any) { if (lock) localStorage.setItem(ORDER_LOCK_KEY, JSON.stringify(lock)); else localStorage.removeItem(ORDER_LOCK_KEY); }
};
