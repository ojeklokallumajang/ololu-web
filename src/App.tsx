/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import AdminView from './components/AdminView';
import { PeranPengguna } from './types';
import { OloluStore } from './services/store';
import { ShieldAlert, AlertTriangle, Info, BellRing, Phone, ShieldCheck, UserPlus, LogIn, Camera, Check, ArrowRight, Upload, KeyRound, ArrowLeft, Calendar, MapPin as MapPinIcon } from 'lucide-react';
import OloluLogo from './components/OloluLogo';

// INNER ERROR BOUNDARY FOR VIEWS
class ErrorBoundary extends React.Component<{children: React.ReactNode, name: string}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center space-y-4">
          <AlertTriangle size={48} className="mx-auto text-red-500" />
          <h2 className="font-bold">Layar {this.props.name} Gagal Dimuat</h2>
          <p className="text-xs text-gray-500">{this.state.error?.toString()}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#046A38] text-white rounded-xl text-xs font-bold">Coba Lagi</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  console.log("App Component Rendering...");
  const [sesi, setSesi] = useState<{ userId: string; role: PeranPengguna } | null>(null);
  const [role, setRole] = useState<PeranPengguna>('penumpang');
  const [showLogin, setShowLogin] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [lockedOrder, setLockedOrder] = useState<{ orderId: string; role: PeranPengguna } | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginStep, setLoginStep] = useState<'peran' | 'form' | 'otp' | 'reset'>('peran');
  const [selectedRole, setSelectedRole] = useState<PeranPengguna>('penumpang');

  // Registration States
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Driver Documents
  const [docKtp, setDocKtp] = useState<string | null>(null);
  const [docSim, setDocSim] = useState<string | null>(null);
  const [docStnk, setDocStnk] = useState<string | null>(null);
  const [docVehicle, setDocVehicle] = useState<string | null>(null);
  const [platNomor, setPlatNomor] = useState('');
  const [jenisMotor, setJenisMotor] = useState('');
  const [warnaKendaraan, setWarnaKendaraan] = useState('');
  const [jenisKendaraan, setJenisKendaraan] = useState<'motor' | 'mobil'>('motor');
  const [bisaBarangBesar, setBisaBarangBesar] = useState(false);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [globalPanicNotification, setGlobalPanicNotification] = useState<{
    show: boolean;
    pelapor: string;
    tipe: string;
  }>({ show: false, pelapor: '', tipe: '' });

  useEffect(() => {
    console.log("App Initializing...");
    async function checkSession() {
      try {
        const s = await OloluStore.getSesi();
        console.log("Session loaded:", s);
        if (s) {
          setSesi(s);
          setRole(s.role);
          setShowLogin(false);

          const lock = OloluStore.getLocalOrderLock();
          console.log("Lock loaded:", lock);
          if (lock) {
            setLockedOrder(lock);
            if (lock.role) setRole(lock.role);
          }
        }
      } catch (err: any) {
        console.error("Session check error:", err);
        setFatalError(err?.message || "Gagal memuat sesi");
      } finally {
        console.log("App Initialization complete.");
        setInitializing(false);
      }
    }
    checkSession();
  }, []);

  const handleStartRegister = (peran: PeranPengguna) => {
    setSelectedRole(peran);
    setAuthMode('register');
    setLoginStep('form');
    setProfilePic(null);
    setTempatLahir(''); setTanggalLahir('');
    setDocKtp(null); setDocSim(null); setDocStnk(null); setDocVehicle(null);
    setPlatNomor(''); setJenisMotor(''); setBisaBarangBesar(false);
    setError('');
  };

  const handleLoginSubmit = async () => {
    if (!phone || !password) {
      setError('Masukkan nomor HP dan kata sandi');
      return;
    }
    setLoading(true);
    const res = await OloluStore.loginPengguna(phone, password);
    if (res.success && res.profil) {
      OloluStore.setSesi({ userId: res.profil.id, role: res.profil.peran });
      setRole(res.profil.peran);
      setShowLogin(false);
      setError('');
    } else {
      setError(res.error || 'Gagal masuk');
    }
    setLoading(false);
  };

  const handleRegisterSubmit = async () => {
    if (!name || !phone || !password || !tempatLahir || !tanggalLahir) {
      setError('Lengkapi data akun pendaftaran');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }
    if (selectedRole === 'sopir') {
      if (!profilePic) { setError('Foto profil wajib diunggah'); return; }
      if (!docKtp || !docSim || !docStnk || !docVehicle) { setError('Semua berkas dokumen wajib diunggah'); return; }
      if (!platNomor || !jenisMotor || !warnaKendaraan) { setError('Plat nomor, tipe, dan warna kendaraan wajib diisi'); return; }
    }
    setLoading(true);
    setError('');
    await OloluStore.kirimFonnteOtp(phone);
    setLoading(false);
    setLoginStep('otp');
  };

  const handleForgotSubmit = async () => {
    if (!phone) {
      setError('Masukkan nomor HP terdaftar');
      return;
    }
    setLoading(true);
    setError('');
    await OloluStore.kirimFonnteOtp(phone);
    setLoading(false);
    setLoginStep('otp');
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }

    setLoading(true);
    if (OloluStore.verifikasiOtp(phone, otp)) {
      if (authMode === 'forgot') {
        setLoginStep('reset');
        setLoading(false);
      } else {
        let finalRole = selectedRole;
        if (phone === '6285156766317') finalRole = 'admin';

        try {
          const res = await OloluStore.registerPengguna(name, phone, finalRole, password, tempatLahir, tanggalLahir);
          if (res.success && res.profil) {
            const profil = { ...res.profil };
            if (profilePic) profil.fotoProfil = profilePic;

            if (finalRole === 'sopir' || finalRole === 'admin') {
              await OloluStore.updateSopirDokumen(profil.id, {
                fotoKtp: docKtp || '', fotoSim: docSim || '', fotoStnk: docStnk || '',
                fotoKendaraan: docVehicle || '', platNomor, jenisMotor, bisaBarangBesar,
                jenisKendaraan, warnaKendaraan
              });
            }
            OloluStore.setSesi({ userId: profil.id, role: profil.peran });
            console.log("Session set success for:", profil.id);
            setRole(profil.peran);
            setShowLogin(false);
            console.log("Login modal closed.");
          } else {
            setError(res.error || "Gagal mendaftar");
          }
        } catch (err: any) {
          console.error("Registration crash:", err);
          setFatalError("Gagal memproses pendaftaran: " + (err?.message || "Unknown error"));
        }
        setLoading(false);
      }
    } else {
      setError('Kode OTP salah atau kedaluwarsa');
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || password !== confirmPassword) {
      setError('Kata sandi baru tidak cocok');
      return;
    }
    setLoading(true);
    const res = await OloluStore.resetPassword(phone, password);
    if (res.success) {
      alert("Kata sandi berhasil diperbarui. Silakan login kembali.");
      setAuthMode('login');
      setLoginStep('form');
      setPassword(''); setConfirmPassword('');
    } else {
      setError(res.error || "Gagal reset password");
    }
    setLoading(false);
  };

  const handleFilePicker = (setter: (val: string) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setter(reader.result as string);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleLogout = () => {
    OloluStore.setSesi(null);
    setShowLogin(true);
    setAuthMode('login');
    setLoginStep('form');
  };

  const handleNotifyPanic = (pelapor?: string, tipe?: string) => {
    setGlobalPanicNotification({
      show: true,
      pelapor: pelapor || 'Seseorang',
      tipe: tipe || 'Darurat SOS'
    });
  };

  const handleGotoAdminPanicRoom = () => {
    setGlobalPanicNotification({ show: false, pelapor: '', tipe: '' });
    setRole('admin');
  };

  if (fatalError) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[40px] shadow-xl border-2 border-red-100 max-w-sm w-full space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={48} className="text-red-500 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Sistem Terhenti</h1>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">Terjadi kesalahan teknis saat memproses data akun Anda. Jangan khawatir, data Anda tetap aman.</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl text-[10px] font-mono text-red-600 break-all border border-red-50 text-left">
            Error: {fatalError}
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="w-full py-4 bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
          >
            Bersihkan Cache & Reset
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 text-gray-400 font-bold text-[10px] uppercase"
          >
            Muat Ulang Saja
          </button>
        </div>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#046A38] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold tracking-widest uppercase">Ololu Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-[#1A1A1A] font-sans antialiased flex flex-col">
      <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 99999, fontSize: '8px', color: '#ccc' }}>v1.0.2-stable</div>

      {fatalError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <h1 className="text-red-600 font-black">Sistem Error</h1>
          <p className="text-xs text-gray-500">{fatalError}</p>
          <button onClick={() => location.reload()} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">Muat Ulang</button>
        </div>
      ) : initializing ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#046A38] text-white">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest">Ololu Memuat...</p>
        </div>
      ) : (
        <div className="flex-grow w-full max-w-7xl mx-auto flex flex-col justify-center items-center">
          {!showLogin ? (
            <div className="w-full md:max-w-[420px] min-h-screen md:min-h-[780px] md:h-[780px] bg-white md:shadow-2xl md:rounded-[36px] border-none md:border md:border-gray-100 flex flex-col relative overflow-hidden self-center">
              {!role ? (
                <div className="flex-1 flex items-center justify-center">Error Peran.</div>
              ) : role === 'admin' ? (
                <div className="flex-1 overflow-y-auto scrollbar-none"><AdminView /></div>
              ) : (
                <div className="flex-1 overflow-y-auto pb-14 relative scrollbar-none">
                  {role === 'penumpang' && (
                    <PassengerView
                      onNotifyAdminPanic={handleNotifyPanic}
                      onLogout={handleLogout}
                      onRoleChange={(r) => setRole(r)}
                      lockedOrderId={lockedOrder?.role === 'penumpang' ? lockedOrder.orderId : undefined}
                    />
                  )}
                  {role === 'sopir' && (
                    <DriverView
                      onNotifyAdminPanic={handleNotifyPanic}
                      onLogout={handleLogout}
                      lockedOrderId={lockedOrder?.role === 'sopir' ? lockedOrder.orderId : undefined}
                    />
                  )}
                </div>
              )}
              <footer className="absolute bottom-0 left-0 right-0 bg-[#E6F4EC] border-t border-emerald-950/5 py-2.5 text-center text-[8px] text-[#046A38] font-bold tracking-widest uppercase shrink-0">© 2026 PT Ololu Lumajang</footer>
            </div>
          ) : (
            <div className="fixed inset-0 bg-[#046A38] flex items-center justify-center p-4 z-[10000]">
               {/* Minimal Login UI for testing */}
               <div className="bg-white p-10 rounded-3xl text-center space-y-4 max-w-sm w-full">
                  <h1 className="font-black text-xl text-[#046A38]">Ololu Login</h1>
                  {authMode === 'login' ? (
                    <div className="space-y-4">
                       <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="628..." className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none" />
                       <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none" />
                       <button onClick={handleLoginSubmit} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl">MASUK</button>
                       <button onClick={()=>setAuthMode('register')} className="text-xs font-bold text-gray-400">Daftar Akun Baru</button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                       {/* Register minimal UI */}
                       <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Lengkap" className="w-full p-3 bg-gray-50 rounded-xl" />
                       <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Nomor WhatsApp" className="w-full p-3 bg-gray-50 rounded-xl" />
                       <button onClick={handleRegisterSubmit} className="w-full py-3 bg-[#046A38] text-white font-black rounded-xl">DAFTAR</button>
                       <button onClick={()=>setAuthMode('login')} className="text-xs font-bold text-gray-400">Kembali ke Login</button>
                    </div>
                  )}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
