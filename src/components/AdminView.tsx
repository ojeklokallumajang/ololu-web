/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OloluStore, KOORDINAT_LUMAJANG, DEFAULT_PENGATURAN_TARIF } from '../services/store';
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
  ArrowRight
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
  const [ratingList, setRatingList] = useState<RatingUlasan[]>([]);
  const [config, setConfig] = useState<PengaturanTarif>(DEFAULT_PENGATURAN_TARIF);
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
  const [tempConfig, setTempConfig] = useState<PengaturanTarif>(DEFAULT_PENGATURAN_TARIF);

  // EMERGENCIES AUDIO ALARM SYSTEM
  const [hasNewEmergency, setHasNewEmergency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAdmin() {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);
      setIsSuperUser(p?.nomorHp === '6285156766317');
    }
    initAdmin();

    const syncData = async () => {
      const [orders, sopir, users, settings, logs, admins] = await Promise.all([
        OloluStore.getAllPesanan(),
        OloluStore.getAllSopir(),
        OloluStore.getAllUsers(),
        OloluStore.getPengaturan(),
        OloluStore.getAllAuditLogs(),
        OloluStore.getAllAdmins()
      ]);

      setPesananList(orders);
      setSopirList(sopir);
      setProfilList(users);
      setConfig(settings);
      setTempConfig(settings);
      setAuditLogs(logs);
      setAdminList(admins);
      setLoading(false);
    };

    syncData();
    const unsubscribe = OloluStore.subscribeToStore(syncData);
    return () => unsubscribe();
  }, []);

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
    await OloluStore.savePengaturan(tempConfig, profile!.id, profile!.nama);
    alert("Pengaturan berhasil disimpan.");
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
          { id: 'penumpang', label: '👤 User' },
          { id: 'pesanan', label: '📋 Order' },
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
          <div className="space-y-3">
             <h3 className="text-xs font-black text-gray-700 uppercase">Daftar Mitra Aktif</h3>
             {sopirList.length === 0 ? <p className="text-xs italic text-gray-400 text-center py-10">Belum ada mitra terdaftar.</p> :
               sopirList.map(s => (
                 <div key={s.id} className="bg-white p-3 rounded-xl border flex items-center justify-between shadow-xs">
                    <div>
                      <p className="text-xs font-black text-gray-800">{s.platNomor || 'RIDER BARU'}</p>
                      <p className="text-[10px] text-gray-500 uppercase">{s.jenisMotor}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-black text-emerald-600">Rp {s.saldoDompet?.toLocaleString()}</p>
                       <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${s.statusOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                         {s.statusOnline ? 'ONLINE' : 'OFFLINE'}
                       </span>
                    </div>
                 </div>
               ))
             }
          </div>
        )}

        {activeTab === 'penumpang' && (
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

        {activeTab === 'tarif' && (
          <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-5">
            <h3 className="text-xs font-black text-[#046A38] uppercase">Pendaftaran & Layanan</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Daftar Motor</span>
                <input type="checkbox" checked={tempConfig.daftarMotorAktif} onChange={(e)=>setTempConfig({...tempConfig, daftarMotorAktif: e.target.checked})} className="w-4 h-4 rounded text-[#046A38]" />
              </div>
              <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Daftar Mobil</span>
                <input type="checkbox" checked={tempConfig.daftarMobilAktif} onChange={(e)=>setTempConfig({...tempConfig, daftarMobilAktif: e.target.checked})} className="w-4 h-4 rounded text-[#046A38]" />
              </div>
            </div>

            <h3 className="text-xs font-black text-[#046A38] uppercase pt-2">Edit Tarif Layanan</h3>
            <div className="space-y-3">
               <div>
                 <label className="text-[9px] font-bold text-gray-400 uppercase">Tarif Dasar (Rp)</label>
                 <input type="number" value={tempConfig.ojekTarifDasar} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifDasar: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-sm font-black" />
               </div>
               <div>
                 <label className="text-[9px] font-bold text-gray-400 uppercase">Tarif Per KM (Rp)</label>
                 <input type="number" value={tempConfig.ojekTarifPerKm} onChange={(e)=>setTempConfig({...tempConfig, ojekTarifPerKm: parseInt(e.target.value)})} className="w-full p-3 bg-gray-50 border rounded-xl outline-none text-sm font-black" />
               </div>
            </div>
            <button onClick={saveConfigWithLog} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-[10px] tracking-widest uppercase shadow-lg">SIMPAN PENGATURAN</button>
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
    </div>
  );
}
