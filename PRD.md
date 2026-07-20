# Product Requirements Document (PRD) - Ololu Lumajang v5.6

## 1. Visi Produk
Menjadi infrastruktur digital utama bagi transportasi dan logistik di Kabupaten Lumajang yang berfokus pada kemandirian ekonomi lokal, keadilan bagi mitra driver (No More Receh), dan keandalan sistem *real-time* yang hemat biaya.

---

## 2. Analisis Peran & Alur Kerja

### 2.1 Penumpang (User)
- **Kebutuhan:** Memesan jasa dengan harga transparan, kemudahan pembayaran tunai tanpa receh, dan identitas driver yang jelas.
- **Alur Utama:**
    1. Login via No HP & Sandi (Verifikasi OTP WhatsApp via Fonnte).
    2. Memilih jenis layanan dengan label dinamis (Ojek: "Lokasi Penjemputan", Makanan: "Resto/Toko Tujuan").
    3. Menentukan lokasi menggunakan *Map Picker* atau *Copy-Paste Link Google Maps*.
    4. Memantau rincian biaya secara live: **Biaya Jasa** vs **Titip Nota (Belanja)**.
    5. Melacak posisi driver dan melakukan chat multimedia (Foto/Suara).
    6. Menerima update nominal nota belanja secara real-time dari driver.
    7. Mengunduh **Invoice Pro (e-Nota)** detail dengan pemisahan jasa dan belanja.

### 2.2 Mitra Driver (Sopir)
- **Kebutuhan:** Pendapatan bersih yang transparan dan perlindungan tarif rute jalan raya.
- **Alur Utama:**
    1. Registrasi mandiri dengan upload berkas lengkap (KTP, SIM, STNK, Motor).
    2. Dasboard Pendapatan: Menampilkan **Penghasilan Bersih** (setelah potong komisi) secara Harian/Mingguan/Bulanan.
    3. Input Nota: Memasukkan nominal belanja fisik di toko yang langsung muncul di HP Penumpang.
    4. Tracking rute jalan raya asli via Google atau OSRM untuk akurasi jarak.
    5. Identitas: Foto profil tampil di dashboard trip untuk keamanan.

### 2.3 Administrator (Superuser)
- **Kebutuhan:** Kendali infrastruktur total dan fleksibilitas tarif.
- **Alur Utama:**
    1. Manajemen Infrastruktur: Memilih mesin peta aktif (**Google Maps API** atau **OSM + OSRM**).
    2. Kendali Tarif Pro:
        - Setel **Tarif Minimum** dan **Tarif Dasar** per layanan.
        - Setel **Jarak Flat (KM)**: Jarak di mana tarif masih harga dasar (cth: 0-4 KM).
        - Setel **Jam Sibuk (Rush Hour)** & **Jam Malam (Night Shift)** per layanan.
        - Setel **Batas Jarak Maksimum** per layanan.
    3. Monitoring & Laporan: Ekspor Excel, Log Audit, dan SOS Radar.

---

## 3. Spesifikasi Fitur Utama (Functional Requirements)

### 3.1 Sistem Peta Cerdas (Hybrid Routing)
- **Multi-Engine:** Mendukung Google Maps (Premium) dan OpenStreetMap + OSRM (Gratis).
- **OSRM Integration:** Menghitung jarak rute jalan raya (bukan garis lurus) untuk mesin OSM tanpa biaya API.
- **Auto-Switching:** Proteksi kuota API Google dengan fallback otomatis atau manual via Admin.

### 3.2 Logika Perhitungan Tarif & Jarak
- **Route-Based Distance:** Jarak dihitung berdasarkan rute aspal nyata.
- **Rounding Strategy:**
    - **Jarak:** Selalu dibulatkan **KE ATAS** (Contoh: 2.1 KM $\to$ 3 KM) untuk keadilan driver.
    - **Harga:** Total akhir dibulatkan ke **RIBUAN KE ATAS** (Contoh: Rp 12.100 $\to$ Rp 13.000) untuk kemudahan kembalian tunai.
- **Formula Tarif Flat & Progresif:**
    - Jika Jarak $\le$ Batas Flat: **Harga = Tarif Dasar + Surcharge**.
    - Jika Jarak $>$ Batas Flat: **Harga = Tarif Dasar + ((Total KM - Jarak Flat) × Tarif Per KM) + Surcharge**.
- **Dynamic Surcharge:** Tambahan biaya flat jika masuk jam sibuk atau jam malam yang ditentukan Admin.

### 3.3 Transparansi Ekonomi
- **Pemisahan Tagihan:** Sistem memisahkan saldo Belanja (Titip Nota) dari Biaya Jasa agar statistik keuangan tidak rancu.
- **Net Income Stats:** Driver hanya melihat uang yang menjadi hak miliknya (Ongkir - Komisi + Parkir).

---

## 4. Teknologi & Infrastruktur
- **Routing Engine:** OSRM (Open Source Routing Machine).
- **Communication:** WebSocket & Supabase Broadcast (Instant Chat & GPS Sync).
- **Identity:** Cloud Storage for Profile Pictures.

---
*Dokumen v5.6 - Standar Produksi Ololu Lumajang.*
