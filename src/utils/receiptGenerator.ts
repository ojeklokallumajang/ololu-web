/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Pesanan } from '../types';

export const generateReceipt = (order: Pesanan, companyName: string = "OLOLU LUMAJANG") => {
  const printWindow = window.open('', '_blank', 'width=750,height=950');
  if (!printWindow) return;

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const fullDate = (iso?: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
      <div class="stop-header">
         <span class="stop-number">${idx + 1}</span>
         <span class="stop-label">PEMBERHENTIAN / TITIK ANTAR</span>
      </div>
      <div class="stop-address">${stop.alamat}</div>
      ${stop.daftarItem.length > 0 ? `
        <div class="shopping-list">
          <div class="shopping-header">Daftar Barang Belanja:</div>
          <table class="item-table">
            ${stop.daftarItem.map(item => `
              <tr>
                <td>• ${item.namaBarang}</td>
                <td style="text-align: right;">${item.jumlah}x</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}
      ${stop.nota ? `
        <div class="merchant-summary">
          <span>Toko: <b>${stop.nota.namaToko}</b></span>
          <span style="float: right;">Nilai Nota: <b>Rp ${stop.nota.totalToko.toLocaleString('id-ID')}</b></span>
        </div>
      ` : ''}
    </div>
  `).join('');

  const itemsAwalHtml = order.itemsAwal && order.itemsAwal.length > 0 ? `
    <div class="stop-item origin">
      <div class="stop-header">
         <span class="stop-number" style="background: #046A38;">!</span>
         <span class="stop-label" style="color: #046A38;">TITIK BELANJA UTAMA (PENJEMPUTAN)</span>
      </div>
      <div class="shopping-list">
        <table class="item-table">
          ${order.itemsAwal.map(item => `
            <tr>
              <td>• ${item.namaBarang}</td>
              <td style="text-align: right;">${item.jumlah}x</td>
            </tr>
          `).join('')}
        </table>
      </div>
    </div>
  ` : '';

  const html = `
    <html>
      <head>
        <title>Invoice Resmi Ololu - ${order.nomorPesanan}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #1f2937; line-height: 1.4; background: #f3f4f6; }
          .receipt-page { background: #fff; max-width: 650px; margin: 0 auto; padding: 40px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); position: relative; }

          /* Header */
          .top-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #f3f4f6; padding-bottom: 25px; margin-bottom: 30px; }
          .company-brand { text-align: left; }
          .company-name { font-size: 28px; font-weight: 900; color: #046A38; margin: 0; letter-spacing: -1px; }
          .receipt-title { font-size: 10px; font-weight: 800; color: #D4AF37; text-transform: uppercase; letter-spacing: 2px; }
          .status-stamp { border: 4px solid #10b981; color: #10b981; padding: 5px 15px; font-size: 20px; font-weight: 900; border-radius: 8px; transform: rotate(-10deg); opacity: 0.9; }

          /* Order Meta */
          .order-meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 12px; color: #6b7280; }
          .order-id { font-weight: 800; color: #111827; }

          /* People Info */
          .people-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f9fafb; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #f3f4f6; }
          .person-box h4 { font-size: 9px; text-transform: uppercase; color: #9ca3af; margin: 0 0 5px 0; letter-spacing: 1px; }
          .person-name { font-size: 14px; font-weight: 800; color: #111827; margin: 0; }
          .person-info { font-size: 11px; color: #6b7280; margin-top: 2px; }

          /* Timeline */
          .timeline { display: flex; justify-content: space-between; margin-bottom: 30px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 15px; }
          .time-stat { text-align: center; flex: 1; }
          .time-stat span { font-size: 8px; font-weight: 800; color: #9ca3af; display: block; text-transform: uppercase; }
          .time-stat b { font-size: 13px; font-weight: 700; color: #111827; }

          /* Journey */
          .section-label { font-size: 10px; font-weight: 900; color: #111827; text-transform: uppercase; margin-bottom: 15px; border-left: 4px solid #D4AF37; padding-left: 10px; }
          .stop-item { margin-bottom: 20px; padding-left: 20px; border-left: 2px solid #e5e7eb; position: relative; }
          .stop-header { display: flex; align-items: center; margin-bottom: 5px; }
          .stop-number { width: 18px; height: 18px; background: #D4AF37; color: #fff; font-size: 10px; font-weight: 900; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-left: -29px; margin-right: 11px; }
          .stop-label { font-size: 9px; font-weight: 800; color: #9ca3af; }
          .stop-address { font-size: 13px; font-weight: 600; color: #374151; }
          .shopping-list { margin-top: 10px; background: #fff; border: 1px solid #f3f4f6; border-radius: 8px; padding: 10px; }
          .shopping-header { font-size: 9px; font-weight: 800; color: #046A38; margin-bottom: 5px; }
          .item-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .merchant-summary { margin-top: 8px; font-size: 10px; padding: 8px; background: #fffbeb; border-radius: 6px; border: 1px solid #fef3c7; color: #92400e; }

          /* Pricing */
          .pricing-table { border-top: 2px solid #f3f4f6; padding-top: 20px; }
          .price-line { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; font-weight: 500; }
          .price-calc { font-size: 10px; color: #9ca3af; margin-top: -8px; margin-bottom: 12px; font-style: italic; }
          .grand-total { display: flex; justify-content: space-between; margin-top: 20px; padding: 20px; background: #046A38; border-radius: 12px; color: #fff; align-items: center; }
          .grand-total span { font-size: 14px; font-weight: 800; }
          .grand-total b { font-size: 28px; font-weight: 900; }

          /* Footer */
          .footer { margin-top: 50px; text-align: center; border-top: 1px dashed #e5e7eb; padding-top: 30px; }
          .signature-area { width: 80px; height: 80px; border: 2px solid #f3f4f6; margin: 0 auto 15px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #ddd; background: #fcfcfc; }
          .thanks { font-size: 12px; font-weight: 600; color: #4b5563; }
          .motto { font-size: 12px; font-weight: 900; color: #046A38; margin-top: 10px; text-transform: uppercase; }

          @media print {
            body { padding: 0; background: #fff; }
            .receipt-page { box-shadow: none; border: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-page">
          <div class="top-bar">
            <div class="company-brand">
              <div class="receipt-title">Bukti Pembayaran Elektronik</div>
              <h1 class="company-name">${companyName}</h1>
            </div>
            <div class="status-stamp">LUNAS</div>
          </div>

          <div class="order-meta">
            <div>Order: <span class="order-id">${order.nomorPesanan}</span></div>
            <div>${fullDate(order.waktuSelesai || order.waktuDibuat)}</div>
          </div>

          <div class="people-section">
            <div class="person-box">
              <h4>Informasi Penumpang</h4>
              <p class="person-name">${order.namaPenumpang}</p>
              <p class="person-info">${order.nomorHpPenumpang}</p>
            </div>
            <div class="person-box" style="text-align: right; border-left: 1px solid #e5e7eb; padding-left: 20px;">
              <h4>Informasi Mitra Driver</h4>
              <p class="person-name">${order.namaSopir || 'Mitra Driver'}</p>
              <p class="person-info">${order.nomorHpSopir || '-'} • ${order.platNomorSopir || '-'}</p>
            </div>
          </div>

          <div class="timeline">
            <div class="time-stat"><span>Order Masuk</span><b>${formatDate(order.waktuDibuat)}</b></div>
            <div class="time-stat"><span>Mulai Jalan</span><b>${formatDate(order.waktuMulaiJalan || order.waktuSopirDiterima)}</b></div>
            <div class="time-stat"><span>Tiba Selesai</span><b>${formatDate(order.waktuSelesai)}</b></div>
            <div class="time-stat"><span>Durasi</span><b>${getDuration()}</b></div>
          </div>

          <div class="section-label">Rincian Perjalanan & Aktivitas</div>
          <div class="stop-item" style="border-left-color: #046A38;">
            <div class="stop-header"><span class="stop-number" style="background: #046A38;">A</span><span class="stop-label">TITIK PENJEMPUTAN</span></div>
            <div class="stop-address">${order.asalAlamat}</div>
          </div>
          ${itemsAwalHtml}
          ${stopsHtml}

          <div class="section-label" style="margin-top: 40px;">Rincian Transaksi Keuangan</div>
          <div class="pricing-table">
            <div class="price-line">
              <span>Tarif Jasa Layanan (${order.jarakKm} KM)</span>
              <span>Rp ${order.tarifPerjalananMurni.toLocaleString('id-ID')}</span>
            </div>
            <div class="price-calc">Rumus: Tarif Dasar + (Jarak &times; Tarif Per KM)</div>

            ${order.biayaParkirTotal > 0 ? `
              <div class="price-line">
                <span>Total Biaya Parkir & Keamanan</span>
                <span>Rp ${order.biayaParkirTotal.toLocaleString('id-ID')}</span>
              </div>
            ` : ''}

            ${order.tambahanTujuan > 0 ? `
              <div class="price-line">
                <span>Biaya Tambahan Multi-Stop</span>
                <span>Rp ${order.tambahanTujuan.toLocaleString('id-ID')}</span>
              </div>
            ` : ''}

            ${order.biayaNotaTotal > 0 ? `
              <div class="price-line" style="color: #046A38; font-weight: 800;">
                <span>Total Belanja (Sesuai Nota Fisik)</span>
                <span>Rp ${order.biayaNotaTotal.toLocaleString('id-ID')}</span>
              </div>
            ` : ''}

            <div class="grand-total">
              <span>TOTAL PEMBAYARAN (${order.pembayaranTunai ? 'TUNAI' : 'NON-TUNAI'})</span>
              <b>Rp ${order.totalBayarAkhir.toLocaleString('id-ID')}</b>
            </div>
          </div>

          <div class="footer">
            <div class="signature-area">DIGITAL<br/>SIGNATURE</div>
            <p class="thanks">Terima kasih telah mempercayakan perjalanan Anda bersama Ololu.</p>
            <div class="motto">BELA BELI PRODUK LUMAJANG!</div>
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
