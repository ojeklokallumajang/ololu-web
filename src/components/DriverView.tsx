/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { OloluStore, KOORDINAT_LUMAJANG } from '../services/store';
import { ololuRealtime } from '../services/supabaseClient';
import { GOOGLE_MAPS_KEY } from './SplashMapKey';
import ChatRoom from './ChatRoom';
import {
  DetailSopir,
  Pesanan,
  TujuanStop,
  TransaksiDompet
} from '../types';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin
} from '@vis.gl/react-google-maps';
import {
  Power,
  ShieldCheck,
  CreditCard,
  History,
  Check,
  Upload,
  Phone,
  AlertTriangle,
  FileText,
  DollarSign,
  Plus,
  HelpCircle,
  Eye,
  Camera,
  MapPin,
  Clock,
  Navigation,
  Star,
  Bell,
  Sliders,
  X,
  Sparkles,
  Radio,
  MessageCircle
} from 'lucide-react';

interface DriverViewProps {
  onNotifyAdminPanic: () => void;
  onLogout: () => void;
  lockedOrderId?: string;
}

export default function DriverView({ onNotifyAdminPanic, onLogout, lockedOrderId }: DriverViewProps) {
  // --- IN-APP STATE SINKRONISASI ---
  const [profile, setProfile] = useState<any>(null);
  const [driverDetail, setDriverDetail] = useState<DetailSopir | null>(null);
  const [activeOrder, setActiveOrder] = useState<Pesanan | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<TransaksiDompet[]>([]);
  
  // DRIVER DOCUMENT SUBMISSION FORM STATE
  const [platNomor, setPlatNomor] = useState('');
  const [jenisMotor, setJenisMotor] = useState('');
  const [bisaBarangBesar, setBisaBarangBesar] = useState(false);
  const [selectedPhotoField, setSelectedPhotoField] = useState<string | null>(null);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);

  // WALLET FORM STATE
  const [topUpAmount, setTopUpAmount] = useState<number>(50000);
  const [topUpProof, setTopUpProof] = useState<string | null>(null);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');

  // NOTA TOKO BUILDER STATE
  const [notaStoreName, setNotaStoreName] = useState('');
  const [notaGoods, setNotaGoods] = useState('');
  const [notaTotal, setNotaTotal] = useState<string>('');
  const [activeNotaStopId, setActiveNotaStopId] = useState<string | null>(null);

  // SUPABASE REALTIME & AUTOBID STATES
  const [config, setConfig] = useState<any>(null);
  const [realtimeOrderAlert, setRealtimeOrderAlert] = useState<Pesanan | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Pesanan[]>([]);
  const [alertCountdown, setAlertCountdown] = useState<number>(15);
  const [isAutobidActive, setIsAutobidActive] = useState<boolean>(true);
  const [autobidCountdown, setAutobidCountdown] = useState<number>(3);
  const [orderAcceptingStatus, setOrderAcceptingStatus] = useState<string | null>(null);
  
  // TABS FOR FINANCE VS ORDER HISTORY
  const [activeHistoryTab, setActiveHistoryTab] = useState<'finance' | 'orders'>('orders');

  useEffect(() => {
    const initDriver = async () => {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);

      const cfg = await OloluStore.getPengaturan();
      setConfig(cfg);

      if (p) {
        const detail = await OloluStore.getSopir(p.id);
        setDriverDetail(detail || null);
        if (detail) {
          setPlatNomor(detail.platNomor || '');
          setJenisMotor(detail.jenisMotor || '');
          setBisaBarangBesar(detail.bisaBarangBesar || false);
        }

        // RECOVERY: Ambil order dari kunci lokal jika ada
        if (lockedOrderId) {
          const order = await OloluStore.getPesananById(lockedOrderId);
          if (order) setActiveOrder(order);
        }

        const txs = await OloluStore.getTransaksiSopir(p.id);
        setTransactions(txs);

        const orders = await OloluStore.getAllPesanan();
        setHistoryOrders(orders.filter(o => o.idSopir === p.id));
      }
    };

    initDriver();
    const unsubscribe = OloluStore.subscribeToStore(initDriver);
    return () => unsubscribe();
  }, [lockedOrderId]);

  // --- REAL-TIME PRESENCE (RADAR) & GEOLOCATION ---
  useEffect(() => {
    if (!driverDetail?.statusOnline || !profile) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // 1. Update Presence (Untuk Radar Penumpang - 0 Write)
        ololuRealtime.trackDriverPresence(profile.id, {
          nama: profile.nama,
          platNomor: driverDetail.platNomor,
          jenisMotor: driverDetail.jenisMotor,
          ...coords
        });

        // 2. Broadcast ke Penumpang jika ada order aktif (0 Write)
        if (activeOrder) {
          ololuRealtime.broadcastTripUpdate(activeOrder.id, {
            type: 'location',
            coords,
            status: activeOrder.status
          });
        }
      },
      (err) => console.warn("Geo error:", err),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverDetail?.statusOnline, activeOrder, profile]);

  // --- STATE SYNC RESPONDER (Handle F5 Penumpang) ---
  useEffect(() => {
    if (!activeOrder || !driverDetail) return;

    const unsubscribe = ololuRealtime.subscribeToSyncRequest(activeOrder.id, () => {
      console.log("Menerima permintaan sinkronisasi dari penumpang...");
      ololuRealtime.broadcastTripUpdate(activeOrder.id, {
        type: 'full-sync',
        driver: {
          id: driverDetail.id,
          nama: profile?.nama,
          platNomor: driverDetail.platNomor,
          ratingRataRata: driverDetail.ratingRataRata
        },
        status: activeOrder.status,
        tahapAktif: activeOrder.tahapAktif
      });
    });

    return () => unsubscribe();
  }, [activeOrder, driverDetail, profile]);

  // Haversine distance calculator to check if driver is close enough to order pickup
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Subscribe to real-time order broadcasts via Supabase WebSockets / PubSub
  useEffect(() => {
    const handleNewOrder = (order: Pesanan) => {
      // 0. Ensure status is 'mencari_sopir'
      if (order.status !== 'mencari_sopir') {
        console.log('[Realtime Notification] Order status is not seeking driver. Ignoring order:', order.nomorPesanan, order.status);
        return;
      }

      // 1. Check if driver is eligible and active
      if (!driverDetail) return;
      if (!driverDetail.statusOnline) {
        console.log('[Realtime Notification] Driver is offline. Ignoring order:', order.nomorPesanan);
        return;
      }
      if (!driverDetail.disetujuiAdmin) return;
      if (driverDetail.saldoDompet < config.saldoMinimalOnlineSopir) {
        console.log('[Realtime Notification] Insufficient wallet balance. Ignoring order:', order.nomorPesanan);
        return;
      }
      
      // 2. Check if driver already has an active order
      if (activeOrder) {
        console.log('[Realtime Notification] Driver has active order. Ignoring order:', order.nomorPesanan);
        return;
      }

      // 3. Check compatibility for 'barang_besar'
      if (order.jenisLayanan === 'barang_besar' && !driverDetail.bisaBarangBesar) {
        console.log('[Realtime Notification] Order is large cargo, driver cannot carry. Ignoring order:', order.nomorPesanan);
        return;
      }

      // 4. Check radius
      const driverLat = driverDetail.lokasiSaatIni?.lat || KOORDINAT_LUMAJANG.lat;
      const driverLng = driverDetail.lokasiSaatIni?.lng || KOORDINAT_LUMAJANG.lng;
      const distance = getDistanceKm(driverLat, driverLng, order.asalLat, order.asalLng);
      
      if (distance > config.radiusPencarianSopirKm) {
        console.log(`[Realtime Notification] Order is too far (${distance.toFixed(2)} km > ${config.radiusPencarianSopirKm} km). Ignoring order:`, order.nomorPesanan);
        return;
      }

      // 5. Order is matching and relevant! Trigger real-time alert!
      console.log('⚡ [Realtime Notification] RELEVANT NEW ORDER RECEIVED!', order);
      setRealtimeOrderAlert(order);
      setAlertCountdown(15);
      setAutobidCountdown(3);
      setOrderAcceptingStatus(null);
    };

    const unsubscribe = ololuRealtime.subscribeToNewOrders(handleNewOrder);
    return () => unsubscribe();
  }, [driverDetail, activeOrder, config]);

  // Interval for countdown and Autobid triggers
  useEffect(() => {
    if (!realtimeOrderAlert) return;

    const timer = setInterval(() => {
      // Decrement main countdown
      setAlertCountdown(prev => {
        if (prev <= 1) {
          setRealtimeOrderAlert(null);
          return 0;
        }
        return prev - 1;
      });

      // Handle Autobid countdown if active
      if (isAutobidActive && !orderAcceptingStatus) {
        setAutobidCountdown(prev => {
          if (prev <= 1) {
            // Trigger auto acceptance
            handleAcceptRealtimeOrder(realtimeOrderAlert.id);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [realtimeOrderAlert, isAutobidActive, orderAcceptingStatus]);

  const handleAcceptRealtimeOrder = (orderId: string) => {
    if (!driverDetail) return;
    setOrderAcceptingStatus('Mengamankan pesanan...');
    
    // STRATEGI IRIT: Jangan tulis ke DB sekarang. Cukup broadcast ke penumpang.
    setTimeout(() => {
      // Kunci UI Sopir secara lokal
      OloluStore.setLocalOrderLock(orderId, 'sopir');

      const order = realtimeOrderAlert || activeOrder; // Fallback jika refresh
      if (order) {
        const updatedOrder = {
          ...order,
          status: 'sopir_ditemukan' as StatusPesanan,
          idSopir: driverDetail.id,
          namaSopir: profile?.nama,
          platNomorSopir: driverDetail.platNomor
        };
        setActiveOrder(updatedOrder);

        // Beritahu penumpang via Broadcast (0 Write)
        ololuRealtime.broadcastTripUpdate(orderId, {
          type: 'accepted',
          driver: {
            id: driverDetail.id,
            nama: profile?.nama,
            platNomor: driverDetail.platNomor,
            ratingRataRata: driverDetail.ratingRataRata
          }
        });
      }

      setOrderAcceptingStatus(null);
      setRealtimeOrderAlert(null);
    }, 800);
  };

  // --- SOPIR DOCUMENT ACTIONS ---
  const handleDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !driverDetail) return;
    if (!platNomor || !jenisMotor) {
      alert("Masukkan Plat Nomor Kendaraan & Jenis Motor Anda!");
      return;
    }

    // Update berkas dummy (gambar base64 placeholder)
    const svgBase64 = (title: string) => `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100' viewBox='0 0 200 100'><rect width='200' height='100' fill='%23046A38'/><text x='50%' y='50%' fill='white' dominant-baseline='middle' text-anchor='middle'>${title}</text></svg>`;

    OloluStore.updateSopirDokumen(driverDetail.id, {
      platNomor,
      jenisMotor,
      bisaBarangBesar,
      fotoKtp: svgBase64("KTP SOPIR " + profile.nama),
      fotoSim: svgBase64("SIM SOPIR " + profile.nama),
      fotoStnk: svgBase64("STNK MOTOR " + platNomor),
      fotoKendaraan: svgBase64("FOTO MOTOR " + jenisMotor)
    });

    alert("🎉 Berkas lamaran pendaftaran sopir Anda berhasil dikirim! Silakan hubungi Admin di panel sebelah untuk menyetujui akun Anda.");
  };

  // --- ONLINE / OFFLINE TOGGLE ENGINE ---
  const handleToggleOnline = async () => {
    if (!driverDetail) return;
    const res = await OloluStore.toggleOnlineSopir(driverDetail.id);
    if (!res.success) {
      alert(`❌ GAGAL ONLINE:\n${res.error}`);
    }
  };

  // --- WALLET ACTIONS ---
  const handlePickProof = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // Gunakan capture jika di HP untuk langsung buka kamera
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      input.setAttribute('capture', 'environment');
    }

    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setTopUpProof(reader.result as string);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmitDeposit = async () => {
    if (!driverDetail || !topUpProof) {
      alert("Pilih nominal dan ambil foto bukti transfer dulu!");
      return;
    }

    setIsSubmittingDeposit(true);
    const res = await OloluStore.ajukanTopUpSopir(driverDetail.id, topUpAmount, topUpProof);

    if (res.success) {
      alert("✅ Bukti deposit terkirim! Saldo akan bertambah setelah diverifikasi Admin.");
      setTopUpProof(null);
    } else {
      alert("❌ Gagal: " + res.error);
    }
    setIsSubmittingDeposit(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError('');
    setWalletSuccess('');
    if (!driverDetail) return;
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      setWalletError('Masukkan nominal tarik dana yang valid!');
      return;
    }
    const res = await OloluStore.ajukanTarikDana(driverDetail.id, amt);
    if (res.success) {
      setWalletSuccess(`🎉 Pengajuan penarikan dana Rp ${amt.toLocaleString('id-ID')} terkirim! Menunggu approval Admin.`);
      setWithdrawAmount('');
    } else {
      setWalletError(res.error || 'Terjadi kesalahan');
    }
  };

  // --- ACTIVE ORDER PROCESS ACTIONS ---
  const handleArrivePickup = () => {
    if (!activeOrder) return;
    const nextStatus = 'dalam_perjalanan' as StatusPesanan;
    setActiveOrder({ ...activeOrder, status: nextStatus });

    // Broadcast status ke penumpang (0 Write)
    ololuRealtime.broadcastTripUpdate(activeOrder.id, {
      type: 'status_update',
      status: nextStatus
    });
  };

  const handleUpdateParking = (stopId: string, choice: 'tidak_ada' | 'parkir_biasa' | 'parkir_pasar') => {
    if (!activeOrder) return;
    const updatedOrder = { ...activeOrder };
    updatedOrder.daftarTujuan = updatedOrder.daftarTujuan.map(s => s.id === stopId ? { ...s, pilihanParkir: choice } : s);
    setActiveOrder(updatedOrder);

    // Broadcast update parkir (0 Write)
    ololuRealtime.broadcastTripUpdate(activeOrder.id, {
      type: 'parking_update',
      stopId,
      choice
    });
  };

  const handleAddNotaToko = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !activeNotaStopId) return;
    const tot = parseFloat(notaTotal);
    if (!notaStoreName || !notaGoods || isNaN(tot) || tot <= 0) {
      alert("Lengkapi detail nota toko dengan benar!");
      return;
    }

    // Simulasi gambar nota
    const dummyNotaImg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='150' viewBox='0 0 300 150'><rect width='300' height='150' fill='%23FAFBF9' stroke='%23B8941F' stroke-width='4'/><text x='20' y='40' font-family='sans-serif' font-size='16' font-weight='bold' fill='%23046A38'>${notaStoreName.toUpperCase()}</text><text x='20' y='75' font-family='monospace' font-size='12' fill='%231A1A1A'>${notaGoods}</text><text x='20' y='120' font-family='sans-serif' font-size='14' font-weight='bold' fill='%23B8941F'>Total: Rp ${tot.toLocaleString('id-ID')}</text></svg>`;

    OloluStore.simpanNotaToko(activeOrder.id, activeNotaStopId, notaStoreName, notaGoods, tot, dummyNotaImg);
    
    // Reset form nota
    setNotaStoreName('');
    setNotaGoods('');
    setNotaTotal('');
    setActiveNotaStopId(null);
  };

  const handleCompleteStop = (stopId: string) => {
    if (!activeOrder) return;
    const updatedOrder = { ...activeOrder };
    let nextTahap = updatedOrder.tahapAktif;

    updatedOrder.daftarTujuan = updatedOrder.daftarTujuan.map((s, idx) => {
      if (s.id === stopId) {
        nextTahap = idx + 1;
        return { ...s, status: 'selesai' as any };
      }
      return s;
    });

    const finalOrder = { ...updatedOrder, tahapAktif: nextTahap };
    setActiveOrder(finalOrder);

    // Broadcast ke penumpang (0 Write)
    ololuRealtime.broadcastTripUpdate(activeOrder.id, {
      type: 'stop_complete',
      stopId,
      nextTahap
    });
  };

  const handleCompleteOrder = async () => {
    if (!activeOrder) return;
    
    const adaPending = activeOrder.daftarTujuan.some(s => s.status === 'pending');
    if (adaPending) {
      if (!confirm("Masih ada stop tujuan yang belum diselesaikan. Yakin ingin langsung menyelesaikan pesanan?")) {
        return;
      }
    }

    // FINAL WRITE: Tulis semua status perjalanan ke database dalam satu kali aksi
    alert("🚀 MENYIMPAN DATA PERJALANAN KE CLOUD...");

    await OloluStore.selesaikanPesanan(activeOrder.id, activeOrder);

    // Refresh history
    const orders = await OloluStore.getAllPesanan();
    if (profile) setHistoryOrders(orders.filter(o => o.idSopir === profile.id));

    alert("🎉 PESANAN SELESAI!\nData telah diarsipkan ke database.");
    setActiveOrder(null);
  };

  const handleBatalOrder = () => {
    if (!activeOrder) return;
    if (confirm("Apakah Anda yakin ingin membatalkan pesanan ini?")) {
      OloluStore.batalPesanan(activeOrder.id, 'sopir', 'Dibatalkan oleh Sopir.');
      setActiveOrder(null);
    }
  };

  const handleLogoutLocal = () => {
    if (confirm("Apakah Anda yakin ingin keluar akun?")) {
      onLogout();
    }
  };

  // TOMBOL PANIK / SOS SOPIR
  const handleTriggerPanic = () => {
    if (!activeOrder) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rep = OloluStore.tambahEmergency(
          activeOrder.id,
          profile?.nama || 'Sopir Ololu',
          profile?.nomorHp || '0',
          'sopir',
          pos.coords.latitude,
          pos.coords.longitude
        );
        onNotifyAdminPanic();
        alert(`🚨 TOMBOL PANIK AKTIF!\nLokasi darurat Anda terkirim ke Admin. Bantuan darurat sedang dikoordinasikan.`);
      },
      () => {
        const rep = OloluStore.tambahEmergency(
          activeOrder.id,
          profile?.nama || 'Sopir Ololu',
          profile?.nomorHp || '0',
          'sopir',
          activeOrder.asalLat,
          activeOrder.asalLng
        );
        onNotifyAdminPanic();
        alert(`🚨 TOMBOL PANIK AKTIF!\nKoordinat GPS gagal diakses browser, koordinat pesanan dikirim ke Admin.`);
      }
    );
  };

  if (!profile || !driverDetail || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-[#046A38]/20 border-t-[#046A38] rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-gray-400 uppercase">Menyiapkan Dashboard Driver...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2.1: AKUN BELUM DISETUJUI ADMIN (UPLOAD BERKAS)
  // =========================================================================
  if (!driverDetail.disetujuiAdmin) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen p-4 space-y-4 pb-20">
        
        {/* STATUS BAR REGISTER */}
        <div className="bg-white p-5 rounded-2xl border-t-4 border-yellow-500 shadow-sm text-center space-y-2">
          <div className="bg-yellow-50 text-yellow-600 p-2.5 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-xl">
            ⏳
          </div>
          <h2 className="text-base font-bold text-gray-800">
            {driverDetail.ditolakAdmin ? 'Pengajuan Anda Ditolak Admin' : 'Akun Anda Belum Disetujui Admin'}
          </h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            {driverDetail.ditolakAdmin 
              ? `Alasan Penolakan: "${driverDetail.alasanDitolak || 'Berkas tidak jelas'}"`
              : 'Silakan isi kelengkapan dokumen kendaraan dan identitas Anda di bawah untuk diverifikasi oleh tim Admin Ololu.'}
          </p>
        </div>

        {/* FORM UPLOAD BERKAS */}
        <form onSubmit={handleDocUpload} className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-4 text-left">
          <h3 className="text-xs font-bold text-gray-700 border-b pb-2">FORMULIR KENDARAAN & DOKUMEN</h3>
          
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Nomor Plat Polisi (Lumajang N-XXX)</label>
            <input
              type="text"
              value={platNomor}
              onChange={(e) => setPlatNomor(e.target.value.toUpperCase())}
              placeholder="cth. N 4321 YX"
              className="w-full p-2 bg-[#FAFBF9] border rounded-lg text-xs focus:outline-[#046A38] font-bold font-mono text-gray-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1">Jenis / Merk Motor</label>
            <input
              type="text"
              value={jenisMotor}
              onChange={(e) => setJenisMotor(e.target.value)}
              placeholder="cth. Honda Vario 125cc"
              className="w-full p-2 bg-[#FAFBF9] border rounded-lg text-xs focus:outline-[#046A38] text-gray-800"
            />
          </div>

          <div className="flex items-center space-x-2 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <input
              type="checkbox"
              id="bisaBarangBesar"
              checked={bisaBarangBesar}
              onChange={(e) => setBisaBarangBesar(e.target.checked)}
              className="w-4 h-4 text-[#046A38] focus:ring-[#046A38] border-gray-300 rounded"
            />
            <label htmlFor="bisaBarangBesar" className="text-[10px] text-[#0A8A4E] font-bold leading-none cursor-pointer">
              Bisa Bawa Barang Besar (Punya Bak Motor / Kapasitas Jumbo)
            </label>
          </div>

          {/* SIMULASI FILE UPLOAD BUTTONS */}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-dashed">
            <button
              type="button"
              onClick={() => setSelectedPhotoField('ktp')}
              className={`p-3 bg-[#FAFBF9] hover:bg-[#E6F4EC] rounded-lg border border-dashed flex flex-col items-center justify-center space-y-1 transition-all ${driverDetail.fotoKtp ? 'border-[#046A38]' : 'border-gray-300'}`}
            >
              <Upload size={16} className="text-gray-400" />
              <span className="text-[9px] font-bold">Foto KTP {driverDetail.fotoKtp && '✅'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPhotoField('sim')}
              className={`p-3 bg-[#FAFBF9] hover:bg-[#E6F4EC] rounded-lg border border-dashed flex flex-col items-center justify-center space-y-1 transition-all ${driverDetail.fotoSim ? 'border-[#046A38]' : 'border-gray-300'}`}
            >
              <Upload size={16} className="text-gray-400" />
              <span className="text-[9px] font-bold">Foto SIM {driverDetail.fotoSim && '✅'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPhotoField('stnk')}
              className={`p-3 bg-[#FAFBF9] hover:bg-[#E6F4EC] rounded-lg border border-dashed flex flex-col items-center justify-center space-y-1 transition-all ${driverDetail.fotoStnk ? 'border-[#046A38]' : 'border-gray-300'}`}
            >
              <Upload size={16} className="text-gray-400" />
              <span className="text-[9px] font-bold">Foto STNK {driverDetail.fotoStnk && '✅'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedPhotoField('kendaraan')}
              className={`p-3 bg-[#FAFBF9] hover:bg-[#E6F4EC] rounded-lg border border-dashed flex flex-col items-center justify-center space-y-1 transition-all ${driverDetail.fotoKendaraan ? 'border-[#046A38]' : 'border-gray-300'}`}
            >
              <Upload size={16} className="text-gray-400" />
              <span className="text-[9px] font-bold">Foto Motor {driverDetail.fotoKendaraan && '✅'}</span>
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#034F2A] hover:bg-[#046A38] text-white font-bold rounded-xl text-xs border border-[#D4AF37] shadow-sm transition-all"
          >
            Kirim Lamaran Mitra Ololu
          </button>
        </form>

        {selectedPhotoField && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-5 rounded-2xl max-w-xs w-full text-center space-y-4">
              <Camera size={28} className="mx-auto text-[#046A38]" />
              <h3 className="font-bold text-sm">Unggah {selectedPhotoField.toUpperCase()} (Simulasi)</h3>
              <p className="text-xs text-gray-500">
                Aplikasi web akan mensimulasikan izin akses kamera/galeri untuk mengambil berkas dokumen Anda.
              </p>
              <div className="bg-emerald-50 py-3 rounded-lg border border-[#046A38]/30 font-bold text-xs text-[#046A38]">
                Foto Diambil Otomatis!
              </div>
              <button
                onClick={() => setSelectedPhotoField(null)}
                className="w-full py-2 bg-[#034F2A] text-white rounded-lg text-xs"
              >
                Selesai
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // VIEW 2.2: DASHBOARD UTAMA SOPIR (AKTIF / ONLINE / DOMPET)
  // =========================================================================
  return (
    <div id="driver-dashboard" className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-24">
      
      {/* HEADER UTAMA SOPIR */}
      <div className="bg-[#046A38] text-white p-5 border-b-2 border-[#D4AF37] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🛵</span>
            <div>
              <h2 className="text-sm font-bold font-sans">{profile?.nama}</h2>
              <p className="text-[10px] text-[#F5E6A8] tracking-widest uppercase font-semibold">Plat: {driverDetail?.platNomor || 'N/A'}</p>
            </div>
          </div>
          
          {/* RATING DISPLAY */}
          <div className="bg-white/10 px-2.5 py-1 rounded-full flex items-center space-x-1 border border-white/20">
            <Star size={12} className="text-[#D4AF37] fill-[#D4AF37]" />
            <span className="text-xs font-bold">{driverDetail.ratingRataRata}</span>
          </div>

          <button
            onClick={handleLogoutLocal}
            className="p-2 bg-white/10 hover:bg-red-500 rounded-lg transition-all"
            title="Keluar"
          >
            <Power size={18} />
          </button>
        </div>

        {/* BUTTON ONLINE / OFFLINE SOPIR (SANGAT MENCOLOK DI ATAS) */}
        <button
          onClick={handleToggleOnline}
          disabled={!driverDetail.disetujuiAdmin && !activeOrder}
          className={`w-full py-3.5 rounded-2xl text-xs font-black tracking-wider flex items-center justify-center space-x-2 transition-all border border-[#D4AF37] shadow-md ${
            driverDetail.statusOnline
              ? 'bg-[#0A8A4E] text-white hover:bg-[#034F2A]'
              : 'bg-gray-400 text-white cursor-not-allowed opacity-80'
          }`}
        >
          <Power size={16} className={driverDetail.statusOnline ? 'animate-pulse text-[#D4AF37]' : ''} />
          <span>
            {driverDetail.statusOnline ? '🟢 ANDA SEDANG ONLINE (SIAP TERIMA ORDER)' : '🔴 MODE ONLINE OFFLINE'}
          </span>
        </button>

        {driverDetail.statusOnline && (
          <div className="bg-white/10 p-3 rounded-xl flex items-center justify-between border border-white/10 text-xs transition-all">
            <div className="flex items-center space-x-2">
              <Radio size={14} className={`text-[#D4AF37] ${isAutobidActive ? 'animate-pulse' : ''}`} />
              <div>
                <span className="font-bold block">Autobid Real-Time WebSocket</span>
                <span className="text-[9px] text-[#FAFBF9]/80 block">Otomatis terima order terdekat</span>
              </div>
            </div>
            <button
              onClick={() => setIsAutobidActive(!isAutobidActive)}
              className={`px-3 py-1.5 rounded-lg font-black tracking-wider transition-all uppercase text-[9px] border ${
                isAutobidActive 
                  ? 'bg-[#FAFBF9] text-[#046A38] border-white hover:bg-[#E6F4EC]' 
                  : 'bg-white/10 text-white/80 border-white/20 hover:bg-white/20'
              }`}
            >
              {isAutobidActive ? '⚡ AUTOBID' : '✋ MANUAL'}
            </button>
          </div>
        )}

        {!driverDetail.statusOnline && (
          <div className="bg-[#E6F4EC] text-[#034F2A] p-2.5 rounded-xl text-[10px] space-y-1">
            <p className="font-bold">⚠️ Syarat Aktif Online Sopir:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Akun terverifikasi oleh Admin: <span className="font-bold text-[#059669]">Lolos ✅</span></li>
              <li>Saldo Dompet Ololu ≥ Rp {config.saldoMinimalOnlineSopir.toLocaleString('id-ID')}: <span className={`font-bold ${driverDetail.saldoDompet >= config.saldoMinimalOnlineSopir ? 'text-[#059669]' : 'text-[#DC2626]'}`}>{driverDetail.saldoDompet >= config.saldoMinimalOnlineSopir ? 'Lolos' : 'Kurang'} (Rp {driverDetail.saldoDompet.toLocaleString('id-ID')})</span></li>
              <li>Tidak sedang membawa order aktif: <span className="font-bold text-[#059669]">Lolos ✅</span></li>
            </ul>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        
        {/* =====================================================================
            VIEW 2.2.1: AREA JALANKAN PESANAN AKTIF (SOPIR JALAN)
            ===================================================================== */}
        {activeOrder ? (
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm space-y-4 text-left">
            
            {/* Banner Order Aktif */}
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <span className="text-[10px] bg-[#E6F4EC] text-[#046A38] px-2 py-0.5 rounded-full font-bold uppercase">
                  {activeOrder.jenisLayanan} • {activeOrder.nomorPesanan}
                </span>
                <h3 className="text-sm font-bold text-gray-800 mt-1">
                  Customer: {activeOrder.namaPenumpang}
                </h3>
                <p className="text-xs text-gray-500">{activeOrder.nomorHpPenumpang}</p>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="bg-[#FAFBF9] hover:bg-[#E6F4EC] border border-gray-200 text-[#046A38] p-2 rounded-full transition-all relative"
                  title="Hubungi Chat"
                >
                  <MessageCircle size={14} />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </button>
                <a
                  href={`tel:${activeOrder.nomorHpPenumpang}`}
                  className="bg-[#FAFBF9] hover:bg-[#E6F4EC] border border-gray-200 text-[#046A38] p-2 rounded-full transition-all"
                >
                  <Phone size={14} />
                </a>
              </div>
            </div>

            {/* Google Map Mini Lacak Perjalanan Sopir */}
            <div className="w-full h-48 rounded-xl border relative overflow-hidden">
              <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
                <Map
                  defaultCenter={{ lat: activeOrder.asalLat || KOORDINAT_LUMAJANG.lat, lng: activeOrder.asalLng || KOORDINAT_LUMAJANG.lng }}
                  defaultZoom={14}
                  mapId="OLOLU_DRIVER_MINI_MAP"
                  style={{ width: '100%', height: '100%' }}
                >
                  <AdvancedMarker position={{ lat: activeOrder.asalLat || KOORDINAT_LUMAJANG.lat, lng: activeOrder.asalLng || KOORDINAT_LUMAJANG.lng }} title="Jemput">
                    <Pin background="#046A38" glyphColor="#fff" scale={0.7} />
                  </AdvancedMarker>
                  {(activeOrder.daftarTujuan || []).map((st, sIdx) => (
                    <AdvancedMarker key={st.id} position={{ lat: st.lat || 0, lng: st.lng || 0 }} title={`Tujuan ${sIdx+1}`}>
                      <Pin background="#D4AF37" glyphColor="#1A1A1A" glyphText={`${sIdx+1}`} scale={0.7} />
                    </AdvancedMarker>
                  ))}
                </Map>
              </APIProvider>
              <div className="absolute top-2 right-2 bg-[#046A38]/95 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-sm">
                Rute Perjalanan ({activeOrder.jarakKm} KM)
              </div>
            </div>

            {/* LOGIKA PERTAHAPAN PERJALANAN (LANGKAH DEMI LANGKAH) */}
            <div className="space-y-4">
              
              {/* STATUS UTAMA DAN TOMBOL UPDATE */}
              <div className="bg-[#FAFBF9] p-3 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-gray-500">TAHAPAN PESANAN:</span>
                  <span className="font-bold text-[#046A38] uppercase">{activeOrder.status}</span>
                </div>
                
                {(activeOrder.status === 'sopir_ditemukan' || activeOrder.status === 'diproses') && (
                  <button
                    onClick={handleArrivePickup}
                    className="w-full py-2.5 bg-[#034F2A] text-white font-bold rounded-xl text-xs hover:bg-[#046A38] border border-[#D4AF37] shadow-sm flex items-center justify-center space-x-1"
                  >
                    <Check size={14} />
                    <span>SAYA SUDAH TIBA DI TITIK JEMPUT (MULAI PERJALANAN)</span>
                  </button>
                )}
              </div>

              {/* TAHAP AKTIF STOPS CONTROLLER */}
              {activeOrder.status === 'dalam_perjalanan' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-700 border-b pb-1">KONTROL TUJUAN PER STASIUN</h4>
                  
                  {activeOrder.daftarTujuan.map((stop, sIdx) => {
                    const isStopSelesai = stop.status === 'selesai';
                    const isAktif = sIdx === activeOrder.tahapAktif;

                    if (!isAktif && !isStopSelesai) return null; // Hanya tampilkan yang aktif atau yang sudah selesai

                    return (
                      <div key={stop.id} className="border border-[#D4AF37] rounded-xl p-3 bg-white space-y-3 shadow-xs">
                        <div className="flex justify-between items-baseline text-xs border-b pb-1.5">
                          <span className="font-bold text-[#046A38]">Tujuan {sIdx + 1} {isStopSelesai && '(SELESAI)'}</span>
                          <span className="text-[10px] text-gray-400">{stop.alamat}</span>
                        </div>

                        {/* SHOPPING LIST JIKA ADA */}
                        {stop.daftarItem?.length > 0 && (
                          <div className="bg-[#FAFBF9] p-2 rounded-lg border border-gray-100 space-y-1">
                            <span className="text-[10px] text-gray-400 font-bold">🛒 BARANG BELANJAAN CUSTOMER:</span>
                            {stop.daftarItem.map(it => (
                              <div key={it.id} className="text-[11px] text-gray-700 flex justify-between">
                                <span>• {it.namaBarang}</span>
                                <span>x{it.jumlah}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* SYSTEM PARKIR BARU - 3 PILIHAN TOMBOL BESAR */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-500 block">🅿️ PILIH BIAYA PARKIR DI LOKASI INI:</span>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateParking(stop.id, 'tidak_ada')}
                              className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border text-center transition-all ${
                                stop.pilihanParkir === 'tidak_ada'
                                  ? 'bg-gray-200 border-gray-400 text-gray-800'
                                  : 'bg-[#FAFBF9] border-gray-150 text-gray-500'
                              }`}
                            >
                              ⚪ TIDAK ADA
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateParking(stop.id, 'parkir_biasa')}
                              className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border text-center transition-all ${
                                stop.pilihanParkir === 'parkir_biasa'
                                  ? 'bg-[#F5E6A8] border-[#D4AF37] text-[#B8941F]'
                                  : 'bg-[#FAFBF9] border-gray-150 text-gray-500'
                              }`}
                            >
                              🅿️ BIASA (Rp {config.biayaParkirBiasa.toLocaleString('id-ID')})
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateParking(stop.id, 'parkir_pasar')}
                              className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border text-center transition-all ${
                                stop.pilihanParkir === 'parkir_pasar'
                                  ? 'bg-orange-100 border-orange-400 text-orange-600'
                                  : 'bg-[#FAFBF9] border-gray-150 text-gray-500'
                              }`}
                            >
                              🏪 PASAR (Rp {config.biayaParkirPasar.toLocaleString('id-ID')})
                            </button>
                          </div>
                        </div>

                        {/* INPUT NOTA BELANJAAN TOKO JIKA MAKANAN/BELANJA */}
                        {activeOrder.jenisLayanan === 'makanan' && !isStopSelesai && (
                          <div className="space-y-2 pt-2 border-t border-dashed">
                            <span className="text-[10px] font-bold text-[#046A38] block">🧾 SIMPAN NOTA TOKO BELANJAAN:</span>
                            
                            {stop.nota ? (
                              <div className="bg-[#E6F4EC] p-2 rounded-lg border border-[#0A8A4E]/20 text-[11px] text-emerald-800">
                                <p><strong>Toko:</strong> {stop.nota.namaToko}</p>
                                <p><strong>Total Nota:</strong> Rp {stop.nota.totalToko.toLocaleString('id-ID')}</p>
                                <button
                                  type="button"
                                  onClick={() => setActiveNotaStopId(stop.id)}
                                  className="text-xs text-[#046A38] font-bold hover:underline mt-1 block"
                                >
                                  Edit Nota Toko
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveNotaStopId(stop.id)}
                                className="w-full py-1.5 bg-[#E6F4EC] text-[#046A38] hover:bg-[#FAFBF9] rounded-lg border border-dashed border-[#0A8A4E]/40 font-bold text-[10px] flex items-center justify-center space-x-1"
                              >
                                <Camera size={12} />
                                <span>AMBIL FOTO / INPUT NOTA BELANJA</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* TOMBOL LANJUT STOP JIKA AKTIF */}
                        {isAktif && (
                          <button
                            type="button"
                            onClick={() => handleCompleteStop(stop.id)}
                            className="w-full py-2 bg-[#034F2A] text-white hover:bg-[#046A38] font-bold rounded-lg text-xs flex items-center justify-center space-x-1"
                          >
                            <Check size={12} />
                            <span>TANDAI TUJUAN {sIdx+1} SELESAI</span>
                          </button>
                        )}
                      </div>
                    );
                  })}

                </div>
              )}

              {/* NOTA TOKO DIALOG MODAL SIMULATOR */}
              {activeNotaStopId && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                  <form onSubmit={handleAddNotaToko} className="bg-white p-5 rounded-2xl max-w-sm w-full space-y-4 text-left">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-bold text-sm text-[#1A1A1A]">KAMERA & DATA NOTA SIMULATOR</h3>
                      <button type="button" onClick={() => setActiveNotaStopId(null)} className="text-gray-400 hover:text-gray-600 font-bold text-sm">✕</button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">NAMA WARUNG / TOKO</label>
                      <input
                        type="text"
                        required
                        value={notaStoreName}
                        onChange={(e) => setNotaStoreName(e.target.value)}
                        placeholder="cth. Warung Bu Ati"
                        className="w-full p-2 bg-[#FAFBF9] border rounded-lg text-xs focus:outline-[#046A38]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">DAFTAR BARANG & HARGA ASLI</label>
                      <textarea
                        required
                        rows={2}
                        value={notaGoods}
                        onChange={(e) => setNotaGoods(e.target.value)}
                        placeholder="cth. 2 Nasi Goreng, Es Teh"
                        className="w-full p-2 bg-[#FAFBF9] border rounded-lg text-xs focus:outline-[#046A38]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-500 mb-0.5">NOMINAL TOTAL BELANJA (RUPIAH)</label>
                      <input
                        type="number"
                        required
                        value={notaTotal}
                        onChange={(e) => setNotaTotal(e.target.value)}
                        placeholder="cth. 32000"
                        className="w-full p-2 bg-[#FAFBF9] border rounded-lg text-xs focus:outline-[#046A38] text-[#B8941F] font-bold"
                      />
                    </div>

                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-[#046A38]/30 flex items-center space-x-2 text-[10px] text-[#0A8A4E]">
                      <Camera size={16} />
                      <span>Simulasi: Foto kamera nota otomatis disisipkan setelah disimpan.</span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#034F2A] hover:bg-[#046A38] text-white font-bold rounded-xl text-xs"
                    >
                      SIMPAN & UNGGAH NOTA SEKARANG
                    </button>
                  </form>
                </div>
              )}

              {/* TARIF TOTAL DIHITUNG REALTIME */}
              <div className="bg-[#E6F4EC] p-3 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">Total Tagihan Penumpang</span>
                  <span className="text-lg font-black text-[#B8941F]">
                    Rp {activeOrder.totalBayarAkhir.toLocaleString('id-ID')}
                  </span>
                </div>
                <span className="bg-[#FAFBF9] text-[#046A38] text-[10px] font-bold px-2 py-1 rounded border border-gray-150">
                  {activeOrder.pembayaranTunai ? '💵 TUNAI' : '📱 DOMPET'}
                </span>
              </div>

              {/* BUTTON FINISH PESANAN */}
              <button
                onClick={handleCompleteOrder}
                className="w-full py-3.5 bg-[#059669] text-white font-black hover:bg-emerald-700 rounded-xl text-xs shadow-md border-b-2 border-emerald-800 tracking-wider flex items-center justify-center space-x-1"
              >
                <Check size={16} />
                <span>🏁 SELESAIKAN ORDERAN SEKARANG</span>
              </button>

              {/* EMERGENCY & PEMBATALAN */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-dashed">
                <button
                  type="button"
                  onClick={handleTriggerPanic}
                  className="py-2.5 bg-[#DC2626] text-white rounded-xl hover:bg-red-700 font-bold flex items-center justify-center space-x-1"
                >
                  <AlertTriangle size={12} />
                  <span>🚨 PANIK / SOS</span>
                </button>
                <button
                  type="button"
                  onClick={handleBatalOrder}
                  className="py-2.5 bg-gray-100 hover:bg-red-50 text-red-500 border rounded-xl font-bold flex items-center justify-center"
                >
                  ✕ Batalkan Order
                </button>
              </div>

            </div>

            {/* CHAT ROOM OVERLAY */}
            {isChatOpen && (
              <ChatRoom
                pesananId={activeOrder.id}
                senderId={profile?.id || 'sopir-id'}
                senderName={profile?.nama || 'Sopir Mitra'}
                senderRole="sopir"
                onClose={() => setIsChatOpen(false)}
              />
            )}

          </div>
        ) : null}

        {/* =====================================================================
            VIEW 2.2.2: AREA DOMPET & HISTORI TRANSAKSI (TABS)
            ===================================================================== */}
        
        {/* TABS SELECTOR */}
        <div className="flex bg-white p-1 rounded-xl border border-gray-150 shadow-2xs gap-1">
          <button
            onClick={() => setActiveHistoryTab('orders')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center flex items-center justify-center space-x-1 border ${
              activeHistoryTab === 'orders'
                ? 'bg-[#E6F4EC] border-[#046A38] text-[#034F2A]'
                : 'bg-white border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>🛵 Riwayat Order ({historyOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveHistoryTab('finance')}
            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all text-center flex items-center justify-center space-x-1 border ${
              activeHistoryTab === 'finance'
                ? 'bg-[#E6F4EC] border-[#046A38] text-[#034F2A]'
                : 'bg-white border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>💰 Dompet & Keuangan</span>
          </button>
        </div>

        {activeHistoryTab === 'finance' ? (
          <>
            {/* DOMPET BOX */}
            <div className="bg-white p-5 rounded-2xl border-t-2 border-[#D4AF37] shadow-xs text-left space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Dompet Ololu</h4>
                  <span className="text-2xl font-black text-[#B8941F]">
                    Rp {driverDetail.saldoDompet.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="bg-[#FAFBF9] p-2 rounded-xl text-[#B8941F] border">
                  <CreditCard size={20} />
                </div>
              </div>

              {/* TOP UP REQUEST WITH PHOTO PROOF */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-500 block">⚡ ISI SALDO DOMPET:</span>
                <div className="grid grid-cols-3 gap-1.5 text-xs text-gray-700">
                  {[10000, 25000, 50000, 100000, 200000, 500000].slice(0, 3).map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopUpAmount(amt)}
                      className={`py-1.5 rounded-lg border text-center font-bold ${topUpAmount === amt ? 'bg-[#FAFBF9] border-[#046A38] text-[#046A38]' : 'bg-white'}`}
                    >
                      {amt/1000} Rb
                    </button>
                  ))}
                </div>

                <div className="flex flex-col space-y-2">
                  <button
                    onClick={handlePickProof}
                    className={`w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center space-x-2 transition-all ${
                      topUpProof ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}
                  >
                    <Camera size={18} />
                    <span className="text-[10px] font-black uppercase">
                      {topUpProof ? 'Ganti Foto Bukti ✅' : 'Ambil Foto Bukti Transfer'}
                    </span>
                  </button>

                  {topUpProof && (
                    <div className="h-20 w-full rounded-xl border overflow-hidden bg-black/5 flex items-center justify-center relative group">
                      <img src={topUpProof} className="h-full object-contain" alt="Bukti Transfer" />
                      <button onClick={()=>setTopUpProof(null)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><X size={10} /></button>
                    </div>
                  )}

                  <button
                    onClick={handleSubmitDeposit}
                    disabled={!topUpProof || isSubmittingDeposit}
                    className="w-full py-3 bg-[#034F2A] text-white font-black rounded-xl text-xs uppercase shadow-md disabled:bg-gray-300 disabled:shadow-none transition-all"
                  >
                    {isSubmittingDeposit ? 'Mengirim...' : `Kirim Deposit Rp ${topUpAmount.toLocaleString('id-ID')}`}
                  </button>
                </div>
              </div>

              {/* SIMULASI TARIK DANA */}
              <form onSubmit={handleWithdraw} className="space-y-3 pt-3 border-t border-dashed">
                <span className="text-[10px] font-bold text-gray-500 block">💵 TARIK DANA KE REKENING (CASH OUT):</span>
                <div className="flex space-x-1.5">
                  <input
                    type="number"
                    placeholder="cth. 20000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 p-2 bg-[#FAFBF9] border rounded-lg text-xs text-[#1A1A1A]"
                  />
                  <button
                    type="submit"
                    className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold px-4 rounded-lg"
                  >
                    Ajukan Tarik
                  </button>
                </div>
                <p className="text-[9px] text-gray-400 italic">
                  *Tarik dana dikenakan biaya admin Rp {config.biayaAdminTarik.toLocaleString('id-ID')} per penarikan.
                </p>
              </form>

              {walletSuccess && <p className="text-xs text-[#059669] font-bold mt-2">{walletSuccess}</p>}
              {walletError && <p className="text-xs text-[#DC2626] font-bold mt-2">{walletError}</p>}
            </div>

            {/* DAFTAR RIWAYAT TRANSAKSI DOMPET */}
            <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-3 text-left">
              <div className="flex items-center space-x-2 border-b pb-2">
                <History size={16} className="text-[#046A38]" />
                <h3 className="text-xs font-bold text-gray-700 uppercase">RIWAYAT DOMPET MITRA</h3>
              </div>

              {transactions.length === 0 ? (
                <p className="text-xs text-gray-400 italic text-center py-4">Belum ada catatan keuangan.</p>
              ) : (
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {transactions.slice().reverse().map((tx) => (
                    <div key={tx.id} className="p-2.5 bg-[#FAFBF9] rounded-lg border border-gray-100 flex justify-between items-start text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 block">{new Date(tx.timestamp).toLocaleDateString('id-ID')} {new Date(tx.timestamp).toLocaleTimeString('id-ID')}</span>
                        <p className="font-semibold text-gray-800 leading-tight mt-0.5">{tx.deskripsi}</p>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase">Saldo Akhir: Rp {tx.saldoAkhir.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black font-mono ${
                          tx.jenis === 'pendapatan' || tx.jenis === 'topup' ? 'text-green-600' : 'text-red-500'
                        }`}>
                          {tx.jenis === 'pendapatan' || tx.jenis === 'topup' ? '+' : '-'} Rp {tx.jumlah.toLocaleString('id-ID')}
                        </span>
                        {tx.statusTarik && (
                          <span className={`block text-[8px] font-bold mt-1 ${
                            tx.statusTarik === 'menunggu' ? 'text-yellow-600 bg-yellow-50 px-1 rounded' :
                            tx.statusTarik === 'disetujui' ? 'text-green-600 bg-green-50 px-1 rounded' : 'text-red-600 bg-red-50 px-1'
                          }`}>
                            {tx.statusTarik.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* RIWAYAT ORDER MITRA */
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-3 text-left">
            <div className="flex items-center space-x-2 border-b pb-2">
              <History size={16} className="text-[#046A38]" />
              <h3 className="text-xs font-bold text-gray-700 uppercase">RIWAYAT PERJALANAN ANDA</h3>
            </div>

            {historyOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-400 italic text-xs space-y-2">
                <span className="text-3xl block">📭</span>
                <p>Belum ada orderan yang Anda selesaikan.</p>
                <p className="text-[10px] text-gray-400">Aktifkan status online dan tunggu pesanan masuk di atas!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {historyOrders
                  .slice()
                  .reverse()
                  .map((p) => {
                    const dateStr = p.waktuDibuat ? new Date(p.waktuDibuat).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Waktu tidak valid';

                    let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    let serviceIcon = "🛵";
                    if (p.jenisLayanan === 'makanan') {
                      badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                      serviceIcon = "🍔";
                    } else if (p.jenisLayanan === 'paket') {
                      badgeClass = "bg-blue-50 text-blue-700 border-blue-100";
                      serviceIcon = "📦";
                    } else if (p.jenisLayanan === 'barang_besar') {
                      badgeClass = "bg-purple-50 text-purple-700 border-purple-100";
                      serviceIcon = "🚗";
                    }

                    return (
                      <div key={p.id} className="p-3 bg-[#FAFBF9] rounded-xl border border-gray-150 space-y-2 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-base">{serviceIcon}</span>
                            <div>
                              <span className="text-[9px] text-gray-400 font-mono block leading-none">{p.nomorPesanan}</span>
                              <span className={`inline-block border text-[7px] font-black uppercase px-1.5 py-0.5 rounded mt-0.5 ${badgeClass}`}>
                                {p.jenisLayanan.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block leading-none">{dateStr}</span>
                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                              p.status === 'selesai' ? 'bg-green-50 text-green-700 border border-green-200' :
                              p.status === 'dibatalkan' ? 'bg-red-50 text-red-700 border border-red-200' :
                              'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            }`}>
                              {p.status === 'selesai' ? '✓ Selesai' :
                               p.status === 'dibatalkan' ? '✕ Batal' : '⏳ Proses'}
                            </span>
                          </div>
                        </div>

                        {/* RUTE JALUR */}
                        <div className="space-y-1 text-[11px] text-gray-600">
                          <p><span className="text-emerald-600 font-bold">Asal:</span> {p.asalAlamat}</p>
                          {p.daftarTujuan.map((stop, sIdx) => (
                            <p key={stop.id}>
                              <span className="text-red-500 font-bold">
                                {p.daftarTujuan.length > 1 ? `Stop ${sIdx + 1}:` : 'Tujuan:'}
                              </span>{' '}
                              {stop.alamat}
                            </p>
                          ))}
                        </div>

                        {/* INFO PENUMPANG & PENDAPATAN */}
                        <div className="pt-2 border-t border-dashed flex justify-between items-center bg-white p-2 rounded-lg border border-gray-150 text-[11px]">
                          <div>
                            <span className="text-[9px] text-gray-400 block font-bold uppercase leading-none">Pelanggan</span>
                            <span className="font-bold text-gray-800">{p.namaPenumpang}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] text-gray-400 block font-bold uppercase leading-none">Pendapatan Bersih</span>
                            <span className="font-bold text-emerald-600">
                              + Rp {p.totalBayarAkhir.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL NOTIFIKASI PESANAN REAL-TIME */}
      {realtimeOrderAlert && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full overflow-hidden border border-gray-100 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header / Alert Badge */}
            <div className="bg-[#046A38] text-white p-5 text-center relative">
              <button 
                onClick={() => setRealtimeOrderAlert(null)}
                className="absolute top-4 right-4 text-white/75 hover:text-white"
              >
                <X size={18} />
              </button>
              
              <div className="bg-white/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-[#D4AF37] mb-3 animate-bounce">
                <Bell size={22} className="fill-current" />
              </div>
              
              <h3 className="font-bold text-lg tracking-tight">PESANAN BARU MASUK!</h3>
              <p className="text-[10px] text-[#FAFBF9]/80 font-mono tracking-widest mt-0.5 uppercase">
                {realtimeOrderAlert.nomorPesanan}
              </p>
            </div>

            {/* Content Details */}
            <div className="p-5 space-y-4 text-left">
              {/* Jenis Layanan & Tarif */}
              <div className="bg-[#FAFBF9] p-4 rounded-2xl border border-gray-150 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold uppercase">Layanan</span>
                  <span className="text-xs font-black text-[#046A38] flex items-center space-x-1 uppercase">
                    <span>{realtimeOrderAlert.jenisLayanan === 'ojek' ? '🛵 OJEK RIDE' : 
                          realtimeOrderAlert.jenisLayanan === 'makanan' ? '🍔 ANTAR MAKANAN' :
                          realtimeOrderAlert.jenisLayanan === 'paket' ? '📦 ANTAR PAKET' : '🚚 BARANG BESAR'}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-bold uppercase">Tarif Bersih</span>
                  <span className="text-base font-black text-[#B8941F]">
                    Rp {realtimeOrderAlert.totalBayarAkhir.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Rute Alamat */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#046A38] text-white font-bold flex items-center justify-center text-[8px] mt-0.5 flex-shrink-0">
                    A
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-500 text-[10px] uppercase">Penjemputan</h4>
                    <p className="text-gray-800 line-clamp-2">{realtimeOrderAlert.asalAlamat}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-4 h-4 rounded-full bg-[#D4AF37] text-white font-bold flex items-center justify-center text-[8px] mt-0.5 flex-shrink-0">
                    B
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-500 text-[10px] uppercase">Tujuan</h4>
                    <p className="text-gray-800 line-clamp-2">
                      {realtimeOrderAlert.daftarTujuan[0]?.alamat}
                      {realtimeOrderAlert.daftarTujuan.length > 1 && ` (+${realtimeOrderAlert.daftarTujuan.length - 1} stop)`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Jarak */}
              <div className="border-t border-dashed pt-3 flex justify-between items-center text-xs text-gray-500 font-semibold">
                <span>Estimasi Jarak Tempuh:</span>
                <span className="font-mono text-gray-800">{realtimeOrderAlert.totalJarakKm.toFixed(1)} KM</span>
              </div>

              {/* Countdown Circular Progress / Indicator */}
              <div className="pt-2 text-center">
                {isAutobidActive ? (
                  <div className="bg-[#E6F4EC] p-3 rounded-2xl border border-emerald-100 flex items-center justify-center space-x-2">
                    <Sparkles size={16} className="text-[#046A38] animate-spin" />
                    <span className="text-xs font-black text-[#046A38] uppercase">
                      Autobid Aktif! Mengambil otomatis dalam {autobidCountdown}s
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 font-semibold">
                    Kesempatan menerima: <span className="text-[#DC2626] font-bold font-mono">{alertCountdown} detik</span>
                  </div>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleAcceptRealtimeOrder(realtimeOrderAlert.id)}
                  disabled={!!orderAcceptingStatus}
                  className="w-full py-3.5 bg-[#034F2A] hover:bg-[#046A38] text-white text-xs font-black rounded-2xl border border-[#D4AF37] shadow-md transition-all tracking-wider disabled:opacity-50"
                >
                  {orderAcceptingStatus ? orderAcceptingStatus : '🟢 TERIMA PENAWARAN PESANAN'}
                </button>
                
                <button
                  onClick={() => setRealtimeOrderAlert(null)}
                  disabled={!!orderAcceptingStatus}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-bold rounded-xl transition-all"
                >
                  Lewati Penawaran Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
