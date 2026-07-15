/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PeranPengguna } from '../types';
import { OloluStore } from '../services/store';
import { Bike, User, ShieldCheck, HelpCircle } from 'lucide-react';
import OloluLogo from './OloluLogo';

interface NavbarProps {
  currentRole: PeranPengguna | 'guide';
  onRoleChange: (role: PeranPengguna | 'guide') => void;
}

export default function Navbar({ currentRole, onRoleChange }: NavbarProps) {
  const profile = OloluStore.getProfilLogin();
  const driver = OloluStore.getSopirLogin();
  const isSuperUser = profile?.nomorHp === '6285156766317';

  return (
    <header className="sticky top-0 z-50 bg-[#046A38] text-white border-b-2 border-[#D4AF37] shadow-md px-3 py-2">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        
        {/* LOGO & NAMA APLIKASI */}
        <div className="flex items-center space-x-2">
          <OloluLogo variant="badge" light={true} />
        </div>

        {/* SELECTOR PERAN / NAVIGASI */}
        <nav className="flex items-center space-x-1">
          {/* Menu Admin HANYA muncul jika Superuser */}
          {isSuperUser && (
            <button
              onClick={() => onRoleChange('admin')}
              className={`flex flex-col items-center justify-center p-1.5 px-3 rounded-lg transition-all ${
                currentRole === 'admin'
                  ? 'bg-white text-[#046A38] font-black shadow-lg scale-105'
                  : 'hover:bg-[#034F2A] text-white/80'
              }`}
            >
              <ShieldCheck size={16} />
              <span className="text-[9px] font-bold uppercase tracking-tighter">Admin</span>
            </button>
          )}

          {/* Menu Penumpang (Sembunyi jika sedang di panel Admin) */}
          {currentRole !== 'admin' && (
            <>
              <button
                onClick={() => onRoleChange('penumpang')}
                className={`flex flex-col items-center justify-center p-1.5 px-3 rounded-lg transition-all ${
                  currentRole === 'penumpang'
                    ? 'bg-white text-[#046A38] font-black shadow-lg'
                    : 'hover:bg-[#034F2A] text-white/80'
                }`}
              >
                <User size={16} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">Penumpang</span>
              </button>

              {/* Tampilkan Menu Sopir jika akun terverifikasi sopir */}
              {(profile?.peran === 'sopir' || isSuperUser) && (
                <button
                  onClick={() => onRoleChange('sopir')}
                  className={`flex flex-col items-center justify-center p-1.5 px-3 rounded-lg transition-all ${
                    currentRole === 'sopir'
                      ? 'bg-white text-[#046A38] font-black shadow-lg'
                      : 'hover:bg-[#034F2A] text-white/80'
                  }`}
                >
                  <div className="relative">
                    <Bike size={16} />
                    {driver?.statusOnline && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399]"></span>
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-tighter">Sopir</span>
                </button>
              )}
            </>
          )}

          {/* Tombol Back ke App dari Admin */}
          {currentRole === 'admin' && (
            <button
              onClick={() => onRoleChange('penumpang')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-[#B8941F]"
            >
              <span>Kembali Ke App</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
