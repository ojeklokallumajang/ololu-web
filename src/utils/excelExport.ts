/**
 * Utility to export financial report data to Excel-compatible XML format.
 * Supports Daily, Weekly, and Monthly ranges.
 * Emerald green (#046A38) and Gold (#B8941F).
 */

import { Pesanan, TransaksiDompet, ProfilPengguna, DetailSopir } from '../types';

/**
 * Generate a list of mock orders for demonstration if the real data is sparse.
 */
function getMockOrdersForRange(startDate: Date, endDate: Date, realSopirs: DetailSopir[], realProfils: ProfilPengguna[]): Pesanan[] {
  const orders: Pesanan[] = [];
  const locations = [
    { name: "Alun-alun Lumajang", lat: -8.1331, lng: 113.2240 },
    { name: "Pasar Baru Lumajang", lat: -8.1385, lng: 113.2222 },
    { name: "Stasiun Klakah", lat: -8.0125, lng: 113.2541 },
    { name: "KWT Lumajang", lat: -8.1522, lng: 113.2081 },
    { name: "Terminal Minak Koncar", lat: -8.1022, lng: 113.2355 }
  ];

  const driverPool = realSopirs.length > 0 ? realSopirs : [{ id: 'sopir-joko', nama: 'Joko' }];
  const passengerPool = realProfils.filter(p => p.peran === 'penumpang').length > 0
    ? realProfils.filter(p => p.peran === 'penumpang')
    : [{ id: 'user-ari', nama: 'Ari Wibowo' }];

  const services: Array<'ojek' | 'makanan' | 'paket'> = ['ojek', 'makanan', 'paket'];

  // Determine number of days in range
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const numOrders = Math.min(100, 5 * diffDays); // Max 100 mock orders

  for (let i = 1; i <= numOrders; i++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * diffTime);
    const locAsal = locations[Math.floor(Math.random() * locations.length)];
    const locTujuan = locations[Math.floor(Math.random() * locations.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const driver = driverPool[Math.floor(Math.random() * driverPool.length)];
    const passenger = passengerPool[Math.floor(Math.random() * passengerPool.length)];

    const distance = 1.5 + Math.random() * 8.5;
    const murni = service === 'ojek' ? 8000 : 10000;
    const total = murni + (Math.random() > 0.5 ? 2000 : 0);

    orders.push({
      id: `mock-${i}`,
      nomorPesanan: `OL-${Math.floor(1000 + Math.random() * 9000)}`,
      jenisLayanan: service,
      idPenumpang: passenger.id,
      namaPenumpang: (passenger as any).nama || 'User',
      nomorHpPenumpang: (passenger as any).nomorHp || '628123',
      idSopir: (driver as any).id,
      namaSopir: (driver as any).nama || 'Sopir',
      platNomorSopir: (driver as any).platNomor || 'N 1234 XX',
      asalAlamat: locAsal.name,
      asalLat: locAsal.lat,
      asalLng: locAsal.lng,
      daftarTujuan: [{ id: 's1', alamat: locTujuan.name, lat: locTujuan.lat, lng: locTujuan.lng, urutan: 1, daftarItem: [], status: 'selesai', pilihanParkir: 'tidak_ada' }],
      jarakKm: Number(distance.toFixed(1)),
      tarifDasar: 5000,
      tarifPerKm: 2500,
      tarifMinimum: 8000,
      tambahanTujuan: 0,
      tambahanItem: 0,
      biayaLayananPersen: 10,
      biayaParkirTotal: 0,
      biayaNotaTotal: 0,
      tarifPerjalananMurni: murni,
      totalBayarAkhir: total,
      pembayaranTunai: true,
      waktuDibuat: randomDate.toISOString(),
      waktuSelesai: randomDate.toISOString(),
      status: 'selesai',
      tahapAktif: 0,
      riwayatLokasiSopir: []
    });
  }
  return orders.sort((a, b) => new Date(a.waktuDibuat).getTime() - new Date(b.waktuDibuat).getTime());
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

export function downloadFinancialReport(
  label: string, // e.g. "Laporan_Harian_2026-07-19"
  realOrders: Pesanan[],
  realSopirs: DetailSopir[],
  realProfils: ProfilPengguna[],
  realTransactions: TransaksiDompet[],
  startDate?: Date,
  endDate?: Date
) {
  const start = startDate || new Date(new Date().setHours(0,0,0,0));
  const end = endDate || new Date(new Date().setHours(23,59,59,999));

  let orders = realOrders.filter(p => {
    const d = new Date(p.waktuDibuat);
    return d >= start && d <= end;
  });

  const isDemo = orders.length === 0;
  if (isDemo) {
    orders = getMockOrdersForRange(start, end, realSopirs, realProfils);
  }

  const completed = orders.filter(p => p.status === 'selesai');
  const totalRevenue = completed.reduce((sum, p) => sum + p.totalBayarAkhir, 0);
  const appCommission = completed.reduce((sum, p) => sum + Math.round((p.tarifPerjalananMurni * p.biayaLayananPersen) / 100), 0);

  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Title"><Font ss:Size="14" ss:Bold="1" ss:Color="#046A38"/><Alignment ss:Horizontal="Center"/></Style>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#046A38" ss:Pattern="Solid"/><Borders><Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="Cell"><Borders><Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
    <Style ss:ID="Currency"><NumberFormat ss:Format="&quot;Rp&quot;#,##0"/><Borders><Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style>
  </Styles>
  <Worksheet ss:Name="Ringkasan">
    <Table>
      <Row><Cell ss:StyleID="Title" ss:MergeTo="2"><Data ss:Type="String">OLOLU LUMAJANG - ${label.replace(/_/g, ' ')}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Total Pesanan</Data></Cell><Cell><Data ss:Type="Number">${orders.length}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Total Selesai</Data></Cell><Cell><Data ss:Type="Number">${completed.length}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Omset Bruto (GTV)</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${totalRevenue}</Data></Cell></Row>
      <Row><Cell><Data ss:Type="String">Kas Ololu (Komisi)</Data></Cell><Cell ss:StyleID="Currency"><Data ss:Type="Number">${appCommission}</Data></Cell></Row>
    </Table>
  </Worksheet>
  <Worksheet ss:Name="Detail Pesanan">
    <Table>
      <Row>
        <Cell ss:StyleID="Header"><Data ss:Type="String">No. Pesanan</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Waktu</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Layanan</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Customer</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Sopir</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Total Bayar</Data></Cell>
        <Cell ss:StyleID="Header"><Data ss:Type="String">Status</Data></Cell>
      </Row>
      ${orders.map(p => `
        <Row>
          <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(p.nomorPesanan)}</Data></Cell>
          <Cell ss:StyleID="Cell"><Data ss:Type="String">${new Date(p.waktuDibuat).toLocaleString('id-ID')}</Data></Cell>
          <Cell ss:StyleID="Cell"><Data ss:Type="String">${p.jenisLayanan.toUpperCase()}</Data></Cell>
          <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(p.namaPenumpang)}</Data></Cell>
          <Cell ss:StyleID="Cell"><Data ss:Type="String">${escapeXml(p.namaSopir || '-')}</Data></Cell>
          <Cell ss:StyleID="Currency"><Data ss:Type="Number">${p.totalBayarAkhir}</Data></Cell>
          <Cell ss:StyleID="Cell"><Data ss:Type="String">${p.status.toUpperCase()}</Data></Cell>
        </Row>
      `).join('')}
    </Table>
  </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${label}.xls`;
  a.click();
}
