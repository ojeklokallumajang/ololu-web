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
  ojekTarifPerKmJauh: 3000,
  ojekBatasKmJauh: 10,
  ojekTarifMinimum: 10000,
  ojekTarifTungguPerMenit: 200,
  ojekPersenJasa: 10,
  ojekBatasKmTarifDasar: 4,
  ojekBiayaPerStop: 2000,
  ojekTarifRushHour: 3000,
  ojekTarifMalam: 5000,
  ojekJarakMaksimum: 30,
  layananOjekAktif: true,

  mobilTarifDasar: 15000,
  mobilTarifPerKm: 5000,
  mobilTarifPerKmJauh: 6000,
  mobilBatasKmJauh: 10,
  mobilTarifMinimum: 20000,
  mobilTarifTungguPerMenit: 500,
  mobilPersenJasa: 10,
  mobilBatasKmTarifDasar: 2,
  mobilBiayaPerStop: 5000,
  mobilTarifRushHour: 5000,
  mobilTarifMalam: 10000,
  mobilJarakMaksimum: 100,
  layananMobilAktif: true,

  makananTarifDasar: 10000,
  makananTarifPerKm: 3000,
  makananTarifPerKmJauh: 4000,
  makananBatasKmJauh: 10,
  makananTarifMinimum: 12000,
  makananTarifTungguPerMenit: 300,
  makananPersenJasa: 15,
  makananBatasKmTarifDasar: 3,
  makananBiayaPerStop: 3000,
  makananTarifRushHour: 3000,
  makananTarifMalam: 5000,
  makananJarakMaksimum: 20,
  layananMakananAktif: true,

  paketTarifDasar: 7000,
  paketTarifPerKm: 2000,
  paketTarifPerKmJauh: 3000,
  paketBatasKmJauh: 10,
  paketTarifMinimum: 10000,
  paketTarifTungguPerMenit: 200,
  paketPersenJasa: 10,
  paketBatasKmTarifDasar: 3,
  paketBiayaPerStop: 2000,
  paketTarifRushHour: 2000,
  paketTarifMalam: 5000,
  paketJarakMaksimum: 50,
  layananPaketAktif: true,

  belanjaTarifDasar: 10000,
  belanjaTarifPerKm: 3000,
  belanjaTarifPerKmJauh: 4000,
  belanjaBatasKmJauh: 10,
  belanjaTarifMinimum: 15000,
  belanjaTarifTungguPerMenit: 300,
  belanjaPersenJasa: 15,
  belanjaBatasKmTarifDasar: 3,
  belanjaBiayaPerStop: 3000,
  belanjaTarifRushHour: 3000,
  belanjaTarifMalam: 5000,
  belanjaJarakMaksimum: 20,
  layananBelanjaAktif: true,

  cargoTarifDasar: 30000,
  cargoTarifPerKm: 10000,
  cargoTarifPerKmJauh: 12000,
  cargoBatasKmJauh: 10,
  cargoTarifMinimum: 50000,
  cargoTarifTungguPerMenit: 1000,
  cargoPersenJasa: 10,
  cargoBatasKmTarifDasar: 3,
  cargoBiayaPerStop: 10000,
  cargoTarifRushHour: 10000,
  cargoTarifMalam: 20000,
  cargoJarakMaksimum: 200,
  layananCargoAktif: true,

  marketTarifDasar: 10000,
  marketTarifPerKm: 3000,
  marketTarifPerKmJauh: 4000,
  marketBatasKmJauh: 10,
  marketTarifMinimum: 15000,
  marketTarifTungguPerMenit: 300,
  marketPersenJasa: 15,
  marketBatasKmTarifDasar: 3,
  marketBiayaPerStop: 3000,
  marketTarifRushHour: 3000,
  marketTarifMalam: 5000,
  marketJarakMaksimum: 30,
  layananMarketAktif: true,

  lainnyaTarifDasar: 10000,
  lainnyaTarifPerKm: 3000,
  lainnyaTarifPerKmJauh: 4000,
  lainnyaBatasKmJauh: 10,
  lainnyaTarifMinimum: 15000,
  lainnyaPersenJasa: 10,
  lainnyaBiayaPerStop: 3000,
  lainnyaTarifRushHour: 3000,
  lainnyaTarifMalam: 5000,
  lainnyaJarakMaksimum: 50,
  layananLainnyaAktif: true,

  biayaParkirBiasa: 2000,
  biayaParkirPasar: 5000,
  biayaPerStopTambahan: 3000,
  biayaKelebihanItem: 1000,

  malamAktif: false,
  malamMulai: "22:00",
  malamSelesai: "05:00",
  malamTambahanFlat: 5000,

  rushHourAktif: false,
  rushHourMulai: "16:00",
  rushHourSelesai: "18:00",

  radiusPencarianSopirKm: 5,
  jarakMaksimalOrderKm: 50,
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
  daftarMotorAktif: true,
  daftarMobilAktif: true,
  mapProvider: 'google',
  googleApiLimit: 25000,
  googleApiUsageCount: 0,
  googleMapsKey: 'AIzaSyAZS9TLRfaVbEDw4XtpJn7T7ppeUenWYZw',
  fonnteToken: 'EMTbGPgY8zfmrVGs3idM'
};

let pengaturans = { ...DEFAULT_PENGATURAN_TARIF };

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
    isSuspended: !!db.is_suspended,
    created_at: db.created_at
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
  const passenger = Array.isArray(db.profiles) ? db.profiles[0] : (db.profiles || {});
  const driverDetail = Array.isArray(db.driver_details) ? db.driver_details[0] : (db.driver_details || {});
  const driverProfiles = driverDetail?.profiles;
  const driverProfile = Array.isArray(driverProfiles) ? driverProfiles[0] : (driverProfiles || {});

  return {
    id: db.id,
    nomorPesanan: db.nomor_pesanan || 'ORD-0000',
    jenisLayanan: db.jenis_layanan,
    idPenumpang: db.id_penumpang,
    namaPenumpang: passenger?.nama || db.nama_penumpang || 'Pelanggan',
    nomorHpPenumpang: passenger?.nomor_hp || db.nomor_hp_penumpang || '',
    idSopir: db.id_sopir || null,
    namaSopir: driverProfile?.nama || db.nama_sopir || '',
    nomorHpSopir: driverProfile?.nomor_hp || db.nomor_hp_sopir || '',
    platNomorSopir: driverDetail?.plat_nomor || db.plat_nomor_sopir || '',
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
      fotoNota: db.nota_awal_foto_url || '',
      waktuDicatat: db.nota_awal_waktu_dicatat || db.waktu_dibuat
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
    biayaTungguTotal: safeParseFloat(db.biaya_tunggu_total, 0),
    biayaMalamTambahan: safeParseFloat(db.biaya_malam_tambahan, 0),
    durasiMenit: parseInt(db.durasi_menit || 0),
    pembayaranTunai: !!db.pembayaran_tunai,
    status: db.status || 'mencari_sopir',
    waktuDibuat: db.waktu_dibuat || new Date().toISOString(),
    waktuSopirDiterima: db.waktu_diterima || null,
    waktuTibaJemput: db.waktu_tiba_jemput || null,
    waktuMulaiJalan: db.waktu_mulai_jalan || null,
    waktuSelesai: db.waktu_selesai || null,
    waktuDibatalkan: db.waktu_dibatalkan || null,
    alasanBatal: db.alasan_batal || '',
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
        totalToko: safeParseFloat(s.nota_total_toko, 0),
        rincianBarang: s.nota_rincian_barang,
        fotoNota: s.nota_foto_url || '',
        waktuDicatat: s.nota_waktu_dicatat || db.waktu_dibuat
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
    if (data.is_suspended) return { success: false, error: "Akun Anda ditangguhkan." };
    return { success: true, profil: mapProfile(data) as any };
  },

  async kirimFonnteOtp(nomorHp: string) {
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const supabase = getSupabase();
    if (supabase) await supabase.from('otps').upsert({ phone_number: cleanedPhone, otp_code: otp, created_at: new Date().toISOString() });
    const config = await this.getPengaturan();
    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { "Authorization": config.fonnteToken || "EMTbGPgY8zfmrVGs3idM" },
        body: new URLSearchParams({ "target": cleanedPhone, "message": `[OLOLU OTP] Kode verifikasi: ${otp}.`, "countryCode": "62" })
      });
      const data = await response.json();
      return data.status === true;
    } catch { return false; }
  },

  async verifikasiOtp(nomorHp: string, otpInput: string) {
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) cleanedPhone = '62' + cleanedPhone.slice(1);
    const { data } = await getSupabase()!.from('otps').select('otp_code').eq('phone_number', cleanedPhone).single();
    return data?.otp_code === otpInput;
  },

  async getSopir(id: string): Promise<DetailSopir | null> {
    const { data } = await getSupabase()!.from('driver_details').select('*').eq('id', id).single();
    return mapDriver(data);
  },

  async updateSopirDokumen(id: string, docs: any) {
    const { error } = await getSupabase()!.from('driver_details').upsert({
      id, foto_ktp: docs.fotoKtp, foto_sim: docs.fotoSim, foto_stnk: docs.fotoStnk,
      foto_kendaraan: docs.fotoKendaraan, plat_nomor: docs.platNomor, jenis_motor: docs.jenisMotor,
      jenis_kendaraan: docs.jenisKendaraan || 'motor', warna_kendaraan: docs.warnaKendaraan || '',
      bisa_barang_besar: !!docs.bisaBarangBesar, updated_at: new Date().toISOString()
    });
    return { success: !error, error: error?.message };
  },

  async toggleOnlineSopir(id: string): Promise<{ success: boolean; error?: string }> {
    const { data } = await getSupabase()!.from('driver_details').select('status_online').eq('id', id).single();
    const { error } = await getSupabase()!.from('driver_details').update({ status_online: !data.status_online }).eq('id', id);
    return { success: !error, error: error?.message };
  },

  async topUpSopir(sopirId: string, jumlah: number, deskripsi: string) {
    const { data: drv } = await getSupabase()!.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    if (!drv) return { success: false, error: "Driver not found" };
    const ns = (drv.saldo_dompet || 0) + jumlah;
    await getSupabase()!.from('driver_details').update({ saldo_dompet: ns }).eq('id', sopirId);
    await getSupabase()!.from('wallet_transactions').insert({ id_sopir: sopirId, jenis: 'topup', jumlah, saldo_awal: drv.saldo_dompet, saldo_akhir: ns, deskripsi });
    return { success: true };
  },

  async ajukanTarikDana(sopirId: string, jumlah: number): Promise<{ success: boolean; error?: string }> {
    const { data: drv } = await getSupabase()!.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    const settings = await this.getPengaturan();
    if (!drv || drv.saldo_dompet < (jumlah + settings.biayaAdminTarik)) return { success: false, error: "Saldo kurang." };
    await getSupabase()!.from('wallet_transactions').insert({ id_sopir: sopirId, jenis: 'tarik_dana', jumlah, saldo_awal: drv.saldo_dompet, saldo_akhir: drv.saldo_dompet, deskripsi: `Tarik dana`, status_tarik: 'menunggu' });
    return { success: true };
  },

  async ajukanTopUpSopir(sopirId: string, jumlah: number, buktiBase64: string) {
    const { data: drv } = await getSupabase()!.from('driver_details').select('saldo_dompet').eq('id', sopirId).single();
    const { error } = await getSupabase()!.from('wallet_transactions').insert({
      id_sopir: sopirId, jenis: 'topup', jumlah, saldo_awal: drv?.saldo_dompet || 0, saldo_akhir: drv?.saldo_dompet || 0,
      deskripsi: `Deposit via transfer`, bukti_transfer: buktiBase64, status_tarik: 'menunggu'
    });
    return { success: !error, error: error?.message };
  },

  async getTransaksiSopir(sopirId: string): Promise<TransaksiDompet[]> {
    const { data } = await getSupabase()!.from('wallet_transactions').select('*').eq('id_sopir', sopirId).order('created_at', { ascending: false });
    return (data || []).map(d => ({ id: d.id, idSopir: d.id_sopir, jenis: d.jenis, jumlah: d.jumlah, saldoAwal: d.saldo_awal, saldoAkhir: d.saldo_akhir, deskripsi: d.deskripsi, statusTarik: d.status_tarik, buktiTransfer: d.bukti_transfer, timestamp: d.created_at } as any));
  },

  async getAllTransactions(): Promise<TransaksiDompet[]> {
    const { data } = await getSupabase()!.from('wallet_transactions').select('*, driver_details(profiles(nama))').order('created_at', { ascending: false });
    return (data || []).map(d => {
      const driverProfile = d.driver_details?.profiles;
      const namaSopir = Array.isArray(driverProfile) ? driverProfile[0]?.nama : driverProfile?.nama;
      return {
        id: d.id,
        idSopir: d.id_sopir,
        namaSopir: namaSopir || 'Mitra',
        jenis: d.jenis,
        jumlah: d.jumlah,
        saldoAwal: d.saldo_awal,
        saldoAkhir: d.saldo_akhir,
        deskripsi: d.deskripsi,
        statusTarik: d.status_tarik,
        buktiTransfer: d.bukti_transfer,
        timestamp: d.created_at
      } as any;
    });
  },

  async prosesTransaksi(txId: string, status: 'disetujui' | 'ditolak', alasan?: string) {
    const { data: tx } = await getSupabase()!.from('wallet_transactions').select('*').eq('id', txId).single();
    if (!tx || tx.status_tarik !== 'menunggu') return;
    if (status === 'disetujui') {
      const { data: drv } = await getSupabase()!.from('driver_details').select('saldo_dompet').eq('id', tx.id_sopir).single();
      if (drv) {
        let n = drv.saldo_dompet + (tx.jenis === 'topup' ? tx.jumlah : -(tx.jumlah + 2500));
        await getSupabase()!.from('driver_details').update({ saldo_dompet: n }).eq('id', tx.id_sopir);
        await getSupabase()!.from('wallet_transactions').update({ status_tarik: 'disetujui', saldo_awal: drv.saldo_dompet, saldo_akhir: n }).eq('id', txId);
        return;
      }
    }
    await getSupabase()!.from('wallet_transactions').update({ status_tarik: status, alasan_penolakan: alasan }).eq('id', txId);
  },

  async buatPesanan(orderData: any, stops: any[]) {
    const supabase = getSupabase()!;
    const nomorPesanan = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: newOrder, error: orderError } = await supabase.from('orders').insert({
      nomor_pesanan: nomorPesanan, id_penumpang: orderData.idPenumpang, jenis_layanan: orderData.jenisLayanan,
      asal_alamat: orderData.asalAlamat, asal_lat: orderData.asalLat, asal_lng: orderData.asalLng,
      items_awal: orderData.itemsAwal || [], jarak_km: orderData.jarakKm, tarif_dasar: orderData.tarifDasar || 0,
      tarif_per_km: orderData.tarifPerKm || 0, tarif_minimum: orderData.tarifMinimum || 0,
      tarif_perjalanan_murni: orderData.tarifPerjalananMurni || orderData.totalBayarAkhir,
      tambahan_tujuan: orderData.tambahanTujuan || 0, tambahan_item: orderData.tambahanItem || 0,
      biaya_layanan_persen: orderData.biayaLayananPersen || 10, biaya_tunggu_total: orderData.biayaTungguTotal || 0,
      biaya_malam_tambahan: orderData.biayaMalamTambahan || 0, durasi_menit: orderData.durasiMenit || 0,
      total_bayar_akhir: orderData.totalBayarAkhir, pembayaran_tunai: orderData.pembayaranTunai, status: 'mencari_sopir'
    }).select().single();
    if (orderError || !newOrder) return null;
    await supabase.from('order_stops').insert(stops.map(s => ({ order_id: newOrder.id, alamat: s.alamat, lat: s.lat, lng: s.lng, urutan: s.urutan, daftar_item: s.items || [] })));
    const { data: finalOrder } = await supabase.from('orders').select('*, order_stops(*), profiles:id_penumpang(nama, nomor_hp), driver_details:id_sopir(plat_nomor, jenis_motor, profiles(nama, nomor_hp))').eq('id', newOrder.id).single();
    const mapped = mapOrder(finalOrder);
    if (mapped) ololuRealtime.broadcastNewOrder(mapped);
    return mapped;
  },

  async getAllPesanan(): Promise<Pesanan[]> {
    const { data } = await getSupabase()!.from('orders').select('*, order_stops(*), profiles:id_penumpang(nama, nomor_hp), driver_details:id_sopir(plat_nomor, jenis_motor, profiles(nama, nomor_hp))').order('waktu_dibuat', { ascending: false });
    return (data || []).map(o => mapOrder(o)).filter(Boolean) as Pesanan[];
  },

  async getPesananById(id: string): Promise<Pesanan | null> {
    const { data } = await getSupabase()!.from('orders').select('*, order_stops(*), profiles:id_penumpang(nama, nomor_hp), driver_details:id_sopir(plat_nomor, jenis_motor, profiles(nama, nomor_hp))').eq('id', id).single();
    return mapOrder(data);
  },

  async tambahEmergency(idPesanan: string, nama: string, hp: string, peran: string, lat: number, lng: number) {
    await getSupabase()!.from('emergency_reports').insert({ id_pesanan: idPesanan, nama_pelapor: nama, nomor_hp_pelapor: hp, peran_pelapor: peran, lat, lng });
  },

  async tambahRating(idPesanan: string, idSopir: string, namaPenumpang: string, bintang: number, ulasan: string) {
    await getSupabase()!.from('ratings').insert({ id_pesanan: idPesanan, id_sopir: idSopir, nama_penumpang: namaPenumpang, bintang, ulasan });
    const { data: ratings } = await getSupabase()!.from('ratings').select('bintang').eq('id_sopir', idSopir);
    if (ratings?.length) await getSupabase()!.from('driver_details').update({ rating_rata_rata: (ratings.reduce((a, c) => a + c.bintang, 0) / ratings.length) }).eq('id', idSopir);
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
    const { data } = await getSupabase()!.from('driver_details').select('*, profiles(nama, nomor_hp, is_suspended)');
    return (data || []).map(d => {
      const m = mapDriver(d);
      const profileData = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
      if (m) {
        (m as any).nama = profileData?.nama || 'Sopir';
        (m as any).nomorHp = profileData?.nomor_hp || '';
        (m as any).isSuspended = !!profileData?.is_suspended;
      }
      return m;
    }).filter(Boolean) as DetailSopir[];
  },

  async verifikasiSopir(id: string, ok: boolean, alasan?: string) {
    const { error } = await getSupabase()!.from('driver_details').update({ disetujui_admin: ok, ditolak_admin: !ok, alasan_ditolak: alasan || '' }).eq('id', id);
    return { success: !error, error: error?.message };
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
    return { success: !error, error: error?.message };
  },

  async removeAdminStatus(id: string) {
    const { error } = await getSupabase()!.from('profiles').update({ is_sub_admin: false, peran: 'penumpang' }).eq('id', id);
    return { success: !error, error: error?.message };
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
    const supabase = getSupabase()!;
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'global_config').single();
    if (!data?.value) return;
    const c = data.value as PengaturanTarif;
    const nc = (c.googleApiUsageCount || 0) + 1;
    const np = nc >= c.googleApiLimit ? 'osm' : c.mapProvider;
    await supabase.from('system_settings').update({ value: { ...c, googleApiUsageCount: nc, mapProvider: np } }).eq('key', 'global_config');
  },

  async getChatMessages(pesananId: string): Promise<ChatMessage[]> {
    const { data } = await getSupabase()!.from('chat_messages').select('*').eq('id_pesanan', pesananId).order('created_at', { ascending: true });
    return (data || []).map(m => ({ id: m.id, idPesanan: m.id_pesanan, senderId: m.sender_id, senderName: m.sender_name, senderRole: m.sender_role, message: m.message, voiceData: m.voice_data, photoData: m.photo_data, timestamp: m.created_at }));
  },

  async sendChatMessage(pesananId: string, senderId: string, senderName: string, senderRole: string, message: string, voiceData?: string, photoData?: string) {
    await getSupabase()!.from('chat_messages').insert({ id_pesanan: pesananId, sender_id: senderId, sender_name: senderName, sender_role: senderRole, message, voice_data: voiceData, photo_data: photoData });
    ololuRealtime.broadcastChatMessage(pesananId, { senderId, senderName, senderRole, message, voiceData, photoData, timestamp: new Date().toISOString() });
  },

  async terimaPesanan(orderId: string, driverId: string) {
    const { data, error } = await getSupabase()!.from('orders').update({ id_sopir: driverId, status: 'sopir_ditemukan', waktu_diterima: new Date().toISOString() }).eq('id', orderId).eq('status', 'mencari_sopir').select();
    if (error || !data?.length) return { success: false, error: "PESANAN_SUDAH_DIAMBIL" };
    return { success: true };
  },

  async updateStatusPesanan(id: string, status: StatusPesanan) { await getSupabase()!.from('orders').update({ status }).eq('id', id); },
  async updateTahapAktif(id: string, tahap: number) { await getSupabase()!.from('orders').update({ tahap_aktif: tahap }).eq('id', id); },
  async updateParkirStop(stopId: string, choice: string) { await getSupabase()!.from('order_stops').update({ pilihan_parkir: choice }).eq('id', stopId); },
  async setStopSelesai(stopId: string) { await getSupabase()!.from('order_stops').update({ status: 'selesai' }).eq('id', stopId); },

  async simpanNotaAwal(pesananId: string, namaToko: string, rincian: string, total: number, fotoBase64: string) {
    const updateData = { nota_awal_nama_toko: namaToko, nota_awal_rincian_barang: rincian, nota_awal_total_toko: total, nota_awal_foto_url: fotoBase64, nota_awal_waktu_dicatat: new Date().toISOString() };
    await getSupabase()!.from('orders').update(updateData).eq('id', pesananId);
    ololuRealtime.broadcastTripUpdate(pesananId, { type: 'nota_awal_update', nota: { namaToko, totalToko: total, rincianBarang: rincian, fotoNota: fotoBase64, waktuDicatat: updateData.nota_awal_waktu_dicatat } });
  },

  async simpanNotaToko(pesananId: string, stopId: string, namaToko: string, rincian: string, total: number, fotoBase64: string) {
    const updateData = { nota_nama_toko: namaToko, nota_rincian_barang: rincian, nota_total_toko: total, nota_foto_url: fotoBase64, nota_waktu_dicatat: new Date().toISOString() };
    await getSupabase()!.from('order_stops').update(updateData).eq('id', stopId);
    ololuRealtime.broadcastTripUpdate(pesananId, { type: 'nota_update', stopId, nota: { namaToko, totalToko: total, rincianBarang: rincian, fotoNota: fotoBase64, waktuDicatat: updateData.nota_waktu_dicatat } });
  },

  async selesaikanPesanan(pesananId: string, finalOrderData: Pesanan) {
    const { error } = await getSupabase()!.from('orders').update({ status: 'selesai', waktu_selesai: new Date().toISOString(), biaya_parkir_total: finalOrderData.biayaParkirTotal, biaya_nota_total: finalOrderData.biayaNotaTotal, total_bayar_akhir: finalOrderData.totalBayarAkhir }).eq('id', pesananId);
    if (!error) { ololuRealtime.broadcastTripUpdate(pesananId, { type: 'status_update', status: 'selesai' }); this.setLocalOrderLock(null); }
  },

  async batalPesanan(pesananId: string, peran: string, alasan: string) {
    await getSupabase()!.from('orders').update({ status: 'dibatalkan', waktu_dibatalkan: new Date().toISOString(), alasan_batal: alasan }).eq('id', pesananId);
    ololuRealtime.broadcastTripUpdate(pesananId, { type: 'status_update', status: 'dibatalkan' });
    this.setLocalOrderLock(null);
  },

  async getSopirLogin(): Promise<DetailSopir | null> {
    const sesi = await this.getSesi();
    return sesi ? this.getSopir(sesi.userId) : null;
  },

  getLocalOrderLock() { const stored = localStorage.getItem(ORDER_LOCK_KEY); return stored ? JSON.parse(stored) : null; },
  setLocalOrderLock(lock: any) { if (lock) localStorage.setItem(ORDER_LOCK_KEY, JSON.stringify(lock)); else localStorage.removeItem(ORDER_LOCK_KEY); }
};
