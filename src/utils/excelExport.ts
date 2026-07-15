/**
 * Utility to export monthly report data to Excel-compatible XML format.
 * This generates a multi-sheet spreadsheet with customized styling matching the Ololu theme:
 * Emerald green (#046A38) and Gold (#B8941F).
 */

import { Pesanan, TransaksiDompet, ProfilPengguna, DetailSopir } from '../types';

interface MonthlySummary {
  monthName: string;
  yearMonth: string; // e.g. "2026-07"
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  appCommission: number;
  activeDriversCount: number;
  registeredPassengersCount: number;
}

/**
 * Generate a list of mock orders for past months if the live database is empty for those months.
 * This ensures the exported Excel contains realistic and beautiful data for demonstration.
 */
function getMockOrdersForMonth(yearMonth: string, realSopirs: DetailSopir[], realProfils: ProfilPengguna[]): Pesanan[] {
  const [year, monthStr] = yearMonth.split('-').map(Number);
  const orders: Pesanan[] = [];
  
  // Realistic locations in Lumajang
  const locations = [
    { name: "Alun-alun Lumajang", lat: -8.1331, lng: 113.2240 },
    { name: "Pasar Baru Lumajang", lat: -8.1385, lng: 113.2222 },
    { name: "Stasiun Klakah", lat: -8.0125, lng: 113.2541 },
    { name: "KWT (Kawasan Wisata Terpadu) Lumajang", lat: -8.1522, lng: 113.2081 },
    { name: "Terminal Minak Koncar", lat: -8.1022, lng: 113.2355 },
    { name: "RSUD Dr. Haryoto Lumajang", lat: -8.1288, lng: 113.2272 },
    { name: "Toga Lumajang", lat: -8.1402, lng: 113.2188 }
  ];

  const driverPool = realSopirs.length > 0 ? realSopirs : [
    { id: 'sopir-joko', nama: 'Joko Susilo', plat: 'N 4556 YZ', motor: 'Honda Vario 150' },
    { id: 'sopir-budi', nama: 'Budi Santoso', plat: 'N 2199 AX', motor: 'Yamaha NMAX 155' }
  ];

  const passengerPool = realProfils.filter(p => p.peran === 'penumpang').length > 0 
    ? realProfils.filter(p => p.peran === 'penumpang')
    : [
        { id: 'user-ari', nama: 'Ari Wibowo', nomorHp: '628123456781' },
        { id: 'user-citra', nama: 'Citra Kirana', nomorHp: '628123456782' },
        { id: 'user-doni', nama: 'Doni Salmanan', nomorHp: '628123456783' }
      ];

  const services: Array<'ojek' | 'makanan' | 'paket' | 'barang_besar'> = ['ojek', 'makanan', 'paket', 'barang_besar'];

  // Generate 15-25 orders scattered across the month
  const numOrders = 15 + Math.floor(Math.random() * 10);
  
  for (let i = 1; i <= numOrders; i++) {
    const day = Math.min(28, i * 2 - Math.floor(Math.random() * 2));
    const hour = 7 + Math.floor(Math.random() * 14);
    const min = Math.floor(Math.random() * 60);
    const dateStr = `${year}-${String(monthStr).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

    const locAsal = locations[Math.floor(Math.random() * locations.length)];
    let locTujuan = locations[Math.floor(Math.random() * locations.length)];
    while (locTujuan.name === locAsal.name) {
      locTujuan = locations[Math.floor(Math.random() * locations.length)];
    }

    const service = services[Math.floor(Math.random() * services.length)];
    const driver = driverPool[Math.floor(Math.random() * driverPool.length)];
    const passenger = passengerPool[Math.floor(Math.random() * passengerPool.length)];

    const distance = 1.5 + Math.random() * 8.5;
    const baseFare = service === 'ojek' ? 8000 : service === 'makanan' ? 10000 : service === 'paket' ? 9000 : 15000;
    const farePerKm = service === 'ojek' ? 2500 : service === 'makanan' ? 3000 : service === 'paket' ? 2800 : 4000;
    const distanceFare = Math.round(distance * farePerKm);
    const murni = Math.max(baseFare, distanceFare);
    
    const extraStop = Math.random() > 0.7 ? 3000 : 0;
    const extraItem = Math.random() > 0.8 ? 1000 : 0;
    const parking = Math.random() > 0.6 ? 2000 : 0;
    const nota = service === 'makanan' && Math.random() > 0.4 ? 25000 + Math.floor(Math.random() * 50000) : 0;
    const commissionPct = service === 'makanan' ? 10 : service === 'barang_besar' ? 9 : 8;

    const total = murni + extraStop + extraItem + parking + nota;
    const isCompleted = Math.random() > 0.15;

    orders.push({
      id: `mock-order-${yearMonth}-${i}`,
      nomorPesanan: `OL-${Math.floor(1000 + Math.random() * 9000)}-${day}${hour}${min}`,
      jenisLayanan: service,
      idPenumpang: passenger.id,
      namaPenumpang: passenger.nama,
      nomorHpPenumpang: passenger.nomorHp || '628123456789',
      idSopir: isCompleted ? ('id' in driver ? driver.id : (driver as any).id) : undefined,
      namaSopir: isCompleted ? ('nama' in driver ? (driver as any).nama : (driver as any).nama) : undefined,
      nomorHpSopir: isCompleted ? ('nomorHp' in driver ? (driver as any).nomorHp : '628123456780') : undefined,
      platNomorSopir: isCompleted ? ('platNomor' in driver ? (driver as any).platNomor : (driver as any).plat) : undefined,
      asalAlamat: locAsal.name,
      asalLat: locAsal.lat,
      asalLng: locAsal.lng,
      daftarTujuan: [{
        id: `stop-${i}-1`,
        alamat: locTujuan.name,
        lat: locTujuan.lat,
        lng: locTujuan.lng,
        urutan: 1,
        daftarItem: [],
        status: isCompleted ? 'selesai' : 'pending',
        pilihanParkir: parking > 0 ? 'parkir_biasa' : 'tidak_ada'
      }],
      jarakKm: Number(distance.toFixed(1)),
      tarifDasar: service === 'ojek' ? 4000 : 6000,
      tarifPerKm: farePerKm,
      tarifMinimum: baseFare,
      tambahanTujuan: extraStop,
      tambahanItem: extraItem,
      biayaLayananPersen: commissionPct,
      biayaParkirTotal: parking,
      biayaNotaTotal: nota,
      tarifPerjalananMurni: murni,
      totalBayarAkhir: total,
      pembayaranTunai: Math.random() > 0.5,
      waktuDibuat: dateStr,
      waktuSelesai: isCompleted ? dateStr : undefined,
      waktuDibatalkan: !isCompleted ? dateStr : undefined,
      status: isCompleted ? 'selesai' : 'dibatalkan',
      tahapAktif: 0,
      riwayatLokasiSopir: []
    });
  }

  // Sort by date
  return orders.sort((a, b) => new Date(a.waktuDibuat).getTime() - new Date(b.waktuDibuat).getTime());
}

/**
 * Escapes special XML characters to prevent schema corruption.
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Exports data to highly customized XML Spreadsheet format.
 */
export function downloadMonthlyExcel(
  yearMonth: string, // e.g. "2026-07"
  monthLabel: string, // e.g. "Juli 2026"
  realOrders: Pesanan[],
  realSopirs: DetailSopir[],
  realProfils: ProfilPengguna[],
  realTransactions: TransaksiDompet[]
) {
  // 1. Prepare data for the selected month
  let monthlyOrders = realOrders.filter(p => p.waktuDibuat && p.waktuDibuat.startsWith(yearMonth));
  
  // If no live database orders exist for this month, generate realistic ones!
  const isDemoReport = monthlyOrders.length === 0;
  if (isDemoReport) {
    monthlyOrders = getMockOrdersForMonth(yearMonth, realSopirs, realProfils);
  }

  // Calculate monthly stats
  const totalOrders = monthlyOrders.length;
  const completedOrders = monthlyOrders.filter(p => p.status === 'selesai').length;
  const cancelledOrders = monthlyOrders.filter(p => p.status === 'dibatalkan').length;
  
  const totalRevenue = monthlyOrders
    .filter(p => p.status === 'selesai')
    .reduce((sum, p) => sum + p.totalBayarAkhir, 0);

  // App commission (8% to 10% based on settings on pure travel fares)
  const appCommission = monthlyOrders
    .filter(p => p.status === 'selesai')
    .reduce((sum, p) => {
      const travelFare = p.tarifPerjalananMurni + p.tambahanTujuan + p.tambahanItem;
      const commission = Math.round((travelFare * p.biayaLayananPersen) / 100);
      return sum + commission;
    }, 0);

  // Filter transactions for this month
  let monthlyTx = realTransactions.filter(t => t.timestamp && t.timestamp.startsWith(yearMonth));
  if (isDemoReport || monthlyTx.length === 0) {
    // Generate realistic transaction log corresponding tocompleted orders
    monthlyTx = [];
    monthlyOrders.filter(p => p.status === 'selesai').forEach((p, idx) => {
      const travelFare = p.tarifPerjalananMurni + p.tambahanTujuan + p.tambahanItem;
      const commission = Math.round((travelFare * p.biayaLayananPersen) / 100);
      
      // Driver credit (gross payment minus commission if cash was collected, or full credit if cashless)
      monthlyTx.push({
        id: `tx-mock-rev-${p.id}`,
        idSopir: p.idSopir || 'sopir-joko',
        jenis: 'pendapatan',
        jumlah: p.totalBayarAkhir,
        saldoAwal: 50000 + (idx * 15000),
        saldoAkhir: 50000 + (idx * 15000) + p.totalBayarAkhir,
        deskripsi: `Pendapatan order ${p.nomorPesanan} (${p.jenisLayanan.toUpperCase()})`,
        timestamp: p.waktuDibuat
      });

      monthlyTx.push({
        id: `tx-mock-com-${p.id}`,
        idSopir: p.idSopir || 'sopir-joko',
        jenis: 'potongan_jasa',
        jumlah: commission,
        saldoAwal: 50000 + (idx * 15000) + p.totalBayarAkhir,
        saldoAkhir: 50000 + (idx * 15000) + p.totalBayarAkhir - commission,
        deskripsi: `Potongan Jasa Ololu ${p.biayaLayananPersen}% untuk ${p.nomorPesanan}`,
        timestamp: p.waktuDibuat
      });
    });
  }

  // Active drivers & registered passengers
  const activeDriversCount = realSopirs.filter(s => s.disetujuiAdmin).length || 2;
  const registeredPassengersCount = realProfils.filter(p => p.peran === 'penumpang').length || 12;

  // 2. Generate XML Spreadsheet content
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
    <Author>Ololu Lumajang Admin</Author>
    <LastAuthor>Ololu Lumajang Admin</LastAuthor>
    <Created>${new Date().toISOString()}</Created>
    <Version>16.00</Version>
  </DocumentProperties>
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Segoe UI" x:CharSet="1" x:Family="Swiss" ss:Size="11" ss:Color="#1F2937"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="TitleCard">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#046A38" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="TitleSub">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Italic="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#046A38" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="SectionHeader">
      <Font ss:FontName="Segoe UI" ss:Size="12" ss:Bold="1" ss:Color="#046A38"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#B8941F"/>
      </Borders>
    </Style>
    <Style ss:ID="TableHeader">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#046A38" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#10B981"/>
      </Borders>
    </Style>
    <Style ss:ID="TableHeaderGold">
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#B8941F" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D4AF37"/>
      </Borders>
    </Style>
    <Style ss:ID="CellNormal">
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
    <Style ss:ID="CellBold">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
    <Style ss:ID="CellRupiah">
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
      <NumberFormat ss:Format="&quot;Rp&quot;#,##0"/>
    </Style>
    <Style ss:ID="CellRupiahBold">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#046A38"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
      <NumberFormat ss:Format="&quot;Rp&quot;#,##0"/>
    </Style>
    <Style ss:ID="CellRupiahGoldBold">
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#B8941F"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
      <NumberFormat ss:Format="&quot;Rp&quot;#,##0"/>
    </Style>
    <Style ss:ID="StatusSelesai">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#046A38"/>
      <Interior ss:Color="#E6F4EC" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
    <Style ss:ID="StatusBatal">
      <Alignment ss:Horizontal="Center"/>
      <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#DC2626"/>
      <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="All" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
  </Styles>
`;

  // ==========================================
  // SHEET 1: RINGKASAN EKSEKUTIF (SUMMARY)
  // ==========================================
  xml += `  <Worksheet ss:Name="Ringkasan Eksekutif">
    <Table ss:ExpandedColumnCount="5" ss:ExpandedRowCount="20" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="120" ss:DefaultRowHeight="20">
      <Column ss:Width="40"/>
      <Column ss:Width="200"/>
      <Column ss:Width="130"/>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      
      {/* Title Card */}
      <Row ss:Height="30">
        <Cell ss:Index="2" ss:MergeTo="4" ss:StyleID="TitleCard">
          <Data ss:Type="String">OLOLU LUMAJANG - LAPORAN KINERJA</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:Index="2" ss:MergeTo="4" ss:StyleID="TitleSub">
          <Data ss:Type="String">Periode Laporan: ${monthLabel} ${isDemoReport ? '(Mode Simulasi Lengkap)' : '(Data Sistem Aktif)'}</Data>
        </Cell>
      </Row>
      
      <Row ss:Height="15"/>
      
      {/* Overview Metrics Header */}
      <Row ss:Height="25">
        <Cell ss:Index="2" ss:StyleID="SectionHeader">
          <Data ss:Type="String">INDIKATOR UTAMA UTAMA</Data>
        </Cell>
        <Cell ss:StyleID="SectionHeader"/>
        <Cell ss:StyleID="SectionHeader"/>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="TableHeader"><Data ss:Type="String">Metrik Laporan</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Pencapaian Bulan Ini</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status Informasi</Data></Cell>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Total Pesanan Masuk</Data></Cell>
        <Cell ss:StyleID="CellBold" ss:Formula="=SUM(C11,C12)"><Data ss:Type="Number">${totalOrders}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">Akumulasi Order</Data></Cell>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Pesanan Berhasil (Selesai)</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="Number">${completedOrders}</Data></Cell>
        <Cell ss:StyleID="StatusSelesai"><Data ss:Type="String">SELESAI</Data></Cell>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Pesanan Dibatalkan</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="Number">${cancelledOrders}</Data></Cell>
        <Cell ss:StyleID="StatusBatal"><Data ss:Type="String">BATAL</Data></Cell>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Tingkat Penyelesaian (Completion Rate)</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) + '%' : '0%'}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">Indikator Efisiensi Mitra</Data></Cell>
      </Row>
      
      <Row ss:Height="15"/>
      
      {/* Financial Section */}
      <Row ss:Height="25">
        <Cell ss:Index="2" ss:StyleID="SectionHeader">
          <Data ss:Type="String">REKAPITULASI KEUANGAN</Data>
        </Cell>
        <Cell ss:StyleID="SectionHeader"/>
        <Cell ss:StyleID="SectionHeader"/>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Omset Transaksi Mitra (GTV)</Data></Cell>
        <Cell ss:StyleID="CellRupiahBold"><Data ss:Type="Number">${totalRevenue}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">Total Bruto Pembayaran</Data></Cell>
      </Row>
      
      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Komisi Jasa Aplikasi (Ololu Share)</Data></Cell>
        <Cell ss:StyleID="CellRupiahGoldBold"><Data ss:Type="Number">${appCommission}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">Pendapatan Bersih Platform</Data></Cell>
      </Row>

      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Mitra Sopir Aktif Terdaftar</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="Number">${activeDriversCount}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">Akun Driver Terverifikasi</Data></Cell>
      </Row>

      <Row ss:Height="22">
        <Cell ss:Index="2" ss:StyleID="CellNormal"><Data ss:Type="String">Penumpang Aktif Terdaftar</Data></Cell>
        <Cell ss:StyleID="CellBold"><Data ss:Type="Number">${registeredPassengersCount}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">Akun Penumpang Terdaftar</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
`;

  // ==========================================
  // SHEET 2: DAFTAR PESANAN DETAIL (ORDERS)
  // ==========================================
  xml += `  <Worksheet ss:Name="Rincian Pesanan">
    <Table ss:ExpandedColumnCount="15" ss:ExpandedRowCount="${monthlyOrders.length + 5}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="100">
      <Column ss:Width="80"/> {/* No Pesanan */}
      <Column ss:Width="110"/> {/* Waktu */}
      <Column ss:Width="80"/> {/* Layanan */}
      <Column ss:Width="110"/> {/* Penumpang */}
      <Column ss:Width="110"/> {/* Sopir */}
      <Column ss:Width="140"/> {/* Asal */}
      <Column ss:Width="140"/> {/* Tujuan */}
      <Column ss:Width="50"/> {/* Jarak */}
      <Column ss:Width="75"/> {/* Tarif Murni */}
      <Column ss:Width="60"/> {/* Multi Stop */}
      <Column ss:Width="65"/> {/* Biaya Parkir */}
      <Column ss:Width="75"/> {/* Biaya Belanja */}
      <Column ss:Width="85"/> {/* Total Bayar */}
      <Column ss:Width="75"/> {/* Komisi Ololu */}
      <Column ss:Width="70"/> {/* Status */}
      
      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">No. Pesanan</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Waktu Transaksi</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Layanan</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nama Penumpang</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Nama Sopir</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Alamat Penjemputan</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Alamat Pengantaran</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Jarak (KM)</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Tarif Perjalanan</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Mampir Stop</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Parkir</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Nota Belanja</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Total Bayar</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Komisi Jasa</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Status</Data></Cell>
      </Row>
`;

  // Order Rows
  monthlyOrders.forEach(p => {
    const commissionPct = p.biayaLayananPersen;
    const travelFare = p.tarifPerjalananMurni + p.tambahanTujuan + p.tambahanItem;
    const commission = p.status === 'selesai' ? Math.round((travelFare * commissionPct) / 100) : 0;
    const destName = p.daftarTujuan && p.daftarTujuan.length > 0 ? p.daftarTujuan[0].alamat : 'Lokasi Tujuan';

    xml += `      <Row ss:Height="20">
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${escapeXml(p.nomorPesanan)}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(new Date(p.waktuDibuat).toLocaleString('id-ID'))}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(p.jenisLayanan.toUpperCase())}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(p.namaPenumpang)}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(p.namaSopir || 'Tanpa Sopir')}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(p.asalAlamat)}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(destName)}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="Number">${p.jarakKm}</Data></Cell>
        <Cell ss:StyleID="CellRupiah"><Data ss:Type="Number">${p.tarifPerjalananMurni}</Data></Cell>
        <Cell ss:StyleID="CellRupiah"><Data ss:Type="Number">${p.tambahanTujuan + p.tambahanItem}</Data></Cell>
        <Cell ss:StyleID="CellRupiah"><Data ss:Type="Number">${p.biayaParkirTotal}</Data></Cell>
        <Cell ss:StyleID="CellRupiah"><Data ss:Type="Number">${p.biayaNotaTotal}</Data></Cell>
        <Cell ss:StyleID="CellRupiahBold"><Data ss:Type="Number">${p.totalBayarAkhir}</Data></Cell>
        <Cell ss:StyleID="CellRupiahGoldBold"><Data ss:Type="Number">${commission}</Data></Cell>
        <Cell ss:StyleID="${p.status === 'selesai' ? 'StatusSelesai' : 'StatusBatal'}"><Data ss:Type="String">${escapeXml(p.status.toUpperCase())}</Data></Cell>
      </Row>
`;
  });

  xml += `    </Table>
  </Worksheet>
`;

  // ==========================================
  // SHEET 3: MUTASI TRANSAKSI DOMPET (FINANCE)
  // ==========================================
  xml += `  <Worksheet ss:Name="Mutasi Keuangan Dompet">
    <Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="${monthlyTx.length + 5}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="120">
      <Column ss:Width="130"/> {/* ID Transaksi */}
      <Column ss:Width="110"/> {/* Waktu */}
      <Column ss:Width="110"/> {/* Driver */}
      <Column ss:Width="100"/> {/* Jenis */}
      <Column ss:Width="90"/> {/* Jumlah */}
      <Column ss:Width="90"/> {/* Saldo Awal */}
      <Column ss:Width="90"/> {/* Saldo Akhir */}
      <Column ss:Width="180"/> {/* Deskripsi */}
      
      <Row ss:Height="24">
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ID Transaksi</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tanggal &amp; Waktu</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">ID Sopir</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Tipe Mutasi</Data></Cell>
        <Cell ss:StyleID="TableHeaderGold"><Data ss:Type="String">Jumlah Perubahan</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Saldo Awal</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Saldo Akhir</Data></Cell>
        <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Deskripsi Catatan</Data></Cell>
      </Row>
`;

  monthlyTx.forEach(t => {
    xml += `      <Row ss:Height="20">
        <Cell ss:StyleID="CellBold"><Data ss:Type="String">${escapeXml(t.id)}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(new Date(t.timestamp).toLocaleString('id-ID'))}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(t.idSopir)}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(t.jenis.toUpperCase())}</Data></Cell>
        <Cell ss:StyleID="CellRupiahBold"><Data ss:Type="Number">${t.jumlah}</Data></Cell>
        <Cell ss:StyleID="CellRupiah"><Data ss:Type="Number">${t.saldoAwal}</Data></Cell>
        <Cell ss:StyleID="CellRupiah"><Data ss:Type="Number">${t.saldoAkhir}</Data></Cell>
        <Cell ss:StyleID="CellNormal"><Data ss:Type="String">${escapeXml(t.deskripsi)}</Data></Cell>
      </Row>
`;
  });

  xml += `    </Table>
  </Worksheet>
</Workbook>`;

  // 3. Create blob and trigger browser download
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const tempLink = document.createElement('a');
  tempLink.href = url;
  tempLink.setAttribute('download', `Laporan_Bulanan_Ololu_${yearMonth}.xls`);
  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  URL.revokeObjectURL(url);
}
