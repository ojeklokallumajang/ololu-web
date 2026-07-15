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

  return (
    <header className="sticky top-0 z-50 bg-[#046A38] text-white border-b-3 border-[#D4AF37] shadow-md px-4 py-3">
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
        
        {/* LOGO & NAMA APLIKASI */}
        <OloluLogo variant="badge" light={true} />

        {/* SELECTOR PERAN / NAVIGASI */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            id="nav-btn-penumpang"
            onClick={() => onRoleChange('penumpang')}
            className={`flex flex-col items-center justify-center p-1.5 px-2.5 rounded-lg transition-all ${
              currentRole === 'penumpang'
                ? 'bg-[#034F2A] text-[#D4AF37] font-bold shadow-inner'
                : 'hover:bg-[#034F2A]/50 text-[#FAFBF9]'
            }`}
            title="Sesi Penumpang"
          >
            <User size={18} className="mb-0.5" />
            <span className="text-[10px] tracking-tight">Penumpang</span>
          </button>

          <button
            id="nav-btn-sopir"
            onClick={() => onRoleChange('sopir')}
            className={`flex flex-col items-center justify-center p-1.5 px-2.5 rounded-lg transition-all ${
              currentRole === 'sopir'
                ? 'bg-[#034F2A] text-[#D4AF37] font-bold shadow-inner'
                : 'hover:bg-[#034F2A]/50 text-[#FAFBF9]'
            }`}
            title="Sesi Sopir"
          >
            <div className="relative">
              <Bike size={18} className="mb-0.5" />
              {driver?.statusOnline && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#059669] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#059669]"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Sopir</span>
          </button>

          <button
            id="nav-btn-admin"
            onClick={() => onRoleChange('admin')}
            className={`flex flex-col items-center justify-center p-1.5 px-2.5 rounded-lg transition-all ${
              currentRole === 'admin'
                ? 'bg-[#034F2A] text-[#D4AF37] font-bold shadow-inner'
                : 'hover:bg-[#034F2A]/50 text-[#FAFBF9]'
            }`}
            title="Sesi Admin"
          >
            <ShieldCheck size={18} className="mb-0.5" />
            <span className="text-[10px] tracking-tight">Admin</span>
          </button>

          <button
            id="nav-btn-panduan"
            onClick={() => onRoleChange('guide')}
            className={`flex flex-col items-center justify-center p-1.5 px-2.5 rounded-lg transition-all ${
              currentRole === 'guide'
                ? 'bg-[#034F2A] text-[#D4AF37] font-bold shadow-inner'
                : 'hover:bg-[#034F2A]/50 text-[#FAFBF9]'
            }`}
            title="Panduan Supabase"
          >
            <HelpCircle size={18} className="mb-0.5" />
            <span className="text-[10px] tracking-tight">Panduan</span>
          </button>
        </nav>

      </div>
    </header>
  );
}
