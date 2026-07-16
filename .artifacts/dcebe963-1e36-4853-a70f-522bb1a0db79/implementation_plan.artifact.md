# Penambahan Tarif Per Stop Spesifik Layanan

Rencana ini akan menambahkan pengaturan biaya tambahan per-stop (mampir) yang unik untuk setiap kategori layanan (Ojek, Mobil, Paket, dll), sehingga Admin memiliki fleksibilitas penuh dalam menentukan biaya mampir berdasarkan jenis kendaraannya.

## User Review Required

> [!IMPORTANT]
> **Transisi Data:** Saya akan mengganti penggunaan field global `biayaPerStopTambahan` dengan field spesifik seperti `ojekBiayaPerStop`, `mobilBiayaPerStop`, dsb. Pengaturan lama akan tetap ada sebagai cadangan sistem, namun pengaturan per-kategori akan menjadi prioritas utama di aplikasi.

## Proposed Changes

### Data Model & Store

#### [MODIFY] [types.ts](file:///W:/ololuv1/src/types.ts)
- Tambahkan field biaya stop ke `PengaturanTarif`:
  - `ojekBiayaPerStop`, `mobilBiayaPerStop`, `makananBiayaPerStop`, `paketBiayaPerStop`, `barangBesarBiayaPerStop`.

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Perbarui `DEFAULT_PENGATURAN_TARIF` dengan nilai default biaya stop (contoh: Motor Rp 3.000, Mobil Rp 5.000).

### Admin Interface

#### [MODIFY] [AdminView.tsx](file:///W:/ololuv1/src/components/AdminView.tsx)
- Tambahkan input "Biaya Per Stop" di setiap tab kategori tarif:
  - **🏍️ Ojek:** Tambahkan field `ojekBiayaPerStop`.
  - **🚗 Mobil:** Tambahkan field `mobilBiayaPerStop`.
  - **🍔 Makanan:** Tambahkan field `makananBiayaPerStop`.
  - **📦 Paket:** Tambahkan field `paketBiayaPerStop`.
  - **🚚 Logistik:** Tambahkan field `barangBesarBiayaPerStop`.

### Passenger Interface

#### [MODIFY] [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx)
- Perbarui fungsi `hitungHarga` agar mengambil biaya per stop sesuai dengan layanan yang dipilih (`selectedLayanan`).

## Verification Plan

### Manual Verification
1. Masuk ke Panel Admin -> Tab **Mobil**. Set biaya per stop jadi Rp 7.000.
2. Masuk ke Panel Admin -> Tab **Ojek**. Set biaya per stop jadi Rp 3.000.
3. Buka Dashboard Penumpang.
4. Buat pesanan **Ojek** dengan 2 stop (1 tujuan tambahan). Pastikan biaya tambahan adalah Rp 3.000.
5. Ubah kendaraan ke **Mobil**. Pastikan biaya tambahan per stop berubah otomatis menjadi Rp 7.000.
