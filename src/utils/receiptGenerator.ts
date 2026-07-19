/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pesanan } from '../types';

export const generateReceipt = (order: Pesanan, companyName: string = "OLOLU LUMAJANG") => {
  const printWindow = window.open('', '_blank', 'width=700,height=900');
  if (!printWindow) return;

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const getDuration = () => {
    if (!order.waktuDibuat || !order.waktuSelesai) return '-';
    const start = new Date(order.waktuDibuat).getTime();
    const end = new Date(order.waktuSelesai).getTime();
    const diff = Math.floor((end - start) / 60000);
    return `${diff} Menit`;
  };

  const stopsHtml = order.daftarTujuan.map((stop, idx) => `
    <div class="stop-item">
      <div class="stop-label">Pemberhentian ${idx + 1}</div>
      <div class="stop-address">${stop.alamat}</div>
      ${stop.daftarItem.length > 0 ? `
        <div class="item-list">
          ${stop.daftarItem.map(item => `<div>• ${item.jumlah}x ${item.namaBarang}</div>`).join('')}
        </div>
      ` : ''}
      ${stop.nota ? `
        <div class="merchant-box">
          <b>Merchant:</b> ${stop.nota.namaToko}<br/>
          <b>Total Belanja:</b> Rp ${stop.nota.totalToko.toLocaleString('id-ID')}
        </div>
      ` : ''}
    </div>
  `).join('');

  const itemsAwalHtml = order.itemsAwal && order.itemsAwal.length > 0 ? `
    <div class="stop-item origin">
      <div class="stop-label" style="color: #046A38;">Titik Belanja Utama</div>
      <div class="item-list">
        ${order.itemsAwal.map(item => `<div>• ${item.jumlah}x ${item.namaBarang}</div>`).join('')}
      </div>
    </div>
  ` : '';

  const html = `
    <html>
      <head>
        <title>Invoice Pro Ololu - ${order.nomorPesanan}</title>
        <style>
          body { font-family: 'Inter', 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; background: #fff; }
          .receipt-container { max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 30px; border-radius: 12px; position: relative; overflow: hidden; }

          /* Header */
          .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 20px; }
          .logo-area { text-align: left; }
          .company-name { font-size: 24px; font-weight: 900; color: #046A38; margin: 0; }
          .invoice-id { font-size: 11px; font-weight: 800; color: #6b7280; letter-spacing: 1px; margin-top: 4px; }
          .status-stamp { padding: 4px 12px; border: 3px solid #10b981; color: #10b981; font-weight: 900; font-size: 14px; border-radius: 6px; transform: rotate(-15deg); opacity: 0.8; }

          /* Sections */
          .section-title { font-size: 10px; font-weight: 800; color: #9ca3af; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 25px; margin-bottom: 10px; display: flex; align-items: center; }
          .section-title::after { content: ""; flex: 1; height: 1px; background: #f3f4f6; margin-left: 10px; }

          /* Grid Info */
          .info-grid { display: grid; grid-cols-2; display: flex; justify-content: space-between; gap: 20px; background: #f9fafb; padding: 15px; border-radius: 10px; }
          .info-box h4 { font-size: 9px; color: #6b7280; margin: 0 0 4px 0; text-transform: uppercase; }
          .info-box p { font-size: 12px; font-weight: 700; margin: 0; }

          /* Timeline */
          .timeline { display: flex; justify-content: space-between; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; margin-top: 10px; }
          .time-point { text-align: center; }
          .time-point span { font-size: 8px; color: #9ca3af; display: block; font-weight: 800; }
          .time-point b { font-size: 11px; font-weight: 700; }

          /* Stops */
          .stop-item { margin-bottom: 15px; padding-left: 15px; border-left: 3px solid #d1d5db; }
          .stop-item.origin { border-left-color: #046A38; }
          .stop-label { font-size: 9px; font-weight: 800; color: #6b7280; text-transform: uppercase; margin-bottom: 2px; }
          .stop-address { font-size: 13px; font-weight: 600; }
          .item-list { font-size: 11px; color: #4b5563; margin-top: 5px; font-weight: 500; }
          .merchant-box { font-size: 11px; background: #fffbeb; border: 1px solid #fef3c7; padding: 6px; border-radius: 6px; margin-top: 5px; color: #92400e; }

          /* Pricing */
          .price-table { margin-top: 20px; }
          .price-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 500; color: #374151; }
          .price-row.sub { font-size: 10px; color: #9ca3af; margin-top: -6px; margin-bottom: 10px; }
          .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #111827; font-weight: 900; font-size: 22px; color: #111827; }

          /* Footer */
          .footer { margin-top: 50px; text-align: center; }
          .qr-placeholder { width: 60px; height: 60px; background: #eee; margin: 0 auto 10px; border: 2px solid #ddd; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #999; }
          .footer-text { font-size: 10px; color: #9ca3af; font-weight: 500; }
          .motto { font-size: 11px; font-weight: 800; color: #046A38; margin-top: 10px; }

          @media print { body { padding: 0; } .receipt-container { border: none; } }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="top-bar">
            <div class="logo-area">
              <h1 class="company-name">${companyName}</h1>
              <div class="invoice-id">ORDER ID: ${order.nomorPesanan}</div>
            </div>
            <div class="status-stamp">LUNAS</div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <h4>Layanan</h4>
              <p>${order.jenisLayanan.toUpperCase()}</p>
            </div>
            <div class="info-box" style="text-align: right;">
              <h4>Metode Bayar</h4>
              <p>${order.pembayaranTunai ? 'CASH (TUNAI)' : 'DOMPET OLOLU'}</p>
            </div>
          </div>

          <div class="timeline">
            <div class="time-point"><span>Dipesan</span><b>${formatDate(order.waktuDibuat)}</b></div>
            <div class="time-point"><span>Mulai</span><b>${formatDate(order.waktuMulaiJalan || order.waktuSopirDiterima)}</b></div>
            <div class="time-point"><span>Tiba</span><b>${formatDate(order.waktuSelesai)}</b></div>
            <div class="time-point"><span>Durasi</span><b>${getDuration()}</b></div>
          </div>

          <div class="section-title">Informasi Mitra & User</div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600;">
            <div>Sopir: ${order.namaSopir || 'Mitra Ololu'} <br/> <span style="font-size: 10px; color: #6b7280; font-weight: 500;">${order.nomorHpSopir || '-'} • ${order.platNomorSopir || '-'}</span></div>
            <div style="text-align: right;">User: ${order.namaPenumpang} <br/> <span style="font-size: 10px; color: #6b7280; font-weight: 500;">${order.nomorHpPenumpang}</span></div>
          </div>

          <div class="section-title">Detail Perjalanan</div>
          <div class="stop-item origin">
            <div class="stop-label">Titik Jemput</div>
            <div class="stop-address">${order.asalAlamat}</div>
          </div>
          ${itemsAwalHtml}
          ${stopsHtml}

          <div class="section-title">Rincian Pembayaran</div>
          <div class="price-table">
            <div class="price-row">
              <span>Tarif Perjalanan (${order.jarakKm} KM)</span>
              <span>Rp ${order.tarifPerjalananMurni.toLocaleString('id-ID')}</span>
            </div>
            <div class="price-row sub">
              <span>Rumus: Tarif Dasar + (Km &times; Tarif/Km)</span>
            </div>

            ${order.biayaParkirTotal > 0 ? `
              <div class="price-row">
                <span>Biaya Parkir & Keamanan</span>
                <span>Rp ${order.biayaParkirTotal.toLocaleString('id-ID')}</span>
              </div>
            ` : ''}

            ${order.tambahanTujuan > 0 ? `
              <div class="price-row">
                <span>Biaya Tambahan Stop (Multi-Resto)</span>
                <span>Rp ${order.tambahanTujuan.toLocaleString('id-ID')}</span>
              </div>
            ` : ''}

            ${order.biayaNotaTotal > 0 ? `
              <div class="price-row" style="color: #046A38; font-weight: 700;">
                <span>Total Belanja (Sesuai Nota)</span>
                <span>Rp ${order.biayaNotaTotal.toLocaleString('id-ID')}</span>
              </div>
            ` : ''}

            <div class="total-row">
              <span>TOTAL</span>
              <span>Rp ${order.totalBayarAkhir.toLocaleString('id-ID')}</span>
            </div>
          </div>

          <div class="footer">
            <div class="qr-placeholder">DIGITAL<br/>SIGNATURE</div>
            <div class="footer-text">
              Nota ini dihasilkan secara otomatis oleh sistem Ololu Lumajang.<br/>
              Simpan sebagai bukti transaksi resmi Anda.
            </div>
            <div class="motto">Warga Lumajang, Bela Beli Produk Lumajang!</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
