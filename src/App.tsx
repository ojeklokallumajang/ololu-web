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
import { ShieldAlert, AlertTriangle, Info, BellRing, Phone, ShieldCheck, UserPlus, LogIn, Camera, Check, ArrowRight, Upload } from 'lucide-react';
import OloluLogo from './components/OloluLogo';
import DesktopDashboard from './components/DesktopDashboard';

export default function App() {
  const [sesi, setSesi] = useState(OloluStore.getSesi());
  const [role, setRole] = useState<PeranPengguna>(sesi?.role || 'penumpang');
  const [showLogin, setShowLogin] = useState(!sesi);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginStep, setLoginStep] = useState<'peran' | 'form' | 'otp'>('peran');
  const [selectedRole, setSelectedRole] = useState<PeranPengguna>('penumpang');

  // Registration States
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Driver Documents (One-Step Registration)
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

  const handleStartRegister = (peran: PeranPengguna) => {
    setSelectedRole(peran);
    setAuthMode('register');
    setLoginStep('form');
    setProfilePic(null);
    setDocKtp(null); setDocSim(null); setDocStnk(null); setDocVehicle(null);
    setPlatNomor(''); setJenisMotor(''); setBisaBarangBesar(false);
    setError('');
  };

  const handleLoginSubmit = () => {
    if (!phone || !password) {
      setError('Masukkan nomor HP dan kata sandi');
      return;
    }
    setLoading(true);
    const res = OloluStore.loginPengguna(phone, password);
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

  const handleVerifyOtp = () => {
    if (otp.length < 6) {
      setError('Masukkan 6 digit kode OTP');
      return;
    }

    setLoading(true);
    if (OloluStore.verifikasiOtp(phone, otp)) {
      let finalRole = selectedRole;
      if (phone === '6285156766317') finalRole = 'admin';

      const profil = OloluStore.registerPengguna(name, phone, finalRole, password);
      if (profilePic) profil.fotoProfil = profilePic;

      if (finalRole === 'sopir' || finalRole === 'admin') {
        OloluStore.updateSopirDokumen(profil.id, {
          fotoKtp: docKtp || '',
          fotoSim: docSim || '',
          fotoStnk: docStnk || '',
          fotoKendaraan: docVehicle || '',
          platNomor,
          jenisMotor,
          bisaBarangBesar
        });
      }

      OloluStore.setSesi({ userId: profil.id, role: profil.peran });
      setRole(profil.peran);
      setShowLogin(false);
      setLoading(false);
    } else {
      setError('Kode OTP salah atau kedaluwarsa');
      setLoading(false);
    }
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
    setLoginStep('peran');
  };

  const handleNotifyPanic = () => {
    const latest = OloluStore.getAllEmergency().find(e => e.status === 'baru');
    if (latest) {
      setGlobalPanicNotification({ show: true, pelapor: latest.namaPelapor, tipe: latest.peranPelapor });
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(987.77, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.3);
      } catch (err) {}
    }
  };

  const handleGotoAdminPanicRoom = () => {
    setGlobalPanicNotification({ show: false, pelapor: '', tipe: '' });
    setRole('admin');
    setTimeout(() => {
      const el = document.getElementById('driver-dashboard') || document.body;
      el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#FAFBF9] text-[#1A1A1A] font-sans antialiased selection:bg-[#046A38] selection:text-[#D4AF37] flex flex-col">
      
      {showLogin && (
        <div className="fixed inset-0 bg-[#046A38]/95 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">

            <div className="bg-[#E6F4EC] p-6 text-center border-b border-emerald-100">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 border border-emerald-50">
                <OloluLogo className="w-10 h-10 text-[#046A38]" />
              </div>
              <h1 className="text-xl font-black text-[#046A38] tracking-tight">Ololu Lumajang</h1>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-none">
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kata Sandi</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full p-3.5 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-sm font-bold" />
                  </div>
                  <button onClick={handleLoginSubmit} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">{loading ? "Memproses..." : "Masuk Sekarang"}</button>
                  <div className="text-center pt-2">
                    <p className="text-[10px] text-gray-500">Belum punya akun?</p>
                    <button onClick={() => { setAuthMode('register'); setLoginStep('peran'); setError(''); }} className="text-[10px] font-bold text-[#046A38] underline">Daftar Akun Baru</button>
                  </div>
                </div>
              )}

              {authMode === 'register' && loginStep === 'peran' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Daftar Sebagai Apa?</p>
                  <button onClick={() => handleStartRegister('penumpang')} className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-100 hover:border-[#046A38] rounded-2xl transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38]"><UserPlus size={20} /></div>
                      <div className="text-left"><p className="font-bold text-sm">Penumpang</p><p className="text-[9px] text-gray-500">Butuh tumpangan/kirim barang</p></div>
                    </div>
                  </button>
                  <button onClick={() => handleStartRegister('sopir')} className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-100 hover:border-[#046A38] rounded-2xl transition-all">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#046A38]"><Phone size={20} /></div>
                      <div className="text-left"><p className="font-bold text-sm">Mitra Rider/Driver</p><p className="text-[9px] text-gray-500">Ingin menambah penghasilan</p></div>
                    </div>
                  </button>
                  <div className="text-center pt-4"><button onClick={() => { setAuthMode('login'); setError(''); }} className="text-[10px] font-bold text-gray-400">Sudah punya akun? Login</button></div>
                </div>
              )}

              {authMode === 'register' && loginStep === 'form' && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-2 mb-4">
                    <div className="relative group cursor-pointer" onClick={() => handleFilePicker(setProfilePic)}>
                      <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {profilePic ? <img src={profilePic} alt="Preview" className="w-full h-full object-cover" /> : <Camera size={24} className="text-gray-300" />}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-[#046A38] text-white p-1.5 rounded-full border-2 border-white shadow-sm"><Upload size={10} /></div>
                    </div>
                    <label className="text-[9px] font-bold text-gray-400 uppercase">Foto Profil {selectedRole === 'sopir' && '(Wajib)'}</label>
                  </div>

                  <div className="space-y-3">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lengkap (Sesuai KTP)" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Nomor WhatsApp (628xxx)" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kata Sandi" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                      <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Konfirmasi" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                    </div>
                  </div>

                  {selectedRole === 'sopir' && (
                    <div className="space-y-4 pt-4 border-t border-dashed">
                      <p className="text-[10px] font-black text-[#046A38] uppercase tracking-widest">Dokumen Kendaraan (Wajib)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleFilePicker(setDocKtp)} className={`p-3 rounded-xl border-2 border-dashed text-center space-y-1 ${docKtp ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                          <Upload size={14} className={docKtp ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} />
                          <p className="text-[8px] font-bold">FOTO KTP {docKtp && '✅'}</p>
                        </button>
                        <button onClick={() => handleFilePicker(setDocSim)} className={`p-3 rounded-xl border-2 border-dashed text-center space-y-1 ${docSim ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                          <Upload size={14} className={docSim ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} />
                          <p className="text-[8px] font-bold">FOTO SIM {docSim && '✅'}</p>
                        </button>
                        <button onClick={() => handleFilePicker(setDocStnk)} className={`p-3 rounded-xl border-2 border-dashed text-center space-y-1 ${docStnk ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                          <Upload size={14} className={docStnk ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} />
                          <p className="text-[8px] font-bold">FOTO STNK {docStnk && '✅'}</p>
                        </button>
                        <button onClick={() => handleFilePicker(setDocVehicle)} className={`p-3 rounded-xl border-2 border-dashed text-center space-y-1 ${docVehicle ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                          <Upload size={14} className={docVehicle ? 'text-emerald-500 mx-auto' : 'text-gray-300 mx-auto'} />
                          <p className="text-[8px] font-bold">FOTO MOTOR {docVehicle && '✅'}</p>
                        </button>
                      </div>
                      <input type="text" value={platNomor} onChange={(e) => setPlatNomor(e.target.value.toUpperCase())} placeholder="Nomor Plat (cth: N 1234 YX)" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                      <input type="text" value={jenisMotor} onChange={(e) => setJenisMotor(e.target.value)} placeholder="Merk & Tipe Motor (cth: Vario 125)" className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-xl outline-none text-xs font-bold" />
                      <div className="flex items-center space-x-2 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <input type="checkbox" id="bakMotor" checked={bisaBarangBesar} onChange={(e) => setBisaBarangBesar(e.target.checked)} className="w-4 h-4 rounded text-[#046A38]" />
                        <label htmlFor="bakMotor" className="text-[10px] font-bold text-emerald-800">Bisa bawa barang besar / Bak motor</label>
                      </div>
                    </div>
                  )}

                  <button onClick={handleRegisterSubmit} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">{loading ? "Mengirim OTP..." : selectedRole === 'sopir' ? "Kirim Ajukan Verifikasi" : "Daftar & Kirim OTP"}</button>
                  <button onClick={() => setLoginStep('peran')} className="w-full text-[10px] font-bold text-gray-400">Kembali</button>
                </div>
              )}

              {authMode === 'register' && loginStep === 'otp' && (
                <div className="space-y-6 text-center">
                  <div className="space-y-2"><h3 className="font-bold text-lg">Verifikasi Pendaftaran</h3><p className="text-xs text-gray-500">Masukkan kode OTP dari WhatsApp <strong>{phone}</strong></p></div>
                  <input type="text" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="000000" className="w-full text-center p-4 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl outline-none text-2xl font-black tracking-[0.5em]" />
                  <button onClick={handleVerifyOtp} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl text-xs tracking-widest uppercase shadow-lg transition-all">{loading ? "Memproses..." : "Konfirmasi & Selesaikan"}</button>
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
          <>
            {role === 'admin' ? (
              <div className="w-full flex flex-col xl:flex-row items-stretch justify-center gap-6">
                <div className="hidden xl:flex w-[400px] shrink-0"><DesktopDashboard /></div>
                <div className="flex-1 bg-white shadow-xl rounded-none md:rounded-3xl border-none md:border md:border-gray-100 overflow-hidden"><div className="p-4 md:p-6"><AdminView /></div></div>
              </div>
            ) : (
              <div className="w-full md:max-w-[420px] min-h-screen md:min-h-[780px] md:h-[780px] bg-white md:shadow-2xl md:rounded-[36px] border-none md:border md:border-gray-100 flex flex-col relative overflow-hidden self-center">
                <div className="bg-[#E6F4EC] px-5 py-2.5 flex items-center justify-between text-[9px] text-[#046A38] font-bold uppercase tracking-widest shrink-0">
                  <span className="flex items-center space-x-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#059669] inline-block animate-pulse"></span><span>Realtime Active</span></span>
                  <span>PT Ololu Lumajang</span>
                </div>
                <div className="flex-1 overflow-y-auto pb-14 relative scrollbar-none">
                  {role === 'penumpang' && <PassengerView onNotifyAdminPanic={handleNotifyPanic} onLogout={handleLogout} onRoleChange={(r) => setRole(r)} />}
                  {role === 'sopir' && <DriverView onNotifyAdminPanic={handleNotifyPanic} onLogout={handleLogout} />}
                </div>
                <footer className="absolute bottom-0 left-0 right-0 bg-[#E6F4EC] border-t border-emerald-950/5 py-2.5 text-center text-[8px] text-[#046A38] font-bold tracking-widest uppercase shrink-0">© 2026 PT Ololu Pengantaran Nusantara Lumajang</footer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
