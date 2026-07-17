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
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!name || !phone || !password) { setError('Lengkapi data pendaftaran'); return; }
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
      const res = await OloluStore.registerPengguna(name, phone, finalRole, password, tempatLahir, tanggalLahir);
      if (res.success && res.profil) {
        OloluStore.setSesi({ userId: res.profil.id, role: res.profil.peran });
        setRole(res.profil.peran);
        setShowLogin(false);
      } else { setError(res.error || "Gagal mendaftar"); }
    } else { setError('Kode OTP salah'); }
    setLoading(false);
  };

  const handleLogout = () => {
    OloluStore.setSesi(null);
    setShowLogin(true);
    setRole('penumpang');
  };

  if (fatalError) return <div className="p-20 text-center text-red-600 font-bold">ERROR FATAL: {fatalError}</div>;
  if (initializing) return <div className="min-h-screen bg-[#046A38] flex items-center justify-center text-white font-bold uppercase tracking-widest">Memuat Ololu...</div>;

  return (
    <div className="min-h-screen bg-[#FAFBF9] flex flex-col items-center antialiased">
      {showLogin ? (
        <div className="fixed inset-0 bg-[#046A38] z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 space-y-6 shadow-2xl">
            <h1 className="text-2xl font-black text-[#046A38] text-center">Ololu Lumajang</h1>
            {error && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}

            {authMode === 'login' ? (
              <div className="space-y-4">
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Nomor WhatsApp" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38] transition-all" />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Kata Sandi" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm font-bold border-2 border-transparent focus:border-[#046A38] transition-all" />
                <button onClick={handleLoginSubmit} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl uppercase tracking-widest shadow-lg">{loading?"Memproses...":"Masuk Sekarang"}</button>
                <button onClick={()=>setAuthMode('register')} className="w-full text-xs font-bold text-gray-400">Daftar Akun Baru</button>
              </div>
            ) : loginStep === 'peran' ? (
              <div className="space-y-3">
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daftar Sebagai:</p>
                <button onClick={()=>handleStartRegister('penumpang')} className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold text-left hover:border-[#046A38] transition-all">👤 Penumpang</button>
                <button onClick={()=>handleStartRegister('sopir')} className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold text-left hover:border-[#046A38] transition-all">🛵 Mitra Driver</button>
                <button onClick={()=>setAuthMode('login')} className="w-full text-xs font-bold text-gray-400 mt-4 text-center">Sudah punya akun? Login</button>
              </div>
            ) : loginStep === 'form' ? (
              <div className="space-y-4">
                <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Nama Lengkap" className="w-full p-3.5 bg-gray-50 rounded-xl outline-none text-xs font-bold border-2 border-transparent focus:border-[#046A38]" />
                <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="WhatsApp (628...)" className="w-full p-3.5 bg-gray-50 rounded-xl outline-none text-xs font-bold border-2 border-transparent focus:border-[#046A38]" />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sandi Baru" className="w-full p-3.5 bg-gray-50 rounded-xl outline-none text-xs font-bold border-2 border-transparent focus:border-[#046A38]" />
                <button onClick={handleRegisterSubmit} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-xl uppercase text-xs shadow-md">{loading?"Mengirim OTP...":"Daftar & Kirim OTP"}</button>
                <button onClick={()=>setLoginStep('peran')} className="w-full text-xs font-bold text-gray-400 text-center">Kembali</button>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Verifikasi OTP</p>
                <input type="text" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="000000" className="w-full text-center p-4 bg-gray-50 rounded-2xl text-2xl font-black tracking-[0.5em] outline-none border-2 border-transparent focus:border-[#046A38]" />
                <button onClick={handleVerifyOtp} disabled={loading} className="w-full py-4 bg-[#046A38] text-white font-black rounded-2xl shadow-lg">{loading?"Memverifikasi...":"Konfirmasi"}</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[420px] min-h-screen bg-white relative flex flex-col shadow-2xl overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {role === 'admin' ? <AdminView /> : role === 'sopir' ?
              <DriverView onNotifyAdminPanic={()=>{}} onLogout={handleLogout} lockedOrderId={lockedOrder?.orderId} /> :
              <PassengerView onNotifyAdminPanic={()=>{}} onLogout={handleLogout} onRoleChange={r=>setRole(r)} lockedOrderId={lockedOrder?.orderId} />
            }
          </div>
          <footer className="p-4 bg-[#E6F4EC] border-t border-emerald-100 text-center space-y-2 shrink-0">
            <div className="flex justify-center space-x-5">
              <a href="https://tiktok.com/@ololuojeklokallumajang" target="_blank" rel="noreferrer" className="text-[9px] font-black text-[#046A38] uppercase flex items-center space-x-1"><span>TikTok:</span> <span className="underline">@ololuojeklokallumajang</span></a>
              <a href="https://instagram.com/ololu_ojeklokallumajang" target="_blank" rel="noreferrer" className="text-[9px] font-black text-[#046A38] uppercase flex items-center space-x-1"><span>Instagram:</span> <span className="underline">@ololu_ojeklokallumajang</span></a>
            </div>
            <p className="text-[7px] text-emerald-800/50 uppercase font-bold tracking-[0.3em]">PT Ololu Pengantaran Nusantara Lumajang</p>
          </footer>
        </div>
      )}
    </div>
  );
}
