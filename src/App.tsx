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
import { ShieldAlert, AlertTriangle, Info, BellRing } from 'lucide-react';
import OloluLogo from './components/OloluLogo';
import DesktopDashboard from './components/DesktopDashboard';

export default function App() {
  const [role, setRole] = useState<PeranPengguna | 'guide'>('penumpang');
  const [globalPanicNotification, setGlobalPanicNotification] = useState<{
    show: boolean;
    pelapor: string;
    tipe: string;
  }>({ show: false, pelapor: '', tipe: '' });

  // REAKTIF TERHADAP STORE UPDATE
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsubscribe = OloluStore.subscribeToStore(() => {
      setTick(prev => prev + 1);
    });
    return () => unsubscribe();
  }, []);

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
