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
  PengaturanTarif,
  LogAudit
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
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { ReusableTable, ColumnDef, FilterDef } from './ReusableTable';
import { downloadMonthlyExcel } from '../utils/excelExport';

export default function AdminView() {
  const profile = OloluStore.getProfilLogin();
  const isSuperUser = profile?.nomorHp === '6285156766317';

  if (!isSuperUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-gray-800">Akses Ditolak</h2>
        <p className="text-sm text-gray-500 mt-2">Halaman ini hanya dapat diakses oleh Administrator Utama Ololu Lumajang.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'stats' | 'sopir' | 'penumpang' | 'pesanan' | 'dompet' | 'tarif' | 'darurat' | 'rating' | 'admins' | 'logs'>('stats');
  
  // STATE DATA REALTIME
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [sopirList, setSopirList] = useState<DetailSopir[]>([]);
  const [profilList, setProfilList] = useState<ProfilPengguna[]>([]);
  const [emergencyList, setEmergencyList] = useState<LaporanDarurat[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiDompet[]>([]);
  const [ratingList, setRatingList] = useState<RatingUlasan[]>([]);
  const [config, setConfig] = useState<PengaturanTarif>(OloluStore.getPengaturan());
  const [adminList, setAdminList] = useState<ProfilPengguna[]>([]);
  const [auditLogs, setAuditLogs] = useState<LogAudit[]>([]);

  // UI DETAIL EXPANSIONS
  const [selectedOrder, setSelectedOrder] = useState<Pesanan | null>(null);
  const [selectedSopir, setSelectedSopir] = useState<DetailSopir | null>(null);
  const [complaintFilter, setComplaintFilter] = useState<string>('semua');
  
  // FORM ADD SUB-ADMIN
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

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
      setAdminList(OloluStore.getAllAdmins());
      setAuditLogs(OloluStore.getAuditLogs());

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
        } catch (e) {
          // Gagal autoplay audio biasanya diblokir browser jika user belum interaksi
        }
      }, 1500);
    }
    return () => clearInterval(audioInterval);
  }, [hasNewEmergency]);

  // --- CHART DATA PREPARATION ---
  const chartDataJam = (() => {
    const hourlyBuckets = Array.from({ length: 24 }, (_, i) => ({
      jam: `${i.toString().padStart(2, '0')}:00`,
      '🛵 Ojek': 0,
      '🍔 Makanan': 0,
      '📦 Paket': 0
    }));

    pesananList.forEach(p => {
      try {
        const hour = new Date(p.waktuDibuat).getHours();
        const bucketIdx = hour;
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
    const prof = profilList.find(p => p.id === sopirId);
    if (setuju) {
      OloluStore.verifikasiSopir(sopirId, true);
      OloluStore.addAuditLog(profile!.id, profile!.nama, "Menyetujui Sopir", `Admin menyetujui dokumen mitra: ${prof?.nama} (${prof?.nomorHp})`);
      alert("Akun Sopir Berhasil Disetujui! Sopir kini bisa login dan mengaktifkan mode Online.");
    } else {
      const alasan = prompt("Masukkan alasan penolakan berkas:") || "Dokumen kurang terbaca jelas";
      OloluStore.verifikasiSopir(sopirId, false, alasan);
      OloluStore.addAuditLog(profile!.id, profile!.nama, "Menolak Sopir", `Admin menolak dokumen mitra: ${prof?.nama} (${prof?.nomorHp}) Alasan: ${alasan}`);
      alert("Berkas lamaran sopir ditolak.");
    }
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPhone || !newAdminName) return;
    OloluStore.tambahSubAdmin(newAdminPhone, newAdminName);
    OloluStore.addAuditLog(profile!.id, profile!.nama, "Menambah Sub-Admin", `Admin baru ditambahkan: ${newAdminName} (${newAdminPhone})`);
    setNewAdminPhone(''); setNewAdminName('');
    alert("Sub-Admin berhasil ditambahkan!");
  };

  const handleRemoveAdmin = (id: string, name: string) => {
    if (confirm(`Hapus hak akses admin untuk ${name}?`)) {
      OloluStore.hapusSubAdmin(id);
      OloluStore.addAuditLog(profile!.id, profile!.nama, "Menghapus Sub-Admin", `Akses admin dicabut dari: ${name}`);
      alert("Akses Admin dicabut.");
    }
  };

  const saveConfigWithLog = () => {
    OloluStore.savePengaturan(tempConfig, profile!.id, profile!.nama);
    alert("Pengaturan berhasil disimpan dan dicatat dalam log audit.");
  };

  // MATIKAN ONLINE SOPIR SECARA PAKSA (REMOTE)
  const handleForceOffline = (sopirId: string) => {
    OloluStore.matikanOnlineSopirPaksa(sopirId);
    alert("Sopir telah berhasil dipaksa Offline.");
  };

  // DARURAT ACTIONS
  const handleResolveEmergency = (id: string) => {
    OloluStore.tanganiEmergency(id);
    alert("Laporan darurat ditandai sebagai SELESAI.");
  };

  // COLUMNS DEFINITIONS
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
        <div className="text-right">
          <span className={`text-[11px] font-black ${s.saldoDompet < 5000 ? 'text-red-500' : 'text-emerald-600'}`}>
            Rp {s.saldoDompet.toLocaleString('id-ID')}
          </span>
        </div>
      )
    },
    {
      id: 'aksi',
      header: 'Aksi',
      accessor: (s) => (
        <div className="flex justify-end space-x-1">
          <button
            onClick={() => setSelectedSopir(s)}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-all"
            title="Detail Berkas"
          >
            <FileText size={14} />
          </button>
          {s.statusOnline && (
            <button
              onClick={() => handleForceOffline(s.id)}
              className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-all"
              title="Paksa Offline"
            >
              <Power size={14} />
            </button>
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
        { label: 'Semua', value: 'all' },
        { label: 'Sedang Online', value: 'online' },
        { label: 'Sedang Offline', value: 'offline' }
      ],
      filterFn: (s, val) => {
        if (val === 'online') return s.statusOnline;
        if (val === 'offline') return !s.statusOnline;
        return true;
      }
    }
  ], []);

  const passengerColumns = useMemo<ColumnDef<ProfilPengguna>[]>(() => [
    {
      id: 'nama',
      header: 'Nama Penumpang',
      sortable: true,
      accessor: (p) => (
        <div className="flex flex-col text-left">
          <span className="font-bold text-gray-900">{p.nama}</span>
          <span className="text-[10px] text-gray-400 font-mono italic">Bergabung: {new Date(p.tanggalDaftar).toLocaleDateString('id-ID')}</span>
        </div>
      )
    },
    {
      id: 'wa',
      header: 'WhatsApp',
      accessor: (p) => (
        <div className="flex items-center space-x-1.5">
          <span className="text-[11px] font-bold text-gray-700">{p.nomorHp}</span>
          <a
            href={`https://wa.me/${p.nomorHp}`}
            target="_blank" rel="noreferrer"
            className="text-emerald-500 hover:text-emerald-700"
          >
            <MessageCircle size={14} />
          </a>
        </div>
      )
    },
    {
      id: 'verifikasi',
      header: 'Verif',
      accessor: (p) => (
        <button
          onClick={() => OloluStore.toggleProfilVerifikasi(p.id)}
          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
            p.terverifikasi 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-red-50 text-red-500 border-red-200'
          }`}
        >
          {p.terverifikasi ? 'AKTIF' : 'SUSPEND'}
        </button>
      )
    }
  ], []);

  const passengerFilters = useMemo<FilterDef<ProfilPengguna>[]>(() => [
    {
      id: 'verif',
      label: 'Status Akun',
      options: [
        { label: 'Semua', value: 'all' },
        { label: 'Terverifikasi', value: 'true' },
        { label: 'Ditangguhkan', value: 'false' }
      ],
      filterFn: (p, val) => {
        if (val === 'true') return p.terverifikasi;
        if (val === 'false') return !p.terverifikasi;
        return true;
      }
    }
  ], []);

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
      
      {/* GIANT FLASHING RED BANNER UNTUK ALARM DARURAT */}
      {hasNewEmergency && (
        <div className="bg-[#DC2626] text-white p-3.5 text-center font-black animate-pulse flex items-center justify-center space-x-2 z-50 sticky top-[0px] border-b-2 border-yellow-400">
          <AlertTriangle className="animate-bounce" size={20} />
          <span className="text-xs tracking-wider uppercase">🚨 ALARM AKTIF: ADA LAPORAN PANIK BARU! 🚨</span>
          <button onClick={() => setActiveTab('darurat')} className="bg-white text-[#DC2626] font-bold text-[9px] px-2 py-1 rounded-md shadow-sm border border-yellow-400">LIHAT LOKASI</button>
        </div>
      )}

      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] space-y-1">
        <div className="flex items-center space-x-2">
          <Activity size={18} className="text-[#D4AF37] animate-pulse" />
          <h1 className="text-lg font-black font-sans tracking-wide">OLOLU CONTROL PANEL</h1>
        </div>
        <p className="text-[10px] text-emerald-100">Selamat datang, Administrator Ololu Lumajang • Kontrol operasional 24 Jam.</p>
      </div>

      <div className="flex bg-white border-b overflow-x-auto whitespace-nowrap scrollbar-none sticky top-[0px] z-30 shadow-sm">
        {[
          { id: 'stats', label: '📊 Statistik' },
          { id: 'sopir', label: '🛵 Mitra Rider' },
          { id: 'penumpang', label: '👤 Penumpang' },
          { id: 'pesanan', label: '📋 Order' },
          { id: 'dompet', label: '💸 Tarik Dana' },
          { id: 'tarif', label: '⚙️ Pengaturan' },
          { id: 'darurat', label: '🚨 SOS' },
          { id: 'rating', label: '⭐ Rating' },
          { id: 'admins', label: '🔑 Admin' },
          { id: 'logs', label: '📜 Log' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id as any); setSelectedOrder(null); setSelectedSopir(null); }}
            className={`px-4 py-3 text-[11px] font-black transition-all border-b-2 flex items-center space-x-1 ${
              activeTab === t.id ? 'border-[#046A38] text-[#046A38] bg-[#E6F4EC]' : 'border-transparent text-[#6B7280] hover:text-[#046A38]'
            }`}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">

        {activeTab === 'stats' && (
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white p-3.5 rounded-xl border-l-4 border-[#046A38] shadow-xs space-y-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase">PESANAN SELESAI</span>
                <p className="text-xl font-black text-gray-800">{pesananList.filter(p=>p.status==='selesai').length}</p>
                <span className="text-[9px] text-gray-400">Total order terekam</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border-l-4 border-[#D4AF37] shadow-xs space-y-1">
                <span className="text-[10px] text-[#046A38] font-bold uppercase">PENDAPATAN KAS</span>
                <p className="text-xl font-black text-[#B8941F]">Rp {totalBiayaJasaMurni.toLocaleString('id-ID')}</p>
                <span className="text-[9px] text-gray-400">Kas bersih Ololu</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border shadow-xs">
              <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Trafik Pesanan Realtime (24 Jam)</h3>
              <div className="h-56 w-full text-[10px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataJam} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorOjek" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/><stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorMakanan" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#046A38" stopOpacity={0.4}/><stop offset="95%" stopColor="#046A38" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="jam" stroke="#94A3B8" />
                    <YAxis stroke="#94A3B8" />
                    <Tooltip />
                    <Area type="monotone" name="🛵 Ojek" dataKey="🛵 Ojek" stroke="#D4AF37" fill="url(#colorOjek)" strokeWidth={2} />
                    <Area type="monotone" name="🍔 Makanan" dataKey="🍔 Makanan" stroke="#046A38" fill="url(#colorMakanan)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sopir' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Verifikasi Mitra Baru</h3>
            {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin).length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded-xl border">Belum ada pengajuan baru.</p>
            ) : (
              <div className="space-y-3">
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin).map((sopir) => {
                  const prof = profilList.find(p => p.id === sopir.id);
                  return (
                    <div key={sopir.id} className="bg-white p-4 rounded-xl border-t-2 border-[#D4AF37] shadow-xs space-y-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{prof?.nama || 'Rider Baru'}</h4>
                        <p className="text-xs text-gray-500">HP: {prof?.nomorHp} | Motor: {sopir.jenisMotor} ({sopir.platNomor})</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                         <button onClick={() => alert(`VIEW BERKAS:\n${sopir.fotoKtp}`)} className="p-2 bg-gray-50 border rounded text-[10px] font-bold">👁️ KTP</button>
                         <button onClick={() => alert(`VIEW BERKAS:\n${sopir.fotoSim}`)} className="p-2 bg-gray-50 border rounded text-[10px] font-bold">👁️ SIM</button>
                         <button onClick={() => alert(`VIEW BERKAS:\n${sopir.fotoStnk}`)} className="p-2 bg-gray-50 border rounded text-[10px] font-bold">👁️ STNK</button>
                         <button onClick={() => alert(`VIEW BERKAS:\n${sopir.fotoKendaraan}`)} className="p-2 bg-gray-50 border rounded text-[10px] font-bold">👁️ MOTOR</button>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleApproveSopir(sopir.id, true)} className="flex-1 py-2 bg-[#034F2A] text-white rounded-lg text-xs font-bold">SETUJUI</button>
                        <button onClick={() => handleApproveSopir(sopir.id, false)} className="flex-1 py-2 bg-red-100 text-[#DC2626] rounded-lg text-xs font-bold">TOLAK</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 pt-4 uppercase">Mitra Rider Aktif</h3>
            <ReusableTable<DetailSopir>
              data={sopirList.filter(s => s.disetujuiAdmin)}
              columns={driverColumns}
              keyExtractor={(s) => s.id}
              searchFields={(s) => [profilList.find(p=>p.id===s.id)?.nama || '', s.jenisMotor, s.platNomor]}
              filters={driverFilters}
            />
          </div>
        )}

        {activeTab === 'penumpang' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Data Penumpang</h3>
            <ReusableTable<ProfilPengguna>
              data={profilList.filter(p => p.peran === 'penumpang')}
              columns={passengerColumns}
              keyExtractor={(p) => p.id}
              searchFields={(p) => [p.nama, p.nomorHp]}
              filters={passengerFilters}
            />
          </div>
        )}

        {activeTab === 'admins' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Kelola Admin (Pegawai)</h3>
            <form onSubmit={handleAddAdmin} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nama Admin" value={newAdminName} onChange={(e)=>setNewAdminName(e.target.value)} className="p-2 bg-gray-50 border rounded text-xs outline-none" />
                <input type="tel" placeholder="WhatsApp (628xx)" value={newAdminPhone} onChange={(e)=>setNewAdminPhone(e.target.value)} className="p-2 bg-gray-50 border rounded text-xs outline-none" />
              </div>
              <button type="submit" className="w-full py-2 bg-[#046A38] text-white rounded-lg text-xs font-bold">TAMBAH ADMIN BARU</button>
            </form>
            <div className="space-y-2">
              {adminList.map(adm => (
                <div key={adm.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs">
                  <div><p className="text-xs font-black text-gray-800">{adm.nama}</p><p className="text-[10px] text-gray-500 font-mono">{adm.nomorHp} {adm.nomorHp === '6285156766317' && '(Owner)'}</p></div>
                  {adm.nomorHp !== '6285156766317' && <button onClick={() => handleRemoveAdmin(adm.id, adm.nama)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Log Audit Sistem</h3>
            <div className="space-y-2">
              {auditLogs.length === 0 ? <p className="text-xs text-gray-400 text-center py-8">Belum ada catatan.</p> : auditLogs.map(log => (
                <div key={log.id} className="bg-white p-3 rounded-xl border-l-4 border-[#046A38] shadow-xs space-y-1">
                  <div className="flex justify-between items-start"><span className="text-[10px] font-black text-[#046A38] uppercase">{log.aksi}</span><span className="text-[9px] text-gray-400 font-mono">{new Date(log.timestamp).toLocaleString('id-ID')}</span></div>
                  <p className="text-[11px] font-bold text-gray-800">{log.detail}</p>
                  <p className="text-[9px] text-gray-400 font-medium">Oleh: <span className="text-[#D4AF37]">{log.adminNama}</span></p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pesanan' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Audit Detail Pesanan</h3>
            <div className="flex space-x-1 border p-1 rounded-lg bg-gray-50 text-[10px] font-bold">
              {['semua', 'ojek', 'makanan', 'selesai', 'dibatalkan'].map((f) => (
                <button
                  key={f} onClick={() => setComplaintFilter(f)}
                  className={`flex-1 py-1 rounded text-center transition-all ${complaintFilter === f ? 'bg-[#046A38] text-white' : 'text-gray-500 hover:text-[#046A38]'}`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            {pesananList.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded border">Belum ada riwayat pesanan.</p> : (
              <div className="space-y-2">
                {pesananList.filter(p => {
                  if (complaintFilter === 'semua') return true;
                  if (complaintFilter === 'ojek') return p.jenisLayanan === 'ojek';
                  if (complaintFilter === 'makanan') return p.jenisLayanan === 'makanan';
                  return p.status === complaintFilter;
                }).slice().reverse().map((p) => (
                  <div key={p.id} onClick={() => setSelectedOrder(p)} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs hover:border-[#046A38] cursor-pointer transition-all">
                    <div>
                      <p className="text-xs font-black text-gray-800">#{p.nomorPesanan}</p>
                      <p className="text-[10px] text-gray-500">{p.namaPenumpang} • {p.jenisLayanan.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-[#046A38]">Rp {p.totalBayarAkhir.toLocaleString('id-ID')}</p>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${p.status === 'selesai' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{p.status.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dompet' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Pencairan Dana Rider</h3>
            {pendingTarikList.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-8">Tidak ada pengajuan tarik dana yang menunggu.</p> : (
              <div className="space-y-3">
                {pendingTarikList.map(tx => {
                  const prof = profilList.find(p => p.id === tx.idSopir);
                  return (
                    <div key={tx.id} className="bg-white p-4 rounded-xl border-t-2 border-[#D4AF37] shadow-xs space-y-3">
                      <div>
                        <p className="text-sm font-black text-gray-800">{prof?.nama}</p>
                        <p className="text-xs text-gray-500">Jumlah: <span className="font-bold text-[#046A38]">Rp {tx.jumlah.toLocaleString('id-ID')}</span></p>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => { OloluStore.prosesTarikDanaAdmin(tx.id, true, 'Selesai ditransfer'); alert('Berhasil disetujui'); }} className="flex-1 py-2 bg-[#046A38] text-white rounded-lg text-xs font-bold">SETUJUI & TRANSFER</button>
                        <button onClick={() => { OloluStore.prosesTarikDanaAdmin(tx.id, false, 'Ditolak admin'); alert('Berhasil ditolak'); }} className="flex-1 py-2 bg-red-100 text-[#DC2626] rounded-lg text-xs font-bold">TOLAK</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tarif' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Pengaturan Tarif & Sistem</h3>
            <div className="bg-white p-4 rounded-xl border shadow-sm space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">TARIF DASAR OJEK</label>
                  <input type="number" value={tempConfig.ojekTarifDasar} onChange={(e) => setTempConfig({...tempConfig, ojekTarifDasar: parseInt(e.target.value)})} className="w-full p-2 bg-gray-50 border rounded text-xs font-bold" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400">TARIF PER KM</label>
                  <input type="number" value={tempConfig.ojekTarifPerKm} onChange={(e) => setTempConfig({...tempConfig, ojekTarifPerKm: parseInt(e.target.value)})} className="w-full p-2 bg-gray-50 border rounded text-xs font-bold" />
                </div>
              </div>
              <button onClick={saveConfigWithLog} className="w-full py-3 bg-[#046A38] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md">SIMPAN PERUBAHAN</button>
            </div>
          </div>
        )}

        {activeTab === 'darurat' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Radar Darurat Lumajang</h3>
            <div className="h-64 bg-gray-200 rounded-2xl overflow-hidden relative border-2 border-red-200">
               <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                  <Map defaultCenter={KOORDINAT_LUMAJANG} defaultZoom={13} mapId="ADMIN_RADAR">
                    {emergencyList.filter(e => e.status === 'baru').map(e => (
                      <AdvancedMarker key={e.id} position={{ lat: e.lat, lng: e.lng }}>
                        <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center animate-ping text-white border-2 border-white shadow-lg">🚨</div>
                      </AdvancedMarker>
                    ))}
                  </Map>
               </APIProvider>
            </div>
            <div className="space-y-2">
              {emergencyList.slice().reverse().map(e => (
                <div key={e.id} className={`p-3 rounded-xl border ${e.status === 'baru' ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-white border-gray-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-black text-red-600 uppercase">LAPORAN {e.status.toUpperCase()}</span>
                    <span className="text-[9px] text-gray-400">{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs font-bold text-gray-800">{e.namaPelapor} ({e.peranPelapor})</p>
                  <p className="text-[10px] text-gray-500">WA: {e.nomorHpPelapor}</p>
                  {e.status === 'baru' && (
                    <button onClick={() => handleResolveEmergency(e.id)} className="mt-2 w-full py-1.5 bg-[#046A38] text-white rounded-lg text-[9px] font-black uppercase">TANDAI SELESAI</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'rating' && (
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-1.5 uppercase">Rating & Ulasan Mitra</h3>
            <div className="bg-[#E6F4EC] p-4 rounded-xl flex justify-between items-center">
              <span className="text-xs font-bold text-[#046A38]">RATING GLOBAL:</span>
              <span className="text-xl font-black text-[#B8941F]">★ {avgRatingGlobal}</span>
            </div>
            <div className="space-y-2">
              {ratingList.map(r => (
                <div key={r.id} className="bg-white p-3 rounded-xl border shadow-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-black text-gray-800">{r.namaPenumpang}</span>
                    <span className="text-[#D4AF37]">{'★'.repeat(r.bintang)}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed italic">"{r.ulasan}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
