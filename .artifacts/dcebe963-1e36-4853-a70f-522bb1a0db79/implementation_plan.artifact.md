# Finalisasi Fungsionalitas Operasional (Chat, Dompet, & Darurat)

Rencana ini bertujuan untuk menyelesaikan seluruh metode yang "hilang" atau masih berupa placeholder di `OloluStore`, sehingga fitur Chat, Dompet, Tombol Panik, dan Rating bisa berfungsi 100% menggunakan Supabase.

## User Review Required

> [!IMPORTANT]
> **Update Database Diperlukan:** Saya akan memberikan script SQL tambahan untuk membuat tabel `chat_messages`, `wallet_transactions`, `emergency_reports`, dan `ratings` di Supabase. Anda wajib menjalankan script ini agar fitur berfungsi.

## Proposed Changes

### Database Schema (Supabase)

#### [NEW] [operational_schema.sql](file:///W:/ololuv1/operational_schema.sql)
- Tabel `chat_messages`: Untuk komunikasi real-time antara penumpang dan sopir.
- Tabel `wallet_transactions`: Untuk mencatat riwayat saldo, top-up, dan withdraw.
- Tabel `emergency_reports`: Untuk mencatat aktivasi Tombol Panik (SOS).
- Tabel `ratings`: Untuk menyimpan penilaian performa sopir.

### Logic Implementation

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Implementasikan metode `Chat`: `getChatMessages`, `sendChatMessage`.
- Implementasikan metode `Dompet`: `toggleOnlineSopir`, `topUpSaldoSopir`, `ajukanTarikDana`.
- Implementasikan metode `Operasional`: `simpanNotaToko`, `tambahRating`.
- Implementasikan metode `Darurat`: `tambahEmergency`, `getAllEmergency`.
- Tambahkan helper `getProfil` untuk kompatibilitas UI.

### UI Integration

#### [MODIFY] [DriverView.tsx](file:///W:/ololuv1/src/components/DriverView.tsx) & [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx)
- Hubungkan state transaksi dan riwayat ke metode store yang baru dibuat.
- Pastikan semua pemanggilan fungsi menangani sifat *asynchronous* (Promise) dengan benar.

## Verification Plan

### Manual Verification
1. **Chat:** Coba kirim pesan dari Sopir ke Penumpang (dan sebaliknya).
2. **Dompet:** Coba "Top Up" saldo simulasi dan pastikan riwayat transaksi muncul.
3. **Panik:** Tekan tombol SOS dan cek apakah laporan muncul di Dashboard Admin.
4. **Rating:** Selesaikan order dan beri bintang, lalu cek apakah rata-rata rating sopir terupdate.
