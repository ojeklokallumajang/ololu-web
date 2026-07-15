/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import AdminView from './components/AdminView';
import SupabaseGuide from './components/SupabaseGuide';
import { PeranPengguna } from './types';
import { OloluStore } from './services/store';
import { ShieldAlert, AlertTriangle, Info, BellRing, Phone, ShieldCheck, UserPlus, LogIn } from 'lucide-react';
import OloluLogo from './components/OloluLogo';
import DesktopDashboard from './components/DesktopDashboard';

export default function App() {
  const [sesi, setSesi] = useState(OloluStore.getSesi());
  const [role, setRole] = useState<PeranPengguna | 'guide'>(sesi?.role || 'penumpang');
  const [showLogin, setShowLogin] = useState(!sesi);
  const [loginStep, setLoginStep] = useState<'peran' | 'form' | 'otp'>('peran');
  const [selectedRole, setSelectedRole] = useState<PeranPengguna>('penumpang');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [globalPanicNotification, setGlobalPanicNotification] = useState<{
    show: boolean;
    pelapor: string;
    tipe: string;
  }>({ show: false, pelapor: '', tipe: '' });

  // REAKTIF TERHADAP STORE UPDATE
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = OloluStore.subscribeToStore(() => {
      const currentSesi = OloluStore.getSesi();
      setSesi(currentSesi);
      if (!currentSesi) setShowLogin(true);
      setTick(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const handleStartLogin = (peran: PeranPengguna) => {
    setSelectedRole(peran);
    setLoginStep('form');
  };

  const handleKirimOtp = () => {
    if (!phone) {
      setError('Masukkan nomor HP Anda');
      return;
    }
    setLoading(true);
    setError('');

    // Simulasi kirim OTP via Fonnte yang ada di store
    OloluStore.kirimFonnteOtp(phone);

    setTimeout(() => {
      setLoading(false);
      setLoginStep('otp');
    }, 1500);
  };

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }

    setLoading(true);
    if (OloluStore.verifikasiOtp(phone, otp)) {
      // Register atau Login
      const profil = OloluStore.registerPengguna(name || 'User Baru', phone, selectedRole);
      OloluStore.setSesi({ userId: profil.id, role: profil.peran });
      setRole(profil.peran);
      setShowLogin(false);
      setLoading(false);
    } else {
      setError('Kode OTP salah atau kedaluwarsa');
      setLoading(false);
    }
  };

  const handleLogout = () => {
    OloluStore.setSesi(null);
    setShowLogin(true);
    setLoginStep('peran');
  };

  // EVENT HANDLER KETIKA TOMBOL DARURAT / PANIC DITEKAN
  const handleNotifyPanic = () => {
    // Cari laporan darurat terbaru yang berstatus 'baru'
    const latest = OloluStore.getAllEmergency().find(e => e.status === 'baru');
    if (latest) {
      setGlobalPanicNotification({
        show: true,
        pelapor: latest.namaPelapor,
        tipe: latest.peranPelapor
      });

      // Bunyi alarm darurat instan menggunakan Web Audio API
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // Note B5
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
      } catch (err) {}
    }
  };

  // Tutup notifikasi panic dan alihkan ke panel Admin
  const handleGotoAdminPanicRoom = () => {
    setGlobalPanicNotification({ show: false, pelapor: '', tipe: '' });
    setRole('admin');
    
    // Scroll otomatis ke radar panik jika memungkinkan
    setTimeout(() => {
      const el = document.getElementById('driver-dashboard') || document.body;
      el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-[#1A1A1A] font-sans antialiased selection:bg-[#046A38] selection:text-[#D4AF37] flex flex-col">
      
      {/* AUTH GATE / LOGIN MODAL */}
      {showLogin && (
        <div className="fixed inset-0 bg-[#046A38]/95 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">

            {/* Header Login */}
            <div className="bg-[#E6F4EC] p-8 text-center border-b border-emerald-100">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-emerald-50">
                <OloluLogo className="w-12 h-12 text-[#046A38]" />
              </div>
              <h1 className="text-2xl font-black text-[#046A38] tracking-tight">Selamat Datang</h1>
              <p className="text-xs text-emerald-700 font-medium mt-1">Aplikasi Ojek & Pengantaran Lumajang</p>
            </div>

            <div className="p-8">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2 text-red-600 animate-shake">
                  <AlertTriangle size={14} />
                  <span className="text-[11px] font-bold">{error}</span>
                </div>
              )}

              {loginStep === 'peran' && (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Pilih Peran Anda</p>
                  <button
                    onClick={() => handleStartLogin('penumpang')}
                    className="w-full group flex items-center justify-between p-4 bg-white border-2 border-gray-100 hover:border-[#046A38] rounded-2xl transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38] group-hover:bg-[#046A38] group-hover:text-white transition-colors">
                        <UserPlus size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">Penumpang</p>
                        <p className="text-[10px] text-gray-500 font-medium">Butuh tumpangan atau kirim barang</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleStartLogin('sopir')}
                    className="w-full group flex items-center justify-between p-4 bg-white border-2 border-gray-100 hover:border-[#046A38] rounded-2xl transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38] group-hover:bg-[#046A38] group-hover:text-white transition-colors">
                        <Phone size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm">Mitra Sopir</p>
                        <p className="text-[10px] text-gray-500 font-medium">Ingin menambah penghasilan</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setRole('guide'); setShowLogin(false); }}
                    className="w-full mt-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#046A38] transition-colors"
                  >
                    Lihat Panduan Developer
                  </button>
                </div>
              )}

              {loginStep === 'form' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama Anda"
                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#046A38] focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor WhatsApp</label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="628xxx"
                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#046A38] focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleKirimOtp}
                    disabled={loading}
                    className="w-full py-4 bg-[#046A38] hover:bg-[#034F2A] disabled:bg-gray-300 text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg shadow-emerald-950/20 transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <span>Lanjutkan</span>
                        <LogIn size={16} />
                      </>
                    )}
                  </button>

                  <button onClick={() => setLoginStep('peran')} className="w-full text-[10px] font-bold text-gray-400 hover:text-gray-600">Kembali</button>
                </div>
              )}

              {loginStep === 'otp' && (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg">Verifikasi Kode OTP</h3>
                    <p className="text-xs text-gray-500">Kode telah dikirim ke WhatsApp <strong>{phone}</strong></p>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="000000"
                    className="w-full text-center p-4 bg-gray-50 border-2 border-transparent focus:border-[#046A38] focus:bg-white rounded-2xl outline-none transition-all text-2xl font-black tracking-[0.5em]"
                  />

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-bold leading-relaxed italic">
                      💡 Simulasi: Gunakan kode "999999" atau cek log console jika WhatsApp sedang tidak aktif.
                    </p>
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    className="w-full py-4 bg-[#046A38] hover:bg-[#034F2A] disabled:bg-gray-300 text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all"
                  >
                    {loading ? "Memproses..." : "Konfirmasi OTP"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* GLOBAL HIGH-URGENCY EMERGENCY MODAL POPUP */}
      {globalPanicNotification.show && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-4 border-[#DC2626] p-6 max-w-sm w-full text-center space-y-4 animate-bounce shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 border-2 border-red-500 animate-pulse">
              <AlertTriangle size={36} className="text-[#DC2626]" />
            </div>
            
            <h2 className="text-[#DC2626] font-black text-lg tracking-wide uppercase">
              🚨 SINYAL DARURAT DIAKTIFKAN 🚨
            </h2>
            
            <p className="text-sm text-gray-700 leading-relaxed">
              Sinyal darurat <strong>PANIC BUTTON</strong> baru saja dipicu oleh mitra/penumpang bernama <strong>{globalPanicNotification.pelapor}</strong> ({globalPanicNotification.tipe.toUpperCase()}) di Lumajang!
            </p>

            <div className="bg-red-50 p-3 rounded-2xl border border-red-200">
              <p className="text-[11px] text-[#DC2626] font-bold">
                ⚠️ POSISI GPS AKURAT DAN INFORMASI KONTAK TELAH DIKIRIM KE SISTEM LOG RADAR ADMIN.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleGotoAdminPanicRoom}
                className="w-full py-3 bg-[#DC2626] hover:bg-red-700 text-white font-black rounded-xl text-xs tracking-wider uppercase shadow-md transition-all"
              >
                Buka Radar Penyelamatan Admin
              </button>
              <button
                onClick={() => setGlobalPanicNotification({ show: false, pelapor: '', tipe: '' })}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold rounded-lg text-xs"
              >
                Abaikan (Simulasi Selesai)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE WRAPPER TO MERGE THE VIEWS DYNAMICALLY ACCORDING TO USER'S DEVICE */}
      <div className="flex-grow w-full max-w-7xl mx-auto p-0 md:p-4 lg:p-6 flex flex-col justify-center items-center">
        
        {role === 'admin' ? (
          <div className="w-full flex flex-col xl:flex-row items-stretch justify-center gap-6">
            
            {/* Live Operational Control Telemetry - PC Only */}
            <div className="hidden xl:flex w-[400px] shrink-0">
              <DesktopDashboard />
            </div>

            {/* Main Admin Panel Database & Configurations */}
            <div className="flex-1 bg-white shadow-xl rounded-none md:rounded-3xl border-none md:border md:border-gray-100 overflow-hidden">
              <div className="p-4 md:p-6">
                <AdminView />
              </div>
            </div>

          </div>
        ) : (
          /* For PASSENGER, DRIVER, or GUIDE: Render a beautiful, premium, clean mobile card viewport on PC or full-width on mobile */
          <div className="w-full md:max-w-[420px] min-h-screen md:min-h-[780px] md:h-[780px] bg-white md:shadow-2xl md:rounded-[36px] border-none md:border md:border-gray-100 flex flex-col relative overflow-hidden self-center">
            
            {/* COMPACT SUB-HEADER */}
            <div className="bg-[#E6F4EC] px-5 py-2.5 flex items-center justify-between text-[9px] text-[#046A38] font-bold uppercase tracking-widest shrink-0">
              <span className="flex items-center space-x-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#059669] inline-block animate-pulse"></span>
                <span>Realtime Active</span>
              </span>
              <span>PT Ololu Lumajang</span>
            </div>

            {/* SCROLLABLE INNER VIEWPORT CONTAINER */}
            <div className="flex-1 overflow-y-auto pb-14 relative scrollbar-none">
              {role === 'penumpang' && (
                <PassengerView onNotifyAdminPanic={handleNotifyPanic} />
              )}

              {role === 'sopir' && (
                <DriverView onNotifyAdminPanic={handleNotifyPanic} />
              )}

              {role === 'guide' && (
                <SupabaseGuide />
              )}
            </div>

            {/* FOOTER INFORMASI DENGAN PALETTE HIJAU & EMAS */}
            <footer className="absolute bottom-0 left-0 right-0 bg-[#E6F4EC] border-t border-emerald-950/5 py-2.5 text-center text-[8px] text-[#046A38] font-bold tracking-widest uppercase shrink-0">
              © 2026 PT Ololu Pengantaran Nusantara Lumajang
            </footer>

          </div>
        )}

      </div>

    </div>
  );
}
