# Product Requirements Document (PRD) - Ololu Lumajang

## 1. Ringkasan Proyek
**Ololu Lumajang** adalah aplikasi web progresif (PWA) yang menyediakan layanan ojek dan pengantaran logistik lokal khusus untuk wilayah Kabupaten Lumajang. Aplikasi ini menghubungkan masyarakat Lumajang dengan mitra Rider/Driver lokal dengan sistem yang transparan, aman, dan realtime.

## 2. Tujuan Utama
- Memberikan solusi transportasi dan logistik yang efisien di Lumajang.
- Memberdayakan mitra Rider/Driver lokal dengan sistem bagi hasil yang adil.
- Menyediakan sistem pendaftaran dan verifikasi yang ketat untuk keamanan pengguna.

## 3. Peran Pengguna
### A. Penumpang (User)
Masyarakat umum yang membutuhkan layanan antar jemput orang, paket, makanan, atau jasa belanja.
### B. Mitra Rider/Driver
Pemilik kendaraan bermotor yang telah diverifikasi oleh admin untuk memberikan layanan.
### C. Superuser (Admin)
Pemegang kendali penuh platform (Nomor Utama: `6285156766317`) yang bertugas memverifikasi mitra, mengatur tarif, dan memantau operasional.

## 4. Fitur Utama
### 4.1. Manajemen Akun & Otentikasi
- **Pendaftaran Akun:** Menggunakan Nomor HP (WhatsApp 62xxx), Nama Lengkap, Foto Profil, dan Kata Sandi.
- **Verifikasi OTP:** Kode 6-digit dikirim via WhatsApp (Fonnte) **hanya satu kali** pada saat pendaftaran akun baru.
- **Login Cepat:** Pengguna yang sudah terdaftar cukup masuk menggunakan **Nomor HP + Kata Sandi**.
- **Reset Password:** Fitur lupa kata sandi menggunakan verifikasi OTP WhatsApp untuk mengganti kunci masuk tanpa menghapus data riwayat.
- **Sesi Persisten:** Login otomatis tersimpan di perangkat hingga pengguna menekan tombol "Logout".

### 4.2. Pendaftaran Mitra Rider/Driver (1-Step)
Calon mitra wajib mengunggah data lengkap dalam satu formulir:
1. Foto Profil (Wajah jelas).
2. Data Identitas (Nama & HP).
3. Berkas Legal: Foto KTP, SIM, STNK.
4. Data Kendaraan: Foto Motor, Nomor Plat, Merek/Tipe Motor.
5. Opsi Kemampuan: Pilihan "Bisa bawa barang besar / Bak motor".
- **Status:** Rider baru tidak bisa "Online" sebelum disetujui secara manual oleh Admin.

### 4.3. Layanan Ololu (6-in-1)
- **Ololu-Ride:** Ojek orang antar jemput.
- **Ololu-Send:** Kirim barang/paket kilat.
- **Belanja:** Jasa titip belanja ke pasar/toko.
- **Makanan:** Pesan antar makanan dari merchant lokal.
- **Wisata:** Jasa antar ke tempat wisata Lumajang (tarif khusus).
- **Market:** Jasa ambil barang COD dari marketplace lokal.

### 4.4. Panel Admin (Eksklusif Superuser)
- **Verifikasi Mitra:** Meninjau dokumen Rider baru dan memberikan persetujuan/penolakan.
- **Dashboard Operasional:** Memantau statistik pendapatan, jumlah order, dan pertumbuhan pengguna.
- **Radar Realtime:** Melihat posisi Rider yang sedang aktif di peta Lumajang.
- **Pengaturan Tarif:** Mengubah harga dasar, tarif per km, dan komisi aplikasi secara dinamis.
- **Audit Riwayat:** Melihat detail setiap transaksi dan chat internal antara pengguna dan rider.

## 5. Aturan Bisnis & Teknis
- **Branding:** Menggunakan identitas "Ololu-Ride" dan "Ololu-Send".
- **Keamanan Data:** Riwayat pesanan, profil, dan saldo tidak boleh hilang saat terjadi reset password.
- **Realtime:** Pergerakan rider dan notifikasi order baru harus muncul secara instan (Supabase Realtime).
- **Platform:** Berjalan di web dengan dukungan penuh PWA (Installable di Android/iOS via Browser).

## 6. Arsitektur Teknologi
- **Frontend:** React + Vite + Tailwind CSS.
- **Backend/Database:** Supabase (PostgreSQL).
- **Realtime Service:** Supabase Realtime Channels.
- **Hosting:** Cloudflare Pages.
- **WhatsApp API:** Fonnte API.
- **Maps API:** Google Maps JavaScript SDK.

---
*Dibuat untuk: PT Ololu Pengantaran Nusantara Lumajang (2026)*
