# Product Requirements Document (PRD) - Ololu Lumajang

## 1. Visi Produk
Menjadi infrastruktur digital utama bagi transportasi dan logistik di Kabupaten Lumajang yang berfokus pada kemandirian ekonomi lokal, biaya operasional rendah, dan keandalan sistem *real-time*.

---

## 2. Analisis Peran & Alur Kerja

### 2.1 Penumpang (User)
- **Kebutuhan:** Memesan jasa transportasi (Ojek/Mobil) atau pengantaran (Makan/Belanja/Paket) dengan harga transparan.
- **Alur Utama:**
    1. Login via No HP & Sandi (Verifikasi OTP hanya di awal).
    2. Memilih jenis layanan (Ride, Car, Food, Send, Big Cargo).
    3. Menentukan lokasi menggunakan *Map Picker*, deteksi GPS otomatis, atau *Copy-Paste Link Google Maps*.
    4. Khusus layanan Belanja: Mengisi daftar item per-toko.
    5. Melacak posisi driver secara *live* di peta.
    6. Mengunduh e-Nota setelah pesanan selesai.

### 2.2 Mitra Driver (Sopir)
- **Kebutuhan:** Mendapatkan orderan terdekat dan mengelola pendapatan secara mandiri.
- **Alur Utama:**
    1. Mendaftar dengan mengunggah foto KTP, SIM, STNK, dan Kendaraan.
    2. Menunggu verifikasi admin.
    3. Mengaktifkan status "Online" (Syarat: Saldo Dompet ≥ Rp 5.000).
    4. Menerima tawaran order (Mode Manual atau Otomatis/Autobid).
    5. Menjalankan tahapan perjalanan (Menuju Jemput -> Dalam Perjalanan -> Selesai).
    6. Mengunggah rincian nota belanja jika layanan makanan/belanja.
    7. Melakukan tarik dana (*Withdraw*) pendapatan.

### 2.3 Administrator (Superuser)
- **Kebutuhan:** Kendali penuh atas ekosistem aplikasi dan keamanan keuangan.
- **Alur Utama:**
    1. Memverifikasi kelayakan mitra baru.
    2. Mengatur tarif (Dasar, Per-KM, Biaya Stop) secara dinamis.
    3. Menyalakan/Mematikan layanan tertentu berdasarkan kondisi lapangan.
    4. Menyetujui deposit atau penarikan dana mitra.
    5. Memantau sinyal darurat (SOS) dari radar peta.
    6. Meninjau log audit untuk keamanan internal.
    7. Mengunduh laporan keuangan Excel (Harian, Mingguan, Bulanan).

---

## 3. Spesifikasi Fitur Utama (Functional Requirements)

### 3.1 Sistem Peta Hybrid (Ololu Hybrid Maps)
- **Metering API:** Sistem mencatat setiap penggunaan Google Maps API.
- **Auto-Switching:** Jika penggunaan mendekati limit gratis $200, sistem otomatis beralih ke OpenStreetMap (OSM) via Leaflet.
- **Strict Boundary:** Pencarian lokasi dibatasi pada area Lumajang (Lat: -7.9 s/d -8.3, Lng: 113.1 s/d 113.4).

### 3.2 Logika Perhitungan Tarif & Jarak
- **Route-Based Distance:** Jarak dihitung berdasarkan rute jalan nyata (Google Directions), bukan garis lurus.
- **Pembulatan:** Jarak selalu dibulatkan **KE ATAS** (Contoh: 6.1 KM $\to$ 7 KM).
- **Rumus Harga Baru:**
    - Jika Jarak $\le$ Batas KM Dasar: **Harga = Tarif Dasar**.
    - Jika Jarak $>$ Batas KM Dasar: **Harga = Total KM (Bulat) × Tarif Per KM**.

### 3.3 Sistem Keuangan & Wallet
- **Bagi Hasil:** Pemotongan komisi aplikator dilakukan secara otomatis oleh *Postgres Trigger* di database saat status order menjadi 'Selesai'.
- **Deposit/Top-Up:** Driver melakukan transfer manual dan mengunggah foto bukti untuk diverifikasi Admin.
- **Withdrawal:** Driver mengajukan penarikan, saldo dikurangi (termasuk biaya admin tarik), dan diproses manual oleh Admin.
- **Advanced Reporting:** Admin dapat mengekspor laporan kinerja keuangan ke format Excel (.xls) dengan cakupan harian, mingguan, dan riwayat 3 bulan.

### 3.4 Pusat Komunikasi Internal
- **WebSocket Messaging:** Chat instan antara Driver & Penumpang per-order.
- **Multimedia Support:** Mendukung pengiriman Foto (Base64) dan Pesan Suara (Webm).
- **Retention:** Chat tersimpan di database selama 31 hari sebelum dihapus otomatis.

---

## 4. Aturan Bisnis & Integritas Data

1. **Sesi Pengguna:** Sesi login tidak boleh kadaluwarsa kecuali di-logout manual.
2. **Keamanan Saldo:** Saldo driver disimpan di tabel `driver_details` dan `wallets` yang disinkronkan oleh database trigger untuk mencegah manipulasi.
3. **Audit Log:** Setiap perubahan tarif atau status admin wajib mencatat ID Admin, Nama, Aksi, dan Timestamp.
4. **SOS System:** Sinyal darurat penumpang/driver akan membunyikan alarm kencang di dashboard Admin dan memunculkan posisi GPS terakhir.

---

## 5. Infrastruktur & Skalabilitas

- **Frontend:** React 19 (Vite) - Dioptimalkan untuk akses cepat di jaringan seluler Lumajang.
- **Backend:** Supabase PostgreSQL - Menggunakan *Row Level Security* (RLS) untuk perlindungan data.
- **Realtime:** Supabase Realtime Channels - Digunakan untuk koordinasi GPS dan Chat.
- **Hosting:** Cloudflare Pages - Menyediakan proteksi DDoS dan CDN lokal Indonesia.
- **Integrasi Pihak Ketiga:**
    - WhatsApp: Fonnte API.
    - Maps: Google Maps API v3.
    - PDF: Native Browser Printing for Receipts.

---
*Dokumen ini adalah acuan resmi pengembangan Ololu Lumajang versi 2.0 (Produksi).*
