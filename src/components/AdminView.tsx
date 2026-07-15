/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OloluStore, KOORDINAT_LUMAJANG } from '../services/store';
import { GOOGLE_MAPS_KEY } from './SplashMapKey';
import {
  Pesanan,
  DetailSopir,
  ProfilPengguna,
  LaporanDarurat,
  TransaksiDompet,
  RatingUlasan,
  PengaturanTarif
} from '../types';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin
} from '@vis.gl/react-google-maps';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend
} from 'recharts';
import {
  ShieldAlert,
  Users,
  Briefcase,
  TrendingUp,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Settings,
  Star,
  Activity,
  AlertTriangle,
  Play,
  Ban,
  Clock,
  Menu,
  ChevronRight,
  Eye,
  Camera,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2
} from 'lucide-react';
import { ReusableTable, ColumnDef, FilterDef } from './ReusableTable';
import { downloadMonthlyExcel } from '../utils/excelExport';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<'stats' | 'sopir' | 'penumpang' | 'pesanan' | 'dompet' | 'tarif' | 'darurat' | 'rating'>('stats');
  
  // STATE DATA REALTIME
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [sopirList, setSopirList] = useState<DetailSopir[]>([]);
  const [profilList, setProfilList] = useState<ProfilPengguna[]>([]);
  const [emergencyList, setEmergencyList] = useState<LaporanDarurat[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiDompet[]>([]);
  const [ratingList, setRatingList] = useState<RatingUlasan[]>([]);
  const [config, setConfig] = useState<PengaturanTarif>(OloluStore.getPengaturan());

  // UI DETAIL EXPANSIONS
  const [selectedOrder, setSelectedOrder] = useState<Pesanan | null>(null);
  const [selectedSopir, setSelectedSopir] = useState<DetailSopir | null>(null);
  const [complaintFilter, setComplaintFilter] = useState<string>('semua');
  
  // FORM EDIT TARIF STATE
  const [tempConfig, setTempConfig] = useState<PengaturanTarif>(OloluStore.getPengaturan());

  // MONTHLY REPORT EXPORT STATE
  const [selectedExportMonth, setSelectedExportMonth] = useState('2026-07');

  // EMERGENCIES AUDIO ALARM SYSTEM
  const [hasNewEmergency, setHasNewEmergency] = useState(false);

  useEffect(() => {
    const syncData = () => {
      setPesananList(OloluStore.getAllPesanan());
      setSopirList(OloluStore.getAllSopir());
      setProfilList(OloluStore.getAllProfil());
      setEmergencyList(OloluStore.getAllEmergency());
      setTransaksiList(OloluStore.getAllTransaksi());
      setRatingList(OloluStore.getAllRating());
      
      const conf = OloluStore.getPengaturan();
      setConfig(conf);

      // Cek apakah ada laporan darurat aktif berstatus 'baru'
      const unhandled = OloluStore.getAllEmergency().some(e => e.status === 'baru');
      setHasNewEmergency(unhandled);
    };

    syncData();
    const unsubscribe = OloluStore.subscribeToStore(syncData);
    return () => unsubscribe();
  }, []);

  // SYNTHESIZE AUDIO WARNING UNTUK ALARM PANIK DARURAT (MANDATORI)
  useEffect(() => {
    let audioInterval: any;
    if (hasNewEmergency) {
      // Bunyi alarm setiap 1.5 detik
      audioInterval = setInterval(() => {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Pitch A5 Tinggi
          
          gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start();
          osc.stop(audioCtx.currentTime + 0.7);
        } catch (e) {}
      }, 1500);
    }
    return () => clearInterval(audioInterval);
  }, [hasNewEmergency]);

  // --- RECHARTS CHART DATA PREPARATION ---
  const chartDataHariIni = (() => {
    const hourlyBuckets = [
      { jam: '08:00', totalOrder: 5, '🛵 Ojek': 2, '🍔 Makanan': 2, '📦 Paket': 1 },
      { jam: '10:00', totalOrder: 12, '🛵 Ojek': 5, '🍔 Makanan': 5, '📦 Paket': 2 },
      { jam: '12:00', totalOrder: 19, '🛵 Ojek': 8, '🍔 Makanan': 8, '📦 Paket': 3 },
      { jam: '14:00', totalOrder: 15, '🛵 Ojek': 6, '🍔 Makanan': 6, '📦 Paket': 3 },
      { jam: '16:00', totalOrder: 26, '🛵 Ojek': 11, '🍔 Makanan': 10, '📦 Paket': 5 },
      { jam: '18:00', totalOrder: 22, '🛵 Ojek': 9, '🍔 Makanan': 9, '📦 Paket': 4 },
      { jam: '20:00', totalOrder: 14, '🛵 Ojek': 6, '🍔 Makanan': 5, '📦 Paket': 3 },
      { jam: '22:00', totalOrder: 8, '🛵 Ojek': 3, '🍔 Makanan': 3, '📦 Paket': 2 }
    ];

    pesananList.forEach(p => {
      if (!p.waktuDibuat) return;
      try {
        const date = new Date(p.waktuDibuat);
        const hour = date.getHours();
        let bucketIdx = 0;
        if (hour < 9) bucketIdx = 0;
        else if (hour < 11) bucketIdx = 1;
        else if (hour < 13) bucketIdx = 2;
        else if (hour < 15) bucketIdx = 3;
        else if (hour < 17) bucketIdx = 4;
        else if (hour < 19) bucketIdx = 5;
        else if (hour < 21) bucketIdx = 6;
        else bucketIdx = 7;

        hourlyBuckets[bucketIdx].totalOrder += 1;
        if (p.jenisLayanan === 'ojek') {
          hourlyBuckets[bucketIdx]['🛵 Ojek'] += 1;
        } else if (p.jenisLayanan === 'makanan') {
          hourlyBuckets[bucketIdx]['🍔 Makanan'] += 1;
        } else {
          hourlyBuckets[bucketIdx]['📦 Paket'] += 1;
        }
      } catch (err) {
        console.warn(err);
      }
    });

    return hourlyBuckets;
  })();

  const chartDataMingguan = (() => {
    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const baselineRevenue = [350000, 420000, 390000, 520000, 490000, 680000, 710000];

    const weeklyData = days.map((day, idx) => {
      return {
        hari: day,
        'Pendapatan Mitra': baselineRevenue[idx],
        'Komisi Ololu': Math.round(baselineRevenue[idx] * 0.1),
        'Pertumbuhan Kumulatif': 0
      };
    });

    const todayIndex = (new Date().getDay() + 6) % 7; // Senin = 0, Minggu = 6
    let addedRevenue = 0;
    pesananList.forEach(p => {
      if (p.status === 'selesai') {
        addedRevenue += p.totalBayarAkhir;
      }
    });

    weeklyData[todayIndex]['Pendapatan Mitra'] += addedRevenue;
    weeklyData[todayIndex]['Komisi Ololu'] += Math.round(addedRevenue * 0.1);

    let runningTotal = 0;
    weeklyData.forEach(item => {
      runningTotal += item['Pendapatan Mitra'] + item['Komisi Ololu'];
      item['Pertumbuhan Kumulatif'] = runningTotal;
    });

    return weeklyData;
  })();

  // --- ACTIONS ---
  
  // VERIFIKASI SOPIR
  const handleApproveSopir = (sopirId: string, setuju: boolean) => {
    if (setuju) {
      OloluStore.verifikasiSopir(sopirId, true);
      alert("Akun Sopir Berhasil Disetujui! Sopir kini bisa login dan mengaktifkan mode Online.");
    } else {
      const alasan = prompt("Masukkan alasan penolakan berkas:") || "Dokumen kurang terbaca jelas";
      OloluStore.verifikasiSopir(sopirId, false, alasan);
      alert("Berkas lamaran sopir ditolak.");
    }
  };

  // MATIKAN ONLINE SOPIR SECARA PAKSA (REMOTE)
  const handleForceOffline = (sopirId: string) => {
    OloluStore.matikanOnlineSopirPaksa(sopirId);
    alert("Sopir telah berhasil dipaksa Offline.");
  };

  const driverColumns = useMemo<ColumnDef<DetailSopir>[]>(() => [
    {
      id: 'nama',
      header: 'Sopir',
      sortable: true,
      getSortValue: (s) => {
        const prof = profilList.find(p => p.id === s.id);
        return prof?.nama || '';
      },
      accessor: (s) => {
        const prof = profilList.find(p => p.id === s.id);
        return (
          <div className="flex flex-col text-left">
            <span className="font-bold text-gray-900 flex items-center gap-1.5">
              {prof?.nama || 'Sopir'}
              {s.statusOnline ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" title="Online"></span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 inline-block" title="Offline"></span>
              )}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">{prof?.nomorHp || '-'}</span>
          </div>
        );
      }
    },
    {
      id: 'motor',
      header: 'Kendaraan',
      sortable: true,
      getSortValue: (s) => s.jenisMotor,
      accessor: (s) => (
        <div className="flex flex-col text-left">
          <span className="font-semibold text-gray-700">{s.jenisMotor || '-'}</span>
          <span className="text-[10px] text-gray-400 font-mono uppercase">{s.platNomor || '-'}</span>
        </div>
      )
    },
    {
      id: 'saldo',
      header: 'Saldo',
      sortable: true,
      getSortValue: (s) => s.saldoDompet,
      accessor: (s) => (
        <span className="font-bold text-[#B8941F] font-mono">
          Rp {s.saldoDompet.toLocaleString('id-ID')}
        </span>
      )
    },
    {
      id: 'performa',
      header: 'Performa',
      sortable: true,
      getSortValue: (s) => s.ratingRataRata,
      accessor: (s) => (
        <div className="flex flex-col items-start gap-0.5 text-left">
          <span className="text-[10px] font-bold text-[#046A38] bg-[#E6F4EC] px-1 py-0.2 rounded flex items-center gap-0.5">
            ★ {s.ratingRataRata}
          </span>
          <span className="text-[9px] text-gray-400">{s.jumlahPesananSelesai} Order</span>
        </div>
      )
    },
    {
      id: 'aksi',
      header: 'Aksi',
      accessor: (s) => (
        <div className="flex flex-col gap-1">
          {s.statusOnline ? (
            <button
              onClick={() => handleForceOffline(s.id)}
              className="text-[9px] bg-red-50 hover:bg-red-100 text-[#DC2626] font-bold px-1.5 py-0.5 rounded border border-red-200 transition-all text-center"
            >
              Force Offline
            </button>
          ) : (
            <span className="text-[10px] text-gray-400 italic">Offline</span>
          )}
        </div>
      )
    }
  ], [profilList]);

  const driverFilters = useMemo<FilterDef<DetailSopir>[]>(() => [
    {
      id: 'status',
      label: 'Status Online',
      options: [
        { label: 'Online 🟢', value: 'online' },
        { label: 'Offline ⚪', value: 'offline' }
      ],
      filterFn: (s, val) => val === 'online' ? s.statusOnline : !s.statusOnline
    },
    {
      id: 'barangBesar',
      label: 'Kapasitas',
      options: [
        { label: 'Bisa Barang Besar 📦', value: 'bisa' },
        { label: 'Motor Standar 🛵', value: 'standar' }
      ],
      filterFn: (s, val) => val === 'bisa' ? s.bisaBarangBesar : !s.bisaBarangBesar
    }
  ], []);

  const passengerColumns = useMemo<ColumnDef<ProfilPengguna>[]>(() => [
    {
      id: 'nama',
      header: 'Nama',
      sortable: true,
      getSortValue: (p) => p.nama,
      accessor: (p) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-gray-900 flex items-center gap-1">
            {p.nama}
            {p.terverifikasi && (
              <span className="text-[8px] bg-emerald-50 text-[#046A38] border border-emerald-200 px-1 py-0.1 rounded-full font-bold">✓ VERIFIED</span>
            )}
          </span>
          <span className="text-[10px] text-gray-400 font-mono">ID: {p.id}</span>
        </div>
      )
    },
    {
      id: 'hp',
      header: 'WhatsApp',
      sortable: true,
      getSortValue: (p) => p.nomorHp,
      accessor: (p) => (
        <span className="font-mono text-gray-700">{p.nomorHp}</span>
      )
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      getSortValue: (p) => p.terverifikasi,
      accessor: (p) => (
        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
          p.terverifikasi ? 'bg-emerald-50 text-[#046A38]' : 'bg-red-50 text-red-600'
        }`}>
          {p.terverifikasi ? 'AKTIF' : 'BLOCKED'}
        </span>
      )
    },
    {
      id: 'aksi',
      header: 'Aksi',
      accessor: (p) => (
        <button
          onClick={() => {
            OloluStore.toggleProfilVerifikasi(p.id);
            setProfilList([...OloluStore.getAllProfil()]);
            alert(`Status verifikasi ${p.nama} berhasil diubah.`);
          }}
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
            p.terverifikasi 
              ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200' 
              : 'bg-emerald-50 hover:bg-emerald-100 text-[#046A38] border-emerald-200'
          }`}
        >
          {p.terverifikasi ? 'Tangguhkan' : 'Aktifkan'}
        </button>
      )
    }
  ], []);

  const passengerFilters = useMemo<FilterDef<ProfilPengguna>[]>(() => [
    {
      id: 'verif',
      label: 'Status Verifikasi',
      options: [
        { label: 'Terverifikasi ✓', value: 'verified' },
        { label: 'Belum Terverifikasi ✗', value: 'unverified' }
      ],
      filterFn: (p, val) => val === 'verified' ? !!p.terverifikasi : !p.terverifikasi
    }
  ], []);

  // PROSES PENARIKAN DANA
  const handleApproveWithdraw = (txId: string, setuju: boolean) => {
    if (setuju) {
      const bukti = prompt("Masukkan No Referensi Transfer / Bukti Transfer E-Wallet:") || "TRX-OK-BANKLUMAJANG";
      OloluStore.prosesTarikDanaAdmin(txId, true, bukti);
      alert("Pengajuan Tarik Dana Disetujui & Status Transfer Berhasil.");
    } else {
      const alasan = prompt("Alasan penolakan pencairan:") || "Saldo tidak mencukupi atau bank gangguan";
      OloluStore.prosesTarikDanaAdmin(txId, false, alasan);
      alert("Pencairan dana ditolak.");
    }
  };

  // PENANGANAN LAPORAN PANIK
  const handleResolveEmergency = (id: string) => {
    OloluStore.tanganiEmergency(id);
    alert("Laporan darurat ditandai sudah ditangani.");
  };

  // HELPERS FOR CUSTOM RUSH HOUR SCHEDULES
  const addRushHourSchedule = () => {
    const currentSchedules = tempConfig.rushHourSchedules || [];
    const newSchedule = {
      id: `rush-${Date.now()}`,
      nama: 'Jadwal Jam Sibuk Baru',
      waktuMulai: '17:00',
      waktuSelesai: '19:00',
      persenKenaikan: 15,
      aktif: true
    };
    setTempConfig({
      ...tempConfig,
      rushHourSchedules: [...currentSchedules, newSchedule]
    });
  };

  const deleteRushHourSchedule = (id: string) => {
    const currentSchedules = tempConfig.rushHourSchedules || [];
    setTempConfig({
      ...tempConfig,
      rushHourSchedules: currentSchedules.filter(s => s.id !== id)
    });
  };

  const updateRushHourSchedule = (id: string, field: string, val: any) => {
    const currentSchedules = tempConfig.rushHourSchedules || [];
    setTempConfig({
      ...tempConfig,
      rushHourSchedules: currentSchedules.map(s => {
        if (s.id === id) {
          return { ...s, [field]: val };
         }
         return s;
      })
    });
  };

  // SIMPAN PENGATURAN BARU
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    OloluStore.saveConfig(tempConfig);
    setConfig(tempConfig);
    alert("🎉 PENGATURAN SISTEM & TARIF BARU BERHASIL DISIMPAN!");
  };

  // SINKRONISASI PENGATURAN FIELD EDIT
  const updateTempConfig = (field: keyof PengaturanTarif, val: any) => {
    setTempConfig({ ...tempConfig, [field]: val });
  };

  // --- STATS COMPUTATION ---
  const totalPendapatanKotor = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => acc + cur.totalBayarAkhir, 0);
  
  // Hitung Pendapatan Jasa Aplikasi (Commission)
  const totalBiayaJasaMurni = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => {
    const jasa = Math.round((cur.tarifPerjalananMurni + cur.tambahanTujuan + cur.tambahanItem) * cur.biayaLayananPersen / 100);
    return acc + jasa;
  }, 0);

  const sopirOnlineCount = sopirList.filter(s => s.statusOnline).length;
  const penumpangCount = profilList.filter(p => p.peran === 'penumpang').length;
  const pendingTarikList = transaksiList.filter(t => t.jenis === 'tarik_dana' && t.statusTarik === 'menunggu');

  // RATING RATA-RATA GLOBAL
  const totalRatingVal = ratingList.reduce((acc, cur) => acc + cur.bintang, 0);
  const avgRatingGlobal = ratingList.length > 0 ? parseFloat((totalRatingVal / ratingList.length).toFixed(1)) : 5.0;

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative font-sans">
      
      {/* =====================================================================
          GIANT FLASHING RED BANNER UNTUK ALARM DARURAT LAPORAN PANIK
          ===================================================================== */}
      {hasNewEmergency && (
        <div className="bg-[#DC2626] text-white p-3.5 text-center font-black animate-pulse flex items-center justify-center space-x-2 z-50 sticky top-[68px] border-b-2 border-yellow-400">
          <AlertTriangle className="animate-bounce" size={20} />
          <span className="text-xs tracking-wider uppercase">🚨 ALARM AKTIF: ADA LAPORAN PANIK BARU MASUK! 🚨</span>
          <button
            onClick={() => setActiveTab('darurat')}
            className="bg-white text-[#DC2626] font-bold text-[9px] px-2 py-1 rounded-md shadow-sm border border-yellow-400"
          >
            LIHAT LOKASI
          </button>
        </div>
      )}

      {/* ADMIN TITLE BANNER */}
      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] space-y-1">
        <div className="flex items-center space-x-2">
          <Activity size={18} className="text-[#D4AF37] animate-pulse" />
          <h1 className="text-lg font-black font-sans tracking-wide">OLOLU CONTROL PANEL</h1>
        </div>
        <p className="text-[10px] text-emerald-100">
          Selamat datang, Administrator Ololu Lumajang • Kontrol penuh operasional 24 Jam.
        </p>
      </div>

      {/* DASHBOARD TAB SEGMENTED CONTROL */}
      <div className="flex bg-white border-b overflow-x-auto whitespace-nowrap scrollbar-none sticky top-[138px] z-30">
        {[
          { id: 'stats', label: '📊 Statistik' },
          { id: 'sopir', label: '🛵 Mitra Sopir' },
          { id: 'penumpang', label: '👤 Penumpang' },
          { id: 'pesanan', label: '📋 Riwayat Order' },
          { id: 'dompet', label: '💸 Tarik Dana' },
          { id: 'tarif', label: '⚙️ Tarif & Layanan' },
          { id: 'darurat', label: '🚨 SOS Darurat' },
          { id: 'rating', label: '⭐ Rating Ulasan' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              setSelectedOrder(null);
              setSelectedSopir(null);
            }}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-1 ${
              activeTab === t.id
                ? 'border-[#046A38] text-[#046A38] bg-[#E6F4EC]'
                : 'border-transparent text-[#6B7280] hover:text-[#046A38]'
            }`}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">

        {/* =====================================================================
            TAB 1: DASHBOARD STATISTIK UTAMA
            ===================================================================== */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            
            {/* GRID RINGKASAN DATA */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              {/* Pesanan Hari Ini */}
              <div className="bg-white p-3.5 rounded-xl border-l-4 border-[#046A38] shadow-xs space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">PESANAN SELESAI</span>
                <p className="text-xl font-black text-gray-800">{pesananList.filter(p=>p.status==='selesai').length}</p>
                <span className="text-[9px] text-gray-400">Total order terekam</span>
              </div>

              {/* Pendapatan Kas Jasa Aplikasi */}
              <div className="bg-white p-3.5 rounded-xl border-l-4 border-[#D4AF37] shadow-xs space-y-1">
                <span className="text-[10px] text-[#046A38] font-bold uppercase">PENDAPATAN BIAYA JASA</span>
                <p className="text-xl font-black text-[#B8941F]">
                  Rp {totalBiayaJasaMurni.toLocaleString('id-ID')}
                </p>
                <span className="text-[9px] text-gray-400">Kas bersih Ololu</span>
              </div>

              {/* Sopir Online */}
              <div className="bg-white p-3.5 rounded-xl border-l-4 border-emerald-500 shadow-xs space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">SOPIR ONLINE AKTIF</span>
                <p className="text-xl font-black text-gray-800 flex items-center space-x-1">
                  <span>{sopirOnlineCount}</span>
                  <span className="h-2 w-2 rounded-full bg-[#059669] inline-block animate-ping"></span>
                </p>
                <span className="text-[9px] text-gray-400">Siap menerima autobid</span>
              </div>

              {/* Total Penumpang */}
              <div className="bg-white p-3.5 rounded-xl border-l-4 border-yellow-500 shadow-xs space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">TOTAL PENUMPANG</span>
                <p className="text-xl font-black text-gray-800">{penumpangCount}</p>
                <span className="text-[9px] text-gray-400">Pengguna terdaftar</span>
              </div>
            </div>

            {/* EKSPOR LAPORAN BULANAN (EXCEL) */}
            <div className="bg-gradient-to-r from-[#046A38] to-[#0B9F59] p-4 rounded-xl border border-emerald-600 shadow-sm text-left text-white space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold flex items-center gap-1.5 text-white">
                    <FileSpreadsheet size={16} className="text-[#D4AF37]" />
                    <span>Unduh Laporan Bulanan (Excel)</span>
                  </h4>
                  <p className="text-[11px] text-emerald-50 leading-relaxed max-w-md">
                    Format Microsoft Excel (.xls) multi-sheet, lengkap dengan Tab Ringkasan, Rincian Pesanan, dan Mutasi Dompet Mitra Ojek.
                  </p>
                </div>
                <span className="text-[9px] bg-[#B8941F] text-white px-1.5 py-0.5 rounded-full font-bold">EXCEL EXPORT</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-emerald-500/30">
                <div className="flex-1">
                  <div className="relative">
                    <select
                      value={selectedExportMonth}
                      onChange={(e) => setSelectedExportMonth(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-emerald-900/40 hover:bg-emerald-900/60 border border-emerald-400/40 rounded-lg text-xs font-semibold text-white outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] transition-all appearance-none cursor-pointer"
                    >
                      <option value="2026-07" className="text-gray-800 font-medium">Juli 2026 (Bulan Ini)</option>
                      <option value="2026-06" className="text-gray-800 font-medium">Juni 2026 (Bulan Lalu)</option>
                      <option value="2026-05" className="text-gray-800 font-medium">Mei 2026 (2 Bulan Lalu)</option>
                    </select>
                    <span className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-emerald-200">
                      <Download size={12} />
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const months: Record<string, string> = {
                      '2026-07': 'Juli 2026',
                      '2026-06': 'Juni 2026',
                      '2026-05': 'Mei 2026'
                    };
                    downloadMonthlyExcel(
                      selectedExportMonth,
                      months[selectedExportMonth] || selectedExportMonth,
                      pesananList,
                      sopirList,
                      profilList,
                      transaksiList
                    );
                  }}
                  className="bg-[#B8941F] hover:bg-[#9B7C16] active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-amber-500 shadow-sm"
                >
                  <Download size={13} />
                  <span>Unduh Laporan</span>
                </button>
              </div>
            </div>

            {/* GRAFIK PEMESANAN RECHARTS (HOURLY) */}
            <div className="bg-white p-4 rounded-xl border shadow-xs text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase">Tren Pemesanan Hari Ini (Berdasarkan Layanan)</h3>
                <span className="text-[9px] bg-emerald-50 text-[#046A38] font-bold px-2 py-0.5 rounded border border-emerald-100">Live WebSockets</span>
              </div>
              <div className="h-56 w-full text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataHariIni} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOjek" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMakanan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#046A38" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#046A38" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPaket" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0B9F59" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0B9F59" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="jam" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                    <Legend verticalAlign="top" height={32} iconType="circle" />
                    <Area type="monotone" name="🛵 Ojek Ride" dataKey="🛵 Ojek" stroke="#D4AF37" fillOpacity={1} fill="url(#colorOjek)" strokeWidth={2} />
                    <Area type="monotone" name="🍔 Antar Makanan" dataKey="🍔 Makanan" stroke="#046A38" fillOpacity={1} fill="url(#colorMakanan)" strokeWidth={2} />
                    <Area type="monotone" name="📦 Antar Paket" dataKey="📦 Paket" stroke="#0B9F59" fillOpacity={1} fill="url(#colorPaket)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GRAFIK OMSET RECHARTS (WEEKLY) */}
            <div className="bg-white p-4 rounded-xl border shadow-xs text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase">Pertumbuhan Omset & Komisi Ololu (7 Hari Terakhir)</h3>
                <span className="text-[9px] bg-amber-50 text-[#B8941F] font-bold px-2 py-0.5 rounded border border-amber-100">Bagi Hasil 10%</span>
              </div>
              <div className="h-56 w-full text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataMingguan} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="hari" stroke="#94A3B8" />
                    <YAxis yAxisId="left" stroke="#94A3B8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" />
                    <Tooltip 
                      formatter={(value: any) => typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <Legend verticalAlign="top" height={32} iconType="rect" />
                    <Bar yAxisId="left" name="Pendapatan Mitra" dataKey="Pendapatan Mitra" fill="#046A38" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar yAxisId="left" name="Komisi Ololu (Kas)" dataKey="Komisi Ololu" fill="#0B9F59" radius={[4, 4, 0, 0]} barSize={12} />
                    <Line yAxisId="right" name="Pertumbuhan Kumulatif" type="monotone" dataKey="Pertumbuhan Kumulatif" stroke="#D4AF37" strokeWidth={3} dot={{ r: 4, strokeWidth: 1, fill: '#ffffff' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PENDING TARIK DANA WARNING */}
            {pendingTarikList.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 text-left flex items-start space-x-3">
                <DollarSign size={20} className="text-[#F59E0B] shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#F59E0B]">Menunggu Pencairan Dana ({pendingTarikList.length})</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Terdapat {pendingTarikList.length} pengajuan penarikan dana sopir yang menunggu persetujuan & transfer Anda. Silakan buka tab "Tarik Dana" untuk memproses.
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* =====================================================================
            TAB 2: VERIFIKASI SOPIR & AKTIF DRIVER LIST
            ===================================================================== */}
        {activeTab === 'sopir' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Kelayakan Dokumen Mitra Baru</h3>

            {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin).length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded-xl border">Belum ada pengajuan baru dari mitra sopir.</p>
            ) : (
              <div className="space-y-3">
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin).map((sopir) => {
                  const prof = profilList.find(p => p.id === sopir.id);
                  return (
                    <div key={sopir.id} className="bg-white p-4 rounded-xl border-t-2 border-[#D4AF37] shadow-xs space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{prof?.nama || 'Sopir Baru'}</h4>
                        <p className="text-xs text-gray-500">HP: {prof?.nomorHp} | Motor: {sopir.jenisMotor} ({sopir.platNomor})</p>
                        {sopir.bisaBarangBesar && (
                          <span className="inline-block mt-1 bg-emerald-50 text-[#046A38] text-[9px] font-bold px-2 py-0.5 rounded">BISA BAWA BARANG BESAR</span>
                        )}
                      </div>

                      {/* SIMULATED BERKAS VIEWING CARD */}
                      <div className="bg-[#FAFBF9] p-2 rounded-lg border border-gray-100 text-[10px] space-y-1">
                        <p className="font-semibold text-gray-500">VERIFIKASI DIGITAL BERKAS UNGGULAN:</p>
                        <div className="grid grid-cols-2 gap-1.5 text-center pt-1.5">
                          <button
                            type="button"
                            onClick={() => alert(`KTP VIEW:\n${sopir.fotoKtp}`)}
                            className="p-1.5 bg-white border rounded hover:bg-gray-50"
                          >
                            👁️ LIHAT KTP
                          </button>
                          <button
                            type="button"
                            onClick={() => alert(`SIM VIEW:\n${sopir.fotoSim}`)}
                            className="p-1.5 bg-white border rounded hover:bg-gray-50"
                          >
                            👁️ LIHAT SIM
                          </button>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveSopir(sopir.id, true)}
                          className="flex-1 py-2 bg-[#034F2A] hover:bg-[#046A38] text-white rounded-lg text-xs font-bold"
                        >
                          SETUJUI MITRA
                        </button>
                        <button
                          onClick={() => handleApproveSopir(sopir.id, false)}
                          className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-[#DC2626] rounded-lg text-xs font-bold"
                        >
                          TOLAK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DAFTAR SOPIR AKTIF */}
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 pt-4 uppercase">Daftar Sopir Aktif Ololu</h3>
            <ReusableTable<DetailSopir>
              data={sopirList.filter(s => s.disetujuiAdmin)}
              columns={driverColumns}
              keyExtractor={(s) => s.id}
              searchPlaceholder="Cari nama, motor, plat..."
              searchFields={(s) => {
                const prof = profilList.find(p => p.id === s.id);
                return [prof?.nama || '', s.jenisMotor, s.platNomor];
              }}
              filters={driverFilters}
              emptyMessage="Tidak ada sopir aktif yang cocok."
            />

          </div>
        )}

        {/* =====================================================================
            TAB 2B: MANAJEMEN PENUMPANG / PELANGGAN
            ===================================================================== */}
        {activeTab === 'penumpang' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Kelola Data Penumpang Ololu</h3>
            
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Berikut adalah daftar seluruh akun penumpang terdaftar di platform Ololu Lumajang. Anda dapat menyaring status atau menangguhkan akun jika melanggar ketentuan.
            </p>

            <ReusableTable<ProfilPengguna>
              data={profilList.filter(p => p.peran === 'penumpang')}
              columns={passengerColumns}
              keyExtractor={(p) => p.id}
              searchPlaceholder="Cari nama, WhatsApp, ID..."
              searchFields={(p) => [p.nama, p.nomorHp, p.id]}
              filters={passengerFilters}
              emptyMessage="Tidak ada data penumpang yang cocok."
            />
          </div>
        )}

        {/* =====================================================================
            TAB 3: RIWAYAT ORDER & KOMPLAIN AUDIT LOGS (SUPER LENGKAP!)
            ===================================================================== */}
        {activeTab === 'pesanan' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Pusat Audit Detail Pesanan</h3>
            
            {/* COMPLAINT FILTER BUTTONS */}
            <div className="flex space-x-1 border p-1 rounded-lg bg-gray-50 text-[10px] font-bold">
              {['semua', 'makanan', 'selesai', 'dibatalkan'].map((f) => (
                <button
                  key={f}
                  onClick={() => setComplaintFilter(f)}
                  className={`flex-1 py-1 rounded text-center transition-all ${
                    complaintFilter === f ? 'bg-[#046A38] text-white' : 'text-gray-500 hover:text-[#046A38]'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* ORDER LISTING ROWS */}
            {pesananList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded border">Belum ada riwayat pesanan.</p>
            ) : (
              <div className="space-y-2">
                {pesananList
                  .filter(p => {
                    if (complaintFilter === 'semua') return true;
                    if (complaintFilter === 'makanan') return p.jenisLayanan === 'makanan';
                    return p.status === complaintFilter;
                  })
                  .slice().reverse().map((pesanan) => (
                    <div
                      key={pesanan.id}
                      onClick={() => setSelectedOrder(pesanan)}
                      className={`bg-white p-3 rounded-xl border cursor-pointer hover:border-[#D4AF37] transition-all text-xs shadow-xs space-y-1.5 ${
                        selectedOrder?.id === pesanan.id ? 'border-2 border-[#046A38]' : ''
                      }`}
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-[#046A38] font-mono">{pesanan.nomorPesanan}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                          pesanan.status === 'selesai' ? 'bg-[#E6F4EC] text-[#046A38]' :
                          pesanan.status === 'dibatalkan' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600 animate-pulse'
                        }`}>
                          {pesanan.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-700 font-semibold">
                        {pesanan.jenisLayanan.toUpperCase()} • {pesanan.asalAlamat.slice(0, 30)}... &rarr; {pesanan.daftarTujuan[0]?.alamat.slice(0, 30)}
                      </p>
                      <div className="flex justify-between text-[10px] text-gray-400 border-t border-dashed pt-1 mt-1">
                        <span>Cust: {pesanan.namaPenumpang}</span>
                        <span className="font-bold text-[#B8941F]">Rp {pesanan.totalBayarAkhir.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* DETAILED DRILLDOWN SCREEN FOR COMPLAINTS AUDITING */}
            {selectedOrder && (
              <div className="bg-white p-4 rounded-xl border border-[#D4AF37] space-y-4 shadow-md text-left pt-3 mt-4 border-t-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-bold text-xs text-[#046A38] uppercase">AUDIT LOG PESANAN LENGKAP</h4>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 font-bold text-xs">✕ Tutup</button>
                </div>

                <div className="text-xs space-y-2">
                  <p><strong>Nomor Pesanan:</strong> {selectedOrder.nomorPesanan}</p>
                  <p><strong>Waktu Dibuat:</strong> {new Date(selectedOrder.waktuDibuat).toLocaleString('id-ID')}</p>
                  {selectedOrder.waktuSelesai && <p><strong>Waktu Selesai:</strong> {new Date(selectedOrder.waktuSelesai).toLocaleString('id-ID')}</p>}
                  {selectedOrder.waktuDibatalkan && <p className="text-red-600"><strong>Waktu Batal:</strong> {new Date(selectedOrder.waktuDibatalkan).toLocaleString('id-ID')} ({selectedOrder.alasanBatal || 'Tanpa Alasan'})</p>}
                  
                  <div className="bg-[#FAFBF9] p-2.5 rounded border text-[11px] space-y-1">
                    <p className="font-bold text-[#046A38] uppercase border-b pb-1 mb-1">Rincian Keuangan:</p>
                    <p>Tarif Jarak Murni: Rp {selectedOrder.tarifPerjalananMurni.toLocaleString('id-ID')}</p>
                    {selectedOrder.tambahanTujuan > 0 && <p>Tambahan Multi Stop: Rp {selectedOrder.tambahanTujuan.toLocaleString('id-ID')}</p>}
                    {selectedOrder.tambahanItem > 0 && <p>Tambahan Kelebihan Item: Rp {selectedOrder.tambahanItem.toLocaleString('id-ID')}</p>}
                    <p className="text-orange-600">Total Biaya Parkir: Rp {selectedOrder.biayaParkirTotal.toLocaleString('id-ID')}</p>
                    <p className="text-emerald-700">Total Nota Belanja: Rp {selectedOrder.biayaNotaTotal.toLocaleString('id-ID')}</p>
                    <p className="font-bold text-[#B8941F] text-xs pt-1 border-t">TOTAL AKHIR BAYAR: Rp {selectedOrder.totalBayarAkhir.toLocaleString('id-ID')}</p>
                    <p className="text-[10px] text-gray-400">Komisi Aplikasi ({selectedOrder.biayaLayananPersen}%): Rp {Math.round((selectedOrder.tarifPerjalananMurni + selectedOrder.tambahanTujuan + selectedOrder.tambahanItem) * selectedOrder.biayaLayananPersen / 100).toLocaleString('id-ID')}</p>
                  </div>

                  {/* STATIONS BREAKDOWN */}
                  <div className="space-y-2 pt-2">
                    <p className="font-bold">URUTAN STASIUN / TUJUAN:</p>
                    {selectedOrder.daftarTujuan.map((stop, sIdx) => (
                      <div key={stop.id} className="p-2.5 bg-white border rounded-lg text-[11px] space-y-1.5">
                        <div className="flex justify-between font-bold text-gray-700 text-[10px]">
                          <span>STOP {sIdx+1} - {stop.alamat}</span>
                          <span className="text-[#046A38] uppercase">{stop.status}</span>
                        </div>
                        <p><strong>Pilihan Parkir Sopir:</strong> {stop.pilihanParkir.replace('_', ' ').toUpperCase()}</p>
                        
                        {stop.nota && (
                          <div className="border-t border-dashed pt-1.5 mt-1 space-y-1 bg-[#E6F4EC] p-2 rounded">
                            <p><strong>Nota Toko:</strong> {stop.nota.namaToko}</p>
                            <p><strong>Daftar Belanja:</strong> {stop.nota.rincianBarang}</p>
                            <p className="font-bold">Total Toko: Rp {stop.nota.totalToko.toLocaleString('id-ID')}</p>
                            {stop.nota.fotoNota && (
                              <img src={stop.nota.fotoNota} alt="Foto Nota" className="w-full h-24 object-cover rounded mt-1" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* LOGS JALUR LOKASI SOPIR */}
                  <div className="pt-2 border-t text-[10px] text-gray-400">
                    <p className="font-bold">LOG RIWAYAT LOKASI SOPIR ({selectedOrder.riwayatLokasiSopir?.length || 0}):</p>
                    <div className="max-h-24 overflow-y-auto font-mono text-[9px] mt-1 bg-gray-50 p-2.5 rounded">
                      {selectedOrder.riwayatLokasiSopir?.map((loc, lIdx) => (
                        <p key={lIdx}>[{new Date(loc.waktu).toLocaleTimeString('id-ID')}] Lat: {loc.lat.toFixed(5)}, Lng: {loc.lng.toFixed(5)}</p>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* =====================================================================
            TAB 4: TARIK DANA & DOMPET AUDITING
            ===================================================================== */}
        {activeTab === 'dompet' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Antrian Tarik Dana Sopir</h3>

            {pendingTarikList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded border">Tidak ada pengajuan tarik dana yang menunggu.</p>
            ) : (
              <div className="space-y-3">
                {pendingTarikList.map((tx) => {
                  const prof = profilList.find(p => p.id === tx.idSopir);
                  return (
                    <div key={tx.id} className="bg-white p-4 rounded-xl border shadow-xs space-y-3 text-xs">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-[#046A38]">{prof?.nama || 'Sopir'}</span>
                        <span className="font-bold text-[#B8941F]">Rp {tx.jumlah.toLocaleString('id-ID')}</span>
                      </div>
                      <p className="text-gray-500">
                        Waktu Pengajuan: {new Date(tx.timestamp).toLocaleString('id-ID')}<br />
                        Saldo Terakhir Sopir: Rp {tx.saldoAwal.toLocaleString('id-ID')} (Dikenakan biaya admin pencairan Rp {config.biayaAdminTarik.toLocaleString('id-ID')})
                      </p>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleApproveWithdraw(tx.id, true)}
                          className="flex-1 py-2 bg-[#034F2A] hover:bg-[#046A38] text-white rounded-lg text-[11px] font-bold"
                        >
                          SETUJUI & SELESAI TRANSFER
                        </button>
                        <button
                          onClick={() => handleApproveWithdraw(tx.id, false)}
                          className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-[#DC2626] rounded-lg text-[11px] font-bold"
                        >
                          TOLAK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AUDIT LOG TRANSAKSI SYSTEM */}
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 pt-4 uppercase">Arsip Log Transaksi Sistem</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transaksiList.slice().reverse().map((tx) => {
                const s = profilList.find(p => p.id === tx.idSopir);
                return (
                  <div key={tx.id} className="p-3 bg-white rounded-lg border text-xs shadow-xs space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-gray-700">{s?.nama} ({tx.jenis.toUpperCase()})</span>
                      <span className={`font-mono ${tx.jenis === 'topup' || tx.jenis === 'pendapatan' ? 'text-green-600' : 'text-red-500'}`}>
                        {tx.jenis === 'topup' || tx.jenis === 'pendapatan' ? '+' : '-'} Rp {tx.jumlah.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <p className="text-gray-500 leading-normal">{tx.deskripsi}</p>
                    <span className="text-[9px] text-gray-400 block">{new Date(tx.created_at || tx.timestamp).toLocaleString('id-ID')}</span>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* =====================================================================
            TAB 5: SYSTEM CONFIGURATION & TARIFF SETTINGS
            ===================================================================== */}
        {activeTab === 'tarif' && (
          <form onSubmit={handleSaveConfig} className="bg-white p-4 rounded-xl border text-left space-y-4 text-xs shadow-xs">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Pengaturan Sistem & Tarif Layanan</h3>
            
            <div className="space-y-4">
              
              {/* PENGATURAN OPERASIONAL SISTEM (24 JAM NONSTOP) */}
              <div className="bg-white p-3 rounded-lg border-2 border-[#046A38] space-y-2">
                <p className="font-bold text-[#046A38] uppercase flex items-center space-x-1.5">
                  <Clock size={14} className="text-[#D4AF37]" />
                  <span>⚙️ PENGATURAN OPERASIONAL SISTEM</span>
                </p>
                <div className="bg-[#FAFBF9] p-2.5 rounded border border-emerald-150 text-[11px] text-[#046A38] font-semibold flex items-center justify-between">
                  <span>Status Operasional:</span>
                  <span className="bg-[#046A38] text-white px-2.5 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-bold">
                    Sistem beroperasi 24 JAM NONSTOP sepanjang tahun
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Jam Buka (Terkunci)</label>
                    <input
                      type="text"
                      value="00:00"
                      disabled
                      className="w-full p-2 bg-gray-50 text-gray-400 border rounded text-xs cursor-not-allowed font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Jam Tutup (Terkunci)</label>
                    <input
                      type="text"
                      value="23:59"
                      disabled
                      className="w-full p-2 bg-gray-50 text-gray-400 border rounded text-xs cursor-not-allowed font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* SAKLAR AKTIVASI LAYANAN */}
              <div className="bg-white p-3 rounded-lg border-2 border-[#046A38] space-y-3">
                <p className="font-bold text-[#046A38] uppercase flex items-center space-x-1.5">
                  <span className="text-sm">🟢</span>
                  <span>SAKLAR AKTIVASI LAYANAN</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="flex flex-col justify-between bg-[#FAFBF9] p-2 rounded border border-gray-200">
                    <span className="font-bold text-[10px] text-gray-700 leading-tight">Ojek Orang</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-gray-400 font-semibold">{tempConfig.layananOjekAktif ? 'AKTIF' : 'OFF'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempConfig.layananOjekAktif}
                          onChange={(e) => updateTempConfig('layananOjekAktif', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#046A38]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between bg-[#FAFBF9] p-2 rounded border border-gray-200">
                    <span className="font-bold text-[10px] text-gray-700 leading-tight">Makanan & Belanja</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-gray-400 font-semibold">{tempConfig.layananMakananAktif ? 'AKTIF' : 'OFF'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempConfig.layananMakananAktif}
                          onChange={(e) => updateTempConfig('layananMakananAktif', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#046A38]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between bg-[#FAFBF9] p-2 rounded border border-gray-200">
                    <span className="font-bold text-[10px] text-gray-700 leading-tight">Kirim Paket</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-gray-400 font-semibold">{tempConfig.layananPaketAktif ? 'AKTIF' : 'OFF'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempConfig.layananPaketAktif}
                          onChange={(e) => updateTempConfig('layananPaketAktif', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#046A38]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between bg-[#FAFBF9] p-2 rounded border border-gray-200">
                    <span className="font-bold text-[10px] text-gray-700 leading-tight">Barang Besar</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-gray-400 font-semibold">{tempConfig.layananBarangBesarAktif ? 'AKTIF' : 'OFF'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempConfig.layananBarangBesarAktif}
                          onChange={(e) => updateTempConfig('layananBarangBesarAktif', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#046A38]"></div>
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between bg-[#FAFBF9] p-2 rounded border border-gray-200">
                    <span className="font-bold text-[10px] text-gray-700 leading-tight">Langganan</span>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-gray-400 font-semibold">{tempConfig.layananLanggananAktif ? 'AKTIF' : 'OFF'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempConfig.layananLanggananAktif}
                          onChange={(e) => updateTempConfig('layananLanggananAktif', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#046A38]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOK PENGATURAN RUSH HOUR BARU */}
              <div className="bg-yellow-50 p-3 rounded-lg border-2 border-[#D4AF37] space-y-3">
                <div className="flex justify-between items-center border-b border-yellow-200 pb-1.5">
                  <p className="font-bold text-yellow-800 uppercase flex items-center space-x-1.5">
                    <span className="text-sm">🌅</span>
                    <span>PENGATURAN RUSH HOUR (JAM SIBUK DYNAMIS)</span>
                  </p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tempConfig.rushHourAktif}
                      onChange={(e) => updateTempConfig('rushHourAktif', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#046A38]"></div>
                    <span className="ml-1.5 text-[10px] font-bold text-gray-700">
                      {tempConfig.rushHourAktif ? "AKTIF" : "NONAKTIF"}
                    </span>
                  </label>
                </div>

                {tempConfig.rushHourAktif && (
                  <div className="space-y-3">
                    {/* Legacy Single Schedule fallback */}
                    <div className="bg-white p-2.5 rounded border border-yellow-200 space-y-1.5">
                      <p className="font-bold text-xs text-[#046A38] uppercase">Jadwal Utama (Legacy)</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-[9px] text-gray-500">Mulai (Jam)</label>
                          <input
                            type="text"
                            value={tempConfig.rushHourMulai || "16:00"}
                            onChange={(e) => updateTempConfig('rushHourMulai', e.target.value)}
                            placeholder="16:00"
                            className="w-full p-1.5 bg-white border rounded text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500">Selesai (Jam)</label>
                          <input
                            type="text"
                            value={tempConfig.rushHourSelesai || "18:00"}
                            onChange={(e) => updateTempConfig('rushHourSelesai', e.target.value)}
                            placeholder="18:00"
                            className="w-full p-1.5 bg-white border rounded text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500">Kenaikan (%)</label>
                          <input
                            type="number"
                            value={tempConfig.rushHourPersenKenaikan || 0}
                            onChange={(e) => updateTempConfig('rushHourPersenKenaikan', parseInt(e.target.value) || 0)}
                            className="w-full p-1.5 bg-white border rounded text-[11px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Multi schedules list */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-t pt-2 mt-1 border-yellow-200">
                        <p className="font-bold text-xs text-yellow-800 uppercase">📋 Multi-Jadwal Tambahan</p>
                        <button
                          type="button"
                          onClick={addRushHourSchedule}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-[#046A38] hover:bg-[#034F2A] text-white rounded-lg text-[10px] font-bold border border-[#D4AF37] transition-all cursor-pointer"
                        >
                          <Plus size={10} />
                          <span>Jadwal Baru</span>
                        </button>
                      </div>

                      {(!tempConfig.rushHourSchedules || tempConfig.rushHourSchedules.length === 0) ? (
                        <p className="text-[10px] text-gray-400 italic text-center py-2.5 bg-white border border-dashed rounded">
                          Belum ada multi-jadwal tambahan. Klik "Jadwal Baru" di atas untuk menambah.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {tempConfig.rushHourSchedules.map((schedule, idx) => (
                            <div key={schedule.id} className="bg-white p-2.5 rounded border border-gray-200 space-y-2 relative">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#046A38]">Jadwal #{idx + 1}</span>
                                <div className="flex items-center space-x-2">
                                  {/* Toggle Aktif/Nonaktif */}
                                  <button
                                    type="button"
                                    onClick={() => updateRushHourSchedule(schedule.id, 'aktif', !schedule.aktif)}
                                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all border cursor-pointer ${
                                      schedule.aktif
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                        : "bg-gray-100 text-gray-500 border-gray-300"
                                    }`}
                                  >
                                    {schedule.aktif ? "AKTIF" : "NONAKTIF"}
                                  </button>
                                  {/* Delete button */}
                                  <button
                                    type="button"
                                    onClick={() => deleteRushHourSchedule(schedule.id)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                                    title="Hapus Jadwal"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="col-span-2">
                                  <label className="text-[9px] text-gray-500">Nama Jadwal</label>
                                  <input
                                    type="text"
                                    value={schedule.nama}
                                    onChange={(e) => updateRushHourSchedule(schedule.id, 'nama', e.target.value)}
                                    className="w-full p-1.5 bg-white border rounded text-[10px] font-semibold text-[#1A1A1A]"
                                    placeholder="Contoh: Pulang Kerja Sore"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-500">Mulai (Jam)</label>
                                  <input
                                    type="text"
                                    value={schedule.waktuMulai}
                                    onChange={(e) => updateRushHourSchedule(schedule.id, 'waktuMulai', e.target.value)}
                                    className="w-full p-1.5 bg-white border rounded text-[10px]"
                                    placeholder="HH:MM"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-gray-500">Selesai (Jam)</label>
                                  <input
                                    type="text"
                                    value={schedule.waktuSelesai}
                                    onChange={(e) => updateRushHourSchedule(schedule.id, 'waktuSelesai', e.target.value)}
                                    className="w-full p-1.5 bg-white border rounded text-[10px]"
                                    placeholder="HH:MM"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <label className="text-[9px] text-gray-500">Kenaikan Tarif (%)</label>
                                  <input
                                    type="number"
                                    value={schedule.persenKenaikan}
                                    onChange={(e) => updateRushHourSchedule(schedule.id, 'persenKenaikan', parseInt(e.target.value) || 0)}
                                    className="w-full p-1.5 bg-white border rounded text-[10px] font-bold text-[#B8941F]"
                                    placeholder="Contoh: 15"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* OJEK */}
              <div className="bg-[#FAFBF9] p-3 rounded-lg border space-y-2">
                <p className="font-bold text-[#046A38] uppercase">1. OJEK ORANG</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Dasar (Rp)</label>
                    <input type="number" value={tempConfig.ojekTarifDasar} onChange={(e)=>updateTempConfig('ojekTarifDasar', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Batas Tarif Dasar (KM)</label>
                    <input type="number" value={tempConfig.ojekBatasKmTarifDasar} onChange={(e)=>updateTempConfig('ojekBatasKmTarifDasar', parseInt(e.target.value)||1)} className="w-full p-2 bg-white border rounded text-xs text-[#046A38] font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif / KM (Rp)</label>
                    <input type="number" value={tempConfig.ojekTarifPerKm} onChange={(e)=>updateTempConfig('ojekTarifPerKm', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Minimum (Rp)</label>
                    <input type="number" value={tempConfig.ojekTarifMinimum} onChange={(e)=>updateTempConfig('ojekTarifMinimum', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Komisi Ololu (%)</label>
                    <input type="number" value={tempConfig.ojekPersenJasa} onChange={(e)=>updateTempConfig('ojekPersenJasa', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>

              {/* MAKANAN */}
              <div className="bg-[#FAFBF9] p-3 rounded-lg border space-y-2">
                <p className="font-bold text-[#046A38] uppercase">2. MAKANAN & BELANJA</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Dasar (Rp)</label>
                    <input type="number" value={tempConfig.makananTarifDasar} onChange={(e)=>updateTempConfig('makananTarifDasar', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Batas Tarif Dasar (KM)</label>
                    <input type="number" value={tempConfig.makananBatasKmTarifDasar} onChange={(e)=>updateTempConfig('makananBatasKmTarifDasar', parseInt(e.target.value)||1)} className="w-full p-2 bg-white border rounded text-xs text-[#046A38] font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif / KM (Rp)</label>
                    <input type="number" value={tempConfig.makananTarifPerKm} onChange={(e)=>updateTempConfig('makananTarifPerKm', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Minimum (Rp)</label>
                    <input type="number" value={tempConfig.makananTarifMinimum} onChange={(e)=>updateTempConfig('makananTarifMinimum', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Komisi Ololu (%)</label>
                    <input type="number" value={tempConfig.makananPersenJasa} onChange={(e)=>updateTempConfig('makananPersenJasa', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>

              {/* PAKET */}
              <div className="bg-[#FAFBF9] p-3 rounded-lg border space-y-2">
                <p className="font-bold text-[#046A38] uppercase">3. KIRIM PAKET</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Dasar (Rp)</label>
                    <input type="number" value={tempConfig.paketTarifDasar} onChange={(e)=>updateTempConfig('paketTarifDasar', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Batas Tarif Dasar (KM)</label>
                    <input type="number" value={tempConfig.paketBatasKmTarifDasar} onChange={(e)=>updateTempConfig('paketBatasKmTarifDasar', parseInt(e.target.value)||1)} className="w-full p-2 bg-white border rounded text-xs text-[#046A38] font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif / KM (Rp)</label>
                    <input type="number" value={tempConfig.paketTarifPerKm} onChange={(e)=>updateTempConfig('paketTarifPerKm', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Minimum (Rp)</label>
                    <input type="number" value={tempConfig.paketTarifMinimum} onChange={(e)=>updateTempConfig('paketTarifMinimum', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Komisi Ololu (%)</label>
                    <input type="number" value={tempConfig.paketPersenJasa} onChange={(e)=>updateTempConfig('paketPersenJasa', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>

              {/* BARANG BESAR */}
              <div className="bg-[#FAFBF9] p-3 rounded-lg border space-y-2">
                <p className="font-bold text-[#046A38] uppercase">4. BARANG BESAR (KAPASITAS MOTOR)</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Dasar (Rp)</label>
                    <input type="number" value={tempConfig.barangBesarTarifDasar} onChange={(e)=>updateTempConfig('barangBesarTarifDasar', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Batas Tarif Dasar (KM)</label>
                    <input type="number" value={tempConfig.barangBesarBatasKmTarifDasar} onChange={(e)=>updateTempConfig('barangBesarBatasKmTarifDasar', parseInt(e.target.value)||1)} className="w-full p-2 bg-white border rounded text-xs text-[#046A38] font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif / KM (Rp)</label>
                    <input type="number" value={tempConfig.barangBesarTarifPerKm} onChange={(e)=>updateTempConfig('barangBesarTarifPerKm', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Tarif Minimum (Rp)</label>
                    <input type="number" value={tempConfig.barangBesarTarifMinimum} onChange={(e)=>updateTempConfig('barangBesarTarifMinimum', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold">Komisi Ololu (%)</label>
                    <input type="number" value={tempConfig.barangBesarPersenJasa} onChange={(e)=>updateTempConfig('barangBesarPersenJasa', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>

              {/* PARKIR SYSTEM CONFIG */}
              <div className="bg-white p-3 rounded-lg border space-y-2">
                <p className="font-bold text-[#046A38] uppercase">🅿️ PENGATURAN HARGA PARKIR</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500">Parkir Biasa (Rp)</label>
                    <input type="number" value={tempConfig.biayaParkirBiasa} onChange={(e)=>updateTempConfig('biayaParkirBiasa', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs font-bold text-[#B8941F]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500">Parkir Pasar (Rp)</label>
                    <input type="number" value={tempConfig.biayaParkirPasar} onChange={(e)=>updateTempConfig('biayaParkirPasar', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs font-bold text-[#B8941F]" />
                  </div>
                </div>
              </div>

              {/* ATURAN OPERASIONAL */}
              <div className="bg-[#FAFBF9] p-3 rounded-lg border-2 border-slate-300 space-y-2">
                <p className="font-bold text-gray-700 uppercase">⚡ BATAS & PARAMETER OPERASIONAL</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Radius Cari Sopir (KM)</label>
                    <input type="number" value={tempConfig.radiusPencarianSopirKm} onChange={(e)=>updateTempConfig('radiusPencarianSopirKm', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Saldo Minimum Online (Rp)</label>
                    <input type="number" value={tempConfig.saldoMinimalOnlineSopir} onChange={(e)=>updateTempConfig('saldoMinimalOnlineSopir', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Respon Tawaran (Detik)</label>
                    <input type="number" value={tempConfig.waktuResponTawaran} onChange={(e)=>updateTempConfig('waktuResponTawaran', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Cari Berikutnya (Detik)</label>
                    <input type="number" value={tempConfig.batasMaksimalPencarianBerikutnya} onChange={(e)=>updateTempConfig('batasMaksimalPencarianBerikutnya', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Interval Lokasi (Detik)</label>
                    <input type="number" value={tempConfig.intervalKirimLokasiSopir} onChange={(e)=>updateTempConfig('intervalKirimLokasiSopir', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>

              {/* LAIN-LAIN / DETAIL DENDA & BIAYA TAMBAHAN */}
              <div className="bg-white p-3 rounded-lg border-2 border-amber-300 space-y-2">
                <p className="font-bold text-amber-800 uppercase">💰 BIAYA TAMBAHAN & DENDA SISTEM</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Biaya Admin Perjalanan (Rp)</label>
                    <input type="number" value={tempConfig.biayaAdminPerjalanan} onChange={(e)=>updateTempConfig('biayaAdminPerjalanan', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Biaya per Stop Tambah (Rp)</label>
                    <input type="number" value={tempConfig.biayaPerStopTambahan} onChange={(e)=>updateTempConfig('biayaPerStopTambahan', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Biaya Kelebihan Item (Rp)</label>
                    <input type="number" value={tempConfig.biayaKelebihanItem} onChange={(e)=>updateTempConfig('biayaKelebihanItem', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Pengali Tarif Prioritas (x)</label>
                    <input type="number" step="0.1" value={tempConfig.pengaliTarifPrioritas} onChange={(e)=>updateTempConfig('pengaliTarifPrioritas', parseFloat(e.target.value)||1.0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Denda Batal Sopir (Rp)</label>
                    <input type="number" value={tempConfig.dendaBatalSopir} onChange={(e)=>updateTempConfig('dendaBatalSopir', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Denda Batal Pmpg (Rp)</label>
                    <input type="number" value={tempConfig.dendaBatalPenumpang} onChange={(e)=>updateTempConfig('dendaBatalPenumpang', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Biaya Admin Top Up (Rp)</label>
                    <input type="number" value={tempConfig.biayaAdminTopUp} onChange={(e)=>updateTempConfig('biayaAdminTopUp', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Biaya Admin Tarik (Rp)</label>
                    <input type="number" value={tempConfig.biayaAdminTarik} onChange={(e)=>updateTempConfig('biayaAdminTarik', parseInt(e.target.value)||0)} className="w-full p-2 bg-white border rounded text-xs" />
                  </div>
                </div>
              </div>

            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#034F2A] hover:bg-[#046A38] text-white font-bold rounded-xl shadow-md transition-all border border-[#D4AF37] text-xs uppercase font-black cursor-pointer"
            >
              Simpan Pengaturan Konfigurasi
            </button>
          </form>
        )}

        {/* =====================================================================
            TAB 6: SOS EMERGENCY / LAPORAN PANIK CONTROL ROOM
            ===================================================================== */}
        {activeTab === 'darurat' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#DC2626] border-b pb-1.5 uppercase flex items-center space-x-1">
              <AlertTriangle className="animate-pulse" size={16} />
              <span>Daftar Panggilan Panic SOS</span>
            </h3>

            {emergencyList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded border">Kondisi aman, tidak ada laporan darurat.</p>
            ) : (
              <div className="space-y-3">
                {/* ACTIVE EMERGENCY MAP AREA */}
                <div className="w-full h-56 rounded-xl border relative overflow-hidden shadow-xs">
                  <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
                    <Map
                      defaultCenter={KOORDINAT_LUMAJANG}
                      defaultZoom={12}
                      mapId="OLOLU_EMERGENCY_MAP"
                      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                      style={{ width: '100%', height: '100%' }}
                    >
                      {emergencyList.filter(e => e.status === 'baru').map(e => (
                        <AdvancedMarker key={e.id} position={{ lat: e.lat, lng: e.lng }} title={`SOS: ${e.namaPelapor}`}>
                          <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center animate-ping text-white shadow-lg border-2 border-white">
                            <span className="text-xs">🚨</span>
                          </div>
                        </AdvancedMarker>
                      ))}
                    </Map>
                  </APIProvider>
                  <div className="absolute top-2 left-2 bg-red-600 text-white font-bold text-[9px] px-2.5 py-0.5 rounded shadow">
                    EMERGENCY GPS RADAR ROOM
                  </div>
                </div>

                {emergencyList.slice().reverse().map((e) => (
                  <div
                    key={e.id}
                    className={`p-4 rounded-xl shadow-xs border text-xs space-y-2.5 transition-all ${
                      e.status === 'baru' ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-white border-gray-150'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-600 uppercase flex items-center space-x-1">
                        <AlertTriangle size={12} />
                        <span>LAPORAN DARURAT: {e.status.toUpperCase()}</span>
                      </span>
                      <span className="text-[10px] text-gray-400">{new Date(e.timestamp).toLocaleTimeString('id-ID')}</span>
                    </div>

                    <div className="text-gray-700">
                      <p><strong>Nama Pelapor:</strong> {e.namaPelapor} ({e.peranPelapor.toUpperCase()})</p>
                      <p><strong>Nomor WhatsApp:</strong> {e.nomorHpPelapor}</p>
                      <p><strong>Koordinat GPS:</strong> {e.lat.toFixed(5)}, {e.lng.toFixed(5)}</p>
                    </div>

                    <div className="flex space-x-1.5 pt-1">
                      <a
                        href={`https://wa.me/${e.nomorHpPelapor}?text=Halo%20saya%20Admin%20Ololu.%20Kami%20menerima%20sinyal%20Panic%20SOS%20dari%20Anda.%20Apakah%20kondisi%20Anda%20aman%3F`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 bg-[#034F2A] hover:bg-[#046A38] text-white rounded-lg text-center font-bold text-[10px] block"
                      >
                        HUBUNGI WA SEKARANG
                      </a>
                      {e.status === 'baru' && (
                        <button
                          onClick={() => handleResolveEmergency(e.id)}
                          className="flex-1 py-1.5 bg-[#059669] hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px]"
                        >
                          TANDAI SUDAH SELESAI
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 7: RATINGS & REVIEWS LEDGER
            ===================================================================== */}
        {activeTab === 'rating' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Laporan Rating & Ulasan Driver</h3>
            <div className="bg-[#E6F4EC] p-3 rounded-xl flex items-center justify-between border border-emerald-100">
              <span className="text-xs font-semibold text-[#046A38]">RATING GLOBAL OLOLU:</span>
              <span className="text-base font-black text-[#B8941F] flex items-center space-x-1">
                <span>★ {avgRatingGlobal}</span>
                <span className="text-xs font-semibold text-gray-500">({ratingList.length} reviews)</span>
              </span>
            </div>

            {ratingList.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded border">Belum ada rating ulasan masuk.</p>
            ) : (
              <div className="space-y-2">
                {ratingList.slice().reverse().map((r) => {
                  const s = sopirList.find(sd => sd.id === r.idSopir);
                  const p = profilList.find(pd => pd.id === r.idSopir);
                  return (
                    <div key={r.id} className="p-3 bg-white rounded-lg border shadow-xs text-xs space-y-1">
                      <div className="flex justify-between items-baseline font-bold">
                        <span className="text-gray-700">Oleh: {r.namaPenumpang}</span>
                        <div className="flex space-x-0.5 text-[#D4AF37] font-bold">
                          {Array.from({ length: r.bintang }).map((_, i) => (
                            <span key={i}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-500 italic leading-tight">"{r.ulasan || 'Sangat memuaskan, ramah, dan cepat!'}"</p>
                      <div className="text-[9px] text-gray-400 border-t pt-1 mt-1 flex justify-between uppercase">
                        <span>Sopir: {p?.nama || 'Sopir Ololu'}</span>
                        <span>{new Date(r.timestamp).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
