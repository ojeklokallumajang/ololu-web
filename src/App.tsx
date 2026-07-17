/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import AdminView from './components/AdminView';
import { PeranPengguna } from './types';
import { OloluStore } from './services/store';
import { AlertTriangle, ShieldCheck, Camera, Upload, KeyRound } from 'lucide-react';

// --- ROBUST ERROR BOUNDARY ---
class SafeErrorBoundary extends React.Component<{children: React.ReactNode, name: string}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) {
    console.error(`[CRASH] ${this.props.name}:`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center space-y-4 bg-white min-h-screen flex flex-col items-center justify-center">
          <AlertTriangle size={48} className="text-red-500 animate-bounce" />
          <h2 className="font-black text-gray-800">Layar {this.props.name} Bermasalah</h2>
          <p className="text-[10px] text-gray-500 font-mono bg-gray-50 p-3 rounded-lg border max-w-xs break-all">
            {this.state.error?.toString()}
          </p>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-[#046A38] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
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
    async function checkSession() {
      try {
        const s = await OloluStore.getSesi();
        if (s) {
          setSesi(s);
          setRole(s.role);
          setShowLogin(false);
          const lock = OloluStore.getLocalOrderLock();
          if (lock) {
            setLockedOrder(lock);
            if (lock.role) setRole(lock.role);
          }
        }
      } catch (err: any) {
        setFatalError(err?.message || "Gagal memuat sesi");
      } finally {
        setInitializing(false);
      }
    }
    checkSession();
  }, []);

  const handleStartRegister = (peran: PeranPengguna) => {
    setSelectedRole(peran);
    setAuthMode('register');
    setLoginStep('form');
  };

  const handleLoginSubmit = async () => {
    if (!phone || !password) { setError('Masukkan nomor HP dan sandi'); return; }
    setLoading(true);
    const res = await OloluStore.loginPengguna(phone, password);
    if (res.success && res.profil) {
      OloluStore.setSesi({ userId: res.profil.id, role: res.profil.peran });
      setRole(res.profil.peran);
      setShowLogin(false);
    } else { setError(res.error || 'Gagal masuk'); }
    setLoading(false);
  };

  const handleRegisterSubmit = async () => {
    if (!name || !phone || !password || !tempatLahir || !tanggalLahir) {
      setError('Lengkapi data pendaftaran termasuk TTL');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi sandi tidak cocok');
      return;
    }
    if (selectedRole === 'sopir') {
      if (!profilePic) { setError('Foto profil wajib'); return; }
      if (!docKtp || !docSim || !docStnk || !docVehicle || !platNomor || !jenisMotor) {
        setError('Lengkapi semua berkas dan data kendaraan!');
        return;
      }
    }
    setLoading(true);
    await OloluStore.kirimFonnteOtp(phone);
    setLoading(false);
    setLoginStep('otp');
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) { setError('Masukkan 6 digit OTP'); return; }
    setLoading(true);
    if (OloluStore.verifikasiOtp(phone, otp)) {
      let finalRole = selectedRole;
      if (phone === '6285156766317') finalRole = 'admin';

      try {
        const res = await OloluStore.registerPengguna(name, phone, finalRole, password, tempatLahir, tanggalLahir, profilePic || undefined);
        if (res.success && res.profil) {
          if (finalRole === 'sopir' || finalRole === 'admin') {
            await OloluStore.updateSopirDokumen(res.profil.id, {
              fotoKtp: docKtp || '', fotoSim: docSim || '', fotoStnk: docStnk || '',
              fotoKendaraan: docVehicle || '', platNomor, jenisMotor, bisaBarangBesar,
              jenisKendaraan, warnaKendaraan
            });
          }
          OloluStore.setSesi({ userId: res.profil.id, role: res.profil.peran });
          setRole(res.profil.peran);
          setShowLogin(false);
        } else { setError(res.error || "Gagal mendaftar"); }
      } catch (err: any) {
        setFatalError("Registration crash: " + err.message);
      }
    } else { setError('Kode OTP salah'); }
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
    setRole('penumpang');
  };

  const handleNotifyPanic = (pelapor?: string, tipe?: string) => {
    setGlobalPanicNotification({
      show: true,
      pelapor: pelapor || 'Seseorang',
      tipe: tipe || 'Darurat SOS'
    });
  };

  if (fatalError) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle size={64} className="text-red-500 mb-4" />
        <h1 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Sistem Terhenti</h1>
        <p className="text-xs text-gray-500 mt-2">{fatalError}</p>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="mt-8 px-8 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest">Bersihkan & Reset</button>
      </div>
    );
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#046A38] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">Ololu Lumajang</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF9] flex flex-col items-center antialiased">
      {showLogin ? (
        <div className="fixed inset-0 bg-[#046A38] z-[10000] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-10 space-y-8 shadow-2xl my-auto text-left">
            <div className="text-center space-y-1">
              <h1 className="text-3xl font-black text-[#046A38] tracking-tighter">OLOLU</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Ojek Lokal Lumajang</p>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 p-3 rounded-2xl border border-red-100">{error}</p>}

            {authMode === 'login' ? (
              <div className="space-y-4">
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp (628...)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38]" />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Kata Sandi" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38]" />
                <button onClick={handleLoginSubmit} disabled={loading} className="w-full py-4.5 bg-[#046A38] text-white font-black rounded-2xl uppercase tracking-widest shadow-lg active:scale-95 transition-all">{loading?"Masuk...":"Masuk Sekarang"}</button>
                <button onClick={()=>setAuthMode('register')} className="w-full text-xs font-bold text-gray-400 mt-2 text-center hover:text-[#046A38] transition-colors">Daftar Akun Baru</button>
              </div>
            ) : loginStep === 'peran' ? (
              <div className="space-y-4">
                <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Daftar Sebagai:</p>
                <button onClick={()=>handleStartRegister('penumpang')} className="w-full p-5 border-2 border-gray-100 rounded-3xl font-black text-left hover:border-[#046A38] transition-all flex justify-between items-center group"><span>👤 PENUMPANG</span><span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span></button>
                <button onClick={()=>handleStartRegister('sopir')} className="w-full p-5 border-2 border-gray-100 rounded-3xl font-black text-left hover:border-[#046A38] transition-all flex justify-between items-center group"><span>🛵 MITRA DRIVER</span><span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span></button>
                <button onClick={()=>setAuthMode('login')} className="w-full text-xs font-bold text-gray-400 mt-6 text-center hover:underline">Sudah punya akun? Login</button>
              </div>
            ) : loginStep === 'form' ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-2 mb-2">
                  <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => handleFilePicker(setProfilePic)}>
                    {profilePic ? <img src={profilePic} className="w-full h-full object-cover" /> : <Camera size={24} className="text-gray-300" />}
                  </div>
                  <label className="text-[9px] font-black text-gray-400 uppercase">Foto Profil {selectedRole==='sopir'&&'(Wajib)'}</label>
                </div>
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Lengkap" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38]" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" value={tempatLahir} onChange={e=>setTempatLahir(e.target.value)} placeholder="Tempat Lahir" className="w-full p-3.5 bg-gray-50 rounded-xl outline-none text-[11px] font-bold border-2 border-transparent focus:border-[#046A38]" />
                  <input type="date" value={tanggalLahir} onChange={e=>setTanggalLahir(e.target.value)} className="w-full p-3.5 bg-gray-50 rounded-xl outline-none text-[11px] font-bold border-2 border-transparent focus:border-[#046A38]" />
                </div>
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp (628...)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38]" />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sandi Baru" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38]" />
                <input type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Ulangi Sandi" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38]" />

                {selectedRole === 'sopir' && (
                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Berkas Kendaraan & Driver</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={()=>handleFilePicker(setDocKtp)} className={`p-3 rounded-xl border-2 border-dashed text-[8px] font-black ${docKtp?'bg-emerald-50 border-emerald-500 text-emerald-600':'text-gray-400 border-gray-100'}`}>FOTO KTP {docKtp&&'✅'}</button>
                      <button onClick={()=>handleFilePicker(setDocSim)} className={`p-3 rounded-xl border-2 border-dashed text-[8px] font-black ${docSim?'bg-emerald-50 border-emerald-500 text-emerald-600':'text-gray-400 border-gray-100'}`}>FOTO SIM {docSim&&'✅'}</button>
                      <button onClick={()=>handleFilePicker(setDocStnk)} className={`p-3 rounded-xl border-2 border-dashed text-[8px] font-black ${docStnk?'bg-emerald-50 border-emerald-500 text-emerald-600':'text-gray-400 border-gray-100'}`}>FOTO STNK {docStnk&&'✅'}</button>
                      <button onClick={()=>handleFilePicker(setDocVehicle)} className={`p-3 rounded-xl border-2 border-dashed text-[8px] font-black ${docVehicle?'bg-emerald-50 border-emerald-500 text-emerald-600':'text-gray-400 border-gray-100'}`}>FOTO MOTOR {docVehicle&&'✅'}</button>
                    </div>
                    <input type="text" value={platNomor} onChange={e=>setPlatNomor(e.target.value.toUpperCase())} placeholder="PLAT NOMOR (N-XXXX-YX)" className="w-full p-3 bg-gray-50 rounded-xl text-[10px] font-black border-2 border-transparent focus:border-[#046A38] uppercase" />
                    <input type="text" value={jenisMotor} onChange={e=>setJenisMotor(e.target.value)} placeholder="TIPE MOTOR (cth: Honda Vario 125)" className="w-full p-3 bg-gray-50 rounded-xl text-[10px] font-black border-2 border-transparent focus:border-[#046A38] uppercase" />
                  </div>
                )}

                <button onClick={handleRegisterSubmit} disabled={loading} className="w-full py-4.5 bg-[#046A38] text-white font-black rounded-3xl uppercase text-xs shadow-xl active:scale-95 transition-all">{loading?"Memproses...":"Kirim Pendaftaran"}</button>
                <button onClick={()=>setLoginStep('peran')} className="w-full text-xs font-bold text-gray-400 text-center hover:text-gray-600">Kembali ke Pilihan Peran</button>
              </div>
            ) : (
              <div className="space-y-8 text-center">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-black uppercase tracking-[0.2em]">Verifikasi OTP</p>
                  <p className="text-[10px] text-gray-400">Kode telah dikirim ke nomor <strong>{phone}</strong></p>
                </div>
                <input type="text" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="000000" className="w-full text-center p-5 bg-gray-50 rounded-[32px] text-3xl font-black tracking-[0.6em] outline-none border-2 border-transparent focus:border-[#046A38] text-[#046A38]" />
                <button onClick={handleVerifyOtp} disabled={loading} className="w-full py-5 bg-[#046A38] text-white font-black rounded-[32px] shadow-2xl active:scale-95 transition-transform">{loading?"Memverifikasi...":"Konfirmasi & Selesai"}</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[420px] min-h-screen bg-white relative flex flex-col shadow-2xl overflow-hidden border-x border-gray-100">
          {globalPanicNotification.show && (
            <div className="absolute top-4 left-4 right-4 z-[9999] bg-red-600 text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top duration-500">
               <div className="flex items-center space-x-3 text-left">
                 <AlertTriangle className="animate-pulse shrink-0" />
                 <div><p className="text-[10px] font-black uppercase">Darurat Terdeteksi!</p><p className="text-[11px] font-bold">{globalPanicNotification.pelapor} butuh bantuan.</p></div>
               </div>
               <button onClick={()=>setRole('admin')} className="bg-white text-red-600 px-4 py-1.5 rounded-full font-black text-[9px] uppercase shadow-sm shrink-0">PANTAU</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-none">
            <SafeErrorBoundary name={role.toUpperCase()}>
              {role === 'admin' ? <AdminView /> : role === 'sopir' ?
                <DriverView onNotifyAdminPanic={()=>handleNotifyPanic('Mitra Driver', 'SOS')} onLogout={handleLogout} lockedOrderId={lockedOrder?.orderId} /> :
                <PassengerView onNotifyAdminPanic={(p, t)=>handleNotifyPanic(p, t)} onLogout={handleLogout} onRoleChange={r=>setRole(r)} lockedOrderId={lockedOrder?.orderId} />
              }
            </SafeErrorBoundary>
          </div>

          <footer className="p-6 bg-gray-50 border-t border-gray-100 text-center space-y-3 shrink-0">
            <div className="flex justify-center space-x-6">
              <a href="https://tiktok.com/@ololuojeklokallumajang" target="_blank" rel="noreferrer" className="text-[10px] font-black text-[#046A38] uppercase hover:text-emerald-700 transition-colors">TikTok</a>
              <a href="https://instagram.com/ololu_ojeklokallumajang" target="_blank" rel="noreferrer" className="text-[10px] font-black text-[#046A38] uppercase hover:text-emerald-700 transition-colors">Instagram</a>
            </div>
            <p className="text-[7px] text-gray-400 uppercase font-black tracking-[0.5em]">PT Ololu Pengantaran Nusantara</p>
          </footer>
        </div>
      )}
    </div>
  );
}
