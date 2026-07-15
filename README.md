<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Ololu Lumajang - Progressive Web App

Aplikasi ojek dan pengantaran logistik lokal khusus Kabupaten Lumajang.

## 🚀 Fitur Utama
- **Login Cepat:** Nomor HP + Kata Sandi.
- **OTP WhatsApp:** Verifikasi pendaftaran via Fonnte API Nyata.
- **One-Step Registration:** Pendaftaran mitra rider langsung lengkap dengan dokumen (KTP, SIM, STNK, dll).
- **Tempat & Tanggal Lahir:** Pendataan identitas lengkap sejak awal pendaftaran.
- **Realtime Radar:** Pelacakan posisi rider di peta Lumajang secara instan menggunakan Supabase Realtime.
- **Admin Dashboard:** Kendali penuh untuk Superuser dan Sub-Admin dengan Audit Log.

## 🛠️ Teknologi
- **Frontend:** React, Vite, Tailwind CSS.
- **Backend:** Supabase (PostgreSQL, Realtime).
- **Hosting:** Cloudflare Pages.
- **WhatsApp API:** Fonnte.

## 📦 Cara Menjalankan Lokal
1. **Install dependencies:** `npm install`
2. **Setup .env:** Isi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `VITE_GOOGLE_MAPS_PLATFORM_KEY`.
3. **Run development:** `npm run dev`

## 🌍 Deployment
Aplikasi ini di-deploy otomatis ke Cloudflare Pages dari branch `main`. Pastikan Environment Variables sudah diatur di dashboard Cloudflare.

## 📄 Dokumentasi
- [Product Requirements Document (PRD)](PRD.md)
- [Database Schema (SQL)](supabase_schema.sql)
