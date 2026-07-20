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
  ClipboardList
} from 'lucide-react';
import { downloadFinancialReport } from '../utils/excelExport';
import { generateReceipt } from '../utils/receiptGenerator';
import MapDirections from './MapDirections';

export default function AdminView() {
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'sopir' | 'penumpang' | 'pesanan' | 'dompet' | 'tarif' | 'darurat' | 'admins' | 'logs' | 'laporan'>('stats');
  
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

      if (results[0].status === 'fulfilled') setPesananList(results[0].value);
      if (results[1].status === 'fulfilled') setSopirList(results[1].value);
      if (results[2].status === 'fulfilled') setProfilList(results[2].value);
      if (results[3].status === 'fulfilled') {
        setConfig(results[3].value);
        setTempConfig(results[3].value);
      }
      if (results[4].status === 'fulfilled') setAuditLogs(results[4].value);
      if (results[5].status === 'fulfilled') setAdminList(results[5].value);
      if (results[6].status === 'fulfilled') setEmergencyList(results[6].value);
      if (results[7].status === 'fulfilled') setTransaksiList(results[7].value);

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
    await OloluStore.addAuditLog(profile.id, profile.nama, "Update Tarif", "Memperbarui konfigurasi sistem v3.3 (Full Services Sync).");
    alert("🚀 SEMUA PENGATURAN BERHASIL DISIMPAN!");
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
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminPhone || !newAdminName) { alert("Lengkapi data."); return; }
    const res = await OloluStore.promoteToAdmin(newAdminPhone, newAdminName);
    if (res.success) {
      if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Tambah Admin", `Menambahkan tim admin baru: ${newAdminName} (${newAdminPhone})`);
      alert("Admin ditambahkan."); setNewAdminPhone(''); setNewAdminName('');
    }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (confirm("Cabut hak akses?")) {
      const adm = adminList.find(a => a.id === id);
      const res = await OloluStore.removeAdminStatus(id);
      if (res.success) {
        if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Cabut Akses Admin", `Menghapus hak akses admin: ${adm?.nama || id}`);
        alert("Akses dicabut.");
      }
    }
  };

  const handleToggleSuspend = async (user: ProfilPengguna) => {
    if (!profile) return;
    const action = user.isSuspended ? "Membatalkan Suspend" : "Menangguhkan (Suspend)";
    if (confirm(`Yakin ingin ${action} akun ${user.nama}?`)) {
      setIsProcessingAction(true);
      const res = await OloluStore.toggleSuspendUser(user.id, !!user.isSuspended);
      if (res.success) await OloluStore.addAuditLog(profile.id, profile.nama, action, `Akun: ${user.nama}`);
      setIsProcessingAction(false);
    }
  };

  const handleForceOffline = async (drvId: string, drvNama: string) => {
    if (!profile) return;
    if (confirm(`Paksa Driver ${drvNama} Offline?`)) {
      setIsProcessingAction(true);
      await OloluStore.forceOfflineDriver(drvId);
      await OloluStore.addAuditLog(profile.id, profile.nama, "Force Offline", `Driver: ${drvNama}`);
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
  };

  const handleAdminTopUp = async () => {
    if (!topUpTargetId || !topUpAmount) return;
    const target = sopirList.find(s => s.id === topUpTargetId);
    const res = await OloluStore.topUpSopir(topUpTargetId, parseInt(topUpAmount), "Isi saldo oleh Admin");
    if (res.success) {
      if (profile) await OloluStore.addAuditLog(profile.id, profile.nama, "Manual Top-Up", `Isi saldo manual Rp ${parseInt(topUpAmount).toLocaleString()} ke ${(target as any)?.nama || topUpTargetId}`);
      alert("Saldo diisi!"); setShowTopUpModal(false); setTopUpAmount('');
    }
  };

  if (loading && pesananList.length === 0) return <div className="flex flex-col items-center justify-center min-h-screen text-left text-gray-800"><div className="w-10 h-10 border-4 border-t-[#046A38] rounded-full animate-spin"></div><p className="text-xs font-bold text-gray-400 mt-4 uppercase text-center tracking-widest leading-none">Memuat Panel Kendali...</p></div>;
  if (!isSuperUser) return <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white text-gray-800"><ShieldAlert size={64} className="text-red-500 mb-4" /><h2 className="text-2xl font-black text-gray-800">Akses Terbatas</h2></div>;

  const totalBiayaJasaMurni = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => acc + Math.round((cur.tarifPerjalananMurni) * (cur.biayaLayananPersen || 10) / 100), 0);
  const pendingVerifList = transaksiList.filter(t => t.statusTarik === 'menunggu');

  // --- RADAR LOGIC ---
  const activeTrips = pesananList.filter(p => (p.status === 'dalam_perjalanan' || p.status === 'sopir_ditemukan' || p.status === 'diproses') && p.daftarTujuan && p.daftarTujuan.length > 0);

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative font-sans text-left text-gray-800">
      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2"><Activity size={18} className="text-[#D4AF37]" /><h1 className="text-lg font-black tracking-wide uppercase leading-none text-white">Ololu Control Panel</h1></div>
          {pendingVerifList.length > 0 && <button onClick={() => setActiveTab('dompet')} className="bg-[#B8941F] text-white text-[8px] font-black px-3 py-1.5 rounded-full animate-bounce shadow-lg flex items-center space-x-1 font-mono tracking-tighter text-white"><Bell size={10} /><span>{pendingVerifList.length} ANTRIAN</span></button>}
        </div>
        <p className="text-[10px] text-emerald-100 uppercase font-bold tracking-widest opacity-80 mt-1">Administrator: {profile?.nama}</p>
      </div>

      <div className="flex bg-white border-b overflow-x-auto whitespace-nowrap scrollbar-none sticky top-0 z-30 shadow-sm text-gray-800">
        {[
          { id: 'stats', label: '📊 Statistik' },
          { id: 'sopir', label: '🛵 Rider' },
          { id: 'dompet', label: '💰 Dompet', badge: pendingVerifList.length },
          { id: 'penumpang', label: '👤 User' },
          { id: 'pesanan', label: '📋 Order' },
          { id: 'darurat', label: '🚨 Darurat', badge: emergencyList.filter(e=>e.status==='baru').length },
          { id: 'tarif', label: '⚙️ Tarif' },
          { id: 'laporan', label: '📥 Laporan' },
          { id: 'admins', label: '🔑 Tim' },
          { id: 'logs', label: '📜 Log' }
        ].map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-5 py-3 text-[11px] font-black transition-all border-b-2 relative ${activeTab === t.id ? 'border-[#046A38] text-[#046A38] bg-[#E6F4EC]' : 'border-transparent text-[#6B7280]'}`}>
            {t.label}
            {t.badge > 0 && <span className="absolute top-2 right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] flex items-center justify-center rounded-full border border-white font-bold text-white">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
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
               <div className="bg-emerald-50 p-2.5 rounded-xl flex items-center justify-center space-x-4 border border-emerald-100 text-gray-800">
                  <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div><span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-none">{sopirList.filter(s=>s.statusOnline).length} ONLINE</span></div>
                  <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div><span className="text-[10px] font-black text-blue-800 uppercase tracking-widest leading-none">{activeTrips.length} TRIP AKTIF</span></div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'sopir' && (
          <div className="space-y-4 text-gray-800 text-left">
             <div className="relative"><input type="text" placeholder="Cari Nama / Plat Rider..." value={searchDriverQuery} onChange={(e) => setSearchDriverQuery(e.target.value)} className="w-full p-4 pl-12 bg-white border rounded-2xl text-xs font-bold outline-none focus:border-[#046A38] shadow-sm text-gray-800" /><Search size={20} className="absolute left-4 top-3.5 text-gray-400" /></div>
             <div className="space-y-2">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest px-1">⏳ Antrian Verifikasi</h3>
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin && s.platNomor).map(s => (
                    <button key={s.id} onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }} className="w-full bg-white p-4 rounded-2xl border-2 border-amber-100 flex items-center justify-between shadow-sm hover:border-amber-400 transition-all text-left text-gray-800"><div className="flex items-center space-x-4"><div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 shadow-inner"><User size={24} /></div><div><p className="text-sm font-black text-gray-800 uppercase leading-none">{(s as any).nama}</p><p className="text-[10px] text-amber-600 font-bold mt-1 uppercase leading-none text-amber-600">Review Berkas</p></div></div><ChevronRight size={20} className="text-amber-300" /></button>
                ))}
             </div>
             <div className="space-y-2 pt-2"><h3 className="text-[10px] font-black text-[#046A38] uppercase tracking-widest px-1">✅ Mitra Aktif Ololu</h3>
                {sopirList.filter(s => s.disetujuiAdmin && ((s as any).nama?.toLowerCase().includes(searchDriverQuery.toLowerCase()) || s.platNomor?.toLowerCase().includes(searchDriverQuery.toLowerCase()))).map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs text-left text-gray-800">
                       <div className="flex items-center space-x-4 cursor-pointer" onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.statusOnline ? 'bg-emerald-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Bike size={20} /></div><div><p className="text-sm font-black text-gray-800 uppercase leading-none">{(s as any).nama}</p><p className="text-[10px] text-gray-500 font-bold mt-1 leading-none">{s.platNomor}</p></div></div>
                       <div className="text-right flex flex-col items-end space-y-1.5"><p className="text-xs font-black text-emerald-600">Rp {s.saldoDompet?.toLocaleString()}</p><button onClick={() => { setTopUpModalTargetId(s.id); setShowTopUpModal(true); }} className="bg-emerald-600 text-white text-[8px] font-black px-2 py-1 rounded shadow-sm uppercase tracking-widest leading-none text-white">Isi Saldo</button></div>
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* ORDER AUDIT TAB */}
        {activeTab === 'pesanan' && (
           <div className="space-y-3 animate-in fade-in duration-300 text-gray-800 text-left">
             <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest px-1">Riwayat & Logistik Order</h3>
             <div className="space-y-2.5">
               {pesananList.slice(0, 100).map(p => (
                <div key={p.id} className="bg-white p-4 rounded-2xl border flex items-center justify-between shadow-xs group hover:border-[#046A38] transition-all text-gray-800">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2"><p className="text-sm font-black tracking-tighter">#{p.nomorPesanan}</p><span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase text-white ${p.status === 'selesai' ? 'bg-emerald-500' : 'bg-amber-400'}`}>{p.status.replace('_',' ')}</span></div>
                    <p className="text-[10px] text-gray-500 font-black mt-0.5 uppercase tracking-tight text-gray-500">{p.jenisLayanan} • {p.namaPenumpang}</p>
                    <p className="text-[9px] text-gray-400 font-bold text-gray-400">{new Date(p.waktuDibuat).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right flex flex-col items-end space-y-1">
                    <p className="text-sm font-black text-[#046A38]">Rp {p.totalBayarAkhir?.toLocaleString('id-ID')}</p>
                    <div className="flex space-x-1.5">
                      <button onClick={() => setSelectedOrder(p)} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Detail Audit</button>
                      {p.status === 'selesai' && <button onClick={() => generateReceipt(p)} className="text-[9px] font-black text-emerald-600 uppercase hover:underline flex items-center space-x-1 text-emerald-600"><FileText size={12} /><span>Nota</span></button>}
                    </div>
                  </div>
                </div>
               ))}
             </div>
           </div>
        )}

        {/* TARIF SETTINGS - SYNC ALL 8 SERVICES */}
        {activeTab === 'tarif' && (
          <div className="space-y-6 animate-in fade-in duration-300 text-left text-gray-800">
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-start space-x-3 shadow-sm"><div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 shadow-inner"><LayoutGrid size={22} /></div><div><h3 className="text-sm font-black text-emerald-900 uppercase leading-none text-emerald-900">Pusat Kendali Layanan v3.3</h3><p className="text-[10px] text-emerald-700 mt-1 uppercase font-bold tracking-widest leading-none text-emerald-700">Tarif, Item, & Stop Control</p></div></div>
            <div className="space-y-8 pb-32">
               {[
                 { id: 'ojek', label: 'Ojek Motor (Ride)', icon: <Bike size={16}/>, color: 'text-emerald-600' },
                 { id: 'mobil', label: 'Ololu Car', icon: <Car size={16}/>, color: 'text-blue-600' },
                 { id: 'makanan', label: 'Food Antar', icon: <ShoppingBag size={16}/>, color: 'text-amber-600' },
                 { id: 'paket', label: 'Kirim Paket (Send)', icon: <Package size={16}/>, color: 'text-indigo-600' },
                 { id: 'belanja', label: 'Belanja (Shop)', icon: <ShoppingCart size={16}/>, color: 'text-rose-600' },
                 { id: 'cargo', label: 'Cargo (Big Logistics)', icon: <MapIcon size={16}/>, color: 'text-purple-600' },
                 { id: 'market', label: 'Market', icon: <Store size={16}/>, color: 'text-orange-600' },
                 { id: 'lainnya', label: 'Lainnya (Extra)', icon: <Plus size={16}/>, color: 'text-gray-600' },
               ].map(s => (
                 <div key={s.id} className="bg-white p-5 rounded-[32px] border border-gray-150 shadow-sm space-y-4 text-left text-gray-800">
                    <div className="flex justify-between items-center border-b pb-3 text-gray-800">
                       <div className={`flex items-center space-x-2 ${s.color} font-black uppercase text-[11px] tracking-widest`}>{s.icon}<span>{s.label}</span></div>
                       <div className="flex items-center space-x-2">
                          <span className={`text-[8px] font-black uppercase ${(tempConfig as any)[`layanan${s.id.charAt(0).toUpperCase()+s.id.slice(1)}Aktif`] ? s.color : 'text-gray-300'}`}>{(tempConfig as any)[`layanan${s.id.charAt(0).toUpperCase()+s.id.slice(1)}Aktif`] ? 'AKTIF' : 'OFF'}</span>
                          <input type="checkbox" checked={(tempConfig as any)[`layanan${s.id.charAt(0).toUpperCase()+s.id.slice(1)}Aktif`]} onChange={(e)=>setTempConfig({...tempConfig, [`layanan${s.id.charAt(0).toUpperCase()+s.id.slice(1)}Aktif`]: e.target.checked})} className="w-5 h-5 rounded text-[#046A38] text-gray-800" />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-gray-800">
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-1">Tarif Dasar (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifDasar`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifDasar`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800" /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-1">Per KM (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifPerKm`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifPerKm`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800" /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-1">Min. Tarif (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}TarifMinimum`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}TarifMinimum`]: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-black text-gray-800" /></div>
                       <div className="space-y-1"><label className="text-[8px] font-black text-emerald-600 uppercase ml-1">Mampir Stop (Rp)</label><input type="number" value={(tempConfig as any)[`${s.id}BiayaPerStop`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}BiayaPerStop`]: parseInt(e.target.value)})} className="w-full p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl outline-none text-xs font-black text-emerald-600" /></div>
                       <div className="space-y-1 col-span-2 pt-1"><label className="text-[8px] font-black text-blue-600 uppercase ml-1">Komisi Ololu (%)</label><input type="number" value={(tempConfig as any)[`${s.id}PersenJasa`]} onChange={(e)=>setTempConfig({...tempConfig, [`${s.id}PersenJasa`]: parseInt(e.target.value)})} className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-2xl outline-none text-xs font-black text-blue-600 shadow-inner" /></div>
                    </div>
                 </div>
               ))}
               <button onClick={saveConfigWithLog} className="w-full py-6 bg-[#046A38] text-white font-black rounded-[40px] text-sm tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all sticky bottom-6 z-40 border-b-8 border-emerald-900 shadow-emerald-900/40 text-white">💾 SIMPAN SELURUH PERUBAHAN</button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: DETAIL ORDER (AUDIT ITEMS/BELANJA) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 text-gray-800 text-left">
           <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <div className="bg-[#034F2A] text-white p-6 flex justify-between items-center shadow-lg text-white"><div><h3 className="text-base font-black uppercase tracking-widest text-white">Rincian Order Audit</h3><p className="text-[10px] text-emerald-200 mt-0.5 uppercase font-bold tracking-widest text-emerald-200"># {selectedOrder.nomorPesanan}</p></div><button onClick={() => setSelectedOrder(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-white/20"><X size={24} /></button></div>
              <div className="p-6 space-y-6 overflow-y-auto scrollbar-none flex-1">
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 space-y-3 shadow-inner">
                    <div className="flex justify-between items-center border-b pb-2"><span className="text-[10px] font-black text-gray-400 uppercase">Customer</span><p className="text-xs font-black text-gray-800 uppercase">{selectedOrder.namaPenumpang}</p></div>
                    <div className="flex justify-between items-center border-b pb-2"><span className="text-[10px] font-black text-gray-400 uppercase">Mitra Driver</span><p className="text-xs font-black text-emerald-700 uppercase">{selectedOrder.namaSopir || 'PENDING'}</p></div>
                    <div className="flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase">Total Bayar</span><p className="text-sm font-black text-[#B8941F]">Rp {selectedOrder.totalBayarAkhir.toLocaleString()}</p></div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center space-x-2"><ClipboardList size={14} /> <span>Daftar Pesanan & Belanja</span></h4>

                    {/* ITEMS AT ORIGIN */}
                    <div className="space-y-2">
                       <p className="text-[9px] font-black text-[#046A38] uppercase flex items-center space-x-1"><MapPin size={10}/><span>Titik Utama: {selectedOrder.asalAlamat}</span></p>
                       <div className="bg-[#FAFBF9] p-3 rounded-2xl border border-gray-100 divide-y divide-gray-100">
                          {(selectedOrder.itemsAwal || []).length === 0 ? <p className="text-[10px] italic text-gray-400 py-1">Tidak ada rincian item belanja.</p> :
                            selectedOrder.itemsAwal?.map(it => (
                              <div key={it.id} className="py-2 flex justify-between items-center"><span className="text-xs font-bold text-gray-700">{it.namaBarang}</span><span className="text-xs font-black text-emerald-600">x{it.jumlah}</span></div>
                            ))
                          }
                       </div>
                    </div>

                    {/* ITEMS AT STOPS */}
                    {selectedOrder.daftarTujuan.map((stop, sIdx) => (
                       <div key={stop.id} className="space-y-2 pt-2 border-t border-dashed">
                          <p className="text-[9px] font-black text-amber-600 uppercase flex items-center space-x-1"><MapPin size={10}/><span>Stop {sIdx+1}: {stop.alamat}</span></p>
                          <div className="bg-[#FAFBF9] p-3 rounded-2xl border border-gray-100 divide-y divide-gray-100 text-gray-800">
                             {(stop.daftarItem || []).length === 0 ? <p className="text-[10px] italic text-gray-400 py-1">Tidak ada rincian item belanja.</p> :
                               stop.daftarItem.map(it => (
                                 <div key={it.id} className="py-2 flex justify-between items-center"><span className="text-xs font-bold text-gray-700">{it.namaBarang}</span><span className="text-xs font-black text-[#B8941F]">x{it.jumlah}</span></div>
                               ))
                             }
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
              <div className="p-6 bg-gray-50 border-t flex space-x-3 shrink-0 text-center">
                 <button onClick={() => generateReceipt(selectedOrder)} className="flex-1 py-4 bg-emerald-600 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"><FileText size={16}/><span>Cetak Nota</span></button>
                 <button onClick={() => setSelectedOrder(null)} className="flex-1 py-4 bg-gray-900 text-white font-black rounded-3xl text-[11px] uppercase tracking-widest text-white active:scale-95 transition-all">Tutup</button>
              </div>
           </div>
        </div>
      )}

      {/* OTHER MODALS (Wallet, Proof, User) REMAINS SAME */}
      {showProofModal && (<div className="fixed inset-0 z-[2000] bg-black/95 flex flex-col items-center justify-center p-6 text-center text-white"><button onClick={()=>setShowProofModal(null)} className="absolute top-8 right-8 text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all text-white"><X size={28} /></button><div className="w-full max-w-sm aspect-[3/4] bg-white rounded-3xl overflow-hidden shadow-2xl ring-4 ring-white/10"><img src={showProofModal} className="w-full h-full object-contain" alt="Bukti Zoom" /></div><p className="text-white text-xs font-black mt-6 uppercase tracking-[0.4em] opacity-80 text-white text-center">DOKUMEN RESMI</p></div>)}
      {showTopUpModal && (<div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-center justify-center p-6 text-center text-gray-800"><div className="bg-white w-full max-w-xs rounded-[40px] p-8 space-y-6 shadow-2xl"><div className="space-y-2"><div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner text-emerald-600"><DollarSign size={40} className="text-emerald-600" /></div><h3 className="font-black text-base uppercase">Isi Saldo Mitra</h3></div><input type="number" value={topUpAmount} onChange={(e)=>setTopUpAmount(e.target.value)} placeholder="Nominal Rp..." className="w-full p-5 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-3xl outline-none text-center text-2xl font-black text-emerald-700 shadow-inner" /><div className="flex space-x-3"><button onClick={()=>setShowTopUpModal(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 font-black rounded-2xl text-[11px] uppercase tracking-widest text-gray-500">Batal</button><button onClick={handleAdminTopUp} className="flex-2 py-4 bg-emerald-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all text-white">ISI SALDO</button></div></div></div>)}

      {selectedUserDetail && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-left text-gray-800">
           <div className="bg-white w-full max-w-xs rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="bg-blue-600 text-white p-6 flex justify-between items-center shadow-lg text-white"><div><h3 className="text-base font-black uppercase tracking-widest leading-none text-white">Detail Penumpang</h3><p className="text-[10px] opacity-70 mt-1 uppercase font-bold tracking-widest text-white text-center">User Management</p></div><button onClick={() => setSelectedUserDetail(null)} className="p-2.5 bg-white/10 rounded-full text-white"><X size={20} /></button></div>
              <div className="p-8 space-y-8">
                 <div className="text-center space-y-3 text-gray-800"><div className="w-20 h-20 bg-blue-50 rounded-[28px] flex items-center justify-center text-blue-600 mx-auto border-4 border-white shadow-xl shadow-blue-900/10"><User size={40} /></div><div><p className="text-xl font-black text-gray-800 leading-none">{selectedUserDetail.nama}</p><p className="text-sm font-bold text-blue-600 mt-1.5">{selectedUserDetail.nomorHp}</p></div></div>
                 <div className="bg-gray-50 p-5 rounded-3xl border border-gray-150 divide-y divide-gray-200 shadow-inner text-gray-800"><div className="py-2.5 flex justify-between items-center text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bergabung</span><span className="text-[10px] font-black text-gray-700">{new Date(selectedUserDetail.created_at || selectedUserDetail.tanggalDaftar).toLocaleDateString('id-ID')}</span></div><div className="py-2.5 flex justify-between items-center text-gray-800"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status Akun</span><span className={`text-[9px] font-black px-2.5 py-1 rounded-lg shadow-xs ${selectedUserDetail.isSuspended ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>{selectedUserDetail.isSuspended ? 'TERBLOKIR' : 'AKTIF'}</span></div></div>
                 <button disabled={isProcessingAction} onClick={() => handleToggleSuspend(selectedUserDetail)} className={`w-full py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all text-white ${selectedUserDetail.isSuspended ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>{isProcessingAction ? 'MEMPROSES...' : (selectedUserDetail.isSuspended ? 'BUKA BLOKIR AKUN' : 'SUSPEND / BLOKIR AKUN')}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
