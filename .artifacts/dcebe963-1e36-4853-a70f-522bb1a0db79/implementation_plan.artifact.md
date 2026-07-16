# Implementasi Fitur Voice Chat (Pesan Suara)

Fitur ini memungkinkan Penumpang dan Sopir untuk saling mengirimkan pesan suara (voice notes) di dalam ruang chat, memberikan kemudahan koordinasi tanpa perlu mengetik.

## User Review Required

> [!IMPORTANT]
> **Strategi Kehematan (Irit):**
> - Pesan suara akan dikirimkan sebagai string **Base64** terkompresi.
> - **Real-time:** Data suara akan dibroadcast secara instan via WebSocket (0 biaya storage/write saat dikirim).
> - **Penyimpanan:** Data suara akan disimpan di database kolom `voice_data` untuk riwayat chat.

## Proposed Changes

### Database Schema (Supabase)

#### [MODIFY] [fix_chat_schema.sql]
```sql
-- Tambahkan kolom voice_data untuk menyimpan rekaman suara (Base64)
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS voice_data TEXT;
```

### types.ts
- Tambahkan properti `voiceData?: string` pada antarmuka `ChatMessage`.

### store.ts
- Perbarui `sendChatMessage` untuk menerima opsional `voiceData`.
- Perbarui `getChatMessages` untuk memetakan kolom `voice_data`.

### ChatRoom.tsx
- Tambahkan tombol **"Mikrofon"** di sebelah input teks.
- Implementasikan logika perekaman suara menggunakan `MediaRecorder` API.
- Tambahkan komponen pemutar audio (Audio Player) mini di dalam bubble chat jika pesan berisi data suara.
- Visualisasi status sedang merekam (animasi pulse).

## Verification Plan

### Manual Verification
1. Buka Chat Room.
2. Tekan dan tahan (atau klik) tombol mikrofon untuk merekam.
3. Lepaskan/Klik stop untuk mengirim.
4. Pastikan bubble chat muncul dengan tombol "Play".
5. Pastikan lawan bicara menerima suara tersebut secara instan dan bisa memutarnya.
6. Refresh halaman, pastikan pesan suara masih ada di riwayat.
