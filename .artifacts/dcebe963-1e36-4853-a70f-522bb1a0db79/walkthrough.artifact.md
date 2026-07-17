# Walkthrough - Implementasi Sistem Dompet & Keuangan Riil

Saya telah mengubah sistem Dompet dari yang sebelumnya hanya simulasi menjadi alur kerja operasional yang nyata. Sekarang, pergerakan uang dikendalikan sepenuhnya oleh Admin untuk menjamin keamanan kas Ololu.

## Perubahan Alur Kerja (Real Flow)

### 1. Sisi Driver: Top Up via WhatsApp
- **Hapus Tombol Instant:** Driver tidak bisa lagi menambah saldo sendiri dengan satu klik (mencegah penyalahgunaan).
- **Request Top Up:** Saat driver ingin isi saldo, mereka memilih nominal lalu klik tombol **"Request Top Up"**. Sistem akan otomatis membuka WhatsApp Admin dengan pesan yang sudah terisi (Nama, No HP, dan Nominal).
- **Pembayaran Manual:** Driver membayar ke Admin (Cash atau Transfer) sesuai kesepakatan.

### 2. Sisi Admin: Kontrol Saldo Penuh
- **Input Saldo Manual:** Setelah Admin menerima pembayaran dari driver, Admin membuka tab **Rider** dan klik tombol hijau **"ISI SALDO"** di baris nama driver tersebut.
- **Pencatatan Otomatis:** Setiap pengisian saldo oleh Admin akan tercatat otomatis di riwayat transaksi sebagai bukti audit.

### 3. Sisi Admin: Persetujuan Tarik Dana (Withdraw)
- **Tab Dompet Baru:** Menambahkan tab **💰 Dompet** di Control Panel Admin.
- **Antrian Cair Dana:** Admin bisa melihat daftar driver yang mengajukan penarikan uang.
- **Tombol ACC/TOLAK:** Admin bisa menyetujui (ACC) setelah mentransfer uang ke driver, atau menolak jika ada masalah. Saldo driver hanya akan terpotong secara permanen jika Admin mengklik **ACC**.

## Ringkasan Teknis

- [x] **Store Sync:** Menambahkan fungsi `topUpSopir` dan `prosesTransaksi` di database.
- [x] **WhatsApp Integration:** Template pesan dinamis untuk pengajuan Top Up.
- [x] **Security:** Memastikan saldo tidak bisa dimanipulasi oleh user di sisi klien.

---
> [!TIP]
> **Cara Mengetes:**
> 1. Masuk sebagai **Driver**, ajukan **Tarik Dana** sebesar Rp 10.000.
> 2. Masuk sebagai **Admin**, buka tab **Dompet**.
> 3. Anda akan melihat pengajuan tersebut. Klik **ACC & CAIRKAN** untuk memprosesnya.
