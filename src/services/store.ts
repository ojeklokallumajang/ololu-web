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
  PeranPengguna
} from '../types';
import { ololuRealtime } from './supabaseClient';

// KOORDINAT SEKITAR ALUN-ALUN LUMAJANG (PUSAT OPERASI OLOLU)
export const KOORDINAT_LUMAJANG = { lat: -8.1331, lng: 113.2240 };

// PENGATURAN DEFAULT ADMIN
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

  rushHourAktif: false,
  rushHourMulai: "16:00",
  rushHourSelesai: "18:00",
  rushHourPersenKenaikan: 15,
  rushHourSchedules: [
    { id: 'rush-pagi', nama: 'Jam Sibuk Pagi', waktuMulai: '07:00', waktuSelesai: '09:00', persenKenaikan: 20, aktif: true },
    { id: 'rush-siang', nama: 'Jam Makan Siang', waktuMulai: '11:30', waktuSelesai: '13:30', persenKenaikan: 15, aktif: false },
    { id: 'rush-sore', nama: 'Sore Pulang Kerja', waktuMulai: '16:00', waktuSelesai: '18:30', persenKenaikan: 25, aktif: true }
  ]
};

// SIMULASI AKUN SOPIR BAWAAN AGAR SISTEM AUTOBID LANGSUNG BISA DIUJI
const SOPIR_MOCK_AWAL: DetailSopir[] = [
  {
    id: "sopir-joko",
    fotoKtp: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>KTP Joko</text></svg>",
    fotoSim: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>SIM Joko</text></svg>",
    fotoStnk: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>STNK Joko</text></svg>",
    fotoKendaraan: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>Motor Joko</text></svg>",
    platNomor: "N 4556 YZ",
    jenisMotor: "Honda Vario 150",
    bisaBarangBesar: true,
    disetujuiAdmin: true,
    ditolakAdmin: false,
    statusOnline: true,
    saldoDompet: 55000,
    ratingRataRata: 4.9,
    jumlahPesananSelesai: 142,
    lokasiSaatIni: { lat: -8.1310, lng: 113.2215 } // Sangat dekat Alun-alun
  },
  {
    id: "sopir-budi",
    fotoKtp: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>KTP Budi</text></svg>",
    fotoSim: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>SIM Budi</text></svg>",
    fotoStnk: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>STNK Budi</text></svg>",
    fotoKendaraan: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23ccc'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'>Motor Budi</text></svg>",
    platNomor: "N 2199 AX",
    jenisMotor: "Yamaha NMAX 155",
    bisaBarangBesar: false,
    disetujuiAdmin: true,
    ditolakAdmin: false,
    statusOnline: true,
    saldoDompet: 25000,
    ratingRataRata: 4.7,
    jumlahPesananSelesai: 88,
    lokasiSaatIni: { lat: -8.1350, lng: 113.2260 } // Dekat Alun-alun
  }
];

const PROFIL_MOCK_AWAL: ProfilPengguna[] = [
  {
    id: "sopir-joko",
    nama: "Joko Susilo",
    nomorHp: "628123456780",
    peran: "sopir",
    terverifikasi: true,
    tanggalDaftar: "2026-05-10T10:00:00-07:00"
  },
  {
    id: "sopir-budi",
    nama: "Budi Setiawan",
    nomorHp: "628123456781",
    peran: "sopir",
    terverifikasi: true,
    tanggalDaftar: "2026-06-15T11:30:00-07:00"
  },
  {
    id: "admin-ololu",
    nama: "Admin Utama",
    nomorHp: "6288212818616",
    peran: "admin",
    terverifikasi: true,
    tanggalDaftar: "2026-01-01T00:00:00-07:00"
  }
];

// LISTENER PUB/SUB UNTUK REAL-TIME UPDATE
type ListenerType = () => void;
const listeners: Set<ListenerType> = new Set();

export function subscribeToStore(listener: ListenerType) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifySubscribers() {
  listeners.forEach(cb => cb());
}

// FUNGSI UTAMA PENYIMPANAN LOCALSTORAGE DENGAN BACKUP MEMORY

const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // Gagal diam-diam jika dalam private browsing / sandbox
    }
  }
};

// LOAD ATAU INISIALISASI DATA
function loadData<T>(key: string, fallback: T): T {
  const stored = safeLocalStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function saveData<T>(key: string, data: T): void {
  safeLocalStorage.setItem(key, JSON.stringify(data));
  notifySubscribers();
}

// STATE IN-MEMORY
let pengaturans = loadData<PengaturanTarif>('ololu_pengaturan', DEFAULT_PENGATURAN_TARIF);
let profilPenggunas = loadData<ProfilPengguna[]>('ololu_profil', PROFIL_MOCK_AWAL);
let sopirDetails = loadData<DetailSopir[]>('ololu_sopir_detail', SOPIR_MOCK_AWAL);
let pesananList = loadData<Pesanan[]>('ololu_pesanan', []);
let transaksiList = loadData<TransaksiDompet[]>('ololu_transaksi', []);
let emergencyList = loadData<LaporanDarurat[]>('ololu_emergency', []);
let ratingList = loadData<RatingUlasan[]>('ololu_rating', []);
let chatMessagesList = loadData<ChatMessage[]>('ololu_chat_messages', []);
let sesiAktif = loadData<{ userId: string; role: PeranPengguna } | null>('ololu_sesi', null);

// REPOSITORY DATA (GETTER/SETTER)

export const OloluStore = {
  // SUBSCRIBE TO STORE FOR REALTIME UPDATES
  subscribeToStore(listener: () => void) {
    return subscribeToStore(listener);
  },

  // PENGATURAN TARIF & SISTEM
  getPengaturan(): PengaturanTarif {
    return pengaturans;
  },
  savePengaturan(config: PengaturanTarif) {
    pengaturans = config;
    saveData('ololu_pengaturan', pengaturans);
  },
  saveConfig(config: PengaturanTarif) {
    this.savePengaturan(config);
  },

  // SESI LOGIN UTAMA
  getSesi(): { userId: string; role: PeranPengguna } | null {
    return sesiAktif;
  },
  setSesi(sesi: { userId: string; role: PeranPengguna } | null) {
    sesiAktif = sesi;
    saveData('ololu_sesi', sesiAktif);
  },
  getProfilLogin(): ProfilPengguna | null {
    if (!sesiAktif) return null;
    return profilPenggunas.find(p => p.id === sesiAktif!.userId) || null;
  },
  getSopirLogin(): DetailSopir | null {
    if (!sesiAktif || sesiAktif.role !== 'sopir') return null;
    return sopirDetails.find(s => s.id === sesiAktif!.userId) || null;
  },

  // DATA PENGGUNA
  getProfil(id: string): ProfilPengguna | null {
    return profilPenggunas.find(p => p.id === id) || null;
  },
  getSopir(id: string): DetailSopir | null {
    return sopirDetails.find(s => s.id === id) || null;
  },
  getAllProfil(): ProfilPengguna[] {
    return profilPenggunas;
  },
  getAllSopir(): DetailSopir[] {
    return sopirDetails;
  },
  toggleProfilVerifikasi(id: string) {
    profilPenggunas = profilPenggunas.map(p => {
      if (p.id === id) {
        return { ...p, terverifikasi: !p.terverifikasi };
      }
      return p;
    });
    saveData('ololu_profil', profilPenggunas);
  },

  // REGISTRASI DAN LOGIN
  registerPengguna(nama: string, nomorHp: string, peran: PeranPengguna): ProfilPengguna {
    // Bersihkan nomor HP agar format 62xxx
    let cleanedPhone = nomorHp.replace(/[^0-9]/g, '');
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '62' + cleanedPhone.slice(1);
    } else if (cleanedPhone.startsWith('8')) {
      cleanedPhone = '62' + cleanedPhone;
    }

    // Cek apakah nomor sudah ada
    const existing = profilPenggunas.find(p => p.nomorHp === cleanedPhone);
    if (existing) {
      return existing;
    }

    const id = `${peran}-${Math.random().toString(36).substr(2, 9)}`;
    const profil: ProfilPengguna = {
      id,
      nama,
      nomorHp: cleanedPhone,
      peran,
      terverifikasi: true, // Auto verifikasi via simulasi/Fonnte OTP
      tanggalDaftar: new Date().toISOString()
    };

    profilPenggunas.push(profil);
    saveData('ololu_profil', profilPenggunas);

    if (peran === 'sopir') {
      const sopir: DetailSopir = {
        id,
        fotoKtp: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23eee'/><text x='10' y='50'>KTP BELUM DIUNGGAH</text></svg>",
        fotoSim: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23eee'/><text x='10' y='50'>SIM BELUM DIUNGGAH</text></svg>",
        fotoStnk: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23eee'/><text x='10' y='50'>STNK BELUM DIUNGGAH</text></svg>",
        fotoKendaraan: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23eee'/><text x='10' y='50'>KENDARAAN BELUM DIUNGGAH</text></svg>",
        platNomor: "",
        jenisMotor: "",
        bisaBarangBesar: false,
        disetujuiAdmin: false, // Wajib disetujui admin sebelum online!
        ditolakAdmin: false,
        statusOnline: false,
        saldoDompet: 0,
        ratingRataRata: 5.0,
        jumlahPesananSelesai: 0,
        lokasiSaatIni: { lat: KOORDINAT_LUMAJANG.lat + (Math.random() - 0.5) * 0.01, lng: KOORDINAT_LUMAJANG.lng + (Math.random() - 0.5) * 0.01 }
      };
      sopirDetails.push(sopir);
      saveData('ololu_sopir_detail', sopirDetails);
    }

    return profil;
  },

  updateSopirDokumen(sopirId: string, updates: Partial<DetailSopir>) {
    sopirDetails = sopirDetails.map(s => {
      if (s.id === sopirId) {
        return { ...s, ...updates, disetujuiAdmin: false, ditolakAdmin: false }; // Reset persetujuan pasca edit berkas
      }
      return s;
    });
    saveData('ololu_sopir_detail', sopirDetails);
  },

  verifikasiSopir(sopirId: string, setuju: boolean, alasan?: string) {
    sopirDetails = sopirDetails.map(s => {
      if (s.id === sopirId) {
        return {
          ...s,
          disetujuiAdmin: setuju,
          ditolakAdmin: !setuju,
          alasanDitolak: setuju ? undefined : alasan
        };
      }
      return s;
    });
    saveData('ololu_sopir_detail', sopirDetails);
  },

  toggleOnlineSopir(sopirId: string): { success: boolean; error?: string } {
    const sopir = sopirDetails.find(s => s.id === sopirId);
    if (!sopir) return { success: false, error: "Sopir tidak ditemukan" };

    if (!sopir.statusOnline) {
      // Cek 3 SYARAT WAJIB ONLINE:
      // 1. Akun disetujui admin
      if (!sopir.disetujuiAdmin) {
        return { success: false, error: "Akun Anda belum disetujui atau sedang dalam peninjauan oleh Admin Ololu." };
      }
      // 2. Saldo dompet >= Rp 5.000
      if (sopir.saldoDompet < pengaturans.saldoMinimalOnlineSopir) {
        return { success: false, error: `Saldo Dompet Anda kurang dari batas minimum Rp ${pengaturans.saldoMinimalOnlineSopir.toLocaleString('id-ID')}. Silakan isi saldo Anda.` };
      }
      // 3. Tidak sedang ada pesanan aktif
      const pesananAktif = pesananList.some(p => p.idSopir === sopirId && p.status !== 'selesai' && p.status !== 'dibatalkan');
      if (pesananAktif) {
        return { success: false, error: "Anda masih memiliki pesanan aktif yang belum diselesaikan!" };
      }
    } else {
      // Jika mau offline, cek apakah sedang ada pesanan aktif
      const pesananAktif = pesananList.some(p => p.idSopir === sopirId && p.status !== 'selesai' && p.status !== 'dibatalkan');
      if (pesananAktif) {
        return { success: false, error: "Tidak boleh offline saat sedang membawa pesanan aktif!" };
      }
    }

    sopirDetails = sopirDetails.map(s => {
      if (s.id === sopirId) {
        return { ...s, statusOnline: !s.statusOnline };
      }
      return s;
    });
    saveData('ololu_sopir_detail', sopirDetails);
    return { success: true };
  },

  matikanOnlineSopirPaksa(sopirId: string) {
    sopirDetails = sopirDetails.map(s => {
      if (s.id === sopirId) {
        return { ...s, statusOnline: false };
      }
      return s;
    });
    saveData('ololu_sopir_detail', sopirDetails);
  },

  // PESANAN & TRANSAKSI
  getAllPesanan(): Pesanan[] {
    return pesananList;
  },
  getPesanan(id: string): Pesanan | null {
    return pesananList.find(p => p.id === id) || null;
  },
  getPesananAktifPenumpang(penumpangId: string): Pesanan | null {
    return pesananList.find(p => p.idPenumpang === penumpangId && p.status !== 'selesai' && p.status !== 'dibatalkan') || null;
  },
  getPesananAktifSopir(sopirId: string): Pesanan | null {
    return pesananList.find(p => p.idSopir === sopirId && p.status !== 'selesai' && p.status !== 'dibatalkan') || null;
  },

  buatPesanan(
    jenisLayanan: 'ojek' | 'makanan' | 'paket' | 'barang_besar',
    idPenumpang: string,
    namaPenumpang: string,
    nomorHpPenumpang: string,
    asalAlamat: string,
    asalLat: number,
    asalLng: number,
    daftarTujuan: Omit<TujuanStop, 'status' | 'pilihanParkir'>[],
    jarakKm: number,
    pembayaranTunai: boolean
  ): Pesanan {
    // Cari tarif sesuai layanan
    let tarifDasar = 0;
    let tarifPerKm = 0;
    let tarifMinimum = 0;
    let persenJasa = 0;
    let batasKmTarifDasar = 3;

    switch (jenisLayanan) {
      case 'ojek':
        tarifDasar = pengaturans.ojekTarifDasar;
        tarifPerKm = pengaturans.ojekTarifPerKm;
        tarifMinimum = pengaturans.ojekTarifMinimum;
        persenJasa = pengaturans.ojekPersenJasa;
        batasKmTarifDasar = pengaturans.ojekBatasKmTarifDasar ?? 3;
        break;
      case 'makanan':
        tarifDasar = pengaturans.makananTarifDasar;
        tarifPerKm = pengaturans.makananTarifPerKm;
        tarifMinimum = pengaturans.makananTarifMinimum;
        persenJasa = pengaturans.makananPersenJasa;
        batasKmTarifDasar = pengaturans.makananBatasKmTarifDasar ?? 3;
        break;
      case 'paket':
        tarifDasar = pengaturans.paketTarifDasar;
        tarifPerKm = pengaturans.paketTarifPerKm;
        tarifMinimum = pengaturans.paketTarifMinimum;
        persenJasa = pengaturans.paketPersenJasa;
        batasKmTarifDasar = pengaturans.paketBatasKmTarifDasar ?? 3;
        break;
      case 'barang_besar':
        tarifDasar = pengaturans.barangBesarTarifDasar;
        tarifPerKm = pengaturans.barangBesarTarifPerKm;
        tarifMinimum = pengaturans.barangBesarTarifMinimum;
        persenJasa = pengaturans.barangBesarPersenJasa;
        batasKmTarifDasar = pengaturans.barangBesarBatasKmTarifDasar ?? 3;
        break;
    }

    // HITUNG BIAYA LAYANAN TAMBAHAN
    // 1. Tambahan Stop (Stop 2, 3, 4, 5 masing-masing dikenakan biaya tambahan stop)
    const jumlahStop = daftarTujuan.length;
    const tambahanTujuan = jumlahStop > 1 ? (jumlahStop - 1) * pengaturans.biayaPerStopTambahan : 0;

    // 2. Tambahan Item Belanja (> 5 item per stop kena biaya kelebihan item)
    let tambahanItem = 0;
    daftarTujuan.forEach(t => {
      let totalItem = 0;
      t.daftarItem?.forEach(it => { totalItem += it.jumlah; });
      if (totalItem > 5) {
        tambahanItem += (totalItem - 5) * pengaturans.biayaKelebihanItem;
      }
    });

    // 3. Tarif Perjalanan Murni (Jarak)
    const jarakBulat = Math.ceil(jarakKm);
    let tarifPerjalananMurni = tarifDasar;
    if (jarakBulat > batasKmTarifDasar) {
      const sisaJarakBulat = jarakBulat - batasKmTarifDasar;
      tarifPerjalananMurni += sisaJarakBulat * tarifPerKm;
    }
    if (tarifPerjalananMurni < tarifMinimum) {
      tarifPerjalananMurni = tarifMinimum;
    }

    // 4. Kenaikan Rush Hour (jika aktif)
    if (pengaturans.rushHourAktif) {
      const sekarang = new Date();
      const jamMenit = `${sekarang.getHours().toString().padStart(2, '0')}:${sekarang.getMinutes().toString().padStart(2, '0')}`;
      let appliedRushHourPct = 0;

      // Check legacy single-schedule config
      if (jamMenit >= pengaturans.rushHourMulai && jamMenit <= pengaturans.rushHourSelesai) {
        appliedRushHourPct = pengaturans.rushHourPersenKenaikan;
      }

      // Check multi-schedule custom config
      if (pengaturans.rushHourSchedules && pengaturans.rushHourSchedules.length > 0) {
        pengaturans.rushHourSchedules.forEach(schedule => {
          if (schedule.aktif && jamMenit >= schedule.waktuMulai && jamMenit <= schedule.waktuSelesai) {
            if (schedule.persenKenaikan > appliedRushHourPct) {
              appliedRushHourPct = schedule.persenKenaikan;
            }
          }
        });
      }

      if (appliedRushHourPct > 0) {
        tarifPerjalananMurni += (tarifPerjalananMurni * appliedRushHourPct / 100);
      }
    }

    // Total Bayar Akhir (Awal sebelum parkir dan nota toko ditambahkan sopir)
    const totalBayarAkhir = Math.round(tarifPerjalananMurni + tambahanTujuan + tambahanItem);

    const nomorPesanan = `OL-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

    const stopsLengkap: TujuanStop[] = daftarTujuan.map((t, idx) => ({
      ...t,
      urutan: idx + 1,
      status: 'pending',
      pilihanParkir: 'tidak_ada'
    }));

    const pesanan: Pesanan = {
      id: `pesanan-${Math.random().toString(36).substr(2, 9)}`,
      nomorPesanan,
      jenisLayanan,
      idPenumpang,
      namaPenumpang,
      nomorHpPenumpang,
      asalAlamat,
      asalLat,
      asalLng,
      daftarTujuan: stopsLengkap,
      jarakKm,
      tarifDasar,
      tarifPerKm,
      tarifMinimum,
      tambahanTujuan,
      tambahanItem,
      biayaLayananPersen: persenJasa,
      biayaParkirTotal: 0,
      biayaNotaTotal: 0,
      tarifPerjalananMurni,
      totalBayarAkhir,
      pembayaranTunai,
      waktuDibuat: new Date().toISOString(),
      status: 'mencari_sopir',
      tahapAktif: 0,
      riwayatLokasiSopir: []
    };

    pesananList.push(pesanan);
    saveData('ololu_pesanan', pesananList);

    // Broadcast real-time order via Supabase Realtime / local pubsub
    ololuRealtime.broadcastNewOrder(pesanan);

    // TRIGGER AUTOBID SIMULASI
    triggerAutobidSimulation(pesanan.id);

    return pesanan;
  },

  terimaPesananSopir(pesananId: string, sopirId: string): { success: boolean; error?: string } {
    const pesanan = pesananList.find(p => p.id === pesananId);
    if (!pesanan) return { success: false, error: "Pesanan tidak ditemukan" };
    if (pesanan.status !== 'mencari_sopir') return { success: false, error: "Pesanan sudah diambil oleh sopir lain!" };

    const sopir = sopirDetails.find(s => s.id === sopirId);
    if (!sopir) return { success: false, error: "Data sopir tidak valid" };

    // Validasi syarat terima order
    if (!sopir.statusOnline) return { success: false, error: "Status Anda harus ONLINE untuk menerima pesanan." };
    if (sopir.saldoDompet < pengaturans.saldoMinimalOnlineSopir) {
      return { success: false, error: `Saldo Dompet Anda kurang dari batas minimum Rp ${pengaturans.saldoMinimalOnlineSopir.toLocaleString('id-ID')}` };
    }
    const oAktif = pesananList.some(p => p.idSopir === sopirId && p.status !== 'selesai' && p.status !== 'dibatalkan');
    if (oAktif) return { success: false, error: "Anda masih memiliki pesanan aktif lainnya yang belum selesai!" };

    // Update pesanan
    pesanan.idSopir = sopir.id;
    pesanan.namaSopir = profilPenggunas.find(p => p.id === sopirId)?.nama || "Sopir Ololu";
    pesanan.nomorHpSopir = profilPenggunas.find(p => p.id === sopirId)?.nomorHp || "";
    pesanan.platNomorSopir = sopir.platNomor;
    pesanan.status = 'diproses';
    pesanan.waktuSopirDiterima = new Date().toISOString();
    pesanan.riwayatLokasiSopir = [{ lat: sopir.lokasiSaatIni?.lat || asalGPSLat(pesanan), lng: sopir.lokasiSaatIni?.lng || asalGPSLng(pesanan), waktu: new Date().toISOString() }];

    saveData('ololu_pesanan', pesananList);

    // SIMULASIKAN PERGERAKAN GPS SOPIR OTOMATIS KE PENUMPANG
    simulasiPergerakanGpsSopir(pesanan.id);

    return { success: true };
  },

  batalPesanan(pesananId: string, dibatalkanOleh: 'penumpang' | 'sopir' | 'admin', alasan: string) {
    pesananList = pesananList.map(p => {
      if (p.id === pesananId) {
        const pBatal = {
          ...p,
          status: 'dibatalkan' as StatusPesanan,
          waktuDibatalkan: new Date().toISOString(),
          alasanBatal: `${dibatalkanOleh.toUpperCase()}: ${alasan}`
        };

        // Jika kena denda batal (Sopir membatalkan atau Penumpang membatalkan sesudah sopir jalan)
        if (dibatalkanOleh === 'sopir' && p.idSopir) {
          const sId = p.idSopir;
          // Kurangi saldo sopir denda batal
          sopirDetails = sopirDetails.map(s => {
            if (s.id === sId) {
              const saldoBaru = Math.max(0, s.saldoDompet - pengaturans.dendaBatalSopir);
              // Catat log denda
              tambahTransaksiDompet(sId, 'denda', pengaturans.dendaBatalSopir, s.saldoDompet, saldoBaru, `Denda pembatalan order aktif ${p.nomorPesanan}`);
              
              // Jika saldo < 5000, otomatis offline
              const isOnline = saldoBaru >= pengaturans.saldoMinimalOnlineSopir ? s.statusOnline : false;

              return { ...s, saldoDompet: saldoBaru, statusOnline: isOnline };
            }
            return s;
          });
          saveData('ololu_sopir_detail', sopirDetails);
        }

        return pBatal;
      }
      return p;
    });
    saveData('ololu_pesanan', pesananList);
  },

  updatePilihanParkir(pesananId: string, stopId: string, pilihan: 'tidak_ada' | 'parkir_biasa' | 'parkir_pasar') {
    pesananList = pesananList.map(p => {
      if (p.id === pesananId) {
        const stopsSelesai = p.daftarTujuan.map(s => {
          if (s.id === stopId) {
            return { ...s, pilihanParkir: pilihan };
          }
          return s;
        });

        // Hitung ulang total biaya parkir
        let totalParkir = 0;
        stopsSelesai.forEach(s => {
          if (s.pilihanParkir === 'parkir_biasa') totalParkir += pengaturans.biayaParkirBiasa;
          if (s.pilihanParkir === 'parkir_pasar') totalParkir += pengaturans.biayaParkirPasar;
        });

        // Hitung ulang total bayar
        const totalBayarAkhir = Math.round(p.tarifPerjalananMurni + p.tambahanTujuan + p.tambahanItem + totalParkir + p.biayaNotaTotal);

        return {
          ...p,
          daftarTujuan: stopsSelesai,
          biayaParkirTotal: totalParkir,
          totalBayarAkhir
        };
      }
      return p;
    });
    saveData('ololu_pesanan', pesananList);
  },

  simpanNotaToko(pesananId: string, stopId: string, namaToko: string, rincianBarang: string, totalToko: number, fotoNotaBase64: string) {
    pesananList = pesananList.map(p => {
      if (p.id === pesananId) {
        const stopsSelesai = p.daftarTujuan.map(s => {
          if (s.id === stopId) {
            return {
              ...s,
              nota: {
                namaToko,
                rincianBarang,
                totalToko,
                fotoNota: fotoNotaBase64 || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ccc'/><text y='50'>Nota Simulasi</text></svg>",
                waktuDicatat: new Date().toISOString()
              }
            };
          }
          return s;
        });

        // Hitung ulang total nota
        let totalNota = 0;
        stopsSelesai.forEach(s => {
          if (s.nota) totalNota += s.nota.totalToko;
        });

        const totalBayarAkhir = Math.round(p.tarifPerjalananMurni + p.tambahanTujuan + p.tambahanItem + p.biayaParkirTotal + totalNota);

        return {
          ...p,
          daftarTujuan: stopsSelesai,
          biayaNotaTotal: totalNota,
          totalBayarAkhir
        };
      }
      return p;
    });
    saveData('ololu_pesanan', pesananList);
  },

  tandaiStopSelesai(pesananId: string, stopId: string) {
    pesananList = pesananList.map(p => {
      if (p.id === pesananId) {
        const stops = p.daftarTujuan.map(s => {
          if (s.id === stopId) {
            return { ...s, status: 'selesai' as const };
          }
          return s;
        });

        // Tentukan tahapAktif berikutnya
        let tahapAktif = p.tahapAktif;
        const totalStop = p.daftarTujuan.length;
        const indexStopSelesai = p.daftarTujuan.findIndex(s => s.id === stopId);
        
        if (indexStopSelesai === tahapAktif && tahapAktif < totalStop - 1) {
          tahapAktif += 1;
        }

        return {
          ...p,
          daftarTujuan: stops,
          tahapAktif
        };
      }
      return p;
    });
    saveData('ololu_pesanan', pesananList);
  },

  ubahStatusPesanan(pesananId: string, statusBaru: StatusPesanan) {
    pesananList = pesananList.map(p => {
      if (p.id === pesananId) {
        const pUbah = { ...p, status: statusBaru };
        if (statusBaru === 'dalam_perjalanan') {
          pUbah.waktuMulaiJalan = new Date().toISOString();
        }
        return pUbah;
      }
      return p;
    });
    saveData('ololu_pesanan', pesananList);
  },

  selesaikanPesanan(pesananId: string) {
    const pesanan = pesananList.find(p => p.id === pesananId);
    if (!pesanan || pesanan.status === 'selesai' || pesanan.status === 'dibatalkan') return;

    // Hitung Pendapatan Sopir dan Potongan Jasa Aplikasi
    const totalBayar = pesanan.totalBayarAkhir; // total uang yang dibayar penumpang
    const biayaJasaAplikasi = Math.round((pesanan.tarifPerjalananMurni + pesanan.tambahanTujuan + pesanan.tambahanItem) * pesanan.biayaLayananPersen / 100);
    const bersihSopir = totalBayar - biayaJasaAplikasi;

    const sopirId = pesanan.idSopir!;

    // UPDATE DATA SOPIR & DOMPET (PENTING!)
    sopirDetails = sopirDetails.map(s => {
      if (s.id === sopirId) {
        const saldoAwal = s.saldoDompet;
        
        // Logika Saldo:
        // Pembayaran Tunai: Sopir terima uang tunai fisik dari Penumpang. 
        // Jadi, Saldo Dompet sopir DIPOTONG biaya jasa aplikasi.
        // Pembayaran Dompet: Saldo Dompet Penumpang dipotong (tidak wajib diisi di mock, dianggap sopir terima transfer di dompet).
        // Untuk mock, kita asumsikan jika pembayaran Tunai -> Dompet Sopir didebit biaya jasa aplikasi.
        // Jika Pembayaran Non-Tunai (Dompet Ololu) -> Saldo Sopir bertambah bersihSopir.
        let saldoAkhir = saldoAwal;
        
        if (pesanan.pembayaranTunai) {
          // Potong biaya jasa saja
          saldoAkhir = Math.max(0, saldoAwal - biayaJasaAplikasi);
          tambahTransaksiDompet(
            sopirId, 
            'potongan_jasa', 
            biayaJasaAplikasi, 
            saldoAwal, 
            saldoAkhir, 
            `Potongan Jasa Ololu ${pesanan.biayaLayananPersen}% atas order ${pesanan.nomorPesanan}`
          );
        } else {
          // Tambah pendapatan bersihSopir
          saldoAkhir = saldoAwal + bersihSopir;
          tambahTransaksiDompet(
            sopirId, 
            'pendapatan', 
            totalBayar, 
            saldoAwal, 
            saldoAwal + totalBayar, 
            `Pendapatan bruto atas order ${pesanan.nomorPesanan}`
          );
          tambahTransaksiDompet(
            sopirId, 
            'potongan_jasa', 
            biayaJasaAplikasi, 
            saldoAwal + totalBayar, 
            saldoAkhir, 
            `Potongan Jasa Ololu ${pesanan.biayaLayananPersen}% atas order ${pesanan.nomorPesanan}`
          );
        }

        // Cek apakah saldo di bawah batas online
        const isOnline = saldoAkhir >= pengaturans.saldoMinimalOnlineSopir ? s.statusOnline : false;

        return {
          ...s,
          saldoDompet: saldoAkhir,
          statusOnline: isOnline,
          jumlahPesananSelesai: s.jumlahPesananSelesai + 1
        };
      }
      return s;
    });

    // Tandai pesanan sebagai selesai
    pesananList = pesananList.map(p => {
      if (p.id === pesananId) {
        return {
          ...p,
          status: 'selesai' as const,
          waktuSelesai: new Date().toISOString()
        };
      }
      return p;
    });

    saveData('ololu_sopir_detail', sopirDetails);
    saveData('ololu_pesanan', pesananList);
  },

  // RATING & ULASAN
  tambahRating(pesananId: string, idSopir: string, namaPenumpang: string, bintang: number, ulasan: string) {
    const r: RatingUlasan = {
      id: `rating-${Math.random().toString(36).substr(2, 9)}`,
      idPesanan: pesananId,
      idSopir,
      namaPenumpang,
      bintang,
      ulasan,
      timestamp: new Date().toISOString()
    };
    ratingList.push(r);
    saveData('ololu_rating', ratingList);

    // Hitung ulang rating rata-rata sopir
    const ratingsSopir = ratingList.filter(rt => rt.idSopir === idSopir);
    const avg = ratingsSopir.reduce((acc, cur) => acc + cur.bintang, 0) / ratingsSopir.length;

    sopirDetails = sopirDetails.map(s => {
      if (s.id === idSopir) {
        return { ...s, ratingRataRata: parseFloat(avg.toFixed(1)) };
      }
      return s;
    });
    saveData('ololu_sopir_detail', sopirDetails);
  },

  getAllRating(): RatingUlasan[] {
    return ratingList;
  },

  // CHAT INTERNAL PESANAN (TERSAMPAN 31 HARI)
  getChatMessages(pesananId: string): ChatMessage[] {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const originalLength = chatMessagesList.length;
    // Bersihkan pesan yang lebih lama dari 31 hari
    chatMessagesList = chatMessagesList.filter(msg => new Date(msg.timestamp).getTime() > thirtyOneDaysAgo);
    if (chatMessagesList.length !== originalLength) {
      saveData('ololu_chat_messages', chatMessagesList);
    }
    return chatMessagesList.filter(msg => msg.idPesanan === pesananId);
  },

  addIncomingChatMessage(msg: ChatMessage) {
    if (!chatMessagesList.some(m => m.id === msg.id)) {
      chatMessagesList.push(msg);
      saveData('ololu_chat_messages', chatMessagesList);
      this.triggerListeners();
    }
  },

  sendChatMessage(pesananId: string, senderId: string, senderName: string, senderRole: 'penumpang' | 'sopir', message: string): ChatMessage {
    const newMsg: ChatMessage = {
      id: `chat-${Math.random().toString(36).substr(2, 9)}`,
      idPesanan: pesananId,
      senderId,
      senderName,
      senderRole,
      message,
      timestamp: new Date().toISOString()
    };
    chatMessagesList.push(newMsg);
    saveData('ololu_chat_messages', chatMessagesList);

    // Broadcast the message via Supabase Realtime
    try {
      ololuRealtime.broadcastChatMessage(pesananId, newMsg);
    } catch (err) {
      console.warn('[Realtime] Failed to broadcast message:', err);
    }

    // Simulasi balasan otomatis sopir jika pengirim adalah penumpang dan sopirnya adalah simulasi
    if (senderRole === 'penumpang') {
      const order = pesananList.find(p => p.id === pesananId);
      if (order && order.idSopir && (order.idSopir.startsWith('sopir-simulasi') || order.idSopir === 'sopir-joko' || order.idSopir === 'sopir-budi')) {
        if (!sesiAktif || sesiAktif.role !== 'sopir' || sesiAktif.userId !== order.idSopir) {
          setTimeout(() => {
            const replies = [
              "Siap kak, saya sedang menuju lokasi penjemputan ya. 🛵",
              "Oke kak, pesanan sedang saya siapkan. Mohon ditunggu ya! 👍",
              "Pesan diterima kak, saya jalan sekarang.",
              "Siap bosku, segera merapat ke lokasi!",
              "Baik kak, mohon ditunggu sebentar ya."
            ];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            
            chatMessagesList = loadData<ChatMessage[]>('ololu_chat_messages', []);
            const replyMsg: ChatMessage = {
              id: `chat-${Math.random().toString(36).substr(2, 9)}`,
              idPesanan: pesananId,
              senderId: order.idSopir!,
              senderName: order.namaSopir || "Sopir Mitra",
              senderRole: 'sopir',
              message: randomReply,
              timestamp: new Date().toISOString()
            };
            chatMessagesList.push(replyMsg);
            saveData('ololu_chat_messages', chatMessagesList);

            // Broadcast the simulated reply as well
            try {
              ololuRealtime.broadcastChatMessage(pesananId, replyMsg);
            } catch (err) {
              console.warn('[Realtime] Failed to broadcast reply:', err);
            }

            // Trigger listeners to update views
            this.triggerListeners();
          }, 2000);
        }
      }
    }

    this.triggerListeners();
    return newMsg;
  },

  // DOMPET OPERATIONS FOR ADMIN & DRIVER
  getTransaksiSopir(sopirId: string): TransaksiDompet[] {
    return transaksiList.filter(t => t.idSopir === sopirId);
  },
  getAllTransaksi(): TransaksiDompet[] {
    return transaksiList;
  },

  ajukanTarikDana(sopirId: string, jumlah: number): { success: boolean; error?: string } {
    const s = sopirDetails.find(sd => sd.id === sopirId);
    if (!s) return { success: false, error: "Sopir tidak terdaftar" };
    if (s.saldoDompet < jumlah + pengaturans.biayaAdminTarik) {
      return { success: false, error: `Saldo tidak mencukupi untuk penarikan sebesar Rp ${jumlah.toLocaleString('id-ID')} ditambah biaya admin penarikan Rp ${pengaturans.biayaAdminTarik.toLocaleString('id-ID')}` };
    }

    const t: TransaksiDompet = {
      id: `tx-${Math.random().toString(36).substr(2, 9)}`,
      idSopir: sopirId,
      jenis: 'tarik_dana',
      jumlah,
      saldoAwal: s.saldoDompet,
      saldoAkhir: s.saldoDompet, // Belum berkurang sebelum disetujui admin
      deskripsi: `Pengajuan tarik dana via transfer Bank/E-Wallet`,
      statusTarik: 'menunggu',
      timestamp: new Date().toISOString()
    };
    transaksiList.push(t);
    saveData('ololu_transaksi', transaksiList);
    return { success: true };
  },

  prosesTarikDanaAdmin(txId: string, setuju: boolean, alasanAtauBukti: string) {
    const tx = transaksiList.find(t => t.id === txId);
    if (!tx || tx.statusTarik !== 'menunggu') return;

    if (setuju) {
      // Potong saldo sopir
      const totalPotong = tx.jumlah + pengaturans.biayaAdminTarik;
      sopirDetails = sopirDetails.map(s => {
        if (s.id === tx.idSopir) {
          const saldoAwal = s.saldoDompet;
          const saldoAkhir = Math.max(0, saldoAwal - totalPotong);
          
          tx.saldoAwal = saldoAwal;
          tx.saldoAkhir = saldoAkhir;
          tx.statusTarik = 'disetujui';
          tx.buktiTransfer = alasanAtauBukti || 'Bukti Transfer diupload Admin';
          tx.deskripsi = `Penarikan dana disetujui Admin. Selesai ditransfer.`;

          const isOnline = saldoAkhir >= pengaturans.saldoMinimalOnlineSopir ? s.statusOnline : false;

          return { ...s, saldoDompet: saldoAkhir, statusOnline: isOnline };
        }
        return s;
      });
    } else {
      tx.statusTarik = 'ditolak';
      tx.alasanPenolakan = alasanAtauBukti || 'Alasan tidak spesifik';
      tx.deskripsi = `Pengajuan penarikan dana DITOLAK oleh Admin. Alasan: ${tx.alasanPenolakan}`;
    }

    saveData('ololu_transaksi', transaksiList);
    saveData('ololu_sopir_detail', sopirDetails);
  },

  topUpSaldoSopir(sopirId: string, jumlah: number, metode: string) {
    sopirDetails = sopirDetails.map(s => {
      if (s.id === sopirId) {
        const saldoAwal = s.saldoDompet;
        const saldoAkhir = saldoAwal + jumlah;
        tambahTransaksiDompet(sopirId, 'topup', jumlah, saldoAwal, saldoAkhir, `Top up saldo mandiri via ${metode}`);
        return { ...s, saldoDompet: saldoAkhir };
      }
      return s;
    });
    saveData('ololu_sopir_detail', sopirDetails);
  },

  // EMERGENCIES (TOMBOL PANIK)
  tambahEmergency(orderId: string, reporterName: string, reporterPhone: string, role: 'penumpang' | 'sopir', lat: number, lng: number): LaporanDarurat {
    const rep: LaporanDarurat = {
      id: `panic-${Math.random().toString(36).substr(2, 9)}`,
      idPesanan: orderId,
      namaPelapor: reporterName,
      nomorHpPelapor: reporterPhone,
      peranPelapor: role,
      lat: lat || KOORDINAT_LUMAJANG.lat,
      lng: lng || KOORDINAT_LUMAJANG.lng,
      status: 'baru',
      timestamp: new Date().toISOString()
    };
    emergencyList.push(rep);
    saveData('ololu_emergency', emergencyList);

    // Mainkan audio warning dan flash merah di Admin panel via broadcast realtime
    try {
      const audio = new Audio("https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg");
      audio.volume = 0.5;
      audio.play();
    } catch (e) {
      // Gagal muter audio karena restriksi browser diam saja
    }

    return rep;
  },

  getAllEmergency(): LaporanDarurat[] {
    return emergencyList;
  },

  tanganiEmergency(id: string) {
    emergencyList = emergencyList.map(e => {
      if (e.id === id) {
        return { ...e, status: 'ditangani' as const };
      }
      return e;
    });
    saveData('ololu_emergency', emergencyList);
  },

  // FONNTE WHATSAPP OTP SIMULATOR
  kirimFonnteOtp(nomorHp: string): string {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `[OLOLU OTP] Kode OTP pendaftaran akun OLOLU Anda adalah: ${otp}. Masukkan kode ini di halaman verifikasi web. Rahasiakan kode ini!`;
    
    // Simpan OTP sementara di sessionStorage untuk validasi pendaftaran
    try {
      sessionStorage.setItem(`ololu_otp_${nomorHp}`, otp);
      console.log(`[FONNTE SENDER ${6288212818616}] Mengirim OTP ${otp} ke ${nomorHp}`);
    } catch (e) {}

    // REAL WHATSAPP CALL (Non-blocking async fetch ke Fonnte jika jaringan tersedia)
    fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": "EMTbGPgY8zfmrVGs3idM"
      },
      body: new URLSearchParams({
        "target": nomorHp,
        "message": message,
        "countryCode": "62"
      })
    })
    .then(r => r.json())
    .then(data => {
      console.log("Fonnte API Response:", data);
    })
    .catch(err => {
      console.warn("Fonnte API Fetch gagal (Mungkin offline/blocked), OTP simulasi tetap berjalan:", err);
    });

    return otp;
  },

  verifikasiOtp(nomorHp: string, inputOtp: string): boolean {
    try {
      const stored = sessionStorage.getItem(`ololu_otp_${nomorHp}`);
      if (stored === inputOtp || inputOtp === "999999") { // 999999 adalah bypass master-code untuk kemudahan testing
        sessionStorage.removeItem(`ololu_otp_${nomorHp}`);
        return true;
      }
    } catch (e) {}
    return false;
  }
};

// HELPER TRANSAKSI DOMPET INTERNAL
function tambahTransaksiDompet(sopirId: string, jenis: TransaksiDompet['jenis'], jumlah: number, saldoAwal: number, saldoAkhir: number, deskripsi: string) {
  const tx: TransaksiDompet = {
    id: `tx-${Math.random().toString(36).substr(2, 9)}`,
    idSopir: sopirId,
    jenis,
    jumlah,
    saldoAwal,
    saldoAkhir,
    deskripsi,
    timestamp: new Date().toISOString()
  };
  transaksiList.push(tx);
  saveData('ololu_transaksi', transaksiList);
}

// HELPER AMBIL TITIK LOKASI ASAL
function asalGPSLat(p: Pesanan): number { return p.asalLat || KOORDINAT_LUMAJANG.lat; }
function asalGPSLng(p: Pesanan): number { return p.asalLng || KOORDINAT_LUMAJANG.lng; }

// METODE SIMULASI PERGERAKAN GPS SOPIR SECARA REALTIME
function simulasiPergerakanGpsSopir(pesananId: string) {
  let tick = 0;
  const intervalId = setInterval(() => {
    pesananList = loadData<Pesanan[]>('ololu_pesanan', []);
    const pIdx = pesananList.findIndex(p => p.id === pesananId);
    if (pIdx === -1) {
      clearInterval(intervalId);
      return;
    }
    const p = pesananList[pIdx];
    if (p.status === 'selesai' || p.status === 'dibatalkan') {
      clearInterval(intervalId);
      return;
    }

    tick++;
    let lat = p.asalLat;
    let lng = p.asalLng;

    // Hitung posisi sopir bergerak menuju tujuan berdasarkan statusnya
    if (p.status === 'sopir_ditemukan' || p.status === 'diproses') {
      // Sopir jalan dari titik mock awal mendekat ke titik jemput (asalLat, asalLng)
      // Kita interpolasikan dari titik mock sopir ke asal
      const targetLat = p.asalLat;
      const targetLng = p.asalLng;
      const startLat = targetLat + 0.003; // Datang dari jarak 300 meter
      const startLng = targetLng - 0.003;
      
      const ratio = Math.min(tick / 5, 1);
      lat = startLat + (targetLat - startLat) * ratio;
      lng = startLng + (targetLng - startLng) * ratio;

      if (ratio === 1) {
        // Otomatis ubah status ke dalam_perjalanan (sampai di titik jemput)
        p.status = 'dalam_perjalanan';
        p.waktuMulaiJalan = new Date().toISOString();
        tick = 0; // Reset tick untuk perjalanan ke tujuan berikutnya
      }
    } else if (p.status === 'dalam_perjalanan') {
      // Sopir berjalan melewati stop demi stop
      const stopTarget = p.daftarTujuan[p.tahapAktif];
      if (stopTarget) {
        const startLat = p.tahapAktif === 0 ? p.asalLat : p.daftarTujuan[p.tahapAktif - 1].lat;
        const startLng = p.tahapAktif === 0 ? p.asalLng : p.daftarTujuan[p.tahapAktif - 1].lng;
        
        const targetLat = stopTarget.lat;
        const targetLng = stopTarget.lng;

        const ratio = Math.min(tick / 6, 1);
        lat = startLat + (targetLat - startLat) * ratio;
        lng = startLng + (targetLng - startLng) * ratio;

        if (ratio === 1) {
          // Sampai di stop
          tick = 0; // Reset tick untuk stop berikutnya / akhir
          
          // Jika ojek atau paket langsung selesaikan stop tersebut
          if (p.jenisLayanan !== 'makanan') {
            stopTarget.status = 'selesai';
            const totalStop = p.daftarTujuan.length;
            if (p.tahapAktif < totalStop - 1) {
              p.tahapAktif += 1;
            } else {
              // Jika semua stop selesai, ubah status order jadi selesai
              // (Untuk kenyamanan interaksi, biarkan sopir asli yang menekan "SELESAIKAN ORDER" di HP-nya jika diuji,
              //  namun jika sopir ini aslinya digerakkan simulasi, kita tunggu 5 detik lalu selesaikan otomatis!)
              if (p.idSopir?.startsWith('sopir-simulasi')) {
                setTimeout(() => {
                  OloluStore.selesaikanPesanan(p.id);
                }, 3000);
              }
            }
          }
        }
      }
    }

    // Catat riwayat titik lokasi sopir
    p.riwayatLokasiSopir.push({ lat, lng, waktu: new Date().toISOString() });
    
    // Perbarui lokasi aktual sopir di daftar sopir agar sinkron
    if (p.idSopir) {
      sopirDetails = sopirDetails.map(s => {
        if (s.id === p.idSopir) {
          return { ...s, lokasiSaatIni: { lat, lng } };
        }
        return s;
      });
      saveData('ololu_sopir_detail', sopirDetails);
    }

    pesananList[pIdx] = p;
    saveData('ololu_pesanan', pesananList);

  }, 4000); // Bergerak setiap 4 detik
}

// METODE AUTOBID SIMULATOR
function triggerAutobidSimulation(pesananId: string) {
  setTimeout(() => {
    pesananList = loadData<Pesanan[]>('ololu_pesanan', []);
    const p = pesananList.find(op => op.id === pesananId);
    if (!p || p.status !== 'mencari_sopir') return;

    // Cari sopir online yang memenuhi syarat
    // (Budi atau Joko yang disimulasikan online di Lumajang)
    const sopirSesuai = sopirDetails.find(s => {
      const matchOnline = s.statusOnline && s.disetujuiAdmin && s.saldoDompet >= pengaturans.saldoMinimalOnlineSopir;
      const matchKemampuan = p.jenisLayanan !== 'barang_besar' || s.bisaBarangBesar;
      const pAktif = pesananList.some(ap => ap.idSopir === s.id && ap.status !== 'selesai' && ap.status !== 'dibatalkan');
      return matchOnline && matchKemampuan && !pAktif;
    });

    if (sopirSesuai) {
      // Ada sopir online, tawarkan ke mereka.
      // Jika pengguna adalah Sopir login yang sedang online, biarkan ia menekan tombol Terima.
      // Namun, jika dalam 8 detik tidak ada yang menerima (misal pengguna sedang di halaman Penumpang),
      // maka sistem simulasi akan otomatis menunjuk sopir joko atau budi untuk meng-accept agar perjalanan berjalan otomatis!
      setTimeout(() => {
        const pCek = pesananList.find(op => op.id === pesananId);
        if (pCek && pCek.status === 'mencari_sopir') {
          // Cari tahu jika pengguna aktif sekarang login sebagai sopir dan menolak/belum menerima
          const curSesi = OloluStore.getSesi();
          if (curSesi && curSesi.role === 'sopir' && curSesi.userId === sopirSesuai.id) {
            // Pengguna sedang login sebagai sopir yang ditargetkan, jangan auto-accept, beri kesempatan menekan!
            return;
          }

          // Auto-accept oleh sopir simulasi
          OloluStore.terimaPesananSopir(pesananId, sopirSesuai.id);
          console.log(`[AUTOBID SIMULATED] Order ${p.nomorPesanan} diterima otomatis oleh ${sopirSesuai.id} dalam 8 detik.`);
        }
      }, 8000);
    } else {
      // Jika tidak ada sopir asli kita yang online, buat sopir bayangan instan agar simulasi tidak mandek!
      setTimeout(() => {
        const pCek = pesananList.find(op => op.id === pesananId);
        if (pCek && pCek.status === 'mencari_sopir') {
          const mockSopirId = `sopir-simulasi-${Math.floor(100 + Math.random() * 900)}`;
          const mockSopirProfil: ProfilPengguna = {
            id: mockSopirId,
            nama: "Achmad Shodiq (Mitra Ololu)",
            nomorHp: "6289987654321",
            peran: "sopir",
            terverifikasi: true,
            tanggalDaftar: new Date().toISOString()
          };
          const mockSopirDetail: DetailSopir = {
            id: mockSopirId,
            fotoKtp: "", fotoSim: "", fotoStnk: "", fotoKendaraan: "",
            platNomor: "N 3491 YX",
            jenisMotor: "Honda Beat FI",
            bisaBarangBesar: p.jenisLayanan === 'barang_besar',
            disetujuiAdmin: true,
            ditolakAdmin: false,
            statusOnline: true,
            saldoDompet: 25000,
            ratingRataRata: 4.8,
            jumlahPesananSelesai: 43,
            lokasiSaatIni: { lat: p.asalLat + 0.002, lng: p.asalLng - 0.002 }
          };

          profilPenggunas.push(mockSopirProfil);
          sopirDetails.push(mockSopirDetail);
          saveData('ololu_profil', profilPenggunas);
          saveData('ololu_sopir_detail', sopirDetails);

          OloluStore.terimaPesananSopir(pesananId, mockSopirId);
          console.log(`[AUTOBID SIMULATED] Tidak ada sopir online. Membuat sopir bayangan ${mockSopirDetail.platNomor} untuk kelancaran tes.`);
        }
      }, 6000);
    }
  }, 1000);
}
