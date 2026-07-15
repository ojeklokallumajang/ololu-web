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
import { ShieldAlert, AlertTriangle, Info, BellRing, Phone, ShieldCheck, UserPlus, LogIn, Camera, Check, ArrowRight, Upload, KeyRound, ArrowLeft } from 'lucide-react';
import OloluLogo from './components/OloluLogo';

export default function App() {
  const [sesi, setSesi] = useState<{ userId: string; role: PeranPengguna } | null>(null);
  const [role, setRole] = useState<PeranPengguna>('penumpang');
  const [showLogin, setShowLogin] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loginStep, setLoginStep] = useState<'peran' | 'form' | 'otp' | 'reset'>('peran');
  const [selectedRole, setSelectedRole] = useState<PeranPengguna>('penumpang');
  const [initializing, setInitializing] = useState(true);

  // States
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Driver Documents
  const [docKtp, setDocKtp] = useState<string | null>(null);
  const [docSim, setDocSim] = useState<string | null>(null);
  const [docStnk, setDocStnk] = useState<string | null>(null);
  const [docVehicle, setDocVehicle] = useState<string | null>(null);
  const [platNomor, setPlatNomor] = useState('');
  const [jenisMotor, setJenisMotor] = useState('');
  const [bisaBarangBesar, setBisaBarangBesar] = useState(false);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [globalPanicNotification, setGlobalPanicNotification] = useState<{
    show: boolean;
    pelapor: string;
    tipe: string;
  }>({ show: false, pelapor: '', tipe: '' });

  // 1. Initial Load Session
  useEffect(() => {
    async function checkSession() {
      const s = await OloluStore.getSesi();
      if (s) {
        setSesi(s);
        setRole(s.role);
        setShowLogin(false);
      }
      setInitializing(false);
    }
    checkSession();

    const unsubscribe = OloluStore.subscribeToStore(async () => {
      const currentSesi = await OloluStore.getSesi();
      setSesi(currentSesi);
      if (!currentSesi) setShowLogin(true);
    });
    return () => unsubscribe();
  }, []);

  const handleStartRegister = (peran: PeranPengguna) => {
    setSelectedRole(peran);
    setAuthMode('register');
    setLoginStep('form');
    setProfilePic(null);
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

  const handleRegisterSubmit = () => {
    if (!name || !phone || !password) {
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
      if (!platNomor || !jenisMotor) { setError('Plat nomor dan jenis motor wajib diisi'); return; }
    }
    setLoading(true);
    setError('');
    OloluStore.kirimFonnteOtp(phone);
    setTimeout(() => {
      setLoading(false);
      setLoginStep('otp');
    }, 1500);
  };

  const handleForgotSubmit = () => {
    if (!phone) {
      setError('Masukkan nomor HP terdaftar');
      return;
    }
    setLoading(true);
    setError('');
    OloluStore.kirimFonnteOtp(phone);
    setTimeout(() => {
      setLoading(false);
      setLoginStep('otp');
    }, 1500);
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
        const res = await OloluStore.registerPengguna(name, phone, finalRole, password);
        if (res.success && res.profil) {
          const profil = res.profil;
          if (profilePic) profil.fotoProfil = profilePic;
          if (finalRole === 'sopir' || finalRole === 'admin') {
            await OloluStore.updateSopirDokumen(profil.id, {
              fotoKtp: docKtp || '', fotoSim: docSim || '', fotoStnk: docStnk || '',
              fotoKendaraan: docVehicle || '', platNomor, jenisMotor, bisaBarangBesar
            });
          }
          OloluStore.setSesi({ userId: profil.id, role: profil.peran });
          setRole(profil.peran);
          setShowLogin(false);
        } else {
          setError(res.error || "Gagal mendaftar");
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

  const handleNotifyPanic = () => {
    // Audit logs handled in store now
  };

  const handleGotoAdminPanicRoom = () => {
    setGlobalPanicNotification({ show: false, pelapor: '', tipe: '' });
    setRole('admin');
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#046A38] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold tracking-widest uppercase">Ololu Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-[#1A1A1A] font-sans antialiased selection:bg-[#046A38] selection:text-[#D4AF37] flex flex-col">
      
      {showLogin && (
        <div className="fixed inset-0 bg-[#046A38]/95 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">

            <div className="bg-[#E6F4EC] p-6 text-center border-b border-emerald-100">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-emerald-50">
                <ShieldCheck className="w-10 h-10 text-[#046A38]" />
              </div>
              <h1 className="text-xl font-black text-[#046A38] tracking-tight">Ololu Lumajang</h1>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto scrollbar-none">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center space-x-2 text-red-600">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] font-bold">{error}</span>
                </div>
              )}

              {authMode === 'login' && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor WhatsApp</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="628xxx" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kata Sandi</label>
                      <button onClick={() => { setAuthMode('forgot'); setLoginStep('form'); setError(''); }} className="text-[10px] font-bold text-[#046A38]">Lupa Password?</button>
                    </div>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-bold" />
                  </div>
                  <button onClick={handleLoginSubmit} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">{loading ? "Memproses..." : "Masuk Sekarang"}</button>
                  <div className="text-center pt-2">
                    <p className="text-[10px] text-gray-500">Belum punya akun?</p>
                    <button onClick={() => { setAuthMode('register'); setLoginStep('peran'); setError(''); }} className="text-[10px] font-bold text-[#046A38] underline">Daftar Akun Baru</button>
                  </div>
                </div>
              )}

              {authMode === 'forgot' && loginStep === 'form' && (
                <div className="space-y-4">
                  <div className="text-center pb-2">
                    <h3 className="font-bold text-base">Reset Kata Sandi</h3>
                    <p className="text-[10px] text-gray-500">Masukkan nomor HP terdaftar untuk verifikasi OTP</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor WhatsApp</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="628xxx" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-bold" />
                  </div>
                  <button onClick={handleForgotSubmit} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">{loading ? "Mengirim OTP..." : "Kirim Kode Reset"}</button>
                  <button onClick={() => setAuthMode('login')} className="w-full text-[10px] font-bold text-gray-400 flex items-center justify-center space-x-1"><ArrowLeft size={12} /> <span>Kembali ke Login</span></button>
                </div>
              )}

              {authMode === 'forgot' && loginStep === 'reset' && (
                <div className="space-y-4">
                  <div className="text-center pb-2">
                    <h3 className="font-bold text-base">Buat Kata Sandi Baru</h3>
                    <p className="text-[10px] text-gray-500">Gunakan kombinasi yang aman dan mudah diingat</p>
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata Sandi Baru" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-bold" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Konfirmasi" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-bold" />
                  <button onClick={handleResetPassword} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">Simpan Kata Sandi</button>
                </div>
              )}

              {authMode === 'register' && loginStep === 'peran' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Daftar Sebagai Apa?</p>
                  <button onClick={() => handleStartRegister('penumpang')} className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-100 hover:border-[#046A38] rounded-2xl transition-all"><div className="flex items-center space-x-4"><div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38]"><UserPlus size={20} /></div><div className="text-left"><p className="font-bold text-sm">Penumpang</p><p className="text-[9px] text-gray-500">Butuh tumpangan/kirim barang</p></div></div></button>
                  <button onClick={() => handleStartRegister('sopir')} className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-100 hover:border-[#046A38] rounded-2xl transition-all"><div className="flex items-center space-x-4"><div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38]"><Phone size={20} /></div><div className="text-left"><p className="font-bold text-sm">Mitra Rider/Driver</p><p className="text-[9px] text-gray-500">Ingin menambah penghasilan</p></div></div></button>
                  <div className="text-center pt-4"><button onClick={() => { setAuthMode('login'); setError(''); }} className="text-[10px] font-bold text-gray-400">Sudah punya akun? Login</button></div>
                </div>
              )}

              {authMode === 'register' && loginStep === 'form' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-2 mb-2">
                    <div className="relative group cursor-pointer" onClick={() => handleFilePicker(setProfilePic)}>
                      <div className="w-16 h-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center overflow-hidden">{profilePic ? <img src={profilePic} alt="Preview" className="w-full h-full object-cover" /> : <Camera size={20} className="text-gray-300" />}</div>
                      <div className="absolute -bottom-1 -right-1 bg-[#046A38] text-white p-1 rounded-full border border-white shadow-sm"><Upload size={8} /></div>
                    </div>
                    <label className="text-[8px] font-bold text-gray-400 uppercase">Foto Profil {selectedRole === 'sopir' && '(Wajib)'}</label>
                  </div>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lengkap" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp (628xxx)" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sandi" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                  </div>
                  {selectedRole === 'sopir' && (
                    <div className="space-y-3 pt-2 border-t border-dashed">
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleFilePicker(setDocKtp)} className={`p-2.5 rounded-lg border-2 border-dashed text-center ${docKtp ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}><Upload size={12} className={docKtp ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} /><p className="text-[7px] font-bold">KTP {docKtp && '✅'}</p></button>
                        <button onClick={() => handleFilePicker(setDocSim)} className={`p-2.5 rounded-lg border-2 border-dashed text-center ${docSim ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}><Upload size={12} className={docSim ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} /><p className="text-[7px] font-bold">SIM {docSim && '✅'}</p></button>
                        <button onClick={() => handleFilePicker(setDocStnk)} className={`p-2.5 rounded-lg border-2 border-dashed text-center ${docStnk ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}><Upload size={12} className={docStnk ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} /><p className="text-[7px] font-bold">STNK {docStnk && '✅'}</p></button>
                        <button onClick={() => handleFilePicker(setDocVehicle)} className={`p-2.5 rounded-lg border-2 border-dashed text-center ${docVehicle ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}><Upload size={12} className={docVehicle ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} /><p className="text-[7px] font-bold">MOTOR {docVehicle && '✅'}</p></button>
                      </div>
                      <input type="text" value={platNomor} onChange={(e) => setPlatNomor(e.target.value.toUpperCase())} placeholder="N-XXXX-YX" className="w-full p-2.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-lg outline-none text-[10px] font-bold" />
                      <input type="text" value={jenisMotor} onChange={(e) => setJenisMotor(e.target.value)} placeholder="Tipe Motor" className="w-full p-2.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-lg outline-none text-[10px] font-bold" />
                    </div>
                  )}
                  <button onClick={handleRegisterSubmit} disabled={loading} className="w-full py-3.5 bg-[#046A38] text-white font-black rounded-2xl text-[10px] tracking-widest uppercase shadow-lg transition-all">{loading ? "Memproses..." : selectedRole === 'sopir' ? "Kirim Verifikasi" : "Daftar & Kirim OTP"}</button>
                  <button onClick={() => setLoginStep('peran')} className="w-full text-[10px] font-bold text-gray-400">Kembali</button>
                </div>
              )}

              {(authMode === 'register' || authMode === 'forgot') && loginStep === 'otp' && (
                <div className="space-y-6 text-center">
                  <div className="space-y-2"><h3 className="font-bold text-lg">Verifikasi OTP</h3><p className="text-xs text-gray-500">Masukkan kode dari WhatsApp <strong>{phone}</strong></p></div>
                  <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="w-full text-center p-4 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-2xl font-black tracking-[0.5em]" />
                  <button onClick={handleVerifyOtp} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">{loading ? "Memproses..." : "Konfirmasi"}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {globalPanicNotification.show && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-4 border-[#DC2626] p-6 max-w-sm w-full text-center space-y-4 animate-bounce shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 border-2 border-red-500 animate-pulse"><AlertTriangle size={36} className="text-[#DC2626]" /></div>
            <h2 className="text-[#DC2626] font-black text-lg tracking-wide uppercase">🚨 SINYAL DARURAT DIAKTIFKAN 🚨</h2>
            <p className="text-sm text-gray-700 leading-relaxed">Sinyal darurat <strong>PANIC BUTTON</strong> dipicu oleh <strong>{globalPanicNotification.pelapor}</strong> ({globalPanicNotification.tipe.toUpperCase()})!</p>
            <div className="space-y-2 pt-2">
              <button onClick={handleGotoAdminPanicRoom} className="w-full py-3 bg-[#DC2626] text-white font-black rounded-xl text-xs tracking-wider uppercase shadow-md transition-all">Buka Radar Penyelamatan</button>
              <button onClick={() => setGlobalPanicNotification({ show: false, pelapor: '', tipe: '' })} className="w-full py-2 bg-gray-100 text-gray-500 font-bold rounded-lg text-xs">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow w-full max-w-7xl mx-auto p-0 md:p-4 lg:p-6 flex flex-col justify-center items-center">
        {!showLogin && (
          <div className="w-full md:max-w-[420px] min-h-screen md:min-h-[780px] md:h-[780px] bg-white md:shadow-2xl md:rounded-[36px] border-none md:border md:border-gray-100 flex flex-col relative overflow-hidden self-center">
            {role === 'admin' ? (
              <div className="flex-1 overflow-y-auto scrollbar-none"><AdminView /></div>
            ) : (
              <>
                <div className="bg-[#E6F4EC] px-5 py-2.5 flex items-center justify-between text-[9px] text-[#046A38] font-bold uppercase tracking-widest shrink-0">
                  <span className="flex items-center space-x-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#059669] inline-block animate-pulse"></span><span>Realtime Active</span></span>
                  <span>PT Ololu Lumajang</span>
                </div>
                <div className="flex-1 overflow-y-auto pb-14 relative scrollbar-none">
                  {role === 'penumpang' && <PassengerView onNotifyAdminPanic={handleNotifyPanic} onLogout={handleLogout} onRoleChange={(r) => setRole(r)} />}
                  {role === 'sopir' && <DriverView onNotifyAdminPanic={handleNotifyPanic} onLogout={handleLogout} />}
                </div>
              </>
            )}
            <footer className="absolute bottom-0 left-0 right-0 bg-[#E6F4EC] border-t border-emerald-950/5 py-2.5 text-center text-[8px] text-[#046A38] font-bold tracking-widest uppercase shrink-0">© 2026 PT Ololu Pengantaran Nusantara Lumajang</footer>
          </div>
        )}
      </div>
    </div>
  );
}
