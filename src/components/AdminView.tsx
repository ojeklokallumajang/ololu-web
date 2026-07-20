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
  ShieldAlert,
  Users,
  MapPin,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  Settings,
  Activity,
  AlertTriangle,
  Clock,
  ChevronRight,
  Eye,
  Camera,
  Radio,
  Search,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  ShieldCheck,
  Power,
  Bike,
  Car,
  ShoppingBag,
  Package,
  User,
  X,
  Bell,
  Calendar,
  Shield,
  Info,
  KeyRound,
  Zap,
  TrendingUp,
  Moon,
  Map as MapIcon,
  ShoppingCart,
  Store,
  HelpCircle,
  LayoutGrid,
  ArrowRight,
  ClipboardList,
  Cpu,
  Lock,
  UserMinus,
  UserCheck,
  History as HistoryIcon
} from 'lucide-react';
import { downloadFinancialReport } from '../utils/excelExport';
import { generateReceipt } from '../utils/receiptGenerator';
import MapDirections from './MapDirections';

export default function AdminView() {
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'sopir' | 'penumpang' | 'pesanan' | 'dompet' | 'tarif' | 'darurat' | 'admins' | 'logs' | 'laporan' | 'sistem'>('stats');
  
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [sopirList, setSopirList] = useState<DetailSopir[]>([]);
  const [profilList, setProfilList] = useState<ProfilPengguna[]>([]);
  const [emergencyList, setEmergencyList] = useState<LaporanDarurat[]>([]);
  const [transaksiList, setTransaksiList] = useState<TransaksiDompet[]>([]);
  const [activeDompetTab, setActiveDompetTab] = useState<'pending' | 'history'>('pending');
  const [config, setConfig] = useState<PengaturanTarif>(DEFAULT_PENGATURAN_TARIF);
  const [adminList, setAdminList] = useState<ProfilPengguna[]>([]);
  const [auditLogs, setAuditLogs] = useState<LogAudit[]>([]);

  const [selectedOrder, setSelectedOrder] = useState<Pesanan | null>(null);
  const [selectedSopir, setSelectedSopir] = useState<DetailSopir | null>(null);
  const [showSopirModal, setShowSopirModal] = useState(false);
  const [alasanTolakSopir, setAlasanTolakSopir] = useState('');
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpTargetId, setTopUpModalTargetId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [showProofModal, setShowProofModal] = useState<string | null>(null);

  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchDriverQuery, setSearchDriverQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<ProfilPengguna | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminName, setNewAdminName] = useState('');

  const [tempConfig, setTempConfig] = useState<PengaturanTarif>(DEFAULT_PENGATURAN_TARIF);
  const [loading, setLoading] = useState(true);

  const [showPanicOverlay, setShowPanicOverlay] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<LaporanDarurat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        OloluStore.getAllPesanan(),
        OloluStore.getAllSopir(),
        OloluStore.getAllUsers(),
        OloluStore.getPengaturan(),
        OloluStore.getAllAuditLogs(),
        OloluStore.getAllAdmins(),
        OloluStore.getAllEmergency(),
        OloluStore.getAllTransactions()
      ]);

      if (results[0].status === 'fulfilled') setPesananList(results[0].value || []);
      if (results[1].status === 'fulfilled') setSopirList(results[1].value || []);
      if (results[2].status === 'fulfilled') setProfilList(results[2].value || []);
      if (results[3].status === 'fulfilled' && results[3].value) {
        setConfig(results[3].value);
        setTempConfig(results[3].value);
      }
      if (results[4].status === 'fulfilled') setAuditLogs(results[4].value || []);
      if (results[5].status === 'fulfilled') setAdminList(results[5].value || []);
      if (results[6].status === 'fulfilled') setEmergencyList(results[6].value || []);
      if (results[7].status === 'fulfilled') setTransaksiList(results[7].value || []);

    } catch (err) {
      console.error("Dashboard Sync Failure:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function initAdmin() {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);
      setIsSuperUser(p?.nomorHp === '6285156766317');
    }
    initAdmin();
    syncData();
    const unsubscribeStore = OloluStore.subscribeToStore(syncData);

    const unsubscribeDrivers = ololuRealtime.subscribeToDriversOnline((state) => {
      setSopirList(current => current.map(s => {
         const presence = state[s.id]?.[0];
         return presence ? { ...s, statusOnline: true, lokasiSaatIni: { lat: presence.lat, lng: presence.lng } } : { ...s, statusOnline: false };
      }));
    });

    const unsubscribeEmergency = ololuRealtime.subscribeToEmergencies((newEmergency: LaporanDarurat) => {
      setActiveEmergency(newEmergency);
      setShowPanicOverlay(true);
      startSiren();
    });

    return () => {
      unsubscribeStore();
      unsubscribeEmergency();
      unsubscribeDrivers();
      stopSiren();
    };
  }, []);

  const startSiren = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, duration: number) => {
      const ctx = audioContextRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + duration);
    };
    if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
    sirenIntervalRef.current = setInterval(() => {
      playTone(800, 0.5);
      setTimeout(() => playTone(600, 0.5), 500);
    }, 1000);
  };

  const stopSiren = () => { if (sirenIntervalRef.current) { clearInterval(sirenIntervalRef.current); sirenIntervalRef.current = null; } };

  const saveConfigWithLog = async () => {
    if (!profile) return;
    await OloluStore.savePengaturan(tempConfig, profile.id, profile.nama);
    await OloluStore.addAuditLog(profile.id, profile.nama, "Update Konfigurasi", "Sinkronisasi Tarif v4.0.");
    alert("🚀 PENGATURAN BERHASIL DISIMPAN!");
    syncData();
  };

  const handleVerifySopir = async (id: string, ok: boolean) => {
    if (!ok && !alasanTolakSopir) { alert("Masukkan alasan!"); return; }
    const res = await OloluStore.verifikasiSopir(id, ok, ok ? '' : alasanTolakSopir);
    if (res.success) {
      if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, ok ? "Setujui Mitra" : "Tolak Mitra", `Mitra ID: ${id}`);
      alert(ok ? "Berhasil Disetujui!" : "Berhasil Ditolak.");
      setShowSopirModal(false); setSelectedSopir(null);
      syncData();
    }
  };

  const handleToggleSuspend = async (user: ProfilPengguna) => {
    if (!profile) return;
    const action = user.isSuspended ? "Aktifkan Akun" : "Blokir Akun";
    if (confirm(`Yakin ingin ${action} ${user.nama}?`)) {
      setIsProcessingAction(true);
      const res = await OloluStore.toggleSuspendUser(user.id, !!user.isSuspended);
      if (res.success) {
        await OloluStore.addAuditLog(profile.id, profile.nama, action, `User: ${user.nama}`);
        alert("Status berhasil diubah.");
        setSelectedUserDetail(null);
        if (showSopirModal) setShowSopirModal(false);
        syncData();
      }
      setIsProcessingAction(false);
    }
  };

  const handleProsesTx = async (id: string, status: 'disetujui' | 'ditolak') => {
    let alasan = status === 'ditolak' ? (prompt("Alasan penolakan:") || 'Ditolak admin') : '';
    await OloluStore.prosesTransaksi(id, status, alasan);
    if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, `${status.toUpperCase()} Transaksi`, `TX ID: ${id}`);
    alert("Berhasil diproses.");
    syncData();
  };

  const handleAdminTopUp = async () => {
    if (!topUpTargetId || !topUpAmount) return;
    const res = await OloluStore.topUpSopir(topUpTargetId, parseInt(topUpAmount), "Top-up manual oleh Admin");
    if (res.success) {
      if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Manual Top-Up", `Target: ${topUpTargetId}, Rp ${topUpAmount}`);
      alert("Saldo diisi!"); setShowTopUpModal(false); setTopUpAmount('');
      syncData();
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminPhone || !newAdminName) return;
    const res = await OloluStore.promoteToAdmin(newAdminPhone, newAdminName);
    if (res.success) {
       if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Tambah Admin", `Nama: ${newAdminName}`);
       alert("Admin ditambahkan."); setNewAdminPhone(''); setNewAdminName('');
       syncData();
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (confirm("Cabut akses?")) {
      const res = await OloluStore.removeAdminStatus(id);
      if (res.success) {
        if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Hapus Admin", `ID: ${id}`);
        syncData();
      }
    }
  };

  if (loading && pesananList.length === 0) return <div className="flex flex-col items-center justify-center min-h-screen text-gray-800 bg-white"><div className="w-10 h-10 border-4 border-t-[#046A38] rounded-full animate-spin"></div><p className="text-xs font-bold text-gray-400 mt-4 uppercase">Sinkronisasi Data Admin...</p></div>;
  if (!isSuperUser && profile?.peran !== 'admin') return <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center text-gray-800"><ShieldAlert size={64} className="text-red-500 mb-4" /><h2 className="text-2xl font-black">Akses Terbatas</h2></div>;

  const totalBiayaJasaMurni = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => acc + Math.round((cur.tarifPerjalananMurni) * (cur.biayaLayananPersen || 10) / 100), 0);
  const pendingVerifList = transaksiList.filter(t => t.statusTarik === 'menunggu');

  // --- RADAR LOGIC ---
  const activeTrips = pesananList.filter(p => (p.status === 'dalam_perjalanan' || p.status === 'sopir_ditemukan' || p.status === 'diproses') && p.daftarTujuan && p.daftarTujuan.length > 0);

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative font-sans text-left text-gray-800 antialiased">
      {/* HEADER */}
      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-white"><Activity size={18} className="text-[#D4AF37]" /><h1 className="text-lg font-black tracking-wide uppercase leading-none text-white">Ololu Control Panel</h1></div>
          {pendingVerifList.length > 0 && <button onClick={() => setActiveTab('dompet')} className="bg-[#B8941F] text-white text-[8px] font-black px-3 py-1.5 rounded-full animate-bounce shadow-lg flex items-center space-x-1 font-mono tracking-tighter text-white"><Bell size={10} /><span>{pendingVerifList.length} ANTRIAN</span></button>}
        </div>
        <p className="text-[10px] text-emerald-100 uppercase font-bold tracking-widest opacity-80 mt-1">Administrator: {profile?.nama}</p>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex bg-white border-b overflow-x-auto whitespace-nowrap scrollbar-none sticky top-0 z-30 shadow-sm text-gray-800">
        {[
          { id: 'stats', label: '📊 Statistik' },
          { id: 'sopir', label: '🛵 Rider' },
          { id: 'dompet', label: '💰 Dompet', badge: pendingVerifList.length },
          { id: 'penumpang', label: '👤 User' },
          { id: 'pesanan', label: '📋 Order' },
          { id: 'darurat', label: '🚨 SOS', badge: emergencyList.filter(e=>e.status==='baru').length },
          { id: 'tarif', label: '⚙️ Tarif' },
          { id: 'laporan', label: '📥 Laporan' },
          { id: 'admins', label: '🔑 Tim' },
          { id: 'logs', label: '📜 Log' },
          ...(isSuperUser ? [{ id: 'sistem', label: '🖥️ Sistem' }] : [])
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-5 py-3 text-[11px] font-black transition-all border-b-2 relative ${activeTab === t.id ? 'border-[#046A38] text-[#046A38] bg-[#E6F4EC]' : 'border-transparent text-[#6B7280]'}`}>
            {t.label}
            {t.badge > 0 && <span className="absolute top-2 right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] flex items-center justify-center rounded-full border border-white font-bold text-white">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* STATS & RADAR */}
        {activeTab === 'stats' && (
          <div className="space-y-4 animate-in fade-in duration-500 text-gray-800 text-left">
            <div className="grid grid-cols-2 gap-2.5">
               <div className="bg-white p-4 rounded-2xl border-l-4 border-[#046A38] shadow-sm text-left text-gray-800"><span className="text-[9px] font-bold text-gray-400 uppercase text-gray-400">Selesai</span><p className="text-xl font-black text-gray-800">{pesananList.filter(p=>p.status==='selesai').length}</p></div>
               <div className="bg-white p-4 rounded-2xl border-l-4 border-[#D4AF37] shadow-sm text-left text-gray-800"><span className="text-[9px] font-bold text-gray-400 uppercase text-gray-400">Kas Ololu</span><p className="text-xl font-black text-[#B8941F]">Rp {totalBiayaJasaMurni.toLocaleString()}</p></div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-sm space-y-3">
               <div className="flex justify-between items-center px-1 text-gray-800">
                 <h3 className="text-xs font-black uppercase tracking-tight flex items-center space-x-2 text-gray-800"><MapPin size={14} className="text-emerald-600" /><span>Radar Driver & Rute Aktif</span></h3>
                 <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse uppercase">Live Track</span>
               </div>
               <div className="h-80 w-full rounded-2xl overflow-hidden border bg-gray-50 relative shadow-inner">
                    <Map defaultCenter={KOORDINAT_LUMAJANG} defaultZoom={13} mapId="ADMIN_RADAR" disableDefaultUI>
                      {activeTrips.map(order => (
                        <MapDirections
                          key={order.id}
                          origin={{ lat: order.asalLat, lng: order.asalLng }}
                          destination={{ lat: order.daftarTujuan[order.daftarTujuan.length - 1].lat, lng: order.daftarTujuan[order.daftarTujuan.length - 1].lng }}
                          waypoints={order.daftarTujuan.slice(0, -1).map(s => ({ location: { lat: s.lat, lng: s.lng }, stopover: true }))}
                        />
                      ))}
                      {sopirList.filter(s => s.statusOnline).map(s => (
                        <AdvancedMarker key={s.id} position={s.lokasiSaatIni || KOORDINAT_LUMAJANG}>
                           <div className="bg-white p-1 rounded-full shadow-lg border-2 border-emerald-600 w-8 h-8 flex items-center justify-center text-lg">🛵</div>
                        </AdvancedMarker>
                      ))}
                    </Map>
               </div>
            </div>
          </div>
        )}

        {/* RIDER LIST */}
        {activeTab === 'sopir' && (
          <div className="space-y-4 text-gray-800 text-left animate-in slide-in-from-bottom-2 duration-300">
             <div className="relative"><input type="text" placeholder="Cari Nama / Plat Rider..." value={searchDriverQuery} onChange={(e) => setSearchDriverQuery(e.target.value)} className="w-full p-4 pl-12 bg-white border rounded-2xl text-xs font-bold outline-none focus:border-[#046A38] shadow-sm text-gray-800" /><Search size={20} className="absolute left-4 top-3.5 text-gray-400" /></div>
             <div className="space-y-2">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">⏳ Antrian Verifikasi</h3>
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin && s.platNomor).map(s => (
                    <button key={s.id} onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }} className="w-full bg-white p-4 rounded-2xl border-2 border-amber-100 flex items-center justify-between shadow-sm hover:border-amber-400 transition-all text-left text-gray-800"><div className="flex items-center space-x-4 text-gray-800"><div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 shadow-inner"><User size={24} /></div><div><p className="text-sm font-black text-gray-800 uppercase leading-none">{(s as any).nama || 'Mitra Baru'}</p><p className="text-[10px] text-amber-600 font-bold mt-1 uppercase leading-none">Review Berkas</p></div></div><ChevronRight size={20} className="text-amber-300" /></button>
                ))}
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin && s.platNomor).length === 0 && <p className="text-[10px] italic text-gray-400 text-center py-4">Belum ada pendaftaran baru.</p>}
             </div>
             <div className="space-y-2 pt-2 text-gray-800 text-left"><h3 className="text-[10px] font-black text-[#046A38] uppercase tracking-widest px-1">✅ Mitra Aktif Ololu</h3>
                {sopirList.filter(s => s.disetujuiAdmin && ((s as any).nama?.toLowerCase().includes(searchDriverQuery.toLowerCase()) || s.platNomor?.toLowerCase().includes(searchDriverQuery.toLowerCase()))).map(s => (
                    <div key={s.id} onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }} className="w-full bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs text-left text-gray-800 hover:border-emerald-200 transition-all cursor-pointer group">
                       <div className="flex items-center space-x-4 text-gray-800">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.statusOnline ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Bike size={20} /></div>
                          <div>
                             <div className="flex items-center space-x-1.5 text-gray-800"><p className="text-sm font-black text-gray-800 uppercase leading-none">{(s as any).nama}</p>{(s as any).isSuspended && <span className="bg-red-600 text-white text-[7px] px-1.5 py-0.5 rounded font-black shadow-sm">BLOKIR</span>}</div>
                             <p className="text-[10px] text-gray-500 font-bold mt-1 leading-none">{s.platNomor} • {s.jenisMotor}</p>
                          </div>
                       </div>
                       <div className="text-right flex flex-col items-end space-y-1.5 text-gray-800">
                          <p className="text-xs font-black text-emerald-600">Rp {s.saldoDompet?.toLocaleString()}</p>
                          <button onClick={(e) => { e.stopPropagation(); setTopUpModalTargetId(s.id); setShowTopUpModal(true); }} className="bg-emerald-600 text-white text-[8px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-widest text-white leading-none">Isi Saldo</button>
                       </div>
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* TAB 3: WALLET / DOMPET */}
        {activeTab === 'dompet' && (
          <div className="space-y-4 animate-in fade-in duration-300 text-left text-gray-800">
             <div className="flex bg-white p-1 rounded-xl border border-gray-150 gap-1 shadow-sm"><button onClick={()=>setActiveDompetTab('pending')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeDompetTab==='pending' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>PENGAJUAN ANTRIAN</button><button onClick={()=>setActiveDompetTab('history')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeDompetTab==='history' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>MUTASI DOMPET</button></div>
             {activeDompetTab === 'pending' ? (
                <div className="space-y-3">
                  {transaksiList.filter(t => t.statusTarik === 'menunggu').length === 0 ? <div className="p-16 text-center text-gray-400 text-xs italic bg-white rounded-[40px] border border-dashed">Belum ada antrian dana.</div> :
                   transaksiList.filter(t => t.statusTarik === 'menunggu').map(t => (
                    <div key={t.id} className={`bg-white p-5 rounded-3xl border-2 shadow-lg space-y-4 ${t.jenis === 'topup' ? 'border-emerald-500' : 'border-[#D4AF37]'}`}>
                      <div className="flex justify-between items-start text-gray-800"><div><p className="text-xs font-black text-gray-800 uppercase tracking-tight">{(t as any).namaSopir || 'Mitra'}</p><p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(t.timestamp).toLocaleString('id-ID')}</p></div><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${t.jenis === 'topup' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-[#B8941F]'}`}>{t.jenis.replace('_',' ')}</span></div>
                      <p className={`text-2xl font-black text-center ${t.jenis === 'topup' ? 'text-emerald-600' : 'text-[#B8941F]'}`}>Rp {t.jumlah?.toLocaleString()}</p>
                      <div className="flex space-x-2 text-white">
                        <button onClick={()=>handleProsesTx(t.id, 'ditolak')} className="flex-1 py-3.5 bg-white text-red-600 border-2 border-red-100 font-black rounded-2xl text-[10px] uppercase text-red-600">Tolak</button>
                        <button onClick={()=>handleProsesTx(t.id, 'disetujui')} className={`flex-[2] py-3.5 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl ${t.jenis === 'topup' ? 'bg-emerald-600' : 'bg-[#046A38]'}`}>Setujui & Update</button>
                      </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="space-y-2">
                  {transaksiList.length === 0 ? <div className="p-16 text-center text-gray-400 text-xs italic bg-white rounded-[40px] border border-dashed text-gray-400">Belum ada riwayat mutasi.</div> :
                   transaksiList.slice(0, 100).map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-150 flex items-center justify-between shadow-xs transition-colors hover:bg-gray-50 text-gray-800 text-left"><div><p className="text-[11px] font-black text-gray-800 leading-tight">{(t as any).namaSopir} - {t.deskripsi}</p><p className="text-[9px] text-gray-400 font-bold mt-1 text-gray-400">{new Date(t.timestamp).toLocaleDateString('id-ID')} {new Date(t.timestamp).toLocaleTimeString('id-ID')}</p></div><div className="text-right text-gray-800"><p className={`text-xs font-black ${t.jenis==='topup'||t.jenis==='pendapatan' ? 'text-green-600':'text-red-500'}`}>{t.jenis==='topup'||t.jenis==='pendapatan'?'+':'-'} Rp {t.jumlah?.toLocaleString()}</p><span className="text-[8px] text-gray-300 uppercase font-black block mt-1">{t.statusTarik || t.jenis}</span></div></div>
                  ))}
                </div>
             )}
          </div>
        )}

        {/* USER LIST */}
        {activeTab === 'penumpang' && (
           <div className="space-y-3 animate-in fade-in duration-300 text-left text-gray-800">
             <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Penumpang Terdaftar</h3>
             <div className="relative mb-3"><input type="text" placeholder="Cari Nama / HP User..." value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)} className="w-full p-4 pl-12 bg-white border rounded-2xl text-xs font-bold outline-none focus:border-[#046A38] shadow-sm text-gray-800 text-left" /><Search size={20} className="absolute left-4 top-3.5 text-gray-400" /></div>
             <div className="space-y-2">
               {profilList.filter(p => p.peran === 'penumpang' && (p.nama?.toLowerCase().includes(searchUserQuery.toLowerCase()) || p.nomorHp?.toLowerCase().includes(searchUserQuery.toLowerCase()))).length === 0 ? <p className="text-xs text-gray-400 text-center py-10 italic">Data user tidak ditemukan.</p> :
                 profilList.filter(p => p.peran === 'penumpang' && (p.nama?.toLowerCase().includes(searchUserQuery.toLowerCase()) || p.nomorHp?.toLowerCase().includes(searchUserQuery.toLowerCase()))).map(p => (
                   <div key={p.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.98] transition-all hover:border-blue-200 text-gray-800 text-left" onClick={() => setSelectedUserDetail(p)}>
                      <div className="flex items-center space-x-4 text-gray-800 text-left"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.isSuspended ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}><User size={20} /></div><div><div className="flex items-center space-x-1.5 text-gray-800"><p className="text-sm font-black text-gray-800 uppercase leading-none">{p.nama}</p>{p.isSuspended && <span className="bg-red-600 text-white text-[7px] px-1.5 py-0.5 rounded uppercase font-black shadow-sm text-white">Blokir</span>}</div><p className="text-[10px] text-gray-500 font-bold mt-1 text-gray-500 leading-none">{p.nomorHp}</p></div></div>
                      <ChevronRight size={18} className="text-gray-300" />
                   </div>
                 ))
               }
             </div>
           </div>
        )}

        {/* ORDER AUDIT */}
        {activeTab === 'pesanan' && (
           <div className="space-y-3 animate-in fade-in duration-300 text-left text-gray-800">
             <div className="flex justify-between items-center px-1 text-gray-800">
                <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest text-gray-700">Riwayat & Logistik Order</h3>
                <button onClick={syncData} className="p-1 text-gray-400 hover:text-[#046A38] text-gray-400"><Radio size={14} className={loading ? 'animate-spin' : ''} /></button>
             </div>
             <div className="space-y-2.5 text-gray-800 text-left">
               {pesananList.length === 0 ? <div className="p-20 text-center text-gray-400 text-xs italic bg-white rounded-[40px] border-2 border-dashed">Belum ada riwayat order.</div> :
                 pesananList.slice(0, 150).map(p => (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs group hover:border-[#046A38] transition-all text-gray-800 text-left">
                    <div className="space-y-1 text-left text-gray-800">
                      <div className="flex items-center space-x-2 text-gray-800 text-left"><p className="text-sm font-black tracking-tighter text-gray-800 leading-none">#{p.nomorPesanan}</p><span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase text-white ${p.status === 'selesai' ? 'bg-emerald-500' : 'bg-amber-400'}`}>{p.status.replace('_',' ')}</span></div>
                      <p className="text-[10px] text-gray-500 font-black mt-1 uppercase tracking-tight text-gray-500 leading-none">{p.jenisLayanan} • {p.namaPenumpang}</p>
                      <p className="text-[9px] text-gray-400 font-bold text-gray-400 mt-1 leading-none">{new Date(p.waktuDibuat).toLocaleString('id-ID')}</p>
                    </div>
                    <div className="text-right flex flex-col items-end space-y-1 text-gray-800">
                      <p className="text-sm font-black text-[#046A38] text-[#046A38] leading-none">Rp {p.totalBayarAkhir?.toLocaleString('id-ID')}</p>
                      <div className="flex space-x-1.5 text-gray-800 text-right">
                        <button onClick={() => setSelectedOrder(p)} className="text-[9px] font-black text-blue-600 uppercase hover:underline text-blue-600">Detail Audit</button>
                      </div>
                    </div>
                  </div>
                 ))
               }
             </div>
           </div>
        )}

        {/* SOS / EMERGENCY */}
        {activeTab === 'darurat' && (
           <div className="space-y-4 animate-in fade-in duration-300 text-left text-gray-800">
             <h3 className="text-xs font-black text-red-600 uppercase px-1 flex items-center space-x-2 text-red-600 leading-none"><AlertTriangle size={16} /> <span>Laporan Darurat (SOS)</span></h3>
             {emergencyList.length === 0 ? <div className="p-16 text-center text-gray-400 text-[10px] italic bg-white rounded-[40px] border border-dashed border-gray-200">Belum ada sinyal darurat.</div> :
               emergencyList.map(e => (
                 <div key={e.id} className={`bg-white p-5 rounded-[32px] border-2 flex flex-col space-y-4 shadow-xl ${e.status === 'baru' ? 'border-red-600 animate-pulse' : 'border-gray-100'} text-left text-gray-800`}>
                    <div className="flex justify-between items-start text-gray-800">
                       <div className="flex items-center space-x-3 text-gray-800">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${e.peranPelapor === 'sopir' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>{e.peranPelapor === 'sopir' ? '🛵' : '👤'}</div>
                          <div><p className="text-sm font-black uppercase leading-none text-gray-800">{e.namaPelapor}</p><p className="text-[11px] text-gray-500 font-bold mt-1 text-gray-500 leading-none">{e.nomorHpPelapor}</p></div>
                       </div>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-sm text-white ${e.status === 'baru' ? 'bg-red-600' : 'bg-emerald-500'}`}>{e.status.toUpperCase()}</span>
                    </div>
                    <div className="h-48 w-full rounded-2xl overflow-hidden border bg-gray-50 relative shadow-inner">
                          <Map defaultCenter={{ lat: parseFloat(e.lat as any), lng: parseFloat(e.lng as any) }} defaultZoom={16} disableDefaultUI>
                             <AdvancedMarker position={{ lat: parseFloat(e.lat as any), lng: parseFloat(e.lng as any) }}><div className="text-4xl animate-bounce drop-shadow-lg">🆘</div></AdvancedMarker>
                          </Map>
                       <div className="absolute top-3 left-3 bg-black/80 text-white text-[9px] px-2 py-1 rounded-lg font-mono shadow-md text-white">{e.lat}, {e.lng}</div>
                    </div>
                    <div className="flex space-x-3 text-white text-center">
                       <a href={`tel:${e.nomorHpPelapor}`} className="flex-1 py-4 bg-emerald-600 text-white text-center rounded-[20px] text-[11px] font-black uppercase shadow-lg text-white leading-none">Hubungi</a>
                       <button className="flex-1 py-4 bg-gray-900 text-white text-center rounded-[20px] text-[11px] font-black uppercase shadow-lg text-white leading-none">Selesai</button>
                    </div>
                 </div>
               ))
             }
           </div>
        )}

        {/* TAB 7: TARIF */}
        {activeTab === 'tarif' && (
          <div className="space-y-6 animate-in fade-in duration-300 text-left text-gray-800">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start space-x-3 shadow-sm text-gray-800 text-left"><div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shadow-inner text-emerald-600"><LayoutGrid size={22} /></div><div><h3 className="text-sm font-black text-emerald-900 uppercase leading-none text-emerald-900">Kendali Layanan v4.8</h3><p className="text-[10px] text-emerald-700 mt-1 uppercase font-bold tracking-widest leading-none text-emerald-700">Tarif Dinamis & Jam Sibuk</p></div></div>

            {/* GLOBAL RUSH HOUR CONFIG */}
            <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 shadow-sm space-y-4 text-left text-gray-800">
               <div className="flex justify-between items-center border-b border-amber-200 pb-3">
                  <div className="flex items-center space-x-2 text-amber-900 font-black uppercase text-[11px] tracking-widest text-amber-900"><Clock size={16}/><span>Jadwal Jam Sibuk (Rush Hour)</span></div>
                  <input type="checkbox" checked={tempConfig.rushHourAktif} onChange={(e)=>setTempConfig({...tempConfig, rushHourAktif: e.target.checked})} className="w-5 h-5 rounded text-amber-600" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[8px] font-black text-amber-700 uppercase ml-1 text-amber-700">Mulai Jam</label><input type="time" value={tempConfig.rushHourMulai} onChange={(e)=>setTempConfig({...tempConfig, rushHourMulai: e.target.value})} className="w-full p-3 bg-white border border-amber-200 rounded-2xl outline-none text-xs font-black text-amber-900" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-amber-700 uppercase ml-1 text-amber-700">Selesai Jam</label><input type="time" value={tempConfig.rushHourSelesai} onChange={(e)=>setTempConfig({...tempConfig, rushHourSelesai: e.target.value})} className="w-full p-3 bg-white border border-amber-200 rounded-2xl outline-none text-xs font-black text-amber-900" /></div>
               </div>
            </div>

            {/* GLOBAL NIGHT SHIFT CONFIG */}
            <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100 shadow-sm space-y-4 text-left text-gray-800">
               <div className="flex justify-between items-center border-b border-indigo-200 pb-3">
                  <div className="flex items-center space-x-2 text-indigo-900 font-black uppercase text-[11px] tracking-widest"><Moon size={16}/><span>Jadwal Jam Malam (Night Shift)</span></div>
                  <input type="checkbox" checked={tempConfig.malamAktif} onChange={(e)=>setTempConfig({...tempConfig, malamAktif: e.target.checked})} className="w-5 h-5 rounded text-indigo-600" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><label className="text-[8px] font-black text-indigo-700 uppercase ml-1">Mulai Jam</label><input type="time" value={tempConfig.malamMulai} onChange={(e)=>setTempConfig({...tempConfig, malamMulai: e.target.value})} className="w-full p-3 bg-white border border-indigo-200 rounded-2xl outline-none text-xs font-black text-indigo-900" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-indigo-700 uppercase ml-1">Selesai Jam</label><input type="time" value={tempConfig.malamSelesai} onChange={(e)=>setTempConfig({...tempConfig, malamSelesai: e.target.value})} className="w-full p-3 bg-white border border-indigo-200 rounded-2xl outline-none text-xs font-black text-indigo-900" /></div>
               </div>
            </div>

            <div className="space-y-8 pb-32 text-gray-800 text-left">
               {[
                 { id: 'ojek', label: 'Ojek Motor (Ride)', icon: <Bike size={16}/>, color: 'text-emerald-600' },
                 { id: 'mobil', label: 'Ololu Car', icon: <Car size={16}/>, color: 'text-blue-600' },
                 { id: 'makanan', label: 'Food Antar', icon: <ShoppingBag size={16}/>, color: 'text-amber-600' },
                 { id: 'paket', label: 'Send Paket', icon: <Package size={16}/>, color: 'text-indigo-600' },
                 { id: 'belanja', label: 'Shop (Belanja)', icon: <ShoppingCart size={16}/>, color: 'text-rose-600' },
                 { id: 'cargo', label: 'Cargo (Big)', icon: <MapIcon size={16}/>, color: 'text-purple-600' },
                 { id: 'market', label: 'Market', icon: <Store size={16}/>, color: 'text-orange-600' },
                 { id: 'lainnya', label: 'Extra (Lainnya)', icon: <Plus size={16}/>, color: 'text-gray-600' },
               ].map(s => (
                 <div key={s.id} className="bg-white p-5 rounded-[32px] border border-gray-150 shadow-sm space-y-4 text-left text-gray-800">
                    <div className="flex justify-between items-center border-b pb-3 text-gray-800 text-left">
                       <div className={`flex items-center space-x-2 ${s.color} font-black uppercase text-[11px] tracking-widest text-left`}>{s.icon}<span>{s.label}</span></div>
                       <input type="checkbox" checked={(tempConfig as any)[`layanan${s.id.charAt(0).toUpperCase()+s.id.slice(1)}Aktif`]} onChange={(e)=>setTempConfig({...tempConfig, [`layanan${s.id.charAt(0).toUpperCase()+s.id.slice(1)}Aktif`]: e.target.checked})} className="w-5 h-5 rounded text-[#046A38] text-gray-800" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-gray-800 text-left">
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none">Dasar (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifDasar`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifDasar`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800 shadow-inner" /></div>
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-emerald-600 uppercase ml-1 text-emerald-600 leading-none">Minimum (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifMinimum`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifMinimum`]: parseInt(e.target.value)})} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none text-xs font-black text-emerald-600 shadow-inner" /></div>
                    </div>

                    <div className="grid grid-cols-1 pt-2 border-t border-dashed">
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none">Normal / KM (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifPerKm`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifPerKm`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800 shadow-inner" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-amber-600 uppercase ml-1 leading-none text-amber-600">⚡ Jam Sibuk (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifRushHour`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifRushHour`]: parseInt(e.target.value)})} className="w-full p-3 bg-amber-50/50 border border-amber-100 rounded-2xl outline-none text-xs font-black text-amber-700 shadow-inner" /></div>
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-indigo-600 uppercase ml-1 leading-none text-indigo-600">🌙 Jam Malam (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifMalam`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifMalam`]: parseInt(e.target.value)})} className="w-full p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl outline-none text-xs font-black text-indigo-700 shadow-inner" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed text-gray-800">
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-rose-600 uppercase ml-1 leading-none text-rose-600">🚀 KM Jauh (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifPerKmJauh`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifPerKmJauh`]: parseInt(e.target.value)})} className="w-full p-3 bg-rose-50/50 border border-rose-100 rounded-2xl outline-none text-xs font-black text-rose-700 shadow-inner" /></div>
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none">Batas KM Jauh</label><input type="number" value={(tempConfig as any)[`${s.id}BatasKmJauh`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}BatasKmJauh`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800 shadow-inner" /></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed text-gray-800">
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-gray-500 uppercase ml-1 leading-none text-gray-500">🛡️ Jarak Max (KM)</label><input type="number" value={(tempConfig as any)[`${s.id}JarakMaksimum`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}JarakMaksimum`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800 shadow-inner" /></div>
                       <div className="space-y-1 text-left"><label className="text-[8px] font-black text-blue-600 uppercase ml-1 leading-none text-blue-600">Potongan Jasa (%)</label><input type="number" value={(tempConfig as any)[`${s.id}PersenJasa`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}PersenJasa`]: parseInt(e.target.value)})} className="w-full p-3 bg-blue-50 border border-blue-100 rounded-2xl outline-none text-xs font-black text-blue-600 shadow-inner" /></div>
                    </div>
                 </div>
               ))}
               {/* BIAYA TAMBAHAN & PARKIR */}
               <div className="bg-white p-5 rounded-[32px] border border-gray-150 shadow-sm space-y-4 text-left text-gray-800">
                  <div className="flex items-center space-x-2 text-gray-700 font-black uppercase text-[11px] tracking-widest border-b pb-3">
                     <Settings size={16} className="text-gray-400" />
                     <span>Biaya Tambahan & Parkir</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-gray-800">
                     <div className="space-y-1 text-left"><label className="text-[8px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none">Parkir Biasa (Rp)</label><input type="number" value={tempConfig.biayaParkirBiasa} onChange={(e)=>setTempConfig({...tempConfig, biayaParkirBiasa: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800 shadow-inner" /></div>
                     <div className="space-y-1 text-left"><label className="text-[8px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none">Parkir Pasar (Rp)</label><input type="number" value={tempConfig.biayaParkirPasar} onChange={(e)=>setTempConfig({...tempConfig, biayaParkirPasar: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800 shadow-inner" /></div>
                     <div className="space-y-1 text-left"><label className="text-[8px] font-black text-amber-600 uppercase ml-1 text-amber-600 leading-none">Kelebihan Item (Rp)</label><input type="number" value={tempConfig.biayaKelebihanItem} onChange={(e)=>setTempConfig({...tempConfig, biayaKelebihanItem: parseInt(e.target.value)})} className="w-full p-3 bg-amber-50/50 border border-amber-100 rounded-2xl outline-none text-xs font-black text-amber-600 shadow-inner" /></div>
                     <div className="space-y-1 text-left"><label className="text-[8px] font-black text-emerald-600 uppercase ml-1 text-emerald-600 leading-none">Stop Tambahan (Rp)</label><input type="number" value={tempConfig.biayaPerStopTambahan} onChange={(e)=>setTempConfig({...tempConfig, biayaPerStopTambahan: parseInt(e.target.value)})} className="w-full p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl outline-none text-xs font-black text-emerald-600 shadow-inner" /></div>
                  </div>
                  <p className="text-[9px] text-gray-400 italic px-1 leading-tight">
                    *Kelebihan item dikenakan jika barang belanjaan &gt; 5 item. <br/>
                    *Biaya parkir ditentukan manual oleh Driver per lokasi.
                  </p>
               </div>

               <button onClick={saveConfigWithLog} className="w-full py-6 bg-[#046A38] text-white font-black rounded-[40px] text-sm tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all sticky bottom-6 z-40 border-b-8 border-emerald-900 shadow-emerald-900/40 text-white text-center leading-none">Simpan Seluruh Perubahan</button>
            </div>
          </div>
        )}

        {/* TAB 8: LAPORAN */}
        {activeTab === 'laporan' && (
          <div className="space-y-6 animate-in fade-in duration-300 text-left text-gray-800">
            <div className="bg-white p-7 rounded-[40px] border border-gray-150 shadow-sm space-y-6 text-gray-800">
              <div className="flex items-center space-x-4 border-b pb-5 text-gray-800 text-left">
                <div className="bg-emerald-50 p-3 rounded-2xl text-[#046A38] shadow-inner text-emerald-600"><Calendar size={24} /></div>
                <div className="text-left"><h3 className="text-base font-black text-gray-800 uppercase leading-none text-gray-800">Laporan Keuangan Excel</h3><p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest text-gray-400 leading-none">Digital Records Archive</p></div>
              </div>
              <div className="space-y-5 text-gray-800 text-left">
                <div className="space-y-3 text-gray-800 text-left">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-gray-400">Laporan Cepat</h4>
                   <div className="grid grid-cols-2 gap-3 text-white text-center">
                      <button onClick={() => downloadFinancialReport(`Laporan_Hari_Ini`, pesananList, sopirList, profilList, transaksiList)} className="flex items-center justify-center space-x-2 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all text-white leading-none"><Download size={16} /><span>Hari Ini</span></button>
                      <button onClick={() => { const now = new Date(); const start = new Date(now.setDate(now.getDate()-7)); downloadFinancialReport(`Laporan_Mingguan`, pesananList, sopirList, profilList, transaksiList, start, new Date()); }} className="flex items-center justify-center space-x-2 py-4 border-2 border-emerald-600 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all text-emerald-700 leading-none"><Download size={16} /><span>Mingguan</span></button>
                   </div>
                </div>
                <div className="space-y-3 pt-2 text-gray-800 text-left">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-gray-400 leading-none">Arsip Bulanan (3 Bulan)</h4>
                  <div className="space-y-2 text-gray-800 text-left">
                    {[0, 1, 2].map(offset => {
                      const d = new Date(); d.setMonth(d.getMonth() - offset);
                      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
                      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                      return (
                        <button key={offset} onClick={() => downloadFinancialReport(`Laporan_Bulanan_${d.getFullYear()}_${d.getMonth()+1}`, pesananList, sopirList, profilList, transaksiList, start, end)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50 border border-gray-100 rounded-2xl group transition-all text-gray-800 text-left">
                          <div className="flex items-center space-x-3 text-gray-800 text-left"><div className="p-2 bg-white rounded-xl shadow-sm text-[#B8941F] group-hover:text-[#046A38] transition-colors text-[#B8941F]"><Calendar size={18} /></div><span className="text-xs font-black text-gray-700 group-hover:text-[#046A38] uppercase transition-colors text-gray-700">{label}</span></div>
                          <Download size={18} className="text-gray-300 group-hover:text-[#046A38] transition-colors text-gray-300" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: TIM / ADMINS */}
        {activeTab === 'admins' && (
           <div className="space-y-6 animate-in fade-in duration-300 text-left text-gray-800">
              <div className="bg-white p-7 rounded-[40px] border shadow-sm space-y-5 text-gray-800 text-left">
                <h3 className="text-xs font-black text-[#046A38] uppercase tracking-widest border-b pb-3 flex items-center space-x-2 text-[#046A38] leading-none text-left"><ShieldCheck size={20} /> <span>Tambah Tim Admin Baru</span></h3>
                <div className="space-y-4 text-gray-800 text-left">
                  <div className="space-y-1.5 text-left text-gray-800"><label className="text-[10px] font-bold text-gray-400 uppercase ml-1 text-gray-400 leading-none">Nama Lengkap</label><input type="text" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl outline-none text-xs font-bold focus:border-[#046A38] shadow-inner text-gray-800 text-left" /></div>
                  <div className="space-y-1.5 text-left text-gray-800"><label className="text-[10px] font-bold text-gray-400 uppercase ml-1 text-gray-400 leading-none">WhatsApp (628...)</label><input type="tel" value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl outline-none text-xs font-bold focus:border-[#046A38] shadow-inner text-gray-800 text-left" /></div>
                  <button onClick={handleAddAdmin} className="w-full py-5 bg-[#046A38] text-white font-black rounded-3xl text-[11px] tracking-widest uppercase shadow-lg text-white leading-none active:scale-95 transition-all">Aktifkan Akses Admin</button>
                </div>
              </div>
              <div className="space-y-3 px-1 text-gray-800 text-left">
                {adminList.map(adm => (<div key={adm.id} className="bg-white p-5 rounded-3xl border border-gray-150 flex items-center justify-between shadow-xs transition-all hover:border-[#046A38] text-gray-800 text-left"><div className="flex items-center space-x-4 text-gray-800 text-left"><div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#046A38] shadow-inner text-[#046A38]"><ShieldCheck size={24} /></div><div><p className="text-sm font-black text-gray-800 uppercase tracking-tight text-gray-800 leading-none">{adm.nama}</p><p className="text-[10px] text-gray-500 font-bold mt-1 text-gray-500 leading-none">{adm.nomorHp} {adm.nomorHp === '6285156766317' && <span className="text-amber-600 ml-1 text-amber-600">(SUPER)</span>}</p></div></div>{adm.nomorHp !== '6285156766317' && <button onClick={() => handleRemoveAdmin(adm.id)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all text-red-400"><Trash2 size={20} /></button>}</div>))}
              </div>
           </div>
        )}

        {/* TAB 10: LOGS */}
        {activeTab === 'logs' && (
           <div className="space-y-3 animate-in fade-in duration-300 text-left text-gray-800">
             <div className="flex justify-between items-center px-1 text-gray-800 text-left"><h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center space-x-2 text-gray-700 text-left leading-none"><Radio size={12} className="text-gray-400" /> <span>Log Aktivitas Sistem</span></h3><button onClick={syncData} className="p-1 text-gray-400 hover:text-[#046A38] text-gray-400"><Radio size={14} className={loading ? 'animate-spin' : ''} /></button></div>
             <div className="space-y-2 text-gray-800 text-left">{auditLogs.slice(0, 100).map(l => (<div key={l.id} className="bg-white p-5 rounded-[32px] border border-gray-150 space-y-2 shadow-xs hover:border-[#046A38] transition-all text-gray-800 text-left"><div className="flex justify-between items-start text-gray-800 text-left leading-none text-gray-800"><span className="text-[10px] font-black text-[#046A38] uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 text-[#046A38] leading-none text-left">{l.aksi}</span><p className="text-[9px] text-gray-400 font-mono text-gray-400 leading-none text-right">{new Date(l.timestamp).toLocaleString('id-ID')}</p></div><p className="text-[11px] text-gray-600 font-medium leading-relaxed text-gray-600 text-left">{l.detail}</p><div className="flex items-center space-x-2 pt-1 opacity-60 text-gray-400 text-left"><User size={12} className="text-gray-400" /><p className="text-[9px] font-black text-gray-500 uppercase text-gray-500 leading-none text-left">Operator: {l.adminNama}</p></div></div>))}</div>
           </div>
        )}

        {/* TAB 11: SISTEM (ONLY SUPER ADMIN) */}
        {activeTab === 'sistem' && isSuperUser && (
           <div className="space-y-6 animate-in fade-in duration-300 text-left text-gray-800">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-3 shadow-sm text-gray-800 text-left"><div className="bg-amber-100 p-2 rounded-xl text-amber-600 shadow-inner text-amber-600"><Cpu size={22} /></div><div><h3 className="text-sm font-black text-amber-900 uppercase leading-none text-amber-900 text-left">Brankas Kunci Sistem</h3><p className="text-[10px] text-amber-700 mt-1 uppercase font-bold tracking-widest leading-none text-amber-700 text-left">Token & API Key Keamanan</p></div></div>

              <div className="bg-white p-6 rounded-[40px] border shadow-sm space-y-6 text-gray-800 text-left">
                 <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden text-white text-left"><div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12 text-white"></div><div className="relative z-10 space-y-4 text-white text-left"><div className="flex justify-between items-center text-white text-left"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-400 text-left">Google Maps Usage</span><span className="text-[9px] font-black bg-emerald-600 px-2.5 py-1 rounded text-white animate-pulse text-white text-center leading-none">ACTIVE</span></div><div className="flex justify-between items-end text-white text-left"><div><div className="text-5xl font-black text-white text-left leading-none">{config.googleApiUsageCount?.toLocaleString() || 0}</div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 text-slate-500 text-left leading-none">Panggilan API</p></div><div className="text-right text-white"><div className="text-xl font-black text-emerald-400 text-emerald-400 text-right leading-none">{tempConfig.googleApiLimit?.toLocaleString() || 25000}</div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2 text-slate-500 text-right leading-none">Kuota Limit</p></div></div><div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 text-gray-800"><div className={`h-full transition-all duration-1000 ${ (config.googleApiUsageCount / config.googleApiLimit) > 0.9 ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-emerald-500' }`} style={{ width: `${Math.min(100, (config.googleApiUsageCount / config.googleApiLimit) * 100)}%` }}></div></div></div></div>

                 <div className="space-y-5 text-gray-800 text-left">
                    <div className="space-y-1.5 text-left text-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none text-left">Fonnte WhatsApp Token</label><div className="relative text-gray-800 text-left"><input type="password" value={tempConfig.fonnteToken} onChange={(e)=>setTempConfig({...tempConfig, fonnteToken: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl outline-none text-xs font-mono text-gray-800 focus:border-[#046A38] transition-all text-left" /><Lock size={16} className="absolute right-4 top-3.5 text-gray-200" /></div></div>
                    <div className="space-y-1.5 text-left text-gray-800"><label className="text-[9px] font-black text-gray-400 uppercase ml-1 text-gray-400 leading-none text-left">Google API Key</label><div className="relative text-gray-800 text-left"><input type="password" value={tempConfig.googleMapsKey} onChange={(e)=>setTempConfig({...tempConfig, googleMapsKey: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl outline-none text-xs font-mono text-gray-800 focus:border-[#046A38] transition-all text-left" /><KeyRound size={16} className="absolute right-4 top-3.5 text-gray-200" /></div></div>
                 </div>

                 <div className="pt-2 text-gray-800 text-left text-center"><button onClick={saveConfigWithLog} className="w-full py-5 bg-[#034F2A] text-white font-black rounded-3xl uppercase text-[11px] tracking-widest shadow-xl border-b-4 border-emerald-900 active:scale-95 transition-all text-white text-center leading-none">💾 Update & Amankan Kunci</button></div>
              </div>
           </div>
        )}
      </div>

      {/* MODAL: DETAIL RIDER (VERIFIKASI & BLOCK) */}
      {showSopirModal && selectedSopir && (
        <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto text-gray-800 text-left">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] text-left text-gray-800">
              <div className="bg-[#034F2A] text-white p-6 flex justify-between items-center shadow-lg text-white"><div><h3 className="text-base font-black uppercase tracking-widest text-white leading-none text-left">Profil Mitra Driver</h3><p className="text-[10px] text-emerald-200 mt-1 uppercase font-bold tracking-widest text-emerald-200 text-left leading-none">Verification & Control</p></div><button onClick={() => setShowSopirModal(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white"><X size={24} /></button></div>
              <div className="p-6 space-y-6 overflow-y-auto scrollbar-none flex-1 text-gray-800 text-left">
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 space-y-3 shadow-inner text-gray-800 text-left">
                    <div className="flex justify-between items-start text-gray-800 text-left"><div><p className="text-xl font-black text-gray-800 leading-none text-left">{(selectedSopir as any).nama}</p><p className="text-sm font-bold text-[#046A38] mt-1.5 leading-none text-left">{(selectedSopir as any).nomorHp}</p></div>{selectedSopir.statusOnline && <div className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse shadow-sm shadow-emerald-500"></div>}</div>
                    <div className="pt-3 grid grid-cols-2 gap-3 border-t border-dashed mt-3 text-gray-800 text-left"><div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none text-gray-400 text-left">Plat Polisi</span><p className="text-xs font-black text-gray-700 font-mono mt-0.5 text-gray-700 leading-none text-left">{selectedSopir.platNomor}</p></div><div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none text-gray-400 text-left">Status Saldo</span><p className="text-xs font-black text-emerald-600 mt-0.5 leading-none text-emerald-600 text-left">Rp {selectedSopir.saldoDompet.toLocaleString()}</p></div></div>
                 </div>

                 {/* SUSPEND BUTTON */}
                 <div className="space-y-3 pt-2 text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-gray-400 text-left">Tindakan Keamanan</h4>
                    {(selectedSopir as any).isSuspended ? (
                      <button onClick={()=>handleToggleSuspend(selectedSopir as any)} className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-emerald-100 active:scale-95 transition-all text-emerald-600 leading-none text-center"><span>AKTIFKAN KEMBALI</span></button>
                    ) : (
                      <button onClick={()=>handleToggleSuspend(selectedSopir as any)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 active:scale-95 transition-all text-red-600 leading-none text-center"><span>SUSPEND MITRA INI</span></button>
                    )}
                 </div>

                 <div className="space-y-4 text-gray-800 text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center space-x-2 text-gray-400 leading-none text-left"><Camera size={14} /> <span>Dokumen Terlampir</span></h4>
                    <div className="grid grid-cols-2 gap-3 text-left text-gray-800 text-left">
                       {[{ label: 'KTP', url: selectedSopir.fotoKtp }, { label: 'SIM', url: selectedSopir.fotoSim }, { label: 'STNK', url: selectedSopir.fotoStnk }, { label: 'UNIT', url: selectedSopir.fotoKendaraan }].map(doc => (
                         <div key={doc.label} className="space-y-2 text-left text-gray-800 text-left">
                            <span className="text-[9px] font-black text-gray-500 uppercase ml-1 tracking-widest text-gray-500 leading-none text-left">{doc.label}</span>
                            <div className="h-32 bg-gray-100 rounded-3xl border border-gray-150 overflow-hidden relative group shadow-sm text-gray-800 text-left">
                               {doc.url ? <img src={doc.url} alt={doc.label} className="w-full h-full object-cover text-gray-800" /> : <div className="w-full h-full flex items-center justify-center text-[10px] italic text-gray-400 font-bold text-gray-400 text-center">KOSONG</div>}
                               {doc.url && <button onClick={() => setShowProofModal(doc.url)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest text-white leading-none text-center">Buka Foto</button>}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex space-x-3 shrink-0 text-white text-center">
                 {!selectedSopir.disetujuiAdmin ? (
                   <>
                     <button onClick={() => handleVerifySopir(selectedSopir.id, false)} className="flex-1 py-5 bg-white text-red-600 border-2 border-red-100 font-black rounded-3xl text-[11px] uppercase tracking-widest active:scale-95 transition-all text-red-600 leading-none text-center">Tolak</button>
                     <button onClick={() => handleVerifySopir(selectedSopir.id, true)} className="flex-[2] py-5 bg-[#046A38] text-white font-black rounded-3xl text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all text-white leading-none text-center">Setujui Mitra</button>
                   </>
                 ) : (
                   <button onClick={() => setShowSopirModal(false)} className="w-full py-5 bg-gray-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all text-white leading-none text-center flex items-center justify-center">Tutup Detail</button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* DETAIL AUDIT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-gray-800 text-left">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] text-left">
              <div className="bg-[#034F2A] text-white p-6 flex justify-between items-center shadow-lg text-white"><div><h3 className="text-base font-black uppercase tracking-widest text-white leading-none text-left">Detail Audit Order</h3><p className="text-[10px] text-emerald-200 mt-1 uppercase font-bold tracking-widest text-emerald-200 text-left leading-none"># {selectedOrder.nomorPesanan}</p></div><button onClick={() => setSelectedOrder(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20"><X size={24} /></button></div>
              <div className="p-6 space-y-6 overflow-y-auto scrollbar-none flex-1 text-gray-800 text-left">
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 space-y-3 shadow-inner text-gray-800 text-left">
                    <div className="flex justify-between items-center border-b pb-2 text-gray-800 text-left leading-none text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase text-gray-400 leading-none text-left">Customer</span><p className="text-xs font-black text-gray-800 uppercase leading-none text-left">{selectedOrder.namaPenumpang}</p></div>
                    <div className="flex justify-between items-center border-b pb-2 text-gray-800 text-left leading-none text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase text-gray-400 leading-none text-left">Driver</span><p className="text-xs font-black text-emerald-700 uppercase leading-none text-left">{selectedOrder.namaSopir || 'MENUNGGU'}</p></div>
                    <div className="flex justify-between items-center text-gray-800 text-left leading-none text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase text-gray-400 leading-none text-left">Biaya Total</span><p className="text-sm font-black text-[#B8941F] leading-none text-left">Rp {selectedOrder.totalBayarAkhir.toLocaleString()}</p></div>
                 </div>
                 <div className="space-y-4 text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center space-x-2 text-gray-400 leading-none text-left"><ClipboardList size={14} /> <span>Daftar Pesanan & Belanja</span></h4>
                    <div className="space-y-2 text-left">
                       <p className="text-[9px] font-black text-[#046A38] uppercase flex items-center space-x-1 text-[#046A38] leading-none text-left"><MapPin size={10}/><span>Titik Utama: {selectedOrder.asalAlamat}</span></p>
                       <div className="bg-[#FAFBF9] p-3 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-gray-800 text-left">
                          {(selectedOrder.itemsAwal || []).length === 0 ? <p className="text-[10px] italic text-gray-400 py-1 text-gray-400 leading-none text-left">Tidak ada rincian belanja.</p> :
                            selectedOrder.itemsAwal?.map(it => (
                              <div key={it.id} className="py-2 flex justify-between items-center text-gray-800 text-left"><span className="text-xs font-bold text-gray-700 text-left">{it.namaBarang}</span><span className="text-xs font-black text-emerald-600 text-right">x{it.jumlah}</span></div>
                            ))
                          }
                       </div>
                    </div>
                    {selectedOrder.daftarTujuan.map((stop, sIdx) => (
                       <div key={stop.id} className="space-y-2 pt-2 border-t border-dashed text-left text-gray-800">
                          <p className="text-[9px] font-black text-amber-600 uppercase flex items-center space-x-1 text-amber-600 leading-none text-left"><MapPin size={10}/><span>Stop {sIdx+1}: {stop.alamat}</span></p>
                          <div className="bg-[#FAFBF9] p-3 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-gray-800 text-left">
                             {(stop.daftarItem || []).length === 0 ? <p className="text-[10px] italic text-gray-400 py-1 text-gray-400 leading-none text-left text-gray-400">Tidak ada rincian belanja.</p> :
                               stop.daftarItem.map(it => (
                                 <div key={it.id} className="py-2 flex justify-between items-center text-gray-800 text-left text-gray-800 text-left"><span className="text-xs font-bold text-gray-700 text-left">{it.namaBarang}</span><span className="text-xs font-black text-[#B8941F] text-right">x{it.jumlah}</span></div>
                               ))
                             }
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex space-x-3 shrink-0 text-white text-center">
                 <button onClick={() => generateReceipt(selectedOrder)} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest text-white leading-none active:scale-95 text-center flex items-center justify-center text-white">Cetak Nota</button>
                 <button onClick={() => setSelectedOrder(null)} className="flex-1 py-4 bg-gray-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest text-white active:scale-95 text-center flex items-center justify-center text-white">Tutup</button>
              </div>
           </div>
        </div>
      )}

      {/* GLOBAL MODALS */}
      {showProofModal && (<div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center p-6 text-center text-white text-gray-800 text-center"><button onClick={()=>setShowProofModal(null)} className="absolute top-8 right-8 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all text-white"><X size={28} /></button><div className="w-full max-w-sm aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/10 text-gray-800"><img src={showProofModal} className="w-full h-full object-contain text-gray-800 text-left" alt="Bukti" /></div><p className="text-white text-xs font-black mt-6 uppercase tracking-[0.4em] opacity-80 text-white text-center">DOKUMEN RESMI</p></div>)}
      {showTopUpModal && (<div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 text-center text-gray-800 text-center"><div className="bg-white w-full max-w-xs rounded-[40px] p-8 space-y-6 shadow-2xl text-center text-gray-800"><div className="space-y-2 text-gray-800 text-center"><div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner text-emerald-600 text-center"><DollarSign size={40} className="text-emerald-600 text-center" /></div><h3 className="font-black text-base uppercase text-gray-800 text-center leading-none">Isi Saldo Mitra</h3></div><input type="number" value={topUpAmount} onChange={(e)=>setTopUpAmount(e.target.value)} placeholder="Nominal Rp..." className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-3xl outline-none text-center text-2xl font-black text-emerald-700 shadow-inner text-emerald-700 text-center" /><div className="flex space-x-3 text-gray-800 text-center text-white"><button onClick={()=>setShowTopUpModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl text-[11px] uppercase tracking-widest text-gray-500 leading-none active:scale-95 transition-all text-center">Batal</button><button onClick={handleAdminTopUp} className="flex-2 py-4 bg-emerald-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all text-white text-center leading-none">ISI SALDO</button></div></div></div>)}

      {selectedUserDetail && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-left text-gray-800 text-left">
           <div className="bg-white w-full max-w-xs rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 text-gray-800 text-left">
              <div className="bg-blue-600 text-white p-6 flex justify-between items-center shadow-lg text-white text-left"><div><h3 className="text-base font-black uppercase tracking-widest leading-none text-white text-left">Profil Penumpang</h3><p className="text-[10px] opacity-70 mt-1 uppercase font-bold tracking-widest text-white text-left leading-none">User Management</p></div><button onClick={() => setSelectedUserDetail(null)} className="p-2.5 bg-white/10 rounded-full text-white"><X size={20} /></button></div>
              <div className="p-8 space-y-8 text-gray-800 text-left">
                 <div className="text-center space-y-3 text-gray-800 text-center"><div className="w-20 h-20 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-600 mx-auto border-4 border-white shadow-xl shadow-blue-900/10 text-blue-600 text-center"><User size={40} /></div><div><p className="text-xl font-black text-gray-800 leading-none text-center">{selectedUserDetail.nama}</p><p className="text-sm font-bold text-blue-600 mt-1.5 text-blue-600 text-center">{selectedUserDetail.nomorHp}</p></div></div>
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 divide-y divide-gray-200 shadow-inner text-gray-800 text-left"><div className="py-2.5 flex justify-between items-center text-gray-800 text-left text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400 leading-none text-left">Bergabung</span><span className="text-[10px] font-black text-gray-700 text-gray-700 leading-none text-right">{new Date(selectedUserDetail.created_at || "").toLocaleDateString('id-ID')}</span></div><div className="py-2.5 flex justify-between items-center text-gray-800 text-left text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400 leading-none text-left">Status Akun</span><span className={`text-[9px] font-black px-2.5 py-1 rounded-lg shadow-xs ${selectedUserDetail.isSuspended ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'} text-center`}>{selectedUserDetail.isSuspended ? 'TERBLOKIR' : 'AKTIF'}</span></div></div>
                 <button disabled={isProcessingAction} onClick={() => handleToggleSuspend(selectedUserDetail)} className={`w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all text-white ${selectedUserDetail.isSuspended ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'} text-center leading-none`}>{isProcessingAction ? 'MEMPROSES...' : (selectedUserDetail.isSuspended ? 'BUKA BLOKIR AKUN' : 'SUSPEND / BLOKIR AKUN')}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
