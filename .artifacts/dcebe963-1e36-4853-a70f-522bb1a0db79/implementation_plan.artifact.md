# Implementasi Pengaturan Tarif Lengkap (Motor vs Mobil)

Rencana ini akan memperluas sistem tarif agar mendukung perbedaan harga antara kendaraan Motor dan Mobil untuk setiap jenis layanan, serta memberikan kontrol penuh kepada Admin atas seluruh parameter biaya di aplikasi.

## User Review Required

> [!IMPORTANT]
> **Struktur Tarif Baru:**
> - **Motor:** Menggunakan parameter `ojek...` (untuk Ride) dan `paket...` (untuk Send).
> - **Mobil:** Menambahkan parameter baru `mobil...` khusus untuk layanan transportasi mobil.
> - **Layanan Lain:** Menambahkan input untuk tarif Makanan, Belanja, dan Barang Besar (Logistik).

## Proposed Changes

### Data Model & Store

#### [MODIFY] [types.ts](file:///W:/ololuv1/src/types.ts)
- Perbarui antarmuka `PengaturanTarif` dengan menambahkan field:
  - `mobilTarifDasar`, `mobilTarifPerKm`, `mobilTarifMinimum`, `mobilPersenJasa`, `mobilBatasKmTarifDasar`.

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Perbarui `DEFAULT_PENGATURAN_TARIF` untuk menyertakan nilai default tarif Mobil.

### Admin Interface

#### [MODIFY] [AdminView.tsx](file:///W:/ololuv1/src/components/AdminView.tsx)
- Desain ulang tab "Tarif" menjadi kategori yang dapat diklik (Accordion atau List):
  - **🏍️ Motor (Ololu-Ride)**
  - **🚗 Mobil (Ololu-Car)**
  - **📦 Paket (Ololu-Send)**
  - **🍔 Makanan & Belanja**
  - **🚚 Barang Besar / Logistik**
  - **🅿️ Parkir & Biaya Tambahan**
  - **⚙️ Aturan Sistem** (Radius, Saldo Minimal, dll)

### Passenger Interface

#### [MODIFY] [PassengerView.tsx](file:///W:/ololuv1/src/components/PassengerView.tsx)
- Tambahkan pilihan kendaraan (Motor/Mobil) pada saat pemesanan (khusus untuk layanan Ride/Send).
- Perbarui fungsi `hitungHarga` agar mengambil parameter tarif yang sesuai dengan pilihan kendaraan.

## Verification Plan

### Manual Verification
1. Buka Admin Panel -> Tab Tarif.
2. Atur tarif Motor (misal: Rp 2.500/km) dan Mobil (misal: Rp 6.000/km).
3. Simpan.
4. Buka Dashboard Penumpang, pilih layanan Ride, alihkan antara Motor dan Mobil, pastikan estimasi harga berubah seketika.
