/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OloluStore, KOORDINAT_LUMAJANG, DEFAULT_PENGATURAN_TARIF } from '../services/store';
import { ololuRealtime } from '../services/supabaseClient';
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
  ShieldCheck,
  Power,
  MessageCircle,
  ArrowRight,
  Bike,
  Car,
  ShoppingBag,
  Package,
  User
} from 'lucide-react';
import { ReusableTable, ColumnDef, FilterDef } from './ReusableTable';

export default function AdminView() {
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'sopir' | 'penumpang' | 'pesanan' | 'dompet' | 'tarif' | 'darurat' | 'rating' | 'admins' | 'logs'>('stats');
  
  // STATE DATA REALTIME
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [sopirList, setSopirList] = useState<DetailSopir[]>([]);
  const [profilList, setProfilList] = useState<ProfilPengguna[]>([]);
  const [emergencyList, setEmergencyList] = useState<LaporanDarurat[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiDompet[]>([]);
  const [activeDompetTab, setActiveDompetTab] = useState<'pending' | 'history'>('pending');
  const [ratingList, setRatingList] = useState<RatingUlasan[]>([]);
  const [config, setConfig] = useState<PengaturanTarif>(DEFAULT_PENGATURAN_TARIF);
  const [adminList, setAdminList] = useState<ProfilPengguna[]>([]);
  const [auditLogs, setAuditLogs] = useState<LogAudit[]>([]);

  // UI DETAIL EXPANSIONS
  const [selectedOrder, setSelectedOrder] = useState<Pesanan | null>(null);
  const [selectedSopir, setSelectedSopir] = useState<DetailSopir | null>(null);
  const [showSopirModal, setShowSopirModal] = useState(false);
  const [alasanTolakSopir, setAlasanTolakSopir] = useState('');
  const [complaintFilter, setComplaintFilter] = useState<string>('semua');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpTargetId, setTopUpModalTargetId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>('');

  const [showProofModal, setShowProofModal] = useState<string | null>(null);

  // FORM ADD SUB-ADMIN
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  // FORM EDIT TARIF STATE
  const [tempConfig, setTempConfig] = useState<PengaturanTarif>(DEFAULT_PENGATURAN_TARIF);
  const [activeTarifCat, setActiveTarifCat] = useState<'ride' | 'car' | 'food' | 'send' | 'big' | 'extra' | 'sys'>('ride');

  // EMERGENCIES AUDIO ALARM SYSTEM
  const [showPanicOverlay, setShowPanicOverlay] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<LaporanDarurat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAdmin() {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);
      setIsSuperUser(p?.nomorHp === '6285156766317');
    }
    initAdmin();

    const syncData = async () => {
      const [orders, sopir, users, settings, logs, admins, emergencies] = await Promise.all([
        OloluStore.getAllPesanan(),
        OloluStore.getAllSopir(),
        OloluStore.getAllUsers(),
        OloluStore.getPengaturan(),
        OloluStore.getAllAuditLogs(),
        OloluStore.getAllAdmins(),
        OloluStore.getAllEmergency()
      ]);

      setPesananList(orders);
      setSopirList(sopir);
      setProfilList(users);
      setConfig(settings);
      setTempConfig(settings);
      setAuditLogs(logs);
      setAdminList(admins);
      setEmergencyList(emergencies);
      setLoading(false);
    };

    syncData();
    const unsubscribeStore = OloluStore.subscribeToStore(syncData);

    // REAL-TIME PANIC LISTENER
    const unsubscribeEmergency = ololuRealtime.subscribeToEmergencies((newEmergency: LaporanDarurat) => {
      console.log("🚨 REAL-TIME EMERGENCY RECEIVED:", newEmergency);
      setActiveEmergency(newEmergency);
      setShowPanicOverlay(true);
      startSiren();
    });

    return () => {
      unsubscribeStore();
      unsubscribeEmergency();
      stopSiren();
    };
  }, []);

  // --- AUDIO SIREN LOGIC ---
  const startSiren = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const playTone = (freq: number, duration: number) => {
      const ctx = audioContextRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    };

    if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);

    sirenIntervalRef.current = setInterval(() => {
      playTone(800, 0.5);
      setTimeout(() => playTone(600, 0.5), 500);
    }, 1000);
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
  };

  const handleHandleEmergency = async () => {
    // In production, update status in DB
    stopSiren();
    setShowPanicOverlay(false);
    setActiveTab('darurat');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#046A38]/20 border-t-[#046A38] rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-gray-400 uppercase">Memuat Dashboard Admin...</p>
      </div>
    );
  }

  if (!isSuperUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-black text-gray-800">Akses Ditolak</h2>
        <p className="text-sm text-gray-500 mt-2">Halaman ini hanya dapat diakses oleh Administrator Utama.</p>
      </div>
    );
  }

  // --- STATS COMPUTATION ---
  const totalBiayaJasaMurni = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => {
    const jasa = Math.round((cur.tarifPerjalananMurni + (cur.tambahanTujuan || 0) + (cur.tambahanItem || 0)) * (cur.biayaLayananPersen || 10) / 100);
    return acc + jasa;
  }, 0);

  const pendingTarikList = transaksiList.filter(t => t.jenis === 'tarik_dana' && t.statusTarik === 'menunggu');
  const avgRatingGlobal = ratingList.length > 0 ? parseFloat((ratingList.reduce((acc, cur) => acc + cur.bintang, 0) / ratingList.length).toFixed(1)) : 5.0;

  const handleApproveSopir = async (id: string, ok: boolean) => {
    // Audit logs handled in store now
    alert(ok ? "Mitra Disetujui!" : "Mitra Ditolak.");
  };

  const saveConfigWithLog = async () => {
    if (!profile) return;
    const catLabels: any = { ride: 'Ojek', car: 'Mobil', food: 'Makanan', send: 'Paket', big: 'Logistik', extra: 'Parkir/Lainnya', sys: 'Sistem' };
    const detail = `Memperbarui konfigurasi tarif kategori: ${catLabels[activeTarifCat] || activeTarifCat.toUpperCase()}`;

    await OloluStore.savePengaturan(tempConfig, profile.id, profile.nama);
    await OloluStore.addAuditLog(profile.id, profile.nama, "Update Tarif", detail);
    alert("🚀 SEMUA PENGATURAN BERHASIL DISIMPAN!");
  };

  const handleVerifySopir = async (id: string, ok: boolean) => {
    if (!ok && !alasanTolakSopir) {
      alert("Masukkan alasan penolakan!");
      return;
    }
    const res = await OloluStore.verifikasiSopir(id, ok, ok ? '' : alasanTolakSopir);
    if (res.success) {
      alert(ok ? "Mitra BERHASIL DISETUJUI! 🎉" : "Mitra DITOLAK.");
      setShowSopirModal(false);
      setSelectedSopir(null);
      setAlasanTolakSopir('');
    } else {
      alert("Gagal verifikasi: " + res.error);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminPhone || !newAdminName) {
      alert("Lengkapi nama dan nomor WhatsApp.");
      return;
    }
    const res = await OloluStore.promoteToAdmin(newAdminPhone, newAdminName);
    if (res.success) {
      alert("Admin berhasil ditambahkan.");
      setNewAdminPhone('');
      setNewAdminName('');
    } else {
      alert(res.error || "Gagal menambah admin.");
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (confirm("Cabut hak akses admin untuk pengguna ini?")) {
      const res = await OloluStore.removeAdminStatus(id);
      if (res.success) {
        alert("Akses admin dicabut.");
      } else {
        alert(res.error || "Gagal mencabut akses.");
      }
    }
  };

  const handleProsesTx = async (id: string, status: 'disetujui' | 'ditolak') => {
    let alasan = '';
    if (status === 'ditolak') {
      alasan = prompt("Alasan penolakan:") || 'Ditolak admin';
    }
    await OloluStore.prosesTransaksi(id, status, alasan);
    alert(status === 'disetujui' ? "Berhasil disetujui! Saldo driver telah diupdate." : "Berhasil ditolak.");
  };

  const handleAdminTopUp = async () => {
    if (!topUpTargetId || !topUpAmount) return;
    const res = await OloluStore.topUpSopir(topUpTargetId, parseInt(topUpAmount), "Isi saldo oleh Admin");
    if (res.success) {
      alert("Saldo berhasil diisi!");
      setShowTopUpModal(false);
      setTopUpAmount('');
    } else {
      alert("Gagal: " + res.error);
    }
  };

  const driverColumns = [
    { id: 'nama', header: 'Sopir', accessor: (s: any) => <div className="text-left font-bold">{s.platNomor || 'Rider'}</div> },
    { id: 'motor', header: 'Motor', accessor: (s: any) => <div className="text-left text-[10px]">{s.jenisMotor}</div> },
    { id: 'saldo', header: 'Saldo', accessor: (s: any) => <div className="text-right font-black">Rp {s.saldoDompet?.toLocaleString()}</div> }
  ];

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative font-sans">
      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] space-y-1 text-left">
        <div className="flex items-center space-x-2">
          <Activity size={18} className="text-[#D4AF37] animate-pulse" />
          <h1 className="text-lg font-black tracking-wide">OLOLU CONTROL PANEL</h1>
        </div>
        <p className="text-[10px] text-emerald-100 uppercase font-bold tracking-widest">Administrator: {profile?.nama}</p>
      </div>

      <div className="flex bg-white border-b overflow-x-auto whitespace-nowrap scrollbar-none sticky top-0 z-30 shadow-sm">
        {[
          { id: 'stats', label: '📊 Statistik' },
          { id: 'sopir', label: '🛵 Rider' },
          { id: 'dompet', label: '💰 Dompet' },
          { id: 'penumpang', label: '👤 User' },
          { id: 'pesanan', label: '📋 Order' },
          { id: 'darurat', label: '🚨 Darurat' },
          { id: 'tarif', label: '⚙️ Pengaturan' },
          { id: 'admins', label: '🔑 Tim' },
          { id: 'logs', label: '📜 Log' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-5 py-3 text-[11px] font-black transition-all border-b-2 ${
              activeTab === t.id ? 'border-[#046A38] text-[#046A38] bg-[#E6F4EC]' : 'border-transparent text-[#6B7280]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 gap-2.5">
             <div className="bg-white p-4 rounded-2xl border-l-4 border-[#046A38] shadow-sm">
               <span className="text-[9px] font-bold text-gray-400 uppercase">Selesai</span>
               <p className="text-xl font-black text-gray-800">{pesananList.filter(p=>p.status==='selesai').length}</p>
             </div>
             <div className="bg-white p-4 rounded-2xl border-l-4 border-[#D4AF37] shadow-sm">
               <span className="text-[9px] font-bold text-gray-400 uppercase">Kas Ololu</span>
               <p className="text-xl font-black text-[#B8941F]">Rp {totalBiayaJasaMurni.toLocaleString()}</p>
             </div>
          </div>
        )}

        {activeTab === 'sopir' && (
          <div className="space-y-4">
             {/* SECTION 1: MENUNGGU VERIFIKASI */}
             <div className="space-y-2">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">⏳ Menunggu Verifikasi</h3>
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin).length === 0 ? (
                  <p className="text-[10px] italic text-gray-400 bg-white p-4 rounded-xl border border-dashed text-center">Tidak ada antrian pendaftaran baru.</p>
                ) : (
                  sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin).map(s => (
                    <button key={s.id} onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }} className="w-full bg-white p-3 rounded-xl border-2 border-amber-100 flex items-center justify-between shadow-sm hover:border-amber-400 transition-all text-left">
                       <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 border border-amber-100">
                             <User size={20} />
                          </div>
                          <div>
                             <p className="text-xs font-black text-gray-800 uppercase">{(s as any).nama || 'RIDER BARU'}</p>
                             <p className="text-[9px] text-amber-600 font-bold">Klik untuk Review Berkas</p>
                          </div>
                       </div>
                       <ChevronRight size={16} className="text-amber-300" />
                    </button>
                  ))
                )}
             </div>

             {/* SECTION 2: MITRA AKTIF */}
             <div className="space-y-2 pt-2">
                <h3 className="text-[10px] font-black text-[#046A38] uppercase tracking-widest px-1">✅ Mitra Aktif Ololu</h3>
                {sopirList.filter(s => s.disetujuiAdmin).length === 0 ? (
                  <p className="text-[10px] italic text-gray-400 text-center py-4">Belum ada mitra aktif.</p>
                ) : (
                  sopirList.filter(s => s.disetujuiAdmin).map(s => (
                    <div key={s.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs">
                       <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-[#046A38]">
                             <Bike size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-800 uppercase">{(s as any).nama}</p>
                            <p className="text-[9px] text-gray-500 font-medium">{s.platNomor} • {s.jenisMotor}</p>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end space-y-1">
                          <p className="text-[10px] font-black text-emerald-600">Rp {s.saldoDompet?.toLocaleString()}</p>
                          <div className="flex space-x-1">
                             <button
                               onClick={() => { setTopUpModalTargetId(s.id); setShowTopUpModal(true); }}
                               className="bg-emerald-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-700"
                             >
                               ISI SALDO
                             </button>
                             <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.statusOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                               {s.statusOnline ? 'ONLINE' : 'OFFLINE'}
                             </span>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}

        {activeTab === 'dompet' && (
          <div className="space-y-4">
             <div className="flex bg-white p-1 rounded-xl border border-gray-150 gap-1 shadow-sm">
                <button onClick={()=>setActiveDompetTab('pending')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeDompetTab==='pending' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>PENGAJUAN TARIK (ACC)</button>
                <button onClick={()=>setActiveDompetTab('history')} className={`flex-1 py-2 text-[10px] font-black rounded-lg transition-all ${activeDompetTab==='history' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>SEMUA TRANSAKSI</button>
             </div>

             {activeDompetTab === 'pending' ? (
                <div className="space-y-3">
                   {transaksiList.filter(t => (t.jenis === 'tarik_dana' || t.jenis === 'topup') && t.statusTarik === 'menunggu').length === 0 ? (
                     <p className="text-[10px] italic text-gray-400 text-center py-10 bg-white rounded-xl border border-dashed">Tidak ada pengajuan deposit atau tarik dana baru.</p>
                   ) : (
                     transaksiList.filter(t => (t.jenis === 'tarik_dana' || t.jenis === 'topup') && t.statusTarik === 'menunggu').map(t => (
                       <div key={t.id} className={`bg-white p-4 rounded-2xl border-2 shadow-md space-y-3 ${t.jenis === 'topup' ? 'border-emerald-500' : 'border-[#D4AF37]'}`}>
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-xs font-black text-gray-800 uppercase">{(t as any).namaSopir}</p>
                                <p className="text-[9px] text-gray-500">{new Date(t.timestamp).toLocaleString()}</p>
                             </div>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.jenis === 'topup' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-[#B8941F]'}`}>
                               {t.jenis === 'topup' ? 'DEPOSIT MASUK' : 'PENGAJUAN TARIK'}
                             </span>
                          </div>

                          <div className="bg-gray-50 p-3 rounded-xl border text-center relative overflow-hidden">
                             {t.jenis === 'topup' && t.buktiTransfer && (
                               <button
                                 onClick={() => setShowProofModal(t.buktiTransfer || null)}
                                 className="absolute right-2 top-2 bg-emerald-600 text-white p-1.5 rounded-lg shadow-sm active:scale-90 transition-transform"
                                 title="Lihat Bukti Transfer"
                               >
                                 <Eye size={12} />
                               </button>
                             )}
                             <span className="text-[9px] font-bold text-gray-400 uppercase block">Nominal {t.jenis === 'topup' ? 'Setoran' : 'Pencairan'}:</span>
                             <p className={`text-xl font-black ${t.jenis === 'topup' ? 'text-emerald-600' : 'text-[#B8941F]'}`}>
                               Rp {t.jumlah?.toLocaleString()}
                             </p>
                          </div>

                          <div className="flex space-x-2">
                             <button onClick={()=>handleProsesTx(t.id, 'ditolak')} className="flex-1 py-2.5 bg-white text-red-600 border border-red-100 font-black rounded-xl text-[9px] uppercase">TOLAK</button>
                             <button
                               onClick={()=>handleProsesTx(t.id, 'disetujui')}
                               className={`flex-[2] py-2.5 text-white font-black rounded-xl text-[9px] uppercase shadow-md ${t.jenis === 'topup' ? 'bg-emerald-600' : 'bg-[#046A38]'}`}
                             >
                               {t.jenis === 'topup' ? 'ACC & TAMBAH SALDO' : 'ACC & CAIRKAN'}
                             </button>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             ) : (
                <div className="space-y-2">
                   {transaksiList.map(t => (
                     <div key={t.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs">
                        <div>
                           <p className="text-[10px] font-black text-gray-800 leading-tight">{t.deskripsi}</p>
                           <p className="text-[8px] text-gray-400">{(t as any).namaSopir} • {new Date(t.timestamp).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                           <p className={`text-[10px] font-black ${t.jenis==='pendapatan'||t.jenis==='topup' ? 'text-green-600':'text-red-500'}`}>
                             {t.jenis==='pendapatan'||t.jenis==='topup'?'+':'-'} Rp {t.jumlah?.toLocaleString()}
                           </p>
                           <span className="text-[7px] text-gray-400 uppercase font-bold">{t.statusTarik || t.jenis}</span>
                        </div>
                     </div>
                   ))}
                </div>
             )}
          </div>
        )}
           <div className="space-y-2">
             <h3 className="text-xs font-black text-gray-700 uppercase mb-3">Daftar Pengguna (Penumpang)</h3>
             {profilList.length === 0 ? <p className="text-xs italic text-gray-400 text-center py-10">Belum ada pengguna terdaftar.</p> :
               profilList.map(p => (
                 <div key={p.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Users size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800">{p.nama}</p>
                        <p className="text-[9px] text-gray-500">{p.nomorHp}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] text-gray-400 uppercase font-medium">{new Date(p.tanggalDaftar).toLocaleDateString()}</p>
                    </div>
                 </div>
               ))
             }
           </div>
        )}

        {activeTab === 'pesanan' && (
           <div className="space-y-2">
             <h3 className="text-xs font-black text-gray-700 uppercase mb-3">Audit Order Masuk</h3>
             {pesananList.map(p => (
                <div key={p.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs">
                  <div>
                    <p className="text-xs font-black text-gray-800">#{p.nomorPesanan}</p>
                    <p className="text-[10px] text-gray-500">{p.jenisLayanan?.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[#046A38]">Rp {p.totalBayarAkhir?.toLocaleString()}</p>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">{p.status}</span>
                  </div>
                </div>
             ))}
           </div>
        )}

        {activeTab === 'darurat' && (
           <div className="space-y-4">
             <h3 className="text-xs font-black text-red-600 uppercase">Laporan Darurat (SOS)</h3>
             {emergencyList.length === 0 ? (
               <div className="p-8 text-center text-gray-400 text-[10px] italic bg-white rounded-2xl border border-dashed">
                 Belum ada laporan darurat masuk.
               </div>
             ) : (
               emergencyList.map(e => (
                 <div key={e.id} className={`bg-white p-4 rounded-2xl border-2 flex flex-col space-y-3 shadow-md ${e.status === 'baru' ? 'border-red-500 animate-pulse' : 'border-gray-100'}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-2">
                         <div className={`p-2 rounded-full ${e.peranPelapor === 'sopir' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                            {e.peranPelapor === 'sopir' ? '🛵' : '👤'}
                         </div>
                         <div>
                            <p className="text-xs font-black text-gray-800 uppercase">{e.namaPelapor}</p>
                            <p className="text-[10px] text-gray-500">{e.nomorHpPelapor}</p>
                         </div>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-1 rounded-full ${e.status === 'baru' ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-600'}`}>
                        {e.status === 'baru' ? 'BUTUH BANTUAN' : 'DITANGANI'}
                      </span>
                    </div>

                    <div className="h-32 w-full rounded-xl overflow-hidden border bg-gray-50 relative">
                       <APIProvider apiKey={GOOGLE_MAPS_KEY}>
                          <Map
                            defaultCenter={{ lat: parseFloat(e.lat as any), lng: parseFloat(e.lng as any) }}
                            defaultZoom={15}
                            disableDefaultUI={true}
                          >
                             <AdvancedMarker position={{ lat: parseFloat(e.lat as any), lng: parseFloat(e.lng as any) }}>
                                <div className="text-2xl animate-bounce">🆘</div>
                             </AdvancedMarker>
                          </Map>
                       </APIProvider>
                       <div className="absolute top-2 left-2 bg-black/70 text-white text-[8px] px-1.5 py-0.5 rounded font-mono">
                         {e.lat}, {e.lng}
                       </div>
                    </div>

                    <div className="flex space-x-2 pt-2 border-t border-dashed">
                       <a href={`tel:${e.nomorHpPelapor}`} className="flex-1 py-2 bg-emerald-600 text-white text-center rounded-xl text-[10px] font-black uppercase">Hubungi Sekarang</a>
                       <button className="flex-1 py-2 bg-gray-800 text-white text-center rounded-xl text-[10px] font-black uppercase">Tandai Selesai</button>
                    </div>
                 </div>
               ))
             )}
           </div>
        )}

        {activeTab === 'tarif' && (
          <div className="space-y-4">
            {/* Navigasi Kategori Tarif */}
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
               {[
                 { id: 'ride', label: '🏍️ Ojek', color: 'bg-emerald-500' },
                 { id: 'car', label: '🚗 Mobil', color: 'bg-blue-500' },
                 { id: 'food', label: '🍔 Makan', color: 'bg-amber-500' },
                 { id: 'send', label: '📦 Paket', color: 'bg-indigo-500' },
                 { id: 'big', label: '🚚 Logistik', color: 'bg-purple-500' },
                 { id: 'extra', label: '🅿️ Lainnya', color: 'bg-slate-500' },
                 { id: 'sys', label: '⚙️ Sistem', color: 'bg-gray-500' }
               ].map(cat => (
                 <button
                   key={cat.id}
                   onClick={() => setActiveTarifCat(cat.id as any)}
                   className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap transition-all border-2 ${
                     activeTarifCat === cat.id ? 'border-[#046A38] bg-[#E6F4EC] text-[#046A38]' : 'border-transparent bg-white text-gray-400'
                   }`}
                 >
                   {cat.label}
                 </button>
               ))}
            </div>

            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {/* 🏍️ OJEK MOTOR */}
               {activeTarifCat === 'ride' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <Bike size={14} /> <span>Pengaturan Ololu-Ride (Motor)</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Dasar</label>
                          <input type="number" value={tempConfig.ojekTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Per KM</label>
                          <input type="number" value={tempConfig.ojekTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifPerKm: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Minimum</label>
                          <input type="number" value={tempConfig.ojekTarifMinimum} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifMinimum: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Batas KM Dasar</label>
                          <input type="number" value={tempConfig.ojekBatasKmTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, ojekBatasKmTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Biaya Per Stop</label>
                          <input type="number" value={tempConfig.ojekBiayaPerStop} onChange={(e)=>setTempConfig({...tempConfig, ojekBiayaPerStop: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                       <span className="text-[9px] font-bold text-emerald-800 uppercase">Status Layanan Ride</span>
                       <input type="checkbox" checked={tempConfig.layananOjekAktif} onChange={(e)=>setTempConfig({...tempConfig, layananOjekAktif: e.target.checked})} className="w-4 h-4 rounded text-[#046A38]" />
                    </div>
                 </div>
               )}

               {/* 🚗 MOBIL */}
               {activeTarifCat === 'car' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-blue-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <Car size={14} /> <span>Pengaturan Ololu-Car (Mobil)</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Dasar</label>
                          <input type="number" value={tempConfig.mobilTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, mobilTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Per KM</label>
                          <input type="number" value={tempConfig.mobilTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, mobilTarifPerKm: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Minimum</label>
                          <input type="number" value={tempConfig.mobilTarifMinimum} onChange={(e)=>setTempConfig({...tempConfig, mobilTarifMinimum: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Batas KM Dasar</label>
                          <input type="number" value={tempConfig.mobilBatasKmTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, mobilBatasKmTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Biaya Per Stop</label>
                          <input type="number" value={tempConfig.mobilBiayaPerStop} onChange={(e)=>setTempConfig({...tempConfig, mobilBiayaPerStop: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                    {/* Reuse existing mobil active toggle if relevant */}
                 </div>
               )}

               {/* 🍔 MAKANAN */}
               {activeTarifCat === 'food' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <ShoppingBag size={14} /> <span>Pengaturan Makanan & Belanja</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Dasar</label>
                          <input type="number" value={tempConfig.makananTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, makananTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Per KM</label>
                          <input type="number" value={tempConfig.makananTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, makananTarifPerKm: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Minimum</label>
                          <input type="number" value={tempConfig.makananTarifMinimum} onChange={(e)=>setTempConfig({...tempConfig, makananTarifMinimum: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Batas KM Dasar</label>
                          <input type="number" value={tempConfig.makananBatasKmTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, makananBatasKmTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Biaya Per Stop</label>
                          <input type="number" value={tempConfig.makananBiayaPerStop} onChange={(e)=>setTempConfig({...tempConfig, makananBiayaPerStop: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                 </div>
               )}

               {/* 📦 PAKET */}
               {activeTarifCat === 'send' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <Package size={14} /> <span>Pengaturan Ololu-Send (Paket)</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Dasar</label>
                          <input type="number" value={tempConfig.paketTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, paketTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Per KM</label>
                          <input type="number" value={tempConfig.paketTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, paketTarifPerKm: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Minimum</label>
                          <input type="number" value={tempConfig.paketTarifMinimum} onChange={(e)=>setTempConfig({...tempConfig, paketTarifMinimum: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Batas KM Dasar</label>
                          <input type="number" value={tempConfig.paketBatasKmTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, paketBatasKmTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Biaya Per Stop</label>
                          <input type="number" value={tempConfig.paketBiayaPerStop} onChange={(e)=>setTempConfig({...tempConfig, paketBiayaPerStop: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                 </div>
               )}

               {/* 🚚 LOGISTIK / BARANG BESAR */}
               {activeTarifCat === 'big' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-purple-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <Package size={14} /> <span>Pengaturan Logistik & Barang Besar</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Dasar</label>
                          <input type="number" value={tempConfig.barangBesarTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, barangBesarTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Per KM</label>
                          <input type="number" value={tempConfig.barangBesarTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, barangBesarTarifPerKm: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Tarif Minimum</label>
                          <input type="number" value={tempConfig.barangBesarTarifMinimum} onChange={(e)=>setTempConfig({...tempConfig, barangBesarTarifMinimum: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Batas KM Dasar</label>
                          <input type="number" value={tempConfig.barangBesarBatasKmTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, barangBesarBatasKmTarifDasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Biaya Per Stop</label>
                          <input type="number" value={tempConfig.barangBesarBiayaPerStop} onChange={(e)=>setTempConfig({...tempConfig, barangBesarBiayaPerStop: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                 </div>
               )}

               {/* 🅿️ PARKIR & TAMBAHAN */}
               {activeTarifCat === 'extra' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <DollarSign size={14} /> <span>Biaya Parkir & Tambahan</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Parkir Biasa</label>
                          <input type="number" value={tempConfig.biayaParkirBiasa} onChange={(e)=>setTempConfig({...tempConfig, biayaParkirBiasa: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Parkir Pasar</label>
                          <input type="number" value={tempConfig.biayaParkirPasar} onChange={(e)=>setTempConfig({...tempConfig, biayaParkirPasar: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Biaya Per Stop</label>
                          <input type="number" value={tempConfig.biayaPerStopTambahan} onChange={(e)=>setTempConfig({...tempConfig, biayaPerStopTambahan: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Kelebihan Item</label>
                          <input type="number" value={tempConfig.biayaKelebihanItem} onChange={(e)=>setTempConfig({...tempConfig, biayaKelebihanItem: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                 </div>
               )}

               {/* ⚙️ ATURAN SISTEM */}
               {activeTarifCat === 'sys' && (
                 <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                       <Settings size={14} /> <span>Kontrol Pendaftaran & Sistem</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                       <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <span className="text-[8px] font-bold text-emerald-800 uppercase leading-none">Daftar Motor</span>
                          <input type="checkbox" checked={tempConfig.daftarMotorAktif} onChange={(e)=>setTempConfig({...tempConfig, daftarMotorAktif: e.target.checked})} className="w-4 h-4 rounded text-[#046A38]" />
                       </div>
                       <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                          <span className="text-[8px] font-bold text-emerald-800 uppercase leading-none">Daftar Mobil</span>
                          <input type="checkbox" checked={tempConfig.daftarMobilAktif} onChange={(e)=>setTempConfig({...tempConfig, daftarMobilAktif: e.target.checked})} className="w-4 h-4 rounded text-[#046A38]" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Radius Cari (KM)</label>
                          <input type="number" value={tempConfig.radiusPencarianSopirKm} onChange={(e)=>setTempConfig({...tempConfig, radiusPencarianSopirKm: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[8px] font-bold text-gray-400 uppercase">Saldo Min Online</label>
                          <input type="number" value={tempConfig.saldoMinimalOnlineSopir} onChange={(e)=>setTempConfig({...tempConfig, saldoMinimalOnlineSopir: parseInt(e.target.value)})} className="w-full p-2.5 bg-gray-50 border rounded-xl outline-none text-xs font-black" />
                       </div>
                    </div>
                 </div>
               )}

               <button
                 onClick={saveConfigWithLog}
                 className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-[10px] tracking-widest uppercase shadow-lg active:scale-95 transition-transform"
               >
                 SIMPAN SEMUA PENGATURAN
               </button>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
           <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                <h3 className="text-xs font-black text-[#046A38] uppercase">Tambah Admin Baru</h3>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nama Lengkap Admin"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold"
                  />
                  <input
                    type="tel"
                    placeholder="Nomor WhatsApp (628...)"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-xs font-bold"
                  />
                  <button
                    onClick={handleAddAdmin}
                    className="w-full py-3 bg-[#046A38] text-white font-black rounded-xl text-[10px] tracking-widest uppercase shadow-md active:scale-95 transition-transform"
                  >
                    TAMBAH TIM ADMIN
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black text-gray-700 uppercase mb-3 px-1">Daftar Tim Admin</h3>
                {adminList.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-[10px] italic bg-white rounded-2xl border border-dashed">
                    Belum ada admin tambahan.
                  </div>
                ) : (
                  adminList.map(adm => (
                    <div key={adm.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-[#046A38]">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800">{adm.nama}</p>
                          <p className="text-[9px] text-gray-500 font-medium">
                            {adm.nomorHp} {adm.nomorHp === '6285156766317' ? <span className="text-amber-600 font-bold ml-1">(SUPERUSER)</span> : <span className="text-emerald-600 font-bold ml-1">(SUB-ADMIN)</span>}
                          </p>
                        </div>
                      </div>
                      {adm.nomorHp !== '6285156766317' && (
                        <button
                          onClick={() => handleRemoveAdmin(adm.id)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus Akses"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
           </div>
        )}

        {activeTab === 'logs' && (
           <div className="space-y-2">
             <h3 className="text-xs font-black text-gray-700 uppercase mb-3">Log Audit Sistem</h3>
             {auditLogs.length === 0 ? <p className="text-xs italic text-gray-400 text-center py-10">Belum ada log tercatat.</p> :
               auditLogs.map(l => (
                 <div key={l.id} className="bg-white p-3 rounded-xl border space-y-1 shadow-xs">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] font-black text-[#046A38] uppercase">{l.aksi}</p>
                      <p className="text-[8px] text-gray-400">{new Date(l.timestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-gray-600 leading-relaxed">{l.detail}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Oleh: {l.adminNama}</p>
                 </div>
               ))
             }
           </div>
        )}
      </div>

      {/* MODAL LIHAT BUKTI TRANSFER */}
      {showProofModal && (
        <div className="fixed inset-0 z-[2000] bg-black/90 flex flex-col items-center justify-center p-4">
           <button onClick={()=>setShowProofModal(null)} className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full"><X size={24} /></button>
           <div className="w-full max-w-sm aspect-[3/4] bg-white rounded-2xl overflow-hidden shadow-2xl">
              <img src={showProofModal} className="w-full h-full object-contain" alt="Bukti Transfer Zoom" />
           </div>
           <p className="text-white text-xs font-bold mt-4 uppercase tracking-widest">Bukti Transfer Deposit</p>
        </div>
      )}

      {/* MODAL ISI SALDO OLEH ADMIN */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-xs rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center">
                 <DollarSign size={32} className="mx-auto text-emerald-600 mb-2" />
                 <h3 className="font-black text-sm uppercase">Isi Saldo Mitra</h3>
                 <p className="text-[10px] text-gray-500">Masukkan nominal penambahan saldo</p>
              </div>
              <input
                type="number"
                value={topUpAmount}
                onChange={(e)=>setTopUpAmount(e.target.value)}
                placeholder="cth: 50000"
                className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-center font-black text-emerald-600"
              />
              <div className="flex space-x-2">
                 <button onClick={()=>setShowTopUpModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl text-[10px]">BATAL</button>
                 <button onClick={handleAdminTopUp} className="flex-1 py-2.5 bg-emerald-600 text-white font-black rounded-xl text-[10px] shadow-md">ISI SEKARANG</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL VERIFIKASI SOPIR (ACC BUTTON HERE) */}
      {showSopirModal && selectedSopir && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
           <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="bg-[#034F2A] text-white p-5 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Verifikasi Mitra</h3>
                    <p className="text-[10px] text-emerald-100">Review Kelengkapan Berkas</p>
                 </div>
                 <button onClick={() => setShowSopirModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                    <XCircle size={20} />
                 </button>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto scrollbar-none flex-1">
                 {/* Profil & Kendaraan */}
                 <div className="bg-gray-50 p-4 rounded-2xl border space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400"><span>Data Identitas</span></div>
                    <p className="text-base font-black text-gray-800">{(selectedSopir as any).nama}</p>
                    <p className="text-xs font-bold text-[#046A38]">{(selectedSopir as any).nomorHp}</p>
                    <div className="pt-2 grid grid-cols-2 gap-2 border-t border-dashed mt-2">
                       <div><span className="text-[8px] font-bold text-gray-400 uppercase">Plat Nomor</span><p className="text-[10px] font-black">{selectedSopir.platNomor}</p></div>
                       <div><span className="text-[8px] font-bold text-gray-400 uppercase">Tipe Motor</span><p className="text-[10px] font-black">{selectedSopir.jenisMotor}</p></div>
                    </div>
                 </div>

                 {/* Galeri Dokumen */}
                 <div className="space-y-3">
                    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Lampiran Dokumen</h4>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { label: 'KTP', url: selectedSopir.fotoKtp },
                         { label: 'SIM', url: selectedSopir.fotoSim },
                         { label: 'STNK', url: selectedSopir.fotoStnk },
                         { label: 'KENDARAAN', url: selectedSopir.fotoKendaraan }
                       ].map(doc => (
                         <div key={doc.label} className="space-y-1">
                            <span className="text-[8px] font-bold text-gray-500 uppercase">{doc.label}</span>
                            <div className="h-24 bg-gray-100 rounded-xl border overflow-hidden relative group">
                               {doc.url ? (
                                 <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                               ) : (
                                 <div className="w-full h-full flex items-center justify-center text-[10px] italic text-gray-400">Kosong</div>
                               )}
                               {doc.url && (
                                 <a href={doc.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[8px] font-bold uppercase">Buka Foto</a>
                               )}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Input Alasan (Hanya jika ingin menolak) */}
                 <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Alasan Penolakan (Opsional)</label>
                    <textarea
                      value={alasanTolakSopir}
                      onChange={(e) => setAlasanTolakSopir(e.target.value)}
                      placeholder="Masukkan alasan jika ingin menolak pendaftaran..."
                      className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-[10px] font-medium"
                      rows={2}
                    />
                 </div>
              </div>

              <div className="p-5 bg-gray-50 border-t flex space-x-3 shrink-0">
                 <button
                   onClick={() => handleVerifySopir(selectedSopir.id, false)}
                   className="flex-1 py-3.5 bg-white text-red-600 border-2 border-red-100 hover:bg-red-50 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all"
                 >
                   TOLAK
                 </button>
                 <button
                   onClick={() => handleVerifySopir(selectedSopir.id, true)}
                   className="flex-[2] py-3.5 bg-[#046A38] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                 >
                   ACC / SETUJUI MITRA
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* PANIC MODE OVERLAY (SANGAT MENCOLOK) */}
      {showPanicOverlay && activeEmergency && (
        <div className="fixed inset-0 z-[1000] bg-red-600/90 backdrop-blur-md flex items-center justify-center p-6 animate-pulse">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden text-center p-8 space-y-6">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto border-4 border-red-100">
                 <AlertTriangle size={64} className="text-red-600 animate-bounce" />
              </div>

              <div className="space-y-1">
                 <h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter">KEADAAN DARURAT!</h2>
                 <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Tombol Panik Diaktifkan Oleh:</p>
              </div>

              <div className="bg-gray-50 p-5 rounded-3xl border space-y-1">
                 <p className="text-xl font-black text-gray-800">{activeEmergency.namaPelapor}</p>
                 <p className="text-sm font-bold text-red-600">{activeEmergency.peranPelapor === 'sopir' ? '🛵 MITRA DRIVER' : '👤 PENUMPANG'}</p>
                 <p className="text-xs font-mono text-gray-400">{activeEmergency.nomorHpPelapor}</p>
              </div>

              <div className="space-y-3">
                 <button
                   onClick={handleHandleEmergency}
                   className="w-full py-5 bg-red-600 text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg active:scale-95 transition-transform"
                 >
                   SAYA TANGANI SEKARANG
                 </button>
                 <p className="text-[10px] text-gray-400 italic">Sirine akan berhenti setelah tombol di atas ditekan.</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
