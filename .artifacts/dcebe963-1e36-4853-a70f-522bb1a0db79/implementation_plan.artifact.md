# Implementasi Sistem Alarm Darurat (Panic Room)

Fitur ini bertujuan untuk memberikan peringatan visual dan audio yang sangat mencolok di Dashboard Admin ketika ada laporan darurat (SOS) dari lapangan.

## User Review Required

> [!WARNING]
> **Audio Alarm:** Sistem akan mencoba memutar suara sirine secara otomatis. Sebagian besar browser (Chrome/Safari) memblokir audio otomatis kecuali jika admin sudah pernah melakukan interaksi (klik) pada halaman dashboard sebelumnya.

## Proposed Changes

### Database & Realtime

#### [MODIFY] [supabaseClient.ts](file:///W:/ololuv1/src/services/supabaseClient.ts)
- Tambahkan listener realtime khusus untuk tabel `emergency_reports`.
- Picu event `new-emergency` ke seluruh komponen yang berlangganan.

### Admin Dashboard Interface

#### [MODIFY] [AdminView.tsx](file:///W:/ololuv1/src/components/AdminView.tsx)
- Tambahkan state `showPanicOverlay` dan `activeEmergency`.
- Implementasikan `useEffect` untuk mendeteksi laporan baru secara realtime.
- **Audio Logic:** Gunakan `AudioContext` untuk memutar suara sirine berulang saat ada laporan masuk.
- **Visual Logic:** Tambahkan overlay merah berkedip (Fullscreen) yang menampilkan detail pelapor, lokasi, dan tombol "Tangani Sekarang".
- **Tab Darurat:** Implementasikan UI detail di `activeTab === 'darurat'` untuk memantau seluruh riwayat SOS.

## Verification Plan

### Manual Verification
1. Login sebagai Admin.
2. Login sebagai Penumpang di HP/Tab lain.
3. Buat pesanan, lalu tekan tombol **🚨 PANIK / SOS**.
4. Verifikasi:
   - Dashboard Admin memunculkan overlay merah besar.
   - Suara sirine berbunyi.
   - Lokasi darurat muncul di peta admin.
   - Admin bisa menekan tombol "Tangani" untuk mematikan alarm.
