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
  isSubAdmin?: boolean; // Menandai jika user adalah admin tambahan
}

export interface LogAudit {
  id: string;
  adminId: string;
  adminNama: string;
  aksi: string; // Misal: "Mengubah Tarif Ojek", "Menyetujui Sopir"
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
  jenisMotor: string; // Tipe spesifik (Vario, Avanza, dll)
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

export type JenisLayanan = 'ojek' | 'mobil' | 'makanan' | 'paket' | 'barang_besar' | 'langganan';

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
    fotoNota: string; // URL base64 simulasi
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
  
  // Rute Perjalanan
  asalAlamat: string;
  asalLat: number;
  asalLng: number;
  itemsAwal?: ItemBelanja[]; // Daftar belanja di lokasi awal (Toko/Resto)
  daftarTujuan: TujuanStop[]; // Maksimal 5 stop untuk makanan/belanja
  
  // Biaya & Tarif
  jarakKm: number;
  tarifDasar: number;
  tarifPerKm: number;
  tarifMinimum: number;
  tambahanTujuan: number; // Biaya tambahan karena mampir-mampir
  tambahanItem: number; // Biaya tambahan karena jumlah item melebihi batas
  biayaLayananPersen: number; // Biaya potongan jasa aplikasi
  biayaParkirTotal: number;
  biayaNotaTotal: number;
  tarifPerjalananMurni: number; // Jarak * tarifPerKm dst
  totalBayarAkhir: number; // Jumlah yang harus dibayar customer
  pembayaranTunai: boolean; // True jika tunai langsung ke sopir, false jika via Dompet Ololu
  
  // Log Waktu
  waktuDibuat: string;
  waktuSopirDiterima?: string;
  waktuMulaiJalan?: string;
  waktuSelesai?: string;
  waktuDibatalkan?: string;
  
  // Status & Riwayat Lokasi
  status: StatusPesanan;
  tahapAktif: number; // Index tujuan aktif (0 s/d daftarTujuan.length - 1)
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
  bintang: number; // 1 s/d 5
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
  voiceData?: string; // Base64 audio data
  photoData?: string; // Base64 image data
  timestamp: string;
}

export interface PengaturanTarif {
  // Tarif Ojek Orang
  ojekTarifDasar: number;
  ojekTarifPerKm: number;
  ojekTarifMinimum: number;
  ojekPersenJasa: number;
  ojekBatasKmTarifDasar: number; // KM berlakunya tarif dasar (contoh: 3)
  ojekBiayaPerStop: number;

  // Tarif Mobil (Ololu-Car)
  mobilTarifDasar: number;
  mobilTarifPerKm: number;
  mobilTarifMinimum: number;
  mobilPersenJasa: number;
  mobilBatasKmTarifDasar: number;
  mobilBiayaPerStop: number;

  // Tarif Makanan & Belanja
  makananTarifDasar: number;
  makananTarifPerKm: number;
  makananTarifMinimum: number;
  makananPersenJasa: number;
  makananBatasKmTarifDasar: number; // KM berlakunya tarif dasar (contoh: 3)
  makananBiayaPerStop: number;

  // Tarif Paket Kilat
  paketTarifDasar: number;
  paketTarifPerKm: number;
  paketTarifMinimum: number;
  paketPersenJasa: number;
  paketBatasKmTarifDasar: number; // KM berlakunya tarif dasar (contoh: 3)
  paketBiayaPerStop: number;

  // Tarif Barang Besar
  barangBesarTarifDasar: number;
  barangBesarTarifPerKm: number;
  barangBesarTarifMinimum: number;
  barangBesarPersenJasa: number;
  barangBesarBatasKmTarifDasar: number; // KM berlakunya tarif dasar (contoh: 3)
  barangBesarBiayaPerStop: number;

  // Aturan Parkir (Sistem Parkir Baru)
  biayaParkirBiasa: number;
  biayaParkirPasar: number;

  // Biaya Tambahan Lainnya
  biayaPerStopTambahan: number; // Tambahan biaya per stop (mulai stop ke-2 dst)
  biayaKelebihanItem: number; // Biaya jika > 5 item per stop

  // Pengaturan Jangkauan & Aturan
  radiusPencarianSopirKm: number;
  saldoMinimalOnlineSopir: number; // Rp 5.000
  dendaBatalSopir: number;
  dendaBatalPenumpang: number;
  biayaAdminTopUp: number;
  biayaAdminTarik: number;
  waktuResponTawaran: number; // detik
  batasMaksimalPencarianBerikutnya: number; // detik
  intervalKirimLokasiSopir: number; // detik
  biayaAdminPerjalanan: number; // Rp
  pengaliTarifPrioritas: number; // pengali tarif (contoh: 1.2)

  // Saklar Layanan (Aktif/Nonaktif)
  layananOjekAktif: boolean;
  layananMakananAktif: boolean;
  layananPaketAktif: boolean;
  layananBarangBesarAktif: boolean;
  layananLanggananAktif: boolean;

  // Kontrol Pendaftaran
  daftarMotorAktif: boolean;
  daftarMobilAktif: boolean;

  // Rush Hour (Jam Sibuk)
  rushHourAktif: boolean;
  rushHourMulai: string; // "16:00"
  rushHourSelesai: string; // "18:00"
  rushHourPersenKenaikan: number; // contoh: 15%
  rushHourSchedules?: JadwalRushHour[];
}

export interface JadwalRushHour {
  id: string;
  nama: string;
  waktuMulai: string; // "16:00"
  waktuSelesai: string; // "18:00"
  persenKenaikan: number; // 15
  aktif: boolean;
}
