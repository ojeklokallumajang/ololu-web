# Sistem Verifikasi Deposit (Top Up) Otomatis via Bukti Foto

Rencana ini akan memindahkan alur Top Up driver dari WhatsApp ke dalam aplikasi, memungkinkan driver mengambil foto bukti transfer dari HP mereka dan Admin melakukan review serta ACC/Tolak deposit secara langsung di Control Panel.

## User Review Required

> [!IMPORTANT]
> **Alur Kerja Baru:**
> 1. Driver memilih nominal dan mengklik tombol **"Ambil Foto Bukti Transfer"** (akan membuka kamera/galeri HP).
> 2. Setelah foto dipilih, driver klik **"Kirim Deposit"**.
> 3. Deposit masuk ke status **"Menunggu"** di sisi Admin (Saldo belum bertambah).
> 4. Admin meninjau foto bukti di tab **💰 Dompet**.
> 5. Jika Admin klik **ACC**, saldo driver otomatis bertambah detik itu juga.

## Proposed Changes

### Data Layer (`store.ts`)

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Tambahkan fungsi `ajukanTopUpSopir(sopirId, jumlah, buktiBase64)`.
- Perbarui `prosesTransaksi` agar mendukung logika penambahan saldo (untuk Top Up) dan pengurangan saldo (untuk Withdraw).
- Pastikan `getAllTransactions` mengambil kolom `bukti_transfer` dan `alasan_penolakan`.

### Driver Interface (`DriverView.tsx`)

#### [MODIFY] [DriverView.tsx](file:///W:/ololuv1/src/components/DriverView.tsx)
- Tambahkan input file tersembunyi yang mendukung akses kamera (`capture="environment"`).
- Implementasi fungsi `handlePickProof` untuk mengonversi gambar ke Base64.
- Perbarui UI Top Up: Tampilkan preview foto bukti sebelum dikirim.

### Admin Interface (`AdminView.tsx`)

#### [MODIFY] [AdminView.tsx](file:///W:/ololuv1/src/components/AdminView.tsx)
- Perbarui tab **💰 Dompet**:
  - Tampilkan pengajuan **Deposit Masuk** (Top Up) di bagian atas antrian.
  - Tambahkan tombol **"LIHAT BUKTI"** yang akan membuka modal gambar untuk verifikasi Admin.
  - Tombol **ACC** akan secara otomatis menjalankan fungsi `topUpSopir` di backend.

## Verification Plan

### Manual Verification
1. Login sebagai **Driver** melalui HP (atau emulator).
2. Lakukan pengajuan Top Up dengan mengunggah foto.
3. Pastikan status di riwayat driver adalah "MENUNGGU".
4. Login sebagai **Admin**.
5. Buka tab **Dompet**, lihat foto bukti transfer driver tersebut.
6. Klik **ACC & TAMBAH SALDO**.
7. Verifikasi saldo driver bertambah secara otomatis.
