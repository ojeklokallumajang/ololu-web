/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { OloluStore, KOORDINAT_LUMAJANG, DEFAULT_PENGATURAN_TARIF } from '../services/store';
import { ololuRealtime } from '../services/supabaseClient';
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
  KeyRound
} from 'lucide-react';
import { downloadFinancialReport } from '../utils/excelExport';
import { generateReceipt } from '../utils/receiptGenerator';

export default function AdminView() {
  const [profile, setProfile] = useState<ProfilPengguna | null>(null);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'sopir' | 'penumpang' | 'pesanan' | 'dompet' | 'tarif' | 'darurat' | 'rating' | 'admins' | 'logs' | 'laporan'>('stats');
  
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

  const [showPanicOverlay, setShowPanicOverlay] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<LaporanDarurat | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [loading, setLoading] = useState(true);

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
      setSopirList(current => current.map(s => ({ ...s, statusOnline: !!state[s.id] })));
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
    await OloluStore.addAuditLog(profile.id, profile.nama, "Update Tarif", "Memperbarui seluruh konfigurasi sistem satu halaman.");
    alert("🚀 SEMUA PENGATURAN BERHASIL DISIMPAN!");
  };

  const handleVerifySopir = async (id: string, ok: boolean) => {
    if (!ok && !alasanTolakSopir) { alert("Masukkan alasan penolakan!"); return; }
    const res = await OloluStore.verifikasiSopir(id, ok, ok ? '' : alasanTolakSopir);
    if (res.success) {
      alert(ok ? "Mitra BERHASIL DISETUJUI! 🎉" : "Mitra DITOLAK.");
      setShowSopirModal(false); setSelectedSopir(null); setAlasanTolakSopir('');
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminPhone || !newAdminName) { alert("Lengkapi data."); return; }
    const res = await OloluStore.promoteToAdmin(newAdminPhone, newAdminName);
    if (res.success) { alert("Admin ditambahkan."); setNewAdminPhone(''); setNewAdminName(''); }
  };

  const handleRemoveAdmin = async (id: string) => {
    if (confirm("Cabut hak akses?")) await OloluStore.removeAdminStatus(id);
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
    await OloluStore.prosesTransaksi(id, status, alasan);
    alert(status === 'disetujui' ? "Berhasil disetujui!" : "Berhasil ditolak.");
  };

  const handleAdminTopUp = async () => {
    if (!topUpTargetId || !topUpAmount) return;
    const res = await OloluStore.topUpSopir(topUpTargetId, parseInt(topUpAmount), "Isi saldo oleh Admin");
    if (res.success) { alert("Saldo diisi!"); setShowTopUpModal(false); setTopUpAmount(''); }
  };

  if (loading && pesananList.length === 0) return <div className="flex flex-col items-center justify-center min-h-screen text-left"><div className="w-10 h-10 border-4 border-t-[#046A38] rounded-full animate-spin"></div><p className="text-xs font-bold text-gray-400 mt-4 uppercase">Memuat Admin...</p></div>;
  if (!isSuperUser) return <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center"><ShieldAlert size={64} className="text-red-500 mb-4" /><h2 className="text-2xl font-black">Akses Ditolak</h2></div>;

  const totalBiayaJasaMurni = pesananList.filter(p => p.status === 'selesai').reduce((acc, cur) => acc + Math.round((cur.tarifPerjalananMurni) * (cur.biayaLayananPersen || 10) / 100), 0);
  const pendingVerifList = transaksiList.filter(t => t.statusTarik === 'menunggu');

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative font-sans">
      <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] relative overflow-hidden text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2"><Activity size={18} className="text-[#D4AF37]" /><h1 className="text-lg font-black tracking-wide uppercase leading-none">Ololu Control Panel</h1></div>
          {pendingVerifList.length > 0 && <button onClick={() => setActiveTab('dompet')} className="bg-[#B8941F] text-white text-[8px] font-black px-3 py-1.5 rounded-full animate-bounce shadow-lg flex items-center space-x-1"><Bell size={10} /><span>{pendingVerifList.length} ANTRIAN</span></button>}
        </div>
        <p className="text-[10px] text-emerald-100 uppercase font-bold tracking-widest opacity-80 mt-1">Administrator: {profile?.nama}</p>
      </div>

      <div className="flex bg-white border-b overflow-x-auto whitespace-nowrap scrollbar-none sticky top-0 z-30 shadow-sm">
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
            {t.badge > 0 && <span className="absolute top-2 right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[7px] flex items-center justify-center rounded-full border border-white">{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 text-left">
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 gap-2.5">
             <div className="bg-white p-4 rounded-2xl border-l-4 border-[#046A38] shadow-sm"><span className="text-[9px] font-bold text-gray-400 uppercase">Selesai</span><p className="text-xl font-black text-gray-800">{pesananList.filter(p=>p.status==='selesai').length}</p></div>
             <div className="bg-white p-4 rounded-2xl border-l-4 border-[#D4AF37] shadow-sm"><span className="text-[9px] font-bold text-gray-400 uppercase">Kas Ololu</span><p className="text-xl font-black text-[#B8941F]">Rp {totalBiayaJasaMurni.toLocaleString()}</p></div>
          </div>
        )}

        {activeTab === 'sopir' && (
          <div className="space-y-4">
             <div className="relative"><input type="text" placeholder="Cari Nama / Plat Rider..." value={searchDriverQuery} onChange={(e) => setSearchDriverQuery(e.target.value)} className="w-full p-3 pl-10 bg-white border rounded-2xl text-xs font-bold outline-none focus:border-[#046A38] transition-all shadow-sm" /><Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" /></div>
             <div className="space-y-2">
                <div className="flex justify-between items-center px-1"><h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">⏳ Menunggu Verifikasi</h3><button onClick={syncData} className="p-1 text-gray-400 hover:text-amber-600 transition-all"><Radio size={12} className={loading ? 'animate-spin' : ''} /></button></div>
                {sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin && s.platNomor).length === 0 ? <p className="text-[10px] italic text-gray-400 bg-white p-4 rounded-xl border border-dashed text-center">Tidak ada antrian pendaftaran lengkap.</p> :
                  sopirList.filter(s => !s.disetujuiAdmin && !s.ditolakAdmin && s.platNomor).map(s => (
                    <button key={s.id} onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }} className="w-full bg-white p-3 rounded-xl border-2 border-amber-100 flex items-center justify-between shadow-sm hover:border-amber-400 transition-all text-left"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600"><User size={20} /></div><div><p className="text-xs font-black text-gray-800 uppercase">{(s as any).nama || 'RIDER BARU'}</p><p className="text-[9px] text-amber-600 font-bold">Review Berkas {s.platNomor}</p></div></div><ChevronRight size={16} className="text-amber-300" /></button>
                  ))
                }
             </div>
             <div className="space-y-2 pt-2"><h3 className="text-[10px] font-black text-[#046A38] uppercase tracking-widest px-1">✅ Mitra Aktif Ololu</h3>
                {sopirList.filter(s => s.disetujuiAdmin && ((s as any).nama?.toLowerCase().includes(searchDriverQuery.toLowerCase()) || s.platNomor?.toLowerCase().includes(searchDriverQuery.toLowerCase()))).map(s => (
                    <div key={s.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs"><div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setSelectedSopir(s); setShowSopirModal(true); }}><div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 text-[#046A38]"><Bike size={16} /></div><div><div className="flex items-center space-x-1"><p className="text-xs font-black text-gray-800 uppercase">{(s as any).nama}</p></div><p className="text-[9px] text-gray-500">{s.platNomor} • {s.jenisMotor}</p></div></div><div className="text-right flex flex-col items-end space-y-1"><p className="text-[10px] font-black text-emerald-600">Rp {s.saldoDompet?.toLocaleString()}</p><div className="flex space-x-1"><button onClick={() => { setTopUpModalTargetId(s.id); setShowTopUpModal(true); }} className="bg-emerald-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded">ISI SALDO</button><span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.statusOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{s.statusOnline ? 'ONLINE' : 'OFFLINE'}</span></div></div></div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'dompet' && (
          <div className="space-y-4">
             <div className="flex bg-white p-1 rounded-xl border gap-1"><button onClick={()=>setActiveDompetTab('pending')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${activeDompetTab==='pending' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>PENGAJUAN TARIK/TOPUP</button><button onClick={()=>setActiveDompetTab('history')} className={`flex-1 py-2 text-[10px] font-black rounded-lg ${activeDompetTab==='history' ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>SEMUA RIWAYAT</button></div>
             {activeDompetTab === 'pending' ? (
                <div className="space-y-3">{transaksiList.filter(t => t.statusTarik === 'menunggu').map(t => (
                  <div key={t.id} className={`bg-white p-4 rounded-2xl border-2 shadow-md space-y-3 ${t.jenis === 'topup' ? 'border-emerald-500' : 'border-[#D4AF37]'}`}><div className="flex justify-between items-start"><div><p className="text-xs font-black text-gray-800 uppercase">{(t as any).namaSopir}</p><p className="text-[9px] text-gray-500">{new Date(t.timestamp).toLocaleString()}</p></div><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.jenis === 'topup' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-[#B8941F]'}`}>{t.jenis.toUpperCase()}</span></div><div className="bg-gray-50 p-3 rounded-xl border text-center relative overflow-hidden">{t.jenis === 'topup' && t.buktiTransfer && <button onClick={() => setShowProofModal(t.buktiTransfer || null)} className="absolute right-2 top-2 bg-emerald-600 text-white p-1.5 rounded-lg"><Eye size={12} /></button>}<span className="text-[9px] font-bold text-gray-400 uppercase block">Nominal:</span><p className={`text-xl font-black ${t.jenis === 'topup' ? 'text-emerald-600' : 'text-[#B8941F]'}`}>Rp {t.jumlah?.toLocaleString()}</p></div><div className="flex space-x-2"><button onClick={()=>handleProsesTx(t.id, 'ditolak')} className="flex-1 py-2.5 bg-white text-red-600 border border-red-100 font-black rounded-xl text-[9px] uppercase">TOLAK</button><button onClick={()=>handleProsesTx(t.id, 'disetujui')} className={`flex-[2] py-2.5 text-white font-black rounded-xl text-[9px] uppercase shadow-md ${t.jenis === 'topup' ? 'bg-emerald-600' : 'bg-[#046A38]'}`}>ACC & PROSES</button></div></div>
                ))}</div>
             ) : (
                <div className="space-y-2">{transaksiList.map(t => (
                  <div key={t.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs"><div><p className="text-[10px] font-black text-gray-800 leading-tight">{t.deskripsi}</p><p className="text-[8px] text-gray-400">{(t as any).namaSopir} • {new Date(t.timestamp).toLocaleDateString()}</p></div><div className="text-right"><p className={`text-[10px] font-black ${t.jenis==='pendapatan'||t.jenis==='topup' ? 'text-green-600':'text-red-500'}`}>{t.jenis==='pendapatan'||t.jenis==='topup'?'+':'-'} Rp {t.jumlah?.toLocaleString()}</p></div></div>
                ))}</div>
             )}
          </div>
        )}

        {activeTab === 'pesanan' && (
           <div className="space-y-2"><h3 className="text-xs font-black text-gray-700 uppercase mb-3 px-1">Audit Order Masuk</h3>
             {pesananList.map(p => (
                <div key={p.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs group"><div><div className="flex items-center space-x-1.5"><p className="text-xs font-black text-gray-800">#{p.nomorPesanan}</p><span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase ${p.status === 'selesai' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span></div><p className="text-[9px] text-gray-500 font-bold mt-0.5">{p.jenisLayanan?.toUpperCase()} • {p.namaPenumpang}</p></div><div className="text-right"><p className="text-[11px] font-black text-[#046A38]">Rp {p.totalBayarAkhir?.toLocaleString('id-ID')}</p><div className="flex flex-col items-end space-y-1 mt-1"><button onClick={() => setSelectedOrder(p)} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Detail</button>{p.status === 'selesai' && <button onClick={() => generateReceipt(p)} className="text-[8px] font-black text-emerald-600 uppercase hover:underline flex items-center space-x-1"><FileText size={10} /><span>Cetak Nota</span></button>}</div></div></div>
             ))}
           </div>
        )}

        {activeTab === 'tarif' && (
          <div className="space-y-6">
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-2"><div className="flex items-center space-x-2"><Settings size={18} className="text-amber-600" /><h3 className="text-xs font-black text-amber-800 uppercase tracking-tight">Pusat Pengaturan Tarif & Sistem</h3></div><p className="text-[10px] text-amber-700 mt-1">Kontrol seluruh parameter bisnis dalam satu halaman.</p></div>
            <div className="space-y-8 pb-24">
               {/* RIDE */}
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4"><h3 className="text-xs font-black text-emerald-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2"><Bike size={16} /> <span>Ololu-Ride (Motor)</span></h3><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Tarif Dasar</label><input type="number" value={tempConfig.ojekTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifDasar: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Per KM</label><input type="number" value={tempConfig.ojekTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifPerKm: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Min. Tarif</label><input type="number" value={tempConfig.ojekTarifMinimum} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifMinimum: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Potongan (%)</label><input type="number" value={tempConfig.ojekPersenJasa} onChange={(e)=>setTempConfig({...tempConfig, ojekPersenJasa: parseInt(e.target.value)})} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-2xl outline-none text-sm font-black text-emerald-700" /></div></div><div className="flex items-center justify-between bg-emerald-50 p-3 rounded-2xl border border-emerald-100"><span className="text-[10px] font-bold text-emerald-800 uppercase">Aktifkan Ride</span><input type="checkbox" checked={tempConfig.layananOjekAktif} onChange={(e)=>setTempConfig({...tempConfig, layananOjekAktif: e.target.checked})} className="w-5 h-5 rounded text-[#046A38]" /></div></div>
               {/* CAR */}
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4"><h3 className="text-xs font-black text-blue-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2"><Car size={16} /> <span>Ololu-Car (Mobil)</span></h3><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Tarif Dasar</label><input type="number" value={tempConfig.mobilTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, mobilTarifDasar: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Per KM</label><input type="number" value={tempConfig.mobilTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, mobilTarifPerKm: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Potongan (%)</label><input type="number" value={tempConfig.mobilPersenJasa} onChange={(e)=>setTempConfig({...tempConfig, mobilPersenJasa: parseInt(e.target.value)})} className="w-full p-3 bg-blue-50 border border-blue-100 rounded-2xl outline-none text-sm font-black text-blue-700" /></div><div className="flex flex-col justify-end"><div className="flex items-center justify-between bg-blue-50 p-3 rounded-2xl border border-blue-100"><span className="text-[10px] font-bold text-blue-800 uppercase">Aktif</span><input type="checkbox" checked={tempConfig.layananMobilAktif} onChange={(e)=>setTempConfig({...tempConfig, layananMobilAktif: e.target.checked})} className="w-5 h-5 rounded text-blue-600" /></div></div></div></div>
               {/* FOOD */}
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4"><h3 className="text-xs font-black text-amber-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2"><ShoppingBag size={16} /> <span>Makanan & Belanja</span></h3><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Tarif Dasar</label><input type="number" value={tempConfig.makananTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, makananTarifDasar: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Per KM</label><input type="number" value={tempConfig.makananTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, makananTarifPerKm: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Potongan (%)</label><input type="number" value={tempConfig.makananPersenJasa} onChange={(e)=>setTempConfig({...tempConfig, makananPersenJasa: parseInt(e.target.value)})} className="w-full p-3 bg-amber-50 border border-amber-100 rounded-2xl outline-none text-sm font-black text-amber-700" /></div><div className="flex flex-col justify-end"><div className="flex items-center justify-between bg-amber-50 p-3 rounded-2xl border border-amber-100"><span className="text-[10px] font-bold text-amber-800 uppercase">Aktif</span><input type="checkbox" checked={tempConfig.layananMakananAktif} onChange={(e)=>setTempConfig({...tempConfig, layananMakananAktif: e.target.checked})} className="w-5 h-5 rounded text-amber-600" /></div></div></div></div>
               {/* OTHERS */}
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4"><h3 className="text-xs font-black text-slate-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2"><DollarSign size={16} /> <span>Biaya Parkir & Tambahan</span></h3><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Parkir Biasa</label><input type="number" value={tempConfig.biayaParkirBiasa} onChange={(e)=>setTempConfig({...tempConfig, biayaParkirBiasa: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Parkir Pasar</label><input type="number" value={tempConfig.biayaParkirPasar} onChange={(e)=>setTempConfig({...tempConfig, biayaParkirPasar: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div><div className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">Stop Ke-2 dst</label><input type="number" value={tempConfig.biayaPerStopTambahan} onChange={(e)=>setTempConfig({...tempConfig, biayaPerStopTambahan: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div></div></div>
               {/* SYSTEM */}
               <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-5">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest border-b pb-2 flex items-center space-x-2"><Settings size={16} /> <span>API & Sistem</span></h3>
                  <div className="bg-slate-900 text-white p-4 rounded-3xl space-y-3 mt-2 w-full"><div className="flex justify-between items-center"><span className="text-[8px] font-black text-slate-400 uppercase">Google API Usage</span><span className="text-[8px] font-black bg-emerald-600 px-2 py-0.5 rounded text-white">{config.googleApiUsageCount} / {tempConfig.googleApiLimit}</span></div><div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (config.googleApiUsageCount / config.googleApiLimit) * 100)}%` }}></div></div></div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Limit API</label><input type="number" value={tempConfig.googleApiLimit} onChange={(e)=>setTempConfig({...tempConfig, googleApiLimit: parseInt(e.target.value)})} className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-black text-[#046A38]" /></div><div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase">Radius Cari (KM)</label><input type="number" value={tempConfig.radiusPencarianSopirKm} onChange={(e)=>setTempConfig({...tempConfig, radiusPencarianSopirKm: parseInt(e.target.value)})} className="w-full p-3.5 bg-gray-50 border rounded-2xl outline-none text-sm font-black" /></div></div>
                  <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex items-start space-x-3"><Info size={20} className="text-blue-600 shrink-0 mt-0.5" /><p className="text-[9px] text-blue-800 leading-relaxed font-medium">Pencarian dikunci untuk <b>Lumajang</b>.</p></div>

                  {/* SUPER USER ONLY: API KEYS */}
                  {isSuperUser && (
                    <div className="space-y-4 pt-6 border-t-2 border-red-100 mt-4">
                       <div className="flex items-center space-x-2 text-red-600"><Shield size={16} /><h3 className="text-[10px] font-black uppercase tracking-widest">Kunci API (Sensitif)</h3></div>
                       <div className="space-y-3">
                          <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-1">Fonnte WA Token</label><input type="password" value={tempConfig.fonnteToken} onChange={(e)=>setTempConfig({...tempConfig, fonnteToken: e.target.value})} className="w-full p-3 bg-red-50/30 border-2 border-dashed border-red-100 rounded-2xl outline-none text-xs font-mono" /></div>
                          <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase ml-1">Google Maps Key</label><input type="password" value={tempConfig.googleMapsKey} onChange={(e)=>setTempConfig({...tempConfig, googleMapsKey: e.target.value})} className="w-full p-3 bg-red-50/30 border-2 border-dashed border-red-100 rounded-2xl outline-none text-xs font-mono" /></div>
                       </div>
                    </div>
                  )}
               </div>
               <button onClick={saveConfigWithLog} className="w-full py-5 bg-[#046A38] text-white font-black rounded-[32px] text-[12px] tracking-[0.3em] uppercase shadow-2xl active:scale-95 transition-all sticky bottom-6 z-40 border-b-4 border-emerald-900">💾 SIMPAN SEMUA PERUBAHAN</button>
            </div>
          </div>
        )}

        {activeTab === 'admins' && (
           <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                <h3 className="text-xs font-black text-[#046A38] uppercase tracking-widest border-b pb-2 flex items-center space-x-2">
                  <ShieldCheck size={16} /> <span>Tambah Tim Admin Baru</span>
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Nama Lengkap Tim</label>
                    <input type="text" placeholder="Masukkan nama..." value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-bold focus:border-[#046A38] transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-gray-400 uppercase ml-1">Nomor WhatsApp (628...)</label>
                    <input type="tel" placeholder="cth: 62851..." value={newAdminPhone} onChange={(e) => setNewAdminPhone(e.target.value)} className="w-full p-3 bg-gray-50 border rounded-2xl outline-none text-xs font-bold focus:border-[#046A38] transition-all" />
                  </div>
                  <button onClick={handleAddAdmin} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-[10px] tracking-widest uppercase shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">AKTIFKAN AKSES ADMIN</button>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Daftar Tim Aktif</h3>
                {adminList.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-[10px] italic bg-white rounded-3xl border border-dashed">Belum ada admin tambahan.</div>
                ) : (
                  adminList.map(adm => (
                    <div key={adm.id} className="bg-white p-4 rounded-[24px] border border-gray-150 flex items-center justify-between shadow-xs group transition-all hover:border-[#046A38]">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38] group-hover:bg-emerald-600 group-hover:text-white transition-all"><ShieldCheck size={20} /></div>
                        <div>
                          <p className="text-xs font-black text-gray-800 uppercase tracking-tight">{adm.nama}</p>
                          <p className="text-[9px] text-gray-500 font-medium">{adm.nomorHp} {adm.nomorHp === '6285156766317' ? <span className="text-amber-600 font-bold ml-1">(SUPERUSER)</span> : <span className="text-emerald-600 font-bold ml-1">(SUB-ADMIN)</span>}</p>
                        </div>
                      </div>
                      {adm.nomorHp !== '6285156766317' && (
                        <button onClick={() => handleRemoveAdmin(adm.id)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hapus Akses">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
           </div>
        )}

        {activeTab === 'laporan' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[32px] border border-gray-150 shadow-sm space-y-5">
              <div className="flex items-center space-x-3 border-b pb-4">
                <div className="bg-emerald-50 p-2.5 rounded-2xl text-[#046A38] shadow-inner"><Calendar size={22} /></div>
                <div>
                  <h3 className="text-sm font-black text-gray-800 uppercase leading-none">Pusat Laporan Keuangan</h3>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-widest">Excel Export Manager</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Laporan Operasional Cepat</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => downloadFinancialReport(`Laporan_Harian_${new Date().toISOString().split('T')[0]}`, pesananList, sopirList, profilList, transaksiList)} className="flex items-center justify-center space-x-2 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all"><Download size={14} /><span>Hari Ini</span></button>
                    <button onClick={() => { const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); const start = new Date(yesterday.setHours(0,0,0,0)); const end = new Date(yesterday.setHours(23,59,59,999)); downloadFinancialReport(`Laporan_Kemarin_${start.toISOString().split('T')[0]}`, pesananList, sopirList, profilList, transaksiList, start, end); }} className="flex items-center justify-center space-x-2 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all"><Download size={14} /><span>Kemarin</span></button>
                  </div>
                </div>

                <button onClick={() => { const now = new Date(); const start = new Date(now.setDate(now.getDate() - now.getDay())); start.setHours(0,0,0,0); const end = new Date(); downloadFinancialReport(`Laporan_Mingguan_sd_${end.toISOString().split('T')[0]}`, pesananList, sopirList, profilList, transaksiList, start, end); }} className="w-full flex items-center justify-center space-x-2 py-4 border-2 border-emerald-600 text-emerald-700 rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all"><FileSpreadsheet size={18} /><span>Unduh Rekap Minggu Ini</span></button>

                <div className="space-y-3 pt-2">
                  <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Arsip Bulanan (3 Bulan Terakhir)</h4>
                  <div className="space-y-2">
                    {[0, 1, 2].map(offset => {
                      const d = new Date(); d.setMonth(d.getMonth() - offset);
                      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                      const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
                      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                      return (
                        <button key={yearMonth} onClick={() => downloadFinancialReport(`Laporan_Bulanan_${yearMonth}`, pesananList, sopirList, profilList, transaksiList, start, end)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50 border border-gray-100 rounded-2xl group transition-all">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-[#B8941F] group-hover:text-[#046A38] transition-colors"><Calendar size={18} /></div>
                            <span className="text-xs font-black text-gray-700 group-hover:text-[#046A38] uppercase transition-colors">{label}</span>
                          </div>
                          <Download size={18} className="text-gray-300 group-hover:text-[#046A38] transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-3xl border border-amber-100 flex items-start space-x-3 shadow-sm">
              <Shield size={22} className="text-[#B8941F] shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                <strong>Legalitas Data:</strong> Laporan ini adalah dokumen resmi yang ditarik langsung dari database transaksi Ololu. Gunakan data ini untuk pembukuan bulanan PT Ololu Nusantara Lumajang.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
           <div className="space-y-3">
             <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">📜 Log Audit Sistem</h3>
                <button onClick={syncData} className="p-1 text-gray-400 hover:text-[#046A38]"><Radio size={14} className={loading ? 'animate-spin' : ''} /></button>
             </div>
             {auditLogs.length === 0 ? (
               <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                  <p className="text-xs italic text-gray-400">Belum ada log tercatat hari ini.</p>
               </div>
             ) : (
               <div className="space-y-2">
                 {auditLogs.map(l => (
                   <div key={l.id} className="bg-white p-4 rounded-2xl border border-gray-150 space-y-1.5 shadow-xs hover:border-[#046A38] transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black text-[#046A38] uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full">{l.aksi}</span>
                        <p className="text-[8px] text-gray-400 font-mono">{new Date(l.timestamp).toLocaleString('id-ID')}</p>
                      </div>
                      <p className="text-[10px] text-gray-600 leading-relaxed font-medium">{l.detail}</p>
                      <div className="flex items-center space-x-1 pt-1 opacity-50">
                        <User size={10} className="text-gray-400" />
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Oleh: {l.adminNama}</p>
                      </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        )}
      </div>

      {showSopirModal && selectedSopir && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"><div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] text-left"><div className="bg-[#034F2A] text-white p-5 flex justify-between items-center"><div><h3 className="text-sm font-black uppercase tracking-widest">Detail Mitra Driver</h3></div><button onClick={() => setShowSopirModal(false)} className="p-2"><XCircle size={20} /></button></div><div className="p-5 space-y-5 overflow-y-auto scrollbar-none"><div className="bg-gray-50 p-4 rounded-2xl border"><p className="text-base font-black text-gray-800">{(selectedSopir as any).nama}</p><p className="text-xs font-bold text-[#046A38]">{(selectedSopir as any).nomorHp}</p></div><div className="space-y-3"><h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b pb-1">Lampiran Dokumen</h4><div className="grid grid-cols-2 gap-2">{[{ label: 'KTP', url: selectedSopir.fotoKtp }, { label: 'SIM', url: selectedSopir.fotoSim }, { latel: 'STNK', url: selectedSopir.fotoStnk }, { label: 'KENDARAAN', url: selectedSopir.fotoKendaraan }].map(doc => (<div key={doc.label} className="space-y-1"><span className="text-[8px] font-bold text-gray-500 uppercase">{doc.label}</span><div className="h-24 bg-gray-100 rounded-xl border overflow-hidden relative group">{doc.url ? <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] italic text-gray-400">Kosong</div>}{doc.url && <a href={doc.url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[8px] font-bold uppercase">Buka Foto</a>}</div></div>))}</div></div></div><div className="p-5 bg-gray-50 border-t flex space-x-3">{!selectedSopir.disetujuiAdmin ? <><button onClick={() => handleVerifySopir(selectedSopir.id, false)} className="flex-1 py-3.5 bg-white text-red-600 border-2 border-red-100 font-black rounded-2xl text-[10px] uppercase">TOLAK</button><button onClick={() => handleVerifySopir(selectedSopir.id, true)} className="flex-[2] py-3.5 bg-[#046A38] text-white font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-emerald-200">SETUJUI</button></> : <button onClick={() => setShowSopirModal(false)} className="w-full py-3.5 bg-gray-800 text-white font-black rounded-2xl text-[10px] uppercase">TUTUP</button>}</div></div></div>
      )}

      {showPanicOverlay && activeEmergency && (
        <div className="fixed inset-0 z-[1000] bg-red-600/90 backdrop-blur-md flex items-center justify-center p-6 animate-pulse"><div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-8 space-y-6 text-center"><div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto border-4 border-red-100"><AlertTriangle size={64} className="text-red-600 animate-bounce" /></div><div className="space-y-1"><h2 className="text-2xl font-black text-red-600 uppercase tracking-tighter">DARURAT!</h2><p className="text-xs text-gray-500 font-bold uppercase">{activeEmergency.namaPelapor}</p></div><button onClick={() => { stopSiren(); setShowPanicOverlay(false); setActiveTab('darurat'); }} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg">SAYA TANGANI</button></div></div>
      )}
    </div>
  );
}
