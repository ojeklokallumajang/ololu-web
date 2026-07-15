/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// AMBIL KUNCI API RESMI YANG DIBERIKAN USER
export const GOOGLE_MAPS_KEY =
  (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : '') ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  'AIzaSyAZS9TLRfaVbEDw4XtpJn7T7ppeUenWYZw';

export const isKeyValid = Boolean(GOOGLE_MAPS_KEY) && GOOGLE_MAPS_KEY !== 'YOUR_API_KEY';

export default function SplashMapKey() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-6 bg-white rounded-xl border-t-2 border-[#D4AF37] shadow-sm text-center max-w-md mx-auto">
      <div className="bg-[#F5E6A8] p-3 rounded-full mb-4">
        <span className="text-2xl">🗺️</span>
      </div>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2 font-sans">
        Kunci API Google Maps Diperlukan
      </h3>
      <p className="text-sm text-[#6B7280] mb-4">
        Aplikasi menggunakan Google Maps JavaScript SDK untuk memilih lokasi, menggambar rute, dan melacak pergerakan sopir secara realtime.
      </p>
      
      <div className="bg-[#E6F4EC] p-3 rounded-lg text-left text-xs text-[#046A38] w-full mb-4 space-y-2">
        <p className="font-semibold">Cara Memasang Kunci API Anda:</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Buka menu <strong>Settings</strong> (ikon gerigi ⚙️ di kanan atas).</li>
          <li>Pilih <strong>Secrets</strong>.</li>
          <li>Tambahkan rahasia baru bernama <code>GOOGLE_MAPS_PLATFORM_KEY</code>.</li>
          <li>Tempelkan Kunci API Google Maps Anda, lalu simpan.</li>
        </ol>
      </div>
      
      <p className="text-[10px] text-gray-400">
        *Aplikasi telah menyediakan Kunci API bawaan resmi Lumajang sehingga peta seharusnya langsung termuat otomatis di browser Anda.
      </p>
    </div>
  );
}
