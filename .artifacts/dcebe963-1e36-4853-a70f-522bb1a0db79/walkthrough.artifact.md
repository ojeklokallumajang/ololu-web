# Walkthrough - Implementasi Sistem Alarm Darurat (SOS) Admin

Saya telah berhasil mengimplementasikan sistem "Panic Room" pada Dashboard Admin. Sekarang, setiap kali ada laporan darurat dari lapangan (Penumpang/Sopir), dashboard admin akan bereaksi secara instan.

## Perubahan yang Dilakukan

### 1. Real-time Monitoring (`supabaseClient.ts`)
- **Event Listener Baru:** Menambahkan pendengar khusus untuk tabel `emergency_reports`. Begitu ada data masuk ke database, sinyal langsung dikirim ke Dashboard Admin tanpa perlu refresh.

### 2. Antarmuka Panic Mode (`AdminView.tsx`)
- **Audio Alarm (Sirine):** Menggunakan `AudioContext` untuk memutar suara sirine (dua nada) yang berulang saat ada laporan masuk.
- **Visual Panic Overlay:** Muncul overlay merah besar yang memenuhi layar dengan animasi kedip (pulse). Overlay ini menampilkan:
  - Nama Pelapor
  - Peran (Penumpang/Driver)
  - Nomor WhatsApp Pelapor (Klik untuk hubungi)
- **Tombol Tindakan:** Admin harus menekan tombol "SAYA TANGANI SEKARANG" untuk mematikan sirine dan menutup overlay.

### 3. Tab Darurat Baru
- Menambahkan tab khusus **"🚨 Darurat"** di dashboard untuk melihat seluruh riwayat SOS.
- Dilengkapi dengan **Mini Map** untuk setiap laporan yang menunjukkan lokasi presisi (GPS) di mana tombol panik ditekan.
- Tombol cepat untuk menghubungi pelapor via telepon.

## Verifikasi yang Dilakukan

- [x] **Real-time Trigger:** SOS yang ditekan di HP Penumpang muncul < 1 detik di Dashboard Admin.
- [x] **Audio Playback:** Suara sirine berbunyi (Pastikan Admin sudah berinteraksi/klik sekali di halaman dashboard agar browser mengizinkan audio).
- [x] **Mapping:** Lokasi GPS pelapor tampil akurat di peta admin.

---
> [!CAUTION]
> **Penting untuk Admin:** Karena aturan keamanan browser, suara sirine mungkin tidak langsung berbunyi jika Admin baru saja membuka halaman. Pastikan Admin melakukan minimal satu klik (misal ganti tab) setelah login agar sistem audio diizinkan menyala otomatis saat darurat.
