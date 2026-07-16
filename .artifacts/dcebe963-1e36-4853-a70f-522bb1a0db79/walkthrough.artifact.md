# Walkthrough - Implementasi Tarif Lengkap & Pemisahan Kendaraan

Saya telah memperluas sistem tarif aplikasi Ololu untuk mendukung perbedaan harga antara Motor dan Mobil, serta memberikan kontrol penuh kepada Admin atas seluruh parameter biaya.

## Perubahan Utama

### 1. Panel Admin: Dashboard Tarif Kategoris
- **Kategori Navigasi:** Pengaturan tarif kini dibagi menjadi kategori: 🏍️ Ojek, 🚗 Mobil, 🍔 Makan, 📦 Paket, 🚚 Logistik, 🅿️ Parkir, dan ⚙️ Sistem.
- **Kontrol Penuh:** Anda sekarang bisa mengatur:
  - Tarif Dasar, Tarif Per KM, Tarif Minimum, dan Batas KM Dasar untuk **setiap layanan**.
  - Biaya Parkir (Biasa & Pasar).
  - Biaya Tambahan (Stop mampir & Kelebihan item).
  - Aturan Sistem (Radius cari & Saldo minimal driver).

### 2. Sisi Penumpang: Pilih Motor atau Mobil
- **Vehicle Selector:** Saat memesan layanan Ride (Ojek) atau Send (Paket), penumpang kini bisa memilih menggunakan **Motor** atau **Mobil**.
- **Real-time Price Adjustment:** Estimasi biaya akan otomatis berubah sesuai dengan tarif yang Anda tentukan di Admin Panel untuk kendaraan tersebut.

### 3. Logika Pendapatan Driver yang Lebih Adil
- **Potongan Jasa:** Sistem sekarang menghitung potongan jasa aplikasi secara otomatis berdasarkan persentase yang diatur di Admin Panel.
- **Transparansi Dompet:** Driver akan melihat rincian Pendapatan Kotor dan Potongan Jasa di riwayat transaksi dompet mereka.

## Verifikasi yang Dilakukan

- [x] **Sync Tarif:** Mengubah tarif di Admin -> Tab Mobil, dan memverifikasi perubahan harga di layar Penumpang.
- [x] **Revenue Logic:** Memastikan saldo driver terupdate dengan benar (Total Bayar - Potongan Jasa).
- [x] **GitHub Push:** Seluruh perbaikan telah dikirim ke repositori pusat.

---
> [!TIP]
> **Cara Mencoba:**
> 1. Hard Refresh (**Ctrl + F5**) di Dashboard Admin.
> 2. Buka tab **Edit Tarif**. Anda akan melihat tampilan baru dengan kategori yang rapi.
> 3. Coba ubah tarif Mobil, lalu buka Dashboard Penumpang untuk melihat perbedaannya saat memilih ikon Mobil.
