import React, { useState, useEffect } from 'react';
import { OloluStore } from '../services/store';
import { 
  TrendingUp, 
  Coins, 
  Users, 
  Activity, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  MapPin, 
  Plus, 
  Sparkles, 
  Bike, 
  PhoneCall, 
  AlertTriangle, 
  Power,
  DollarSign
} from 'lucide-react';
import { Pesanan, DetailSopir } from '../types';

export default function DesktopDashboard() {
  const [time, setTime] = useState(new Date());
  const [activeOrders, setActiveOrders] = useState<Pesanan[]>([]);
  const [drivers, setDrivers] = useState<DetailSopir[]>([]);
  const [rates, setRates] = useState<any>(null);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time data and subscribe to store changes
  useEffect(() => {
    const updateLocalState = async () => {
      const [orders, listSopir, settings, emergencies] = await Promise.all([
        OloluStore.getAllPesanan(),
        OloluStore.getAllSopir(),
        OloluStore.getPengaturan(),
        OloluStore.getAllEmergency()
      ]);

      setActiveOrders(orders);
      setDrivers(listSopir);
      setRates(settings);
      setAlertLogs(emergencies);
    };

    updateLocalState();
    const unsubscribe = OloluStore.subscribeToStore(updateLocalState);
    return () => unsubscribe();
  }, []);

  // Format date-time for Lumajang (WIB / West Indonesia Time, GMT+7)
  const formatWIB = () => {
    // Force GMT+7 representation
    const utc = time.getTime() + time.getTimezoneOffset() * 60000;
    const wibTime = new Date(utc + 3600000 * 7);
    return wibTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }) + ' WIB';
  };

  const getEmergencyStatus = () => {
    const activePanic = alertLogs.filter(e => e.status === 'baru');
    return activePanic.length > 0 ? {
      active: true,
      count: activePanic.length,
      pelapor: activePanic[0].namaPelapor,
      peran: activePanic[0].peranPelapor
    } : { active: false, count: 0, pelapor: '', peran: '' };
  };

  // Kelola hitung-hitungan statistics
  const activeOrdersCount = activeOrders.filter(p => p.status !== 'selesai' && p.status !== 'dibatalkan').length;
  const completedOrdersCount = activeOrders.filter(p => p.status === 'selesai').length;
  const totalOmset = activeOrders
    .filter(p => p.status === 'selesai')
    .reduce((acc, curr) => acc + (curr.totalBayarAkhir || 0), 0);

  const emergency = getEmergencyStatus();

  if (!rates) {
    return <div className="p-8 text-center text-slate-500 font-bold">Inisialisasi Telemetri...</div>;
  }

  return (
    <div className="w-full flex-1 max-w-[850px] bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white font-sans flex flex-col space-y-6 shadow-2xl overflow-hidden self-stretch relative">
      
      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* HEADER OPERATIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 relative z-10">
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Live Telemetry System</p>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight font-display text-white mt-1">
            Pusat Operasional Ololu <span className="text-[#D4AF37]">Lumajang</span>
          </h2>
          <p className="text-[10px] text-slate-400 font-medium">PT Ololu Pengantaran Nusantara • Dashboard Monitoring Terpadu</p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/80 p-2.5 px-4 rounded-2xl border border-slate-800">
          <Clock className="text-[#D4AF37] w-4 h-4 animate-pulse shrink-0" />
          <div className="text-right">
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Jam Operasional</p>
            <p className="text-xs font-mono font-bold text-white tracking-wider">{formatWIB()}</p>
          </div>
        </div>
      </div>

      {/* STATS COUNTER GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 relative z-10">
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Sopir Online</p>
            <p className="text-lg font-bold text-white font-mono leading-tight">
              {drivers.filter(d => d.statusOnline).length} <span className="text-[10px] text-slate-500 font-normal">/ {drivers.length}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Pesanan Aktif</p>
            <p className="text-lg font-bold text-white font-mono leading-tight">{activeOrdersCount}</p>
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase">Selesai Hari Ini</p>
            <p className="text-lg font-bold text-white font-mono leading-tight">{completedOrdersCount}</p>
          </div>
        </div>

        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
            <Coins size={20} />
          </div>
          <div className="overflow-hidden">
            <p className="text-[9px] text-slate-400 font-bold uppercase">Omset Sukses</p>
            <p className="text-sm font-bold text-[#D4AF37] font-mono leading-tight truncate" title={`Rp ${totalOmset.toLocaleString('id-ID')}`}>
              Rp {totalOmset.toLocaleString('id-ID')}
            </p>
          </div>
        </div>
      </div>

      {/* EMERGENCY TICKER */}
      {emergency.active && (
        <div className="bg-red-950/60 border border-red-900/80 p-3 rounded-2xl flex items-center justify-between text-[10px] animate-pulse relative z-10">
          <span className="flex items-center space-x-2 text-red-200 font-bold">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            <span>🚨 DARURAT AKTIF: Dipicu oleh {emergency.pelapor} ({emergency.peran.toUpperCase()})</span>
          </span>
          <span className="text-[9px] bg-red-600 text-white font-extrabold px-2 py-0.5 rounded-full uppercase">Periksa Radar Admin!</span>
        </div>
      )}

      {/* MID PANEL SECTION (TARIFF & ACTIVE DRIVERS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        
        {/* LIVE TARIFF OVERVIEW */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex flex-col space-y-3">
          <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest flex items-center space-x-1">
            <TrendingUp size={13} />
            <span>Pantauan Tarif Aktif Sistem</span>
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <p className="text-[8px] text-slate-400 font-bold">1. OJEK ORANG</p>
              <div className="font-mono mt-1 font-bold space-y-0.5 text-slate-200">
                <p>Dasar: <span className="text-white">Rp {rates.ojekTarifDasar}</span> / {rates.ojekBatasKmTarifDasar}KM</p>
                <p>Km berikutnya: <span className="text-white">Rp {rates.ojekTarifPerKm}</span></p>
                <p>Min: <span className="text-[#D4AF37]">Rp {rates.ojekTarifMinimum}</span></p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <p className="text-[8px] text-slate-400 font-bold">2. MAKANAN & BELANJA</p>
              <div className="font-mono mt-1 font-bold space-y-0.5 text-slate-200">
                <p>Dasar: <span className="text-white">Rp {rates.makananTarifDasar}</span> / {rates.makananBatasKmTarifDasar}KM</p>
                <p>Km berikutnya: <span className="text-white">Rp {rates.makananTarifPerKm}</span></p>
                <p>Min: <span className="text-[#D4AF37]">Rp {rates.makananTarifMinimum}</span></p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <p className="text-[8px] text-slate-400 font-bold">3. KIRIM PAKET</p>
              <div className="font-mono mt-1 font-bold space-y-0.5 text-slate-200">
                <p>Dasar: <span className="text-white">Rp {rates.paketTarifDasar}</span> / {rates.paketBatasKmTarifDasar}KM</p>
                <p>Km berikutnya: <span className="text-white">Rp {rates.paketTarifPerKm}</span></p>
                <p>Min: <span className="text-[#D4AF37]">Rp {rates.paketTarifMinimum}</span></p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80">
              <p className="text-[8px] text-slate-400 font-bold">4. BARANG BESAR</p>
              <div className="font-mono mt-1 font-bold space-y-0.5 text-slate-200">
                <p>Dasar: <span className="text-white">Rp {rates.barangBesarTarifDasar}</span> / {rates.barangBesarBatasKmTarifDasar}KM</p>
                <p>Km berikutnya: <span className="text-white">Rp {rates.barangBesarTarifPerKm}</span></p>
                <p>Min: <span className="text-[#D4AF37]">Rp {rates.barangBesarTarifMinimum}</span></p>
              </div>
            </div>
          </div>
          
          <p className="text-[8px] text-slate-500 font-medium italic">
            *Setiap kali Anda merubah tarif di panel admin simulator HP, tarif pantauan di atas akan otomatis tersinkronisasi.
          </p>
        </div>

        {/* DRIVERS STATUS TELEMETRY */}
        <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-2xl flex flex-col space-y-3">
          <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest flex items-center space-x-1">
            <Bike size={13} />
            <span>Status Mitra & Koordinat GPS</span>
          </p>

          <div className="flex-1 flex flex-col justify-between space-y-2">
            {drivers.map(drv => (
              <div key={drv.id} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-[#E6F4EC] text-[#046A38] font-bold flex items-center justify-center border border-emerald-900 text-[10px]">
                      {(drv as any).nama?.charAt(0) || 'M'}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border border-slate-900 ${
                      drv.statusOnline ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}></span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-200">{(drv as any).nama || 'Mitra Ololu'}</p>
                    <p className="text-[9px] text-slate-400 font-mono">{drv.platNomor} • {drv.jenisMotor}</p>
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] space-y-0.5">
                  <p className="text-[#D4AF37] font-bold">Rp {(drv.saldoDompet || 0).toLocaleString('id-ID')}</p>
                  <p className="text-[9px] text-slate-400" title="Koordinat GPS Terakhir">
                    GPS: {drv.lokasiSaatIni?.lat.toFixed(4) || '0'}, {drv.lokasiSaatIni?.lng.toFixed(4) || '0'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[8px] text-slate-500 font-medium italic">
            *Status online mitra sangat krusial bagi sistem pencarian/autobid order terdekat.
          </p>
        </div>
      </div>

      {/* LIVE ORDERS LIST TABLE */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col space-y-3 relative z-10 min-h-[220px]">
        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest flex items-center space-x-1">
          <MapPin size={13} />
          <span>Monitor Aktivitas Pesanan Real-time ({activeOrders.length})</span>
        </p>

        <div className="flex-1 overflow-y-auto max-h-[180px] scrollbar-thin scrollbar-thumb-slate-800">
          {activeOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-1">
              <p className="text-xs text-slate-500 font-bold">Tidak ada log aktivitas pesanan aktif.</p>
              <p className="text-[10px] text-slate-500 max-w-sm">
                Log pesanan akan muncul secara otomatis di sini begitu ada penumpang yang melakukan pemesanan melalui aplikasi.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-2">No. Order</th>
                  <th className="py-2">Layanan</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2 text-right">Jarak</th>
                  <th className="py-2 text-right">Biaya</th>
                  <th className="py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
                {activeOrders.slice(0, 10).map(p => {
                  let statusColor = 'bg-slate-800 text-slate-300';
                  if (p.status === 'mencari_sopir') statusColor = 'bg-amber-950/80 text-amber-300 border border-amber-500/30';
                  if (p.status === 'diterima' || p.status === 'di_tujuan_1') statusColor = 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30';
                  if (p.status === 'selesai') statusColor = 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30';
                  if (p.status === 'dibatalkan') statusColor = 'bg-red-950/80 text-red-300 border border-red-500/30';

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2 text-[11px] font-bold text-white">{p.nomorPesanan}</td>
                      <td className="py-2 text-[10px] uppercase font-bold text-[#D4AF37]">
                        {p.jenisLayanan === 'barang_besar' ? 'Barang' : p.jenisLayanan}
                      </td>
                      <td className="py-2 text-[11px] text-slate-400 max-w-[110px] truncate">{p.namaPenumpang}</td>
                      {/* Jarak sudah dibulatkan ke atas! */}
                      <td className="py-2 text-right text-[11px]">{Math.ceil(p.jarakKm)} KM</td>
                      <td className="py-2 text-right font-bold text-emerald-400 text-[11px]">
                        Rp {p.biayaPerjalananTotal?.toLocaleString('id-ID') || 0}
                      </td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold ${statusColor}`}>
                          {p.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
