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
  UserCheck
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
      if (results[3].status === 'fulfilled') {
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
    await OloluStore.addAuditLog(profile.id, profile.nama, "Update Konfigurasi", "Memperbarui pengaturan sistem v3.8.");
    alert("🚀 SEMUA PENGATURAN BERHASIL DISIMPAN!");
    syncData();
  };

  const handleVerifySopir = async (id: string, ok: boolean) => {
    if (!ok && !alasanTolakSopir) { alert("Masukkan alasan penolakan!"); return; }
    const res = await OloluStore.verifikasiSopir(id, ok, ok ? '' : alasanTolakSopir);
    if (res.success) {
      if (profile) {
        const action = ok ? "Setujui Mitra" : "Tolak Mitra";
        const target = (selectedSopir as any)?.nama || id;
        await OloluStore.addAuditLog(profile.id, profile.nama, action, `${action}: ${target}${!ok ? ` - Alasan: ${alasanTolakSopir}` : ''}`);
      }
      alert(ok ? "Mitra BERHASIL DISETUJUI! 🎉" : "Mitra DITOLAK.");
      setShowSopirModal(false); setSelectedSopir(null); setAlasanTolakSopir('');
      syncData();
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminPhone || !newAdminName) { alert("Lengkapi data."); return; }
    const res = await OloluStore.promoteToAdmin(newAdminPhone, newAdminName);
    if (res.success) {
      if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Tambah Admin", `Menambahkan tim admin baru: ${newAdminName} (${newAdminPhone})`);
      alert("Admin ditambahkan."); setNewAdminPhone(''); setNewAdminName('');
      syncData();
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (confirm("Cabut hak akses?")) {
      const adm = adminList.find(a => a.id === id);
      const res = await OloluStore.removeAdminStatus(id);
      if (res.success) {
        if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Cabut Akses Admin", `Menghapus hak akses admin: ${adm?.nama || id}`);
        alert("Akses dicabut.");
        syncData();
      }
    }
  };

  const handleToggleSuspend = async (user: ProfilPengguna) => {
    if (!profile) return;
    const action = user.isSuspended ? "Membatalkan Suspend" : "Menangguhkan (Suspend)";
    if (confirm(`Yakin ingin ${action} akun ${user.nama}?`)) {
      setIsProcessingAction(true);
      const res = await OloluStore.toggleSuspendUser(user.id, !!user.isSuspended);
      if (res.success) {
        await OloluStore.addAuditLog(profile.id, profile.nama, action, `Akun: ${user.nama} (${user.peran})`);
        alert("Status akun berhasil diubah.");
        setSelectedUserDetail(null);
        if (showSopirModal) setShowSopirModal(false);
        syncData();
      }
      setIsProcessingAction(false);
    }
  };

  const handleForceOffline = async (drvId: string, drvNama: string) => {
    if (!profile) return;
    if (confirm(`Paksa Driver ${drvNama} Offline?`)) {
      setIsProcessingAction(true);
      await OloluStore.forceOfflineDriver(drvId);
      await OloluStore.addAuditLog(profile.id, profile.nama, "Force Offline", `Driver: ${drvNama}`);
      syncData();
      setIsProcessingAction(false);
    }
  };

  const handleProsesTx = async (id: string, status: 'disetujui' | 'ditolak') => {
    let alasan = status === 'ditolak' ? (prompt("Alasan penolakan:") || 'Ditolak admin') : '';
    const tx = transaksiList.find(t => t.id === id);
    await OloluStore.prosesTransaksi(id, status, alasan);
    if (profile) {
      const actionLabel = status === 'disetujui' ? "ACC" : "TOLAK";
      const typeLabel = tx?.jenis === 'topup' ? "Deposit" : "Tarik Dana";
      await OloluStore.addAuditLog(profile.id, profile.nama, `${actionLabel} ${typeLabel}`, `${actionLabel} ${typeLabel} Rp ${tx?.jumlah?.toLocaleString()} oleh ${(tx as any)?.namaSopir}${alasan ? ` - Alasan: ${alasan}` : ''}`);
    }
    alert(status === 'disetujui' ? "Berhasil disetujui!" : "Berhasil ditolak.");
    syncData();
  };

  const handleAdminTopUp = async () => {
    if (!topUpTargetId || !topUpAmount) return;
    const target = sopirList.find(s => s.id === topUpTargetId);
    const res = await OloluStore.topUpSopir(topUpTargetId, parseInt(topUpAmount), "Isi saldo oleh Admin");
    if (res.success) {
      if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Manual Top-Up", `Isi saldo manual Rp ${parseInt(topUpAmount).toLocaleString()} ke ${(target as any)?.nama || topUpTargetId}`);
      alert("Saldo diisi!"); setShowTopUpModal(false); setTopUpAmount('');
      syncData();
    }
  };

  if (loading && pesananList.length === 0) return <div className="flex flex-col items-center justify-center min-h-screen text-left text-gray-800"><div className="w-10 h-10 border-4 border-t-[#046A38] rounded-full animate-spin"></div><p className="text-xs font-bold text-gray-400 mt-4 uppercase text-center tracking-widest leading-none">Memuat Panel Kendali...</p></div>;
  if (!isSuperUser && profile?.peran !== 'admin') return <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-gray-800"><ShieldAlert size={64} className="text-red-500 mb-4" /><h2 className="text-2xl font-black text-gray-800">Akses Terbatas</h2></div>;

  const totalBiayaJasaMurni = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => acc + Math.round((cur.tarifPerjalananMurni) * (cur.biayaLayananPersen || 10) / 100), 0);
  const pendingVerifList = transaksiList.filter(t => t.statusTarik === 'menunggu');

  // --- RADAR LOGIC ---
  const activeTrips = pesananList.filter(p => (p.status === 'dalam_perjalanan' || p.status === 'sopir_ditemukan' || p.status === 'diproses') && p.daftarTujuan && p.daftarTujuan.length > 0);

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative font-sans text-left text-gray-800">
      {/* HEADER */}
      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2"><Activity size={18} className="text-[#D4AF37]" /><h1 className="text-lg font-black tracking-wide uppercase leading-none text-white">Ololu Control Panel</h1></div>
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
               <div className="bg-white p-4 rounded-2xl border-l-4 border-[#046A38] shadow-sm"><span className="text-[9px] font-bold text-gray-400 uppercase">Selesai</span><p className="text-xl font-black text-gray-800">{pesananList.filter(p=>p.status==='selesai').length}</p></div>
               <div className="bg-white p-4 rounded-2xl border-l-4 border-[#D4AF37] shadow-sm"><span className="text-[9px] font-bold text-gray-400 uppercase">Kas Ololu</span><p className="text-xl font-black text-[#B8941F]">Rp {totalBiayaJasaMurni.toLocaleString()}</p></div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-sm space-y-3">
               <div className="flex justify-between items-center px-1">
                 <h3 className="text-xs font-black uppercase tracking-tight flex items-center space-x-2 text-gray-800"><MapPin size={14} className="text-emerald-600" /><span>Radar Driver & Rute Aktif</span></h3>
                 <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse uppercase">Live</span>
               </div>
               <div className="h-80 w-full rounded-2xl overflow-hidden border bg-gray-50 relative shadow-inner">
                  <APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY}>
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
                  </APIProvider>
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
             <div className="space-y-2 pt-2 text-gray-800"><h3 className="text-[10px] font-black text-[#046A38] uppercase tracking-widest px-1">✅ Mitra Aktif Ololu</h3>
                {sopirList.filter(s => s.disetujuiAdmin && ((s as any).nama?.toLowerCase().includes(searchDriverQuery.toLowerCase()) || s.platNomor?.toLowerCase().includes(searchDriverQuery.toLowerCase()))).map(s => (
                    <div key={s.id} onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }} className="w-full bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs text-left text-gray-800 hover:border-emerald-200 transition-all cursor-pointer">
                       <div className="flex items-center space-x-4 text-gray-800">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.statusOnline ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Bike size={20} /></div>
                          <div>
                             <div className="flex items-center space-x-1.5"><p className="text-sm font-black text-gray-800 uppercase leading-none">{(s as any).nama}</p>{(s as any).isSuspended && <span className="bg-red-600 text-white text-[7px] px-1.5 py-0.5 rounded font-black shadow-sm">BLOKIR</span>}</div>
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

        {/* WALLET / DOMPET */}
        {activeTab === 'dompet' && (
          <div className="space-y-4 animate-in fade-in duration-300 text-left text-gray-800">
             <div className="flex bg-white p-1 rounded-2xl border border-gray-150 gap-1 shadow-sm"><button onClick={()=>setActiveDompetTab('pending')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeDompetTab==='pending' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>PENGAJUAN ANTRIAN</button><button onClick={()=>setActiveDompetTab('history')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all ${activeDompetTab==='history' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>MUTASI DOMPET</button></div>
             {activeDompetTab === 'pending' ? (
                <div className="space-y-3">
                  {transaksiList.filter(t => t.statusTarik === 'menunggu').length === 0 ? <div className="p-16 text-center text-gray-400 text-xs italic bg-white rounded-[40px] border border-dashed">Belum ada antrian dana.</div> :
                   transaksiList.filter(t => t.statusTarik === 'menunggu').map(t => (
                    <div key={t.id} className={`bg-white p-5 rounded-3xl border-2 shadow-lg space-y-4 ${t.jenis === 'topup' ? 'border-emerald-500' : 'border-[#D4AF37]'}`}>
                      <div className="flex justify-between items-start text-gray-800"><div><p className="text-xs font-black text-gray-800 uppercase tracking-tight">{(t as any).namaSopir}</p><p className="text-[10px] text-gray-400 font-bold mt-0.5">{new Date(t.timestamp).toLocaleString('id-ID')}</p></div><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${t.jenis === 'topup' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-[#B8941F]'}`}>{t.jenis.replace('_',' ')}</span></div>
                      <div className="bg-gray-50 p-4 rounded-2xl border text-center relative overflow-hidden text-gray-800">
                        {t.jenis === 'topup' && t.buktiTransfer && <button onClick={() => setShowProofModal(t.buktiTransfer || null)} className="absolute right-3 top-3 bg-emerald-600 text-white p-2 rounded-xl shadow-md active:scale-90 text-white"><Eye size={16} /></button>}
                        <p className={`text-2xl font-black ${t.jenis === 'topup' ? 'text-emerald-600' : 'text-[#B8941F]'}`}>Rp {t.jumlah?.toLocaleString()}</p>
                      </div>
                      <div className="flex space-x-2 text-white">
                        <button onClick={()=>handleProsesTx(t.id, 'ditolak')} className="flex-1 py-3.5 bg-white text-red-600 border-2 border-red-100 font-black rounded-2xl text-[10px] uppercase text-red-600">Tolak</button>
                        <button onClick={()=>handleProsesTx(t.id, 'disetujui')} className={`flex-[2] py-3.5 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl ${t.jenis === 'topup' ? 'bg-emerald-600' : 'bg-[#046A38]'}`}>Setujui & Update</button>
                      </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="space-y-2">
                  {transaksiList.length === 0 ? <div className="p-16 text-center text-gray-400 text-xs italic bg-white rounded-[40px] border border-dashed">Belum ada riwayat mutasi.</div> :
                   transaksiList.slice(0, 100).map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-150 flex items-center justify-between shadow-xs transition-colors hover:bg-gray-50 text-gray-800"><div><p className="text-[11px] font-black text-gray-800 leading-tight">{(t as any).namaSopir} - {t.deskripsi}</p><p className="text-[9px] text-gray-400 font-bold mt-1">{new Date(t.timestamp).toLocaleDateString('id-ID')} {new Date(t.timestamp).toLocaleTimeString('id-ID')}</p></div><div className="text-right"><p className={`text-xs font-black ${t.jenis==='topup'||t.jenis==='pendapatan' ? 'text-green-600':'text-red-500'}`}>{t.jenis==='topup'||t.jenis==='pendapatan'?'+':'-'} Rp {t.jumlah?.toLocaleString()}</p><span className="text-[8px] text-gray-300 uppercase font-black block mt-1">{t.statusTarik || t.jenis}</span></div></div>
                  ))}
                </div>
             )}
          </div>
        )}

        {/* USER LIST */}
        {activeTab === 'penumpang' && (
           <div className="space-y-3 animate-in fade-in duration-300 text-left text-gray-800">
             <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Penumpang Terdaftar</h3>
             <div className="relative mb-3"><input type="text" placeholder="Cari Nama / HP User..." value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)} className="w-full p-4 pl-12 bg-white border rounded-2xl text-xs font-bold outline-none focus:border-[#046A38] shadow-sm text-gray-800" /><Search size={20} className="absolute left-4 top-3.5 text-gray-400" /></div>
             <div className="space-y-2">
               {profilList.filter(p => p.peran === 'penumpang' && (p.nama?.toLowerCase().includes(searchUserQuery.toLowerCase()) || p.nomorHp?.toLowerCase().includes(searchUserQuery.toLowerCase()))).length === 0 ? <p className="text-xs text-gray-400 text-center py-10 italic">Data user tidak ditemukan.</p> :
                 profilList.filter(p => p.peran === 'penumpang' && (p.nama?.toLowerCase().includes(searchUserQuery.toLowerCase()) || p.nomorHp?.toLowerCase().includes(searchUserQuery.toLowerCase()))).map(p => (
                   <div key={p.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs cursor-pointer active:scale-[0.98] transition-all hover:border-blue-200 text-gray-800" onClick={() => setSelectedUserDetail(p)}>
                      <div className="flex items-center space-x-4"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.isSuspended ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}><User size={20} /></div><div><div className="flex items-center space-x-1.5"><p className="text-sm font-black text-gray-800 uppercase leading-none">{p.nama}</p>{p.isSuspended && <span className="bg-red-600 text-white text-[7px] px-1.5 py-0.5 rounded uppercase font-black shadow-sm">Blokir</span>}</div><p className="text-[10px] text-gray-500 font-bold mt-1 leading-none">{p.nomorHp}</p></div></div>
                      <ChevronRight size={18} className="text-gray-300" />
                   </div>
                 ))
               }
             </div>
           </div>
        )}

        {/* SYSTEM TAB (ONLY FOR SUPER ADMIN) */}
        {activeTab === 'sistem' && isSuperUser && (
           <div className="space-y-6 animate-in fade-in duration-300 text-left text-gray-800">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start space-x-3 shadow-sm text-gray-800"><div className="bg-amber-100 p-2 rounded-xl text-amber-600 shadow-inner text-amber-600"><Cpu size={22} /></div><div><h3 className="text-sm font-black text-amber-900 uppercase leading-none">Sistem & Brankas Kunci</h3><p className="text-[10px] text-amber-700 mt-1 uppercase font-bold tracking-widest leading-none">Pengaturan Token & API Key</p></div></div>

              <div className="bg-white p-6 rounded-[40px] border shadow-sm space-y-6 text-gray-800">
                 <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden text-white"><div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-12 translate-x-12"></div><div className="relative z-10 space-y-4 text-white"><div className="flex justify-between items-center text-white"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-slate-400">Google API Status</span><span className="text-[9px] font-black bg-emerald-600 px-2.5 py-1 rounded text-white animate-pulse">MONITORED</span></div><div className="flex justify-between items-end text-white"><div><div className="text-5xl font-black text-white">{config.googleApiUsageCount?.toLocaleString() || 0}</div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Total Panggilan API</p></div><div className="text-right text-white"><div className="text-xl font-black text-emerald-400">{tempConfig.googleApiLimit?.toLocaleString() || 25000}</div><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Limit Kuota</p></div></div><div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700"><div className={`h-full transition-all duration-1000 ${ (config.googleApiUsageCount / config.googleApiLimit) > 0.9 ? 'bg-red-500' : 'bg-emerald-500' }`} style={{ width: `${Math.min(100, (config.googleApiUsageCount / config.googleApiLimit) * 100)}%` }}></div></div></div></div>

                 <div className="space-y-5 text-gray-800">
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-1 leading-none">Fonnte WhatsApp Token (Secret)</label><div className="relative"><input type="password" value={tempConfig.fonnteToken} onChange={(e)=>setTempConfig({...tempConfig, fonnteToken: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl outline-none text-xs font-mono text-gray-800 focus:border-[#046A38] transition-all" /><Lock size={16} className="absolute right-4 top-3.5 text-gray-200" /></div></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-gray-400 uppercase ml-1 leading-none">Google Maps API Key (Public)</label><div className="relative"><input type="password" value={tempConfig.googleMapsKey} onChange={(e)=>setTempConfig({...tempConfig, googleMapsKey: e.target.value})} className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-100 rounded-2xl outline-none text-xs font-mono text-gray-800 focus:border-[#046A38] transition-all" /><KeyRound size={16} className="absolute right-4 top-3.5 text-gray-200" /></div></div>
                 </div>

                 <div className="pt-2 text-gray-800 text-left"><button onClick={saveConfigWithLog} className="w-full py-5 bg-[#034F2A] text-white font-black rounded-3xl uppercase text-[11px] tracking-widest shadow-xl border-b-4 border-emerald-900 active:scale-95 transition-all text-white">💾 Update & Amankan Kunci</button></div>
              </div>
           </div>
        )}

        {/* LOGS TAB FALLBACK */}
        {activeTab === 'logs' && auditLogs.length === 0 && <div className="p-20 text-center text-gray-400 text-xs italic bg-white rounded-[40px] border-2 border-dashed">Belum ada log aktivitas hari ini.</div>}
      </div>

      {/* MODALS: DETAIL RIDER (VERIFIKASI & BLOCK) */}
      {showSopirModal && selectedSopir && (
        <div className="fixed inset-0 z-[1200] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto text-gray-800 text-left">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] text-left text-gray-800">
              <div className="bg-[#034F2A] text-white p-6 flex justify-between items-center shadow-lg text-white"><div><h3 className="text-base font-black uppercase tracking-widest text-white leading-none">Profil Mitra Driver</h3><p className="text-[10px] text-emerald-200 mt-0.5 uppercase font-bold tracking-widest text-emerald-200 text-left leading-none">Verification & Control</p></div><button onClick={() => setShowSopirModal(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white"><X size={24} /></button></div>
              <div className="p-6 space-y-6 overflow-y-auto scrollbar-none flex-1 text-gray-800 text-left">
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 space-y-3 shadow-inner text-gray-800 text-left">
                    <div className="flex justify-between items-start text-gray-800"><div><p className="text-xl font-black text-gray-800 leading-none">{(selectedSopir as any).nama}</p><p className="text-sm font-bold text-[#046A38] mt-1.5 leading-none">{(selectedSopir as any).nomorHp}</p></div>{selectedSopir.statusOnline && <div className="bg-emerald-500 w-3 h-3 rounded-full animate-pulse shadow-sm shadow-emerald-500"></div>}</div>
                    <div className="pt-3 grid grid-cols-2 gap-3 border-t border-dashed mt-3 text-gray-800 text-left"><div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Plat Polisi</span><p className="text-xs font-black text-gray-700 font-mono mt-0.5 leading-none">{selectedSopir.platNomor}</p></div><div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Status Saldo</span><p className="text-xs font-black text-emerald-600 mt-0.5 leading-none text-emerald-600">Rp {selectedSopir.saldoDompet.toLocaleString()}</p></div></div>
                 </div>

                 {/* ACTION SECTION: BLOCK/SUSPEND */}
                 <div className="space-y-3 pt-2 text-left">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none text-gray-400">Kontrol Keamanan Akun</h4>
                    {sopirList.find(s => s.id === selectedSopir.id && (s as any).isSuspended) ? (
                      <button onClick={()=>handleToggleSuspend(selectedSopir as any)} className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-emerald-100 active:scale-95 transition-all text-emerald-600 leading-none"><UserCheck size={18}/><span>AKTIFKAN KEMBALI AKUN</span></button>
                    ) : (
                      <button onClick={()=>handleToggleSuspend(selectedSopir as any)} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-red-100 active:scale-95 transition-all text-red-600 leading-none"><UserMinus size={18}/><span>TANGGUHKAN (SUSPEND) MITRA</span></button>
                    )}
                 </div>

                 <div className="space-y-4 text-gray-800">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-2 flex items-center space-x-2 text-gray-400 leading-none"><Camera size={14} /> <span>Lampiran Dokumen Resmi</span></h4>
                    <div className="grid grid-cols-2 gap-3 text-left text-gray-800">
                       {[{ label: 'KTP', url: selectedSopir.fotoKtp }, { label: 'SIM', url: selectedSopir.fotoSim }, { label: 'STNK', url: selectedSopir.fotoStnk }, { label: 'UNIT', url: selectedSopir.fotoKendaraan }].map(doc => (
                         <div key={doc.label} className="space-y-2 text-left text-gray-800">
                            <span className="text-[9px] font-black text-gray-500 uppercase ml-1 tracking-widest text-gray-500 leading-none">{doc.label}</span>
                            <div className="h-32 bg-gray-100 rounded-3xl border border-gray-150 overflow-hidden relative group shadow-sm text-gray-800">
                               {doc.url ? <img src={doc.url} alt={doc.label} className="w-full h-full object-cover text-gray-800" /> : <div className="w-full h-full flex items-center justify-center text-[10px] italic text-gray-400 font-bold text-gray-400">KOSONG</div>}
                               {doc.url && <button onClick={() => setShowProofModal(doc.url)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest text-white leading-none">Buka Foto</button>}
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex space-x-3 shrink-0 text-white text-center">
                 {!selectedSopir.disetujuiAdmin ? (
                   <>
                     <button onClick={() => handleVerifySopir(selectedSopir.id, false)} className="flex-1 py-5 bg-white text-red-600 border-2 border-red-100 font-black rounded-3xl text-[11px] uppercase tracking-widest active:scale-95 transition-all text-red-600 leading-none">Tolak</button>
                     <button onClick={() => handleVerifySopir(selectedSopir.id, true)} className="flex-[2] py-5 bg-[#046A38] text-white font-black rounded-3xl text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-all text-white leading-none">Setujui Mitra</button>
                   </>
                 ) : (
                   <button onClick={() => setShowSopirModal(false)} className="w-full py-5 bg-gray-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all text-white leading-none flex items-center justify-center">Tutup Detail</button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* DETAIL ORDER AUDIT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-gray-800 text-left">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="bg-[#034F2A] text-white p-6 flex justify-between items-center shadow-lg text-white"><div><h3 className="text-base font-black uppercase tracking-widest text-white leading-none">Detail Audit Order</h3><p className="text-[10px] text-emerald-200 mt-0.5 uppercase font-bold tracking-widest text-emerald-200"># {selectedOrder.nomorPesanan}</p></div><button onClick={() => setSelectedOrder(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20"><X size={24} /></button></div>
              <div className="p-6 space-y-6 overflow-y-auto scrollbar-none flex-1">
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 space-y-3 shadow-inner text-gray-800 text-left">
                    <div className="flex justify-between items-center border-b pb-2 text-gray-800 text-left leading-none"><span className="text-[10px] font-black text-gray-400 uppercase leading-none">Customer</span><p className="text-xs font-black text-gray-800 uppercase leading-none">{selectedOrder.namaPenumpang}</p></div>
                    <div className="flex justify-between items-center border-b pb-2 text-gray-800 text-left leading-none"><span className="text-[10px] font-black text-gray-400 uppercase leading-none">Driver</span><p className="text-xs font-black text-emerald-700 uppercase leading-none">{selectedOrder.namaSopir || 'MENUNGGU'}</p></div>
                    <div className="flex justify-between items-center text-gray-800 text-left leading-none"><span className="text-[10px] font-black text-gray-400 uppercase leading-none">Biaya Total</span><p className="text-sm font-black text-[#B8941F] leading-none">Rp {selectedOrder.totalBayarAkhir.toLocaleString()}</p></div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center space-x-2 text-gray-400 leading-none"><ClipboardList size={14} /> <span>Daftar Pesanan & Belanja</span></h4>
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-[#046A38] uppercase flex items-center space-x-1 text-[#046A38] leading-none"><MapPin size={10}/><span>Titik Utama: {selectedOrder.asalAlamat}</span></p>
                       <div className="bg-[#FAFBF9] p-3 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-gray-800">
                          {(selectedOrder.itemsAwal || []).length === 0 ? <p className="text-[10px] italic text-gray-400 py-1 text-gray-400 leading-none">Tidak ada rincian belanja.</p> :
                            selectedOrder.itemsAwal?.map(it => (
                              <div key={it.id} className="py-2 flex justify-between items-center text-gray-800 text-left"><span className="text-xs font-bold text-gray-700">{it.namaBarang}</span><span className="text-xs font-black text-emerald-600">x{it.jumlah}</span></div>
                            ))
                          }
                       </div>
                    </div>
                    {selectedOrder.daftarTujuan.map((stop, sIdx) => (
                       <div key={stop.id} className="space-y-2 pt-2 border-t border-dashed text-left text-gray-800">
                          <p className="text-[9px] font-black text-amber-600 uppercase flex items-center space-x-1 text-amber-600 leading-none"><MapPin size={10}/><span>Stop {sIdx+1}: {stop.alamat}</span></p>
                          <div className="bg-[#FAFBF9] p-3 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-gray-800 text-left">
                             {(stop.daftarItem || []).length === 0 ? <p className="text-[10px] italic text-gray-400 py-1 text-gray-400 leading-none">Tidak ada rincian belanja.</p> :
                               stop.daftarItem.map(it => (
                                 <div key={it.id} className="py-2 flex justify-between items-center text-gray-800 text-left"><span className="text-xs font-bold text-gray-700">{it.namaBarang}</span><span className="text-xs font-black text-[#B8941F]">x{it.jumlah}</span></div>
                               ))
                             }
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex space-x-3 shrink-0 text-white text-center">
                 <button onClick={() => generateReceipt(selectedOrder)} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest text-white leading-none active:scale-95 transition-all text-center flex items-center justify-center">Cetak Nota</button>
                 <button onClick={() => setSelectedOrder(null)} className="flex-1 py-4 bg-gray-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest text-white leading-none active:scale-95 text-center flex items-center justify-center">Tutup</button>
              </div>
           </div>
        </div>
      )}

      {/* PANIC MODE OVERLAY */}
      {showPanicOverlay && activeEmergency && (
        <div className="fixed inset-0 z-[10000] bg-red-600/90 backdrop-blur-xl flex items-center justify-center p-6 animate-pulse text-center">
           <div className="bg-white w-full max-w-sm rounded-[48px] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-500 text-gray-800">
              <div className="w-28 h-28 bg-red-50 rounded-full flex items-center justify-center mx-auto border-8 border-red-100 shadow-inner text-red-600"><AlertTriangle size={64} className="text-red-600 animate-bounce" /></div>
              <div className="space-y-2 text-center text-gray-800"><h2 className="text-3xl font-black text-red-600 uppercase tracking-tighter text-red-600">DARURAT!</h2><p className="text-xs text-gray-500 font-bold uppercase tracking-[0.2em] text-gray-500 text-center">Sinyal SOS Diaktifkan Oleh:</p></div>
              <div className="bg-gray-50 p-6 rounded-[32px] border border-gray-150 space-y-1 shadow-inner text-gray-800 text-center"><p className="text-2xl font-black text-gray-800 leading-none">{activeEmergency.namaPelapor}</p><p className="text-sm font-bold text-red-600 uppercase tracking-widest text-red-600 text-center">{activeEmergency.peranPelapor === 'sopir' ? 'MITRA DRIVER' : 'PELANGGAN'}</p></div>
              <button onClick={() => { stopSiren(); setShowPanicOverlay(false); setActiveTab('darurat'); }} className="w-full py-6 bg-red-600 text-white font-black rounded-3xl text-xs tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all border-b-8 border-red-900 shadow-red-900/40 text-white leading-none">SAYA TANGANI SEKARANG</button>
           </div>
        </div>
      )}
    </div>
  );
}
