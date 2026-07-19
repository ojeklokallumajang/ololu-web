/**
 * Utility to export financial report data to Excel-compatible XML format.
 * Supports Daily, Weekly, and Monthly ranges.
 * Emerald green (#046A38) and Gold (#B8941F).
 */

import { Pesanan, TransaksiDompet, ProfilPengguna, DetailSopir } from '../types';

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
