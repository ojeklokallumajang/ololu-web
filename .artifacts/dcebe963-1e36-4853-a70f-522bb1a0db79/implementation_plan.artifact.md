# Implementasi Sistem Persetujuan (ACC) Driver

Rencana ini akan menambahkan fitur verifikasi driver di Panel Admin, sehingga Admin dapat melihat dokumen yang diunggah (KTP, SIM, dll) dan menyetujui atau menolak pendaftaran driver tersebut.

## User Review Required

> [!IMPORTANT]
> **Keamanan Data:** Saya akan memastikan seluruh dokumen driver (KTP, SIM, STNK) tampil di dashboard admin hanya untuk Administrator Utama agar proses verifikasi valid.

## Proposed Changes

### Data Layer (`store.ts`)

#### [MODIFY] [store.ts](file:///W:/ololuv1/src/services/store.ts)
- Perbarui `getAllSopir()` agar mengambil data profil (nama, nomor HP) menggunakan join table.
- Tambahkan fungsi `verifikasiSopir(id, setuju, alasan?)` untuk mengubah status `disetujui_admin` di database.

### Admin Interface (`AdminView.tsx`)

#### [MODIFY] [AdminView.tsx](file:///W:/ololuv1/src/components/AdminView.tsx)
- Ubah tampilan tab "Rider":
  - **Section 1: Menunggu Verifikasi.** Menampilkan daftar rider baru yang belum disetujui.
  - **Section 2: Detail Berkas.** Saat rider diklik, tampilkan foto KTP, SIM, STNK, dan Kendaraan.
  - **Section 3: Tombol Aksi.** Tambahkan tombol **"ACC / SETUJUI"** dan **"TOLAK"**.
- **Section 4: Rider Aktif.** Daftar rider yang sudah lolos verifikasi (seperti yang ada sekarang).

## Verification Plan

### Manual Verification
1. Daftar sebagai Driver baru di browser lain (atau incognito).
2. Unggah semua berkas dokumen.
3. Masuk ke Panel Admin -> Tab Rider.
4. Pastikan driver baru tersebut muncul di daftar "Menunggu Verifikasi".
5. Klik driver tersebut, cek apakah foto dokumennya muncul.
6. Klik tombol **ACC**.
7. Verifikasi di browser driver bahwa status sudah berubah jadi "Disetujui" dan bisa Online.
