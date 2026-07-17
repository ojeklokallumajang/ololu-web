# Walkthrough - Perbaikan Penyimpanan Berkas Driver (Fix Missing Docs)

Saya telah memperbaiki masalah di mana data kendaraan dan foto dokumen driver (KTP, SIM, STNK) tidak muncul di Panel Admin meskipun sudah diisi lengkap oleh pendaftar.

## Perubahan yang Dilakukan

### 1. Perbaikan Logika Database (`store.ts`)
- **Ganti Update ke Upsert:** Sebelumnya, aplikasi menggunakan perintah `update` yang hanya bekerja jika data sudah ada di tabel detail driver. Sekarang saya menggunakan `upsert` (Update or Insert).
- **Auto-Create Detail:** Jika ini adalah pendaftaran pertama kali, sistem akan otomatis **membuat baris baru** di tabel detail driver saat mereka mengunggah dokumen. Jika sudah ada, sistem akan **memperbaruinya**.

### 2. Keamanan Data
- Memastikan status verifikasi tetap `false` saat dokumen diperbarui, sehingga Admin harus melakukan review ulang setiap ada perubahan berkas.

## Verifikasi yang Dilakukan

- [x] **Tes Simpan:** Mensimulasikan pendaftaran driver baru; data sekarang tersimpan dengan benar di tabel `driver_details`.
- [x] **Sinkronisasi Admin:** Memastikan modal verifikasi di Admin sekarang menampilkan Plat Nomor, Tipe Motor, dan foto dokumen secara lengkap.
- [x] **GitHub Push:** Perbaikan sudah aktif di repositori `main`.

---
> [!IMPORTANT]
> **Instruksi untuk Driver:**
> Karena sebelumnya datanya gagal masuk ke tabel detail, **mohon minta driver untuk klik "Kirim Lamaran" atau "Simpan" sekali lagi** di aplikasinya. Kali ini datanya dijamin akan langsung tembus ke dashboard Admin Anda!
