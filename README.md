<div align="center">
  <img width="400" alt="Ololu Logo" src="public/favicon.svg" />
  <h1>Ololu Lumajang v5.6 - Super App Pro</h1>
  <p>Infrastruktur Transportasi & Logistik tercanggih dengan akurasi rute aspal dan efisiensi biaya API.</p>
</div>

---

## 🌟 Keunggulan Ololu v5.6
**Ololu Lumajang** bukan sekadar aplikasi ojek biasa. Kami menggunakan teknologi perutean (routing) jalan raya tercanggih untuk memastikan Driver tidak rugi bensin dan Penumpang mendapatkan harga yang logis.

## 🚀 Fitur Utama Terbaru
### 📍 Peta Cerdas & Gratisan Akurat (OSRM Engine)
- **Hybrid Maps:** Admin bisa memilih antara **Google Maps API** (Premium) atau **OpenStreetMap (OSM)**.
- **OSRM Inside:** Meskipun menggunakan OSM gratisan, jarak tetap dihitung berdasarkan **Rute Jalan Raya Nyata** (bukan garis lurus) menggunakan mesin OSRM.
- **Auto-Ceil Distance:** Jarak 2.1 KM otomatis dihitung 3 KM demi kesejahteraan Driver.

### 💰 Ekonomi Jujur & Transparan
- **No More Receh:** Total bayar otomatis dibulatkan ke **Ribuan Terdekat** (cth: Rp 12.100 jadi Rp 13.000) agar transaksi tunai lancar jaya.
- **Live Receipt nominal:** Driver input nominal nota di toko, Penumpang langsung lihat updatenya secara live tanpa refresh.
- **Net Income Stats:** Driver bisa memantau penghasilan murni (sudah dipotong komisi Ololu) secara real-time.

### ⚙️ Kendali Tarif Super Fleksibel
- **Flat Rate System:** Setel tarif flat untuk jarak X km pertama (cth: 4 KM pertama Rp 8.000).
- **Dynamic Surcharge:** Pengaturan mandiri Jam Sibuk (Rush Hour) dan Jam Malam (Night Shift) per layanan.
- **Max Distance Guard:** Pembatasan jarak pesanan otomatis per jenis layanan.

### 📱 Antarmuka (UX) Personal
- **Dynamic Labeling:** Teks otomatis berubah antara "Lokasi Penjemputan" (Ride) dan "Resto/Toko Tujuan" (Food).
- **Profile Identity:** Foto asli pengguna dan mitra tampil di beranda dan dashboard untuk keamanan ekstra.

---

## 🛠️ Stack Teknologi
- **Engine:** React 19 + TypeScript + Vite.
- **Database:** Supabase (Realtime Sync & Broadcast).
- **Routing:** Google Directions API & OSRM (Open Source Routing Machine).
- **Styling:** Tailwind CSS 4.0.
- **Auth:** Fonnte WhatsApp OTP.

---

## 📦 Instalasi Cepat
```bash
git clone https://github.com/ojeklokallumajang/ololu-web.git
npm install
npm run dev
```

---
<div align="center">
  <p><b>PT Ololu Pengantaran Nusantara Lumajang</b></p>
  <p><i>"Warga Lumajang, Bela Beli Produk Lumajang!"</i></p>
</div>
