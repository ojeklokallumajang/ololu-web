<div align="center">
  <img width="400" alt="Ololu Logo" src="public/favicon.svg" />
  <h1>Ololu Lumajang - Super App Transportasi & Logistik Lokal</h1>
  <p>Aplikasi Web Progresif (PWA) tercanggih khusus untuk masyarakat Kabupaten Lumajang.</p>
</div>

---

## 🌟 Apa itu Ololu?
**Ololu Lumajang** adalah platform *all-in-one* yang menghubungkan masyarakat Lumajang dengan mitra driver lokal. Dibangun dengan fokus pada efisiensi biaya API, akurasi rute nyata, dan kemudahan penggunaan bagi warga lokal.

## 🚀 Fitur Unggulan
### 📍 Sistem Peta Hybrid & Cerdas (Anti-Boncos)
- **Google Maps x OpenStreetMap:** Berpindah otomatis ke OpenStreetMap jika kuota Google Maps habis untuk menjaga biaya operasional tetap Rp 0.
- **Strict Lumajang Search:** Pencarian lokasi dikunci ketat di area Lumajang agar hasil selalu akurat dan relevan.
- **Copy-Paste Link Maps:** Penumpang bisa menempel link dari aplikasi Google Maps asli untuk menentukan titik jemput/antar secara instan.

### 🍔 Alur Belanja Multi-Resto (Estafet)
- **Belanja Efisien:** Penumpang bisa memesan dari banyak toko/restoran sekaligus dalam satu kali jalan.
- **Item List Per-Stop:** Rincian belanja terpisah rapi untuk setiap toko agar driver tidak bingung.
- **Auto-Home:** Alamat rumah otomatis terdeteksi via GPS saat membuka layanan Makanan.

### 💰 Sistem Dompet & Keuangan Terpadu
- **Auto-Commission:** Potongan bagi hasil aplikator dilakukan otomatis setiap kali order selesai.
- **Dashboard Pendapatan Driver:** Pantau hasil kerja harian, mingguan, dan bulanan secara *real-time*.
- **Invoice Pro (e-Nota):** Penumpang bisa mengunduh nota belanja digital super detail (breakdown tarif, timeline perjalanan, dan stempel digital).
- **Financial Reporting Admin:** Ekspor laporan keuangan ke format Excel (XLS) untuk periode Harian, Mingguan, dan 3 bulan terakhir.

### 💬 Komunikasi Real-time Tingkat Lanjut
- **Instant Chat:** Kirim pesan teks secepat kilat menggunakan teknologi WebSocket.
- **Kirim Foto & Suara:** Bagikan foto lokasi atau nota fisik serta pesan suara (Voice Note) di dalam aplikasi.

---

## 🛠️ Arsitektur Teknologi
- **Core:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS 4.0.
- **Database & Realtime:** Supabase (Postgres & Broadcast Channels).
- **Maps Engine:** Google Maps JS SDK + Leaflet (OpenStreetMap).
- **Otentikasi:** WhatsApp OTP via Fonnte API.
- **Hosting:** Cloudflare Pages (Enterprise-grade Speed).

---

## 📦 Panduan Instalasi Lokal
1. **Clone Repositori:**
   ```bash
   git clone https://github.com/ojeklokallumajang/ololu-web.git
   cd ololu-web
   ```
2. **Install Dependensi:**
   ```bash
   npm install
   ```
3. **Konfigurasi Environment:**
   Buat file `.env` di root folder dan isi:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_GOOGLE_MAPS_PLATFORM_KEY=your_google_key
   ```
4. **Jalankan Aplikasi:**
   ```bash
   npm run dev
   ```

---

## 🌍 Dokumentasi Lanjutan
- 📘 [Product Requirements Document (PRD)](PRD.md) - Detail logika bisnis dan alur kerja.
- 📂 [Presentation Resources](docs/pitch/) - Materi konten dinamis untuk PPT (User, Driver, Investor).
- 📂 [Skema Database](supabase_schema.sql) - Struktur tabel dan Trigger Postgres.

---
<div align="center">
  <p><b>PT Ololu Pengantaran Nusantara Lumajang</b></p>
  <p><i>"Warga Lumajang, Bela Beli Produk Lumajang!"</i></p>
</div>
