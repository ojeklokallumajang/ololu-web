/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pesanan } from '../types';

export const generateReceipt = (order: Pesanan, companyName: string = "OLOLU LUMAJANG") => {
  const printWindow = window.open('', '_blank', 'width=600,height=800');
  if (!printWindow) return;

  const dateStr = new Date(order.waktuSelesai || order.waktuDibuat).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const stopsHtml = order.daftarTujuan.map((stop, idx) => `
    <div style="margin-bottom: 8px;">
      <div style="font-size: 10px; color: #666; font-weight: bold;">TUJUAN ${idx + 1}</div>
      <div style="font-size: 12px; font-weight: bold;">${stop.alamat}</div>
      ${stop.daftarItem.length > 0 ? `
        <div style="margin-left: 10px; margin-top: 4px; border-left: 2px solid #eee; padding-left: 8px;">
          ${stop.daftarItem.map(item => `<div style="font-size: 11px;">• ${item.jumlah}x ${item.namaBarang}</div>`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  const itemsAwalHtml = order.itemsAwal && order.itemsAwal.length > 0 ? `
    <div style="margin-bottom: 12px; background: #f9f9f9; padding: 10px; border-radius: 8px;">
      <div style="font-size: 10px; color: #046A38; font-weight: bold; margin-bottom: 4px;">BELANJA DI RESTO/TOKO:</div>
      ${order.itemsAwal.map(item => `<div style="font-size: 11px; font-weight: bold;">• ${item.jumlah}x ${item.namaBarang}</div>`).join('')}
    </div>
  ` : '';

  const html = `
    <html>
      <head>
        <title>Nota Ololu - ${order.nomorPesanan}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1a1a1a; line-height: 1.4; }
          .header { text-align: center; border-bottom: 2px dashed #046A38; padding-bottom: 20px; margin-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: 900; color: #046A38; margin: 0; letter-spacing: -0.5px; }
          .invoice-label { font-size: 10px; font-weight: bold; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; }
          .section-title { font-size: 11px; font-weight: bold; color: #999; margin-top: 20px; margin-bottom: 8px; text-transform: uppercase; }
          .price-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
          .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #1a1a1a; font-weight: 900; font-size: 18px; }
          .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #888; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="invoice-label">Bukti Pembayaran Digital</div>
          <h1 class="company-name">${companyName}</h1>
          <div style="font-size: 12px; margin-top: 5px;">Invoice: <b>${order.nomorPesanan}</b></div>
          <div style="font-size: 11px; color: #666;">${dateStr}</div>
        </div>

        <div class="section-title">Layanan & Mitra</div>
        <div style="font-size: 14px; font-weight: bold;">${order.jenisLayanan.toUpperCase()}</div>
        <div style="font-size: 12px;">Sopir: ${order.namaSopir || 'Mitra Ololu'} (${order.platNomorSopir || '-'})</div>
        <div style="font-size: 12px;">Penumpang: ${order.namaPenumpang}</div>

        <div class="section-title">Rute Perjalanan</div>
        <div style="margin-bottom: 12px;">
          <div style="font-size: 10px; color: #666; font-weight: bold;">TITIK JEMPUT</div>
          <div style="font-size: 12px; font-weight: bold;">${order.asalAlamat}</div>
        </div>

        ${itemsAwalHtml}
        ${stopsHtml}

        <div class="section-title">Rincian Biaya</div>
        <div class="price-row">
          <span>Tarif Perjalanan (${order.jarakKm} KM)</span>
          <span>Rp ${order.tarifPerjalananMurni.toLocaleString('id-ID')}</span>
        </div>
        ${order.biayaParkirTotal > 0 ? `
          <div class="price-row">
            <span>Biaya Parkir</span>
            <span>Rp ${order.biayaParkirTotal.toLocaleString('id-ID')}</span>
          </div>
        ` : ''}
        ${order.tambahanTujuan > 0 ? `
          <div class="price-row">
            <span>Tambahan Stop</span>
            <span>Rp ${order.tambahanTujuan.toLocaleString('id-ID')}</span>
          </div>
        ` : ''}
        ${order.biayaNotaTotal > 0 ? `
          <div class="price-row">
            <span>Total Nota Belanja</span>
            <span>Rp ${order.biayaNotaTotal.toLocaleString('id-ID')}</span>
          </div>
        ` : ''}

        <div class="total-row">
          <span>TOTAL BAYAR</span>
          <span>Rp ${order.totalBayarAkhir.toLocaleString('id-ID')}</span>
        </div>

        <div style="margin-top: 15px; font-size: 11px; font-style: italic; color: #666;">
          Metode Pembayaran: ${order.pembayaranTunai ? 'Tunai kepada Sopir' : 'Saldo Dompet Ololu'}
        </div>

        <div class="footer">
          <p>Terima kasih telah menggunakan layanan Ololu.<br>Simpan nota ini sebagai bukti transaksi resmi Anda.</p>
          <div style="margin-top: 20px; font-weight: bold; color: #046A38;">Warga Lumajang, Bela Beli Produk Lumajang!</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            // setTimeout(() => window.close(), 500);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
