/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// SINKRONISASI TIPE DATA UTAMA APLIKASI OLOLU

export type PeranPengguna = 'penumpang' | 'sopir' | 'admin';

export interface ProfilPengguna {
  id: string;
  nama: string;
  nomorHp: string;
  password?: string;
  peran: PeranPengguna;
  terverifikasi: boolean;
  tanggalDaftar: string;
  fotoProfil?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  isSubAdmin?: boolean;
  isSuspended?: boolean;
  created_at?: string;
}

export interface LogAudit {
  id: string;
  adminId: string;
  adminNama: string;
  aksi: string;
  detail: string;
  timestamp: string;
}

export interface DetailSopir {
  id: string;
  fotoKtp: string;
  fotoSim: string;
  fotoStnk: string;
  fotoKendaraan: string;
  platNomor: string;
  jenisMotor: string;
  jenisKendaraan: 'motor' | 'mobil';
  warnaKendaraan: string;
  bisaBarangBesar: boolean;
  disetujuiAdmin: boolean;
  ditolakAdmin: boolean;
  alasanDitolak?: string;
  statusOnline: boolean;
  saldoDompet: number;
  ratingRataRata: number;
  jumlahPesananSelesai: number;
  lokasiSaatIni?: { lat: number; lng: number };
}

export type JenisLayanan = 'ojek' | 'mobil' | 'makanan' | 'paket' | 'belanja' | 'cargo' | 'market' | 'lainnya';

export interface ItemBelanja {
  id: string;
  namaBarang: string;
  jumlah: number;
  perkiraanHarga: number;
}

export interface TujuanStop {
  id: string;
  alamat: string;
  lat: number;
  lng: number;
  urutan: number;
  daftarItem: ItemBelanja[];
  status: 'pending' | 'selesai';
  pilihanParkir: 'tidak_ada' | 'parkir_biasa' | 'parkir_pasar';
  nota?: {
    namaToko: string;
    rincianBarang: string;
    totalToko: number;
    fotoNota: string;
    waktuDicatat: string;
  };
}

export type StatusPesanan = 'mencari_sopir' | 'sopir_ditemukan' | 'diproses' | 'dalam_perjalanan' | 'selesai' | 'dibatalkan';

export interface Pesanan {
  id: string;
  nomorPesanan: string;
  jenisLayanan: JenisLayanan;
  idPenumpang: string;
  namaPenumpang: string;
  nomorHpPenumpang: string;
  idSopir?: string;
  namaSopir?: string;
  nomorHpSopir?: string;
  platNomorSopir?: string;
  
  asalAlamat: string;
  asalLat: number;
  asalLng: number;
  itemsAwal?: ItemBelanja[];
  notaAwal?: {
    namaToko: string;
    rincianBarang: string;
    totalToko: number;
    fotoNota: string;
    waktuDicatat: string;
  };
  daftarTujuan: TujuanStop[];
  
  jarakKm: number;
  tarifDasar: number;
  tarifPerKm: number;
  tarifMinimum: number;
  tambahanTujuan: number;
  tambahanItem: number;
  biayaLayananPersen: number;
  biayaParkirTotal: number;
  biayaNotaTotal: number;
  biayaTungguTotal: number;
  biayaMalamTambahan: number;
  durasiMenit: number;
  tarifPerjalananMurni: number;
  totalBayarAkhir: number;
  pembayaranTunai: boolean;
  
  waktuDibuat: string;
  waktuSopirDiterima?: string;
  waktuTibaJemput?: string;
  waktuMulaiJalan?: string;
  waktuSelesai?: string;
  waktuDibatalkan?: string;
  
  status: StatusPesanan;
  tahapAktif: number;
  riwayatLokasiSopir: { lat: number; lng: number; waktu: string }[];
}

export interface TransaksiDompet {
  id: string;
  idSopir: string;
  jenis: 'pendapatan' | 'potongan_jasa' | 'topup' | 'tarik_dana' | 'denda';
  jumlah: number;
  saldoAwal: number;
  saldoAkhir: number;
  deskripsi: string;
  buktiTransfer?: string;
  alasanPenolakan?: string;
  statusTarik?: 'menunggu' | 'disetujui' | 'ditolak';
  timestamp: string;
}

export interface LaporanDarurat {
  id: string;
  idPesanan: string;
  namaPelapor: string;
  nomorHpPelapor: string;
  peranPelapor: 'penumpang' | 'sopir';
  lat: number;
  lng: number;
  status: 'baru' | 'ditangani';
  timestamp: string;
}

export interface RatingUlasan {
  id: string;
  idPesanan: string;
  idSopir: string;
  namaPenumpang: string;
  bintang: number;
  ulasan: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  idPesanan: string;
  senderId: string;
  senderName: string;
  senderRole: 'penumpang' | 'sopir';
  message: string;
  voiceData?: string;
  photoData?: string;
  timestamp: string;
}

export interface PengaturanTarif {
  // Ojek Motor
  ojekTarifDasar: number;
  ojekTarifPerKm: number;
  ojekTarifPerKmJauh: number;
  ojekBatasKmJauh: number;
  ojekTarifMinimum: number;
  ojekTarifTungguPerMenit: number;
  ojekPersenJasa: number;
  ojekBatasKmTarifDasar: number;
  ojekBiayaPerStop: number;
  ojekTarifRushHour: number;
  ojekTarifMalam: number;
  ojekJarakMaksimum: number;
  layananOjekAktif: boolean;

  // Ololu Car
  mobilTarifDasar: number;
  mobilTarifPerKm: number;
  mobilTarifPerKmJauh: number;
  mobilBatasKmJauh: number;
  mobilTarifMinimum: number;
  mobilTarifTungguPerMenit: number;
  mobilPersenJasa: number;
  mobilBatasKmTarifDasar: number;
  mobilBiayaPerStop: number;
  mobilTarifRushHour: number;
  mobilTarifMalam: number;
  mobilJarakMaksimum: number;
  layananMobilAktif: boolean;

  // Food Antar
  makananTarifDasar: number;
  makananTarifPerKm: number;
  makananTarifPerKmJauh: number;
  makananBatasKmJauh: number;
  makananTarifMinimum: number;
  makananTarifTungguPerMenit: number;
  makananPersenJasa: number;
  makananBatasKmTarifDasar: number;
  makananBiayaPerStop: number;
  makananTarifRushHour: number;
  makananTarifMalam: number;
  makananJarakMaksimum: number;
  layananMakananAktif: boolean;

  // Kirim Paket
  paketTarifDasar: number;
  paketTarifPerKm: number;
  paketTarifPerKmJauh: number;
  paketBatasKmJauh: number;
  paketTarifMinimum: number;
  paketTarifTungguPerMenit: number;
  paketPersenJasa: number;
  paketBatasKmTarifDasar: number;
  paketBiayaPerStop: number;
  paketTarifRushHour: number;
  paketTarifMalam: number;
  paketJarakMaksimum: number;
  layananPaketAktif: boolean;

  // Belanja
  belanjaTarifDasar: number;
  belanjaTarifPerKm: number;
  belanjaTarifPerKmJauh: number;
  belanjaBatasKmJauh: number;
  belanjaTarifMinimum: number;
  belanjaTarifTungguPerMenit: number;
  belanjaPersenJasa: number;
  belanjaBatasKmTarifDasar: number;
  belanjaBiayaPerStop: number;
  belanjaTarifRushHour: number;
  belanjaTarifMalam: number;
  belanjaJarakMaksimum: number;
  layananBelanjaAktif: boolean;

  // Cargo (Logistik)
  cargoTarifDasar: number;
  cargoTarifPerKm: number;
  cargoTarifPerKmJauh: number;
  cargoBatasKmJauh: number;
  cargoTarifMinimum: number;
  cargoTarifTungguPerMenit: number;
  cargoPersenJasa: number;
  cargoBatasKmTarifDasar: number;
  cargoBiayaPerStop: number;
  cargoTarifRushHour: number;
  cargoTarifMalam: number;
  cargoJarakMaksimum: number;
  layananCargoAktif: boolean;

  // Market
  marketTarifDasar: number;
  marketTarifPerKm: number;
  marketTarifPerKmJauh: number;
  marketBatasKmJauh: number;
  marketTarifMinimum: number;
  marketTarifTungguPerMenit: number;
  marketPersenJasa: number;
  marketBatasKmTarifDasar: number;
  marketBiayaPerStop: number;
  marketTarifRushHour: number;
  marketTarifMalam: number;
  marketJarakMaksimum: number;
  layananMarketAktif: boolean;

  // Lainnya
  lainnyaTarifDasar: number;
  lainnyaTarifPerKm: number;
  lainnyaTarifPerKmJauh: number;
  lainnyaBatasKmJauh: number;
  lainnyaTarifMinimum: number;
  lainnyaPersenJasa: number;
  lainnyaBiayaPerStop: number;
  lainnyaTarifRushHour: number;
  lainnyaTarifMalam: number;
  lainnyaJarakMaksimum: number;
  layananLainnyaAktif: boolean;

  // Aturan Parkir
  biayaParkirBiasa: number;
  biayaParkirPasar: number;
  biayaPerStopTambahan: number;
  biayaKelebihanItem: number;

  // Jam Malam
  malamAktif: boolean;
  malamMulai: string;
  malamSelesai: string;
  malamTambahanFlat: number;

  // Rush Hour
  rushHourAktif: boolean;
  rushHourMulai: string;
  rushHourSelesai: string;

  // Pengaturan Jangkauan
  radiusPencarianSopirKm: number;
  jarakMaksimalOrderKm: number;
  saldoMinimalOnlineSopir: number;
  dendaBatalSopir: number;
  dendaBatalPenumpang: number;
  biayaAdminTopUp: number;
  biayaAdminTarik: number;
  waktuResponTawaran: number;
  batasMaksimalPencarianBerikutnya: number;
  intervalKirimLokasiSopir: number;
  biayaAdminPerjalanan: number;
  pengaliTarifPrioritas: number;

  // Kontrol Pendaftaran
  daftarMotorAktif: boolean;
  daftarMobilAktif: boolean;

  // Map & API
  mapProvider: 'google' | 'osm';
  googleApiLimit: number;
  googleApiUsageCount: number;
  googleMapsKey: string;
  fonnteToken: string;
}

export interface JadwalRushHour {
  id: string;
  nama: string;
  waktuMulai: string;
  waktuSelesai: string;
  persenKenaikan: number;
  aktif: boolean;
}
