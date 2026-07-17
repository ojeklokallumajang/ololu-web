# Walkthrough - Implementasi Deposit via Bukti Foto (Real Flow)

Saya telah mengintegrasikan sistem deposit (Top Up) yang mendukung pengunggahan bukti transfer langsung dari kamera HP. Sekarang seluruh alur keuangan dari Driver ke Admin sudah terpusat di dalam aplikasi.

## Alur Kerja Baru (Sisi Driver)

### 1. Ambil Foto dari HP
- Driver tidak perlu lagi mengirim WhatsApp manual. Cukup klik tombol **"Ambil Foto Bukti Transfer"**.
- Di HP, sistem akan otomatis menawarkan untuk membuka **Kamera** atau **Galeri**.
- Driver akan melihat preview kecil foto yang sudah diambil sebelum dikirim.

### 2. Pengiriman Deposit
- Setelah foto siap, driver klik **"Kirim Deposit Rp XX.XXX"**.
- Status di riwayat driver akan berubah menjadi **"MENUNGGU"** (Saldo belum bertambah sampai Admin setuju).

## Alur Kerja Baru (Sisi Admin)

### 3. Review Bukti di Tab Dompet
- Di Dashboard Admin tab **💰 Dompet**, akan muncul pengajuan baru berlabel **"DEPOSIT MASUK"**.
- Admin bisa klik tombol 👁️ (**Lihat Bukti**) untuk memperbesar foto bukti transfer yang dikirim driver.

### 4. ACC & Update Saldo Otomatis
- Jika bukti sudah benar, Admin klik **"ACC & TAMBAH SALDO"**.
- Sistem akan otomatis:
  - Menambah saldo driver tersebut secara riil.
  - Memperbarui status transaksi menjadi "Disetujui".
  - Mencatat saldo awal dan saldo akhir sebagai audit log keuangan.

---
> [!TIP]
> **Cara Mencoba Sekarang:**
> 1. Gunakan HP untuk login sebagai **Driver**.
> 2. Ajukan Top Up dan **ambil foto struk/bukti transfer** asli atau simulasi.
> 3. Masuk ke **Admin Panel** -> **Dompet**.
> 4. Klik ikon mata untuk melihat foto, lalu klik tombol hijau **ACC** untuk mengetes penambahan saldo otomatis.
