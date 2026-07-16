# Alur Real-time "Super Irit" dengan UI Hard-Lock

Strategi ini menjamin UI tetap terkunci pada proses order meskipun halaman di-refresh, tanpa melakukan penulisan status ke database di tengah perjalanan.

## User Review Required

> [!IMPORTANT]
> **Mekanisme Penguncian (Hard-Lock):**
> - Sistem akan menggunakan `Session-Tracking` yang disimpan di perangkat.
> - Jika user melakukan Refresh (F5), aplikasi akan mendeteksi sesi aktif dan **memaksa** UI masuk ke layar lacak pesanan, bahkan sebelum koneksi database/websocket terbentuk sempurna.
> - Data sopir (nama, plat, lokasi) akan disinkronkan kembali via jalur Realtime (Broadcast) dalam waktu < 1 detik setelah refresh.

## Proposed Changes

### Logic & Persistence

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Tambahkan metode `setLocalOrderLock(orderId, role)` dan `getLocalOrderLock()`.
- Modifikasi fungsi `selesaikanPesanan` untuk menghapus pengunci lokal setelah data berhasil ditulis ke database.

### Real-time Engine

#### [MODIFY] [supabaseClient.ts](file:///W:/ololuv1/src/services/supabaseClient.ts)
- Tambahkan fitur `requestStateSync(orderId)`: Penumpang yang baru refresh akan meminta sopir untuk mengirimkan ulang biodata dan lokasinya via Broadcast.

### Interface Implementation

#### [MODIFY] [App.tsx](file:///W:/ololuv1/src/App.tsx)
- Tambahkan pengecekan `getLocalOrderLock()` pada saat inisialisasi aplikasi. Jika ada, arahkan view langsung ke `PassengerView` atau `DriverView` dengan state order yang terkunci.

#### [MODIFY] [DriverView.tsx](file:///W:/ololuv1/src/components/DriverView.tsx) & [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx)
- Implementasikan listener untuk sinkronisasi ulang setelah refresh agar data yang hilang dari memori RAM bisa kembali dari jalur WebSocket.

## Verification Plan

### Manual Verification
1. **Tes Kunci:** Buat pesanan -> Terima sebagai Sopir -> Tekan F5 (Refresh) pada kedua browser.
2. **Hasil yang diharapkan:** Kedua browser harus langsung masuk kembali ke layar order masing-masing, bukan ke beranda atau layar cari sopir.
3. **Tes Sinkronisasi:** Pastikan lokasi sopir muncul kembali di peta penumpang segera setelah refresh selesai.
4. **Tes Database:** Cek Supabase Dashboard, pastikan tidak ada aktivitas `UPDATE` pada tabel `orders` selama perjalanan berlangsung.
