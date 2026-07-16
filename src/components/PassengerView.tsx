/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { OloluStore, KOORDINAT_LUMAJANG } from '../services/store';
import { GOOGLE_MAPS_KEY } from './SplashMapKey';
import ChatRoom from './ChatRoom';
import {
  Pesanan,
  TujuanStop,
  ItemBelanja,
  StatusPesanan
} from '../types';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Car,
  Phone,
  AlertTriangle,
  Star,
  CheckCircle,
  HelpCircle,
  DollarSign,
  AlertOctagon,
  Clock,
  Package,
  ShoppingBag,
  Info,
  Search,
  X,
  Home,
  MessageCircle,
  Zap,
  Shield,
  Check,
  Compass,
  Store,
  ShoppingCart,
  Bike,
  History,
  User,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import OloluLogo from './OloluLogo';
import { ololuRealtime } from '../services/supabaseClient';

interface PassengerViewProps {
  onNotifyAdminPanic: (pelapor: string, tipe: string) => void;
  onLogout: () => void;
  onRoleChange: (role: any) => void;
  lockedOrderId?: string;
}

// Daftar tempat populer di Lumajang sebagai rekomendasi cepat & fallback offline
const LUMAJANG_HOTSPOTS = [
  { name: "Alun-Alun Lumajang", description: "Jl. Alun-Alun Barat, Lumajang", lat: -8.1331, lng: 113.2240 },
  { name: "Mie Gacoan Lumajang", description: "Jl. Kyai Muksin, Lumajang", lat: -8.1312, lng: 113.2215 },
  { name: "Pasar Baru Lumajang", description: "Jl. Kyai Muksin, Lumajang", lat: -8.1385, lng: 113.2208 },
  { name: "Stasiun Klakah Lumajang", description: "Klakah, Lumajang", lat: -8.0125, lng: 113.2512 },
  { name: "Terminal Minak Koncar Lumajang", description: "Wonorejo, Kedungjajang, Lumajang", lat: -8.1065, lng: 113.2389 },
  { name: "Kawasan Wonorejo Terpadu", description: "Wonorejo, Lumajang", lat: -8.1141, lng: 113.2452 },
  { name: "Taman Toga Lumajang", description: "Jl. Mastrip, Lumajang", lat: -8.1450, lng: 113.2080 },
  { name: "RSUD Dr. Haryoto Lumajang", description: "Jl. Basuki Rahmat No.5, Lumajang", lat: -8.1278, lng: 113.2265 },
  { name: "STKIP PGRI Lumajang", description: "Jl. Pisang Agung, Lumajang", lat: -8.1410, lng: 113.2170 },
  { name: "KFC Lumajang", description: "Jl. Panglima Besar Sudirman, Lumajang", lat: -8.1325, lng: 113.2230 },
  { name: "GM Plaza Lumajang", description: "Jl. Kyai Muksin, Lumajang", lat: -8.1290, lng: 113.2282 },
  { name: "Polres Lumajang", description: "Jl. Alun-Alun Utara, Lumajang", lat: -8.1360, lng: 113.2255 },
  { name: "Dinas Kesehatan Lumajang", description: "Jl. Jendral Ahmad Yani, Lumajang", lat: -8.1345, lng: 113.2212 }
];

// Controller sub-component to pan map to coordinates
function MapRecenterController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
}

// Sub-component for places searching inside map picker
function MapPickerSearch({ 
  query, 
  setQuery, 
  onSelectSuggestion, 
  suggestions, 
  setSuggestions,
  onPerformSearch
}: {
  query: string;
  setQuery: (q: string) => void;
  onSelectSuggestion: (s: any) => void;
  suggestions: any[];
  setSuggestions: (s: any[]) => void;
  onPerformSearch: (q: string) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setIsSearching(true);
    
    const lowercaseQuery = query.toLowerCase();
    const localFiltered = LUMAJANG_HOTSPOTS.filter(h => 
      h.name.toLowerCase().includes(lowercaseQuery) || 
      h.description.toLowerCase().includes(lowercaseQuery)
    );

    if (placesLib) {
      placesLib.Place.searchByText({
        textQuery: query + " Lumajang",
        fields: ['displayName', 'location', 'formattedAddress'],
        maxResultCount: 5,
      }).then(({ places }) => {
        setIsSearching(false);
        if (places && places.length > 0) {
          const results = places.map(p => ({
            name: p.displayName || '',
            description: p.formattedAddress || '',
            lat: p.location?.lat() || KOORDINAT_LUMAJANG.lat,
            lng: p.location?.lng() || KOORDINAT_LUMAJANG.lng
          }));
          setSuggestions(results);
        } else {
          setSuggestions(localFiltered);
        }
      }).catch(err => {
        console.warn("Places search failed, using local suggestions:", err);
        setIsSearching(false);
        setSuggestions(localFiltered);
      });
    } else {
      setIsSearching(false);
      setSuggestions(localFiltered);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-1.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="Cari nama jalan, toko, pasar, cafe..."
            className="w-full p-2.5 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-[#046A38] text-gray-800"
          />
          {query && (
            <button 
              onClick={() => { setQuery(''); setSuggestions(LUMAJANG_HOTSPOTS); }}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2.5 bg-[#046A38] hover:bg-[#034F2A] text-white text-xs font-black rounded-xl transition-all flex items-center space-x-1 shrink-0"
        >
          <Search size={14} />
          <span>{isSearching ? 'Memuat...' : 'Cari'}</span>
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl bg-white shadow-sm divide-y divide-gray-50">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(s)}
              className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors flex items-start space-x-2 text-xs"
            >
              <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-gray-800 block">{s.name}</span>
                <span className="text-[10px] text-gray-500 block truncate">{s.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================================================================
// HELPER COMPONENT: REAL-TIME DRIVERS TRACKING MAP (DYNAMIC INTERACTIVE HOMEPAGE MAP)
// =========================================================================
interface SimulatedDriver {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  isSimulated: boolean;
  jenisMotor: string;
}

function LiveDriversMap() {
  const [drivers, setDrivers] = useState<SimulatedDriver[]>([]);

  useEffect(() => {
    const handlePresence = (state: any) => {
      const activeDrivers: SimulatedDriver[] = [];

      // Parse Presence State dari Supabase
      Object.keys(state).forEach(id => {
        const presences = state[id];
        if (presences && presences.length > 0) {
          const p = presences[0];
          if (p.lat && p.lng) {
            activeDrivers.push({
              id,
              nama: p.nama || "Mitra Ololu",
              lat: p.lat,
              lng: p.lng,
              isSimulated: false,
              jenisMotor: p.jenisMotor || "Motor"
            });
          }
        }
      });

      setDrivers(activeDrivers);
    };

    const unsubscribe = ololuRealtime.subscribeToDriversOnline((payload) => {
      // Jika payload adalah state presence (event sync)
      if (payload && typeof payload === 'object' && !payload.key) {
        handlePresence(payload);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-[0_4px_16px_rgba(4,106,56,0.04)] space-y-3.5 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-800 tracking-tight flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
            <span>Pantau Driver Terdekat</span>
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-none font-medium">Real-time GPS Tracking Mitra OLOLU</p>
        </div>
        <div className="bg-[#E6F4EC] border border-[#046A38]/20 px-2.5 py-1 rounded-full text-[#034F2A] text-[10px] font-black flex items-center space-x-1">
          <span>🛵</span>
          <span>{drivers.length} Driver Online</span>
        </div>
      </div>

      <div className="h-64 rounded-2xl overflow-hidden border border-gray-150 shadow-inner relative bg-gray-50">
        <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
          <Map
            defaultCenter={KOORDINAT_LUMAJANG}
            defaultZoom={14}
            mapId="OLOLU_HOMEPAGE_LIVEMAP"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            disableDefaultUI={true}
            gestureHandling="cooperative"
          >
            {/* Center Alun-Alun Marker */}
            <AdvancedMarker position={KOORDINAT_LUMAJANG} title="Alun-Alun Lumajang">
              <Pin background="#046A38" glyphColor="#fff" scale={0.7} />
            </AdvancedMarker>

            {/* Online Driver Markers */}
            {drivers.map(d => (
              <AdvancedMarker key={d.id} position={{ lat: d.lat, lng: d.lng }} title={`${d.nama} (${d.jenisMotor})`}>
                <div className="relative group cursor-pointer">
                  {/* Glowing Pulse Circle */}
                  <div className="absolute -inset-1 bg-emerald-500 rounded-full blur-[2px] opacity-25 animate-pulse"></div>
                  {/* Custom Motorbike Pin */}
                  <div className="relative bg-white text-[14px] p-1 rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.15)] border-2 border-[#0A8A4E] w-7 h-7 flex items-center justify-center hover:scale-110 hover:border-[#D4AF37] transition-all">
                    🛵
                  </div>
                  {/* Micro Tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-gray-900/95 text-white text-[8px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap shadow-md pointer-events-none z-50">
                    {d.nama} • <span className="text-yellow-400 font-mono font-normal">{d.jenisMotor}</span>
                  </div>
                </div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>

        {/* Small Ambient Overlay Infobar */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-white/95 backdrop-blur-xs p-2 rounded-xl border border-gray-150 shadow-xs flex items-center justify-between text-[9px] pointer-events-none">
          <div className="flex items-center space-x-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-gray-700">Ololu-Ride & Send Aktif</span>
          </div>
          <span className="text-gray-400">24 Jam Nonstop • Aman & Nyaman</span>
        </div>
      </div>

      <div className="bg-[#FAFBF9] p-2.5 rounded-2xl border border-gray-100 flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center space-x-2">
          <span className="text-base">🛡️</span>
          <span>Sopir berlisensi resmi, terverifikasi administrasi Lumajang, & ber-rating tinggi.</span>
        </div>
      </div>
    </div>
  );
}

export default function PassengerView({ onNotifyAdminPanic, onLogout, onRoleChange, lockedOrderId }: PassengerViewProps) {
  // --- IN-APP STATE SINKRONISASI ---
  const [profile, setProfile] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const isSuperUser = profile?.nomorHp === '6285156766317';
  const [activeOrder, setActiveOrder] = useState<Pesanan | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Pesanan[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [ratingsSubmitted, setRatingsSubmitted] = useState<boolean>(false);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  
  // FORM PEMESANAN STATE
  const [viewMode, setViewMode] = useState<'home' | 'booking' | 'history' | 'profile'>('home');
  const [subLayanan, setSubLayanan] = useState<'ojek' | 'kirim' | 'belanja' | 'makanan' | 'wisata' | 'market'>('ojek');
  const [selectedLayanan, setSelectedLayanan] = useState<'ojek' | 'makanan' | 'paket' | 'barang_besar'>('ojek');
  const [asalAlamat, setAsalAlamat] = useState<string>('Alun-Alun Lumajang (Jl. Alun-Alun Barat)');
  const [asalLat, setAsalLat] = useState<number>(KOORDINAT_LUMAJANG.lat);
  const [asalLng, setAsalLng] = useState<number>(KOORDINAT_LUMAJANG.lng);
  const [pembayaranTunai, setPembayaranTunai] = useState<boolean>(true);

  // DAFTAR STOP TUJUAN STATE (Minimal 1, Maksimal 5)
  const [stops, setStops] = useState<{
    id: string;
    alamat: string;
    lat: number;
    lng: number;
    items: { id: string; namaBarang: string; jumlah: number; perkiraanHarga: number }[];
  }[]>([
    {
      id: 'stop-1',
      alamat: 'Pasar Baru Lumajang (Jl. Kyai Muksin)',
      lat: -8.1385,
      lng: 113.2208,
      items: []
    }
  ]);

  // Custom Service Fields
  const [penerimaNama, setPenerimaNama] = useState<string>('');
  const [penerimaHp, setPenerimaHp] = useState<string>('');
  const [deskripsiPaket, setDeskripsiPaket] = useState<string>('');
  const [durasiWisata, setDurasiWisata] = useState<string>('6_jam');
  const [marketNamaBarang, setMarketNamaBarang] = useState<string>('');
  const [marketHargaCod, setMarketHargaCod] = useState<number>(0);

  // --- STATE MAP PICKER MODAL ---
  const [mapPickerTarget, setMapPickerTarget] = useState<'asal' | string | null>(null);
  const [tempLat, setTempLat] = useState<number>(KOORDINAT_LUMAJANG.lat);
  const [tempLng, setTempLng] = useState<number>(KOORDINAT_LUMAJANG.lng);
  const [tempAlamat, setTempAlamat] = useState<string>('');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<{ name: string; description: string; lat: number; lng: number }[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  useEffect(() => {
    const initPassenger = async () => {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);

      const cfg = await OloluStore.getPengaturan();
      setConfig(cfg);

      if (p) {
        const orders = await OloluStore.getAllPesanan();
        setHistoryOrders(orders.filter(o => o.idPenumpang === p.id));
      }

      // RECOVERY: Jika ada kunci order (Refresh F5), ambil data dasar dari DB
      if (lockedOrderId) {
        const order = await OloluStore.getPesananById(lockedOrderId);
        if (order) {
          setActiveOrder(order);
          ololuRealtime.requestStateSync(lockedOrderId);
        }
      }
    };

    initPassenger();
    const unsubscribe = OloluStore.subscribeToStore(initPassenger);
    return () => unsubscribe();
  }, [lockedOrderId]);

  // --- TRIP BROADCAST LISTENER (0 Write Updates) ---
  useEffect(() => {
    if (!activeOrder) return;

    const unsubscribe = ololuRealtime.subscribeToTrip(activeOrder.id, (data) => {
      if (data.type === 'location') {
        setDriverLoc(data.coords);
      } else if (data.type === 'accepted' || data.type === 'full-sync') {
        setActiveOrder(prev => prev ? ({
          ...prev,
          status: data.status || 'sopir_ditemukan',
          idSopir: data.driver.id,
          namaSopir: data.driver.nama,
          platNomorSopir: data.driver.platNomor,
          tahapAktif: data.tahapAktif ?? prev.tahapAktif
        }) : null);
      } else if (data.type === 'status_update') {
        setActiveOrder(prev => prev ? ({ ...prev, status: data.status }) : null);
      } else if (data.type === 'parking_update') {
        setActiveOrder(prev => {
          if (!prev) return null;
          const stops = prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, pilihanParkir: data.choice } : s);
          return { ...prev, daftarTujuan: stops };
        });
      } else if (data.type === 'stop_complete') {
        setActiveOrder(prev => {
          if (!prev) return null;
          const stops = prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, status: 'selesai' as any } : s);
          return { ...prev, daftarTujuan: stops, tahapAktif: data.nextTahap };
        });
      } else if (data.type === 'nota_update') {
        setActiveOrder(prev => {
          if (!prev) return null;
          const stops = prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, nota: data.nota } : s);
          return { ...prev, daftarTujuan: stops };
        });
      }
    });

    return () => unsubscribe();
  }, [activeOrder?.id]);

  const selectSubLayanan = (sub: 'ojek' | 'kirim' | 'belanja' | 'makanan' | 'wisata' | 'market') => {
    setSubLayanan(sub);
    if (sub === 'ojek') setSelectedLayanan('ojek');
    else if (sub === 'kirim') setSelectedLayanan('paket');
    else if (sub === 'belanja' || sub === 'makanan' || sub === 'market') setSelectedLayanan('makanan');
    else if (sub === 'wisata') setSelectedLayanan('barang_besar');
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung layanan lokasi.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latVal = position.coords.latitude;
        const lngVal = position.coords.longitude;
        setTempLat(latVal);
        setTempLng(lngVal);
        setIsLocating(false);
        setTempAlamat(`Lokasi Saya (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`);
      },
      (error) => {
        setIsLocating(false);
        alert(`Gagal mendapatkan lokasi: ${error.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleOpenMapPicker = (target: 'asal' | string) => {
    setMapPickerTarget(target);
    if (target === 'asal') {
      setTempLat(asalLat);
      setTempLng(asalLng);
      setTempAlamat(asalAlamat);
    } else {
      const stop = stops.find(s => s.id === target);
      if (stop) {
        setTempLat(stop.lat);
        setTempLng(stop.lng);
        setTempAlamat(stop.alamat);
      }
    }
    setSuggestions(LUMAJANG_HOTSPOTS);
  };

  const handleConfirmMapPicker = () => {
    if (mapPickerTarget === 'asal') {
      setAsalLat(tempLat);
      setAsalLng(tempLng);
      setAsalAlamat(tempAlamat || `Titik Terpilih (${tempLat.toFixed(5)}, ${tempLng.toFixed(5)})`);
    } else if (mapPickerTarget) {
      setStops(stops.map(s => s.id === mapPickerTarget ? { ...s, lat: tempLat, lng: tempLng, alamat: tempAlamat } : s));
    }
    setMapPickerTarget(null);
  };

  const handleAddStop = () => {
    if (stops.length >= 5) return;
    setStops([...stops, { id: `stop-${Date.now()}`, alamat: 'Taman Toga Lumajang', lat: -8.1450, lng: 113.2080, items: [] }]);
  };

  const handleRemoveStop = (id: string) => {
    if (stops.length > 1) setStops(stops.filter(s => s.id !== id));
  };

  const handleAddItemToStop = (stopId: string) => {
    setStops(stops.map(s => s.id === stopId ? { ...s, items: [...s.items, { id: `item-${Date.now()}`, namaBarang: '', jumlah: 1, perkiraanHarga: 0 }] } : s));
  };

  const handleUpdateItem = (stopId: string, itemId: string, field: string, val: any) => {
    setStops(stops.map(s => s.id === stopId ? { ...s, items: s.items.map(it => it.id === itemId ? { ...it, [field]: val } : it) } : s));
  };

  const hitungTotalJarak = (): number => {
    let total = 0;
    let prevLat = asalLat;
    let prevLng = asalLng;
    stops.forEach(st => {
      const dist = (Math.abs(st.lat - prevLat) + Math.abs(st.lng - prevLng)) * 111 * 0.75;
      total += dist;
      prevLat = st.lat;
      prevLng = st.lng;
    });
    return Math.max(1, Math.ceil(total));
  };

  const hitungEstimasiHarga = () => {
    if (!config) return 0;
    let tarifDasar = 0, tarifPerKm = 0, tarifMinimum = 0, batasKm = 3;
    if (selectedLayanan === 'ojek') { tarifDasar = config.ojekTarifDasar; tarifPerKm = config.ojekTarifPerKm; tarifMinimum = config.ojekTarifMinimum; batasKm = config.ojekBatasKmTarifDasar; }
    else if (selectedLayanan === 'makanan') { tarifDasar = config.makananTarifDasar; tarifPerKm = config.makananTarifPerKm; tarifMinimum = config.makananTarifMinimum; batasKm = config.makananBatasKmTarifDasar; }
    else if (selectedLayanan === 'paket') { tarifDasar = config.paketTarifDasar; tarifPerKm = config.paketTarifPerKm; tarifMinimum = config.paketTarifMinimum; batasKm = config.paketBatasKmTarifDasar; }
    else if (selectedLayanan === 'barang_besar') { tarifDasar = config.barangBesarTarifDasar; tarifPerKm = config.barangBesarTarifPerKm; tarifMinimum = config.barangBesarTarifMinimum; batasKm = config.barangBesarBatasKmTarifDasar; }

    const jarak = hitungTotalJarak();
    let harga = tarifDasar + (jarak > batasKm ? (jarak - batasKm) * tarifPerKm : 0);
    harga = Math.max(harga, tarifMinimum);

    const tambahanTujuan = stops.length > 1 ? (stops.length - 1) * config.biayaPerStopTambahan : 0;
    return harga + tambahanTujuan;
  };

  const handlePesan = async () => {
    if (!profile) return;
    const jarak = hitungTotalJarak();
    const estimasi = hitungEstimasiHarga();
    const total = estimasi + (subLayanan === 'wisata' ? (durasiWisata === '6_jam' ? 150000 : 250000) : 0);
    
    const order = await OloluStore.buatPesanan({
      jenisLayanan: selectedLayanan,
      idPenumpang: profile.id,
      asalAlamat,
      asalLat,
      asalLng,
      jarakKm: jarak,
      totalBayarAkhir: total,
      pembayaranTunai,
      tarifPerjalananMurni: estimasi
    }, stops.map((s, i) => ({ ...s, urutan: i + 1 })) as any);

    if (order) setActiveOrder(order as any);
  };

  const handleTriggerPanic = async () => {
    if (!activeOrder) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await OloluStore.tambahEmergency(activeOrder.id, profile.nama, profile.nomorHp, 'penumpang', pos.coords.latitude, pos.coords.longitude);
      onNotifyAdminPanic(profile.nama, 'Darurat SOS');
      alert("🚨 Tombol Panik Aktif! Admin telah diberitahu.");
    });
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeOrder && activeOrder.idSopir) {
      await OloluStore.tambahRating(activeOrder.id, activeOrder.idSopir, profile.nama, ratingVal, reviewText);
      setRatingsSubmitted(true);
    }
  };

  const handleBatalAtauTutup = () => {
    if (activeOrder?.status === 'selesai' || activeOrder?.status === 'dibatalkan') setActiveOrder(null);
    else if (confirm('Batalkan pesanan?')) {
      OloluStore.batalPesanan(activeOrder!.id, 'penumpang', 'Dibatalkan');
      setActiveOrder(null);
    }
  };

  if (!profile || !config) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-[#046A38]/20 border-t-[#046A38] rounded-full animate-spin"></div>
      <p className="mt-4 text-xs font-bold text-gray-400">Memuat Dashboard...</p>
    </div>
  );

  if (viewMode === 'profile') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center relative shadow-lg">
        <button onClick={() => setViewMode('home')} className="absolute left-6 top-6 bg-white/10 p-2 rounded-full border border-white/20"><Home size={16} /></button>
        <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
          {profile.fotoProfil ? <img src={profile.fotoProfil} className="w-full h-full object-cover" /> : <User size={48} />}
        </div>
        <h2 className="text-xl font-black">{profile.nama}</h2>
        <p className="text-emerald-100 text-xs font-bold">{profile.nomorHp}</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <button className="w-full flex items-center justify-between text-sm font-bold text-gray-700"><span>Edit Profil</span> <ChevronRight size={16} /></button>
          <button className="w-full flex items-center justify-between text-sm font-bold text-gray-700"><span>Keamanan</span> <ChevronRight size={16} /></button>
        </div>
        <button onClick={onLogout} className="w-full py-4 bg-red-50 text-red-600 font-black rounded-3xl border-2 border-red-100">Keluar Akun</button>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center px-6 z-50 max-w-[420px] mx-auto">
        <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center text-gray-400"><Home size={18} /><span className="text-[8px] font-bold">Beranda</span></button>
        <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center text-gray-400"><Bike size={18} /><span className="text-[8px] font-bold">Ojek</span></button>
        <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center text-gray-400"><History size={18} /><span className="text-[8px] font-bold">Riwayat</span></button>
        <button className="flex-1 flex flex-col items-center text-[#046A38]"><User size={18} /><span className="text-[8px] font-bold">Profil</span></button>
      </nav>
    </div>
  );

  if (activeOrder) return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative">
      <div className="bg-[#046A38] text-white p-4 text-center border-b-2 border-[#D4AF37] sticky top-0 z-40">
        <p className="text-[10px] uppercase font-bold text-[#F5E6A8]">{activeOrder.nomorPesanan}</p>
        <h2 className="text-lg font-bold">{activeOrder.status.replace('_', ' ').toUpperCase()}</h2>
      </div>
      <div className="w-full h-72 relative border-b">
        <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <Map defaultCenter={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }} defaultZoom={13} mapId="OLOLU_MAP">
            <AdvancedMarker position={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }}><Pin background="#046A38" scale={0.8} /></AdvancedMarker>
            {driverLoc && <AdvancedMarker position={driverLoc}><div className="text-2xl">🛵</div></AdvancedMarker>}
          </Map>
        </APIProvider>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#D4AF37]">
          <span className="text-[10px] text-gray-400 font-bold">TOTAL TAGIHAN</span>
          <p className="text-2xl font-black text-[#B8941F]">Rp {activeOrder.totalBayarAkhir.toLocaleString('id-ID')}</p>
        </div>
        {activeOrder.namaSopir && (
          <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-[#E6F4EC] p-2 rounded-full text-[#046A38]"><Car size={20} /></div>
              <div><h4 className="text-xs font-bold text-gray-500">SOPIR MITRA</h4><h3 className="text-sm font-bold">{activeOrder.namaSopir}</h3></div>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setIsChatOpen(true)} className="bg-[#E6F4EC] p-2 rounded-full text-[#046A38]"><MessageCircle size={18} /></button>
              <a href={`tel:${activeOrder.nomorHpSopir}`} className="bg-[#E6F4EC] p-2 rounded-full text-[#046A38]"><Phone size={18} /></a>
            </div>
          </div>
        )}
        <button onClick={handleTriggerPanic} className="w-full py-3 bg-red-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">🚨 PANIK / SOS</button>
        {(activeOrder.status === 'selesai' || activeOrder.status === 'dibatalkan') && (
          <button onClick={handleBatalAtauTutup} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs">Tutup</button>
        )}
      </div>
      {isChatOpen && <ChatRoom pesananId={activeOrder.id} senderId={profile.id} senderName={profile.nama} senderRole="penumpang" onClose={() => setIsChatOpen(false)} />}
    </div>
  );

  if (viewMode === 'history') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      <div className="bg-[#046A38] text-white p-6 rounded-b-3xl border-b border-[#D4AF37] relative">
        <button onClick={() => setViewMode('home')} className="absolute right-4 top-6 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold">← Beranda</button>
        <h1 className="text-xl font-black">Riwayat Pesanan</h1>
      </div>
      <div className="p-4 space-y-3">
        {historyOrders.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-150 space-y-3">
            <div className="flex justify-between border-b pb-2">
              <span className="text-[10px] font-mono text-gray-400">{p.nomorPesanan}</span>
              <span className="text-[10px] font-bold uppercase text-[#046A38]">{p.status}</span>
            </div>
            <p className="text-xs text-gray-700 truncate">{p.asalAlamat}</p>
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-[#B8941F]">Rp {p.totalBayarAkhir.toLocaleString('id-ID')}</span>
              <span className="text-gray-400 text-[10px]">{new Date(p.waktuDibuat).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (viewMode === 'home') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 pt-2">
      <div className="p-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-150 shadow-sm space-y-4 text-left">
          <h3 className="text-lg font-black">Halo, {profile.nama}! 👋</h3>
          <p className="text-xs text-gray-500">Butuh tumpangan atau kirim barang di Lumajang?</p>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="w-full py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-md uppercase text-xs">Pesan Sekarang</button>
          {isSuperUser && <button onClick={() => onRoleChange('admin')} className="w-full py-3 bg-amber-500 text-[#046A38] font-black rounded-2xl shadow-md uppercase text-xs">Dashboard Admin</button>}
        </div>
      </div>
      <div className="px-5"><LiveDriversMap /></div>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around z-50 max-w-[420px] mx-auto shadow-lg">
        <button onClick={() => setViewMode('home')} className="text-[#046A38] flex flex-col items-center"><Home size={20} /><span className="text-[8px] font-bold">Beranda</span></button>
        <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="text-gray-400 flex flex-col items-center"><Bike size={20} /><span className="text-[8px] font-bold">Ojek</span></button>
        <button onClick={() => setViewMode('history')} className="text-gray-400 flex flex-col items-center"><History size={20} /><span className="text-[8px] font-bold">Riwayat</span></button>
        <button onClick={() => setViewMode('profile')} className="text-gray-400 flex flex-col items-center"><User size={20} /><span className="text-[8px] font-bold">Profil</span></button>
      </nav>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      <div className="bg-[#046A38] text-white p-4 rounded-b-2xl border-b border-[#D4AF37] relative flex flex-col items-start">
        <button onClick={() => setViewMode('home')} className="absolute right-4 top-4 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold">← Batal</button>
        <h1 className="text-base font-black uppercase">{subLayanan}</h1>
        <p className="text-[10px] text-emerald-100">Layanan Ololu Lumajang</p>
      </div>

      <div className="p-3 space-y-3 text-left">
        <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl border border-gray-150">
          {['ojek', 'kirim', 'belanja', 'makanan', 'wisata', 'market'].map(s => (
            <button key={s} onClick={() => selectSubLayanan(s as any)} className={`flex flex-col items-center p-2 rounded-lg ${subLayanan === s ? 'bg-[#E6F4EC] text-[#046A38]' : 'text-gray-400'}`}>
              <div className="text-xs uppercase font-bold">{s.charAt(0)}</div>
              <span className="text-[7px] mt-1">{s}</span>
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-xl border space-y-4">
          <div><label className="text-[10px] font-bold text-gray-400 uppercase">Titik Jemput</label>
          <input readOnly onClick={() => handleOpenMapPicker('asal')} value={asalAlamat} className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-bold" /></div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-400 uppercase">Tujuan</label> <button onClick={handleAddStop} className="text-[#046A38] text-[9px] font-bold">+ Stop</button></div>
            {stops.map(s => (
              <div key={s.id} className="flex space-x-2 items-center">
                <input readOnly onClick={() => handleOpenMapPicker(s.id)} value={s.alamat} className="flex-1 p-2 bg-gray-50 border rounded-lg text-xs" />
                {stops.length > 1 && <button onClick={() => handleRemoveStop(s.id)} className="text-red-500"><Trash2 size={14} /></button>}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-dashed">
            <span className="text-xs font-bold">Estimasi Biaya:</span>
            <span className="text-lg font-black text-[#B8941F]">Rp {hitungEstimasiHarga().toLocaleString('id-ID')}</span>
          </div>
        </div>

        <button onClick={handlePesan} className="w-full py-3 bg-[#034F2A] text-white font-black rounded-xl text-xs uppercase tracking-widest border-b-4 border-[#D4AF37]">Konfirmasi Pesanan</button>
      </div>

      {mapPickerTarget && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="bg-[#034F2A] text-white p-4 flex justify-between items-center">
            <h3 className="font-bold text-xs uppercase">Pilih Lokasi</h3>
            <button onClick={() => setMapPickerTarget(null)}><X size={20} /></button>
          </div>
          <div className="p-3"><MapPickerSearch query={mapSearchQuery} setQuery={setMapSearchQuery} suggestions={suggestions} setSuggestions={setSuggestions} onSelectSuggestion={(s) => { setTempLat(s.lat); setTempLng(s.lng); setTempAlamat(s.name); setMapSearchQuery(s.name); setSuggestions([]); }} onPerformSearch={()=>{}} /></div>
          <div className="flex-1 relative">
            <APIProvider apiKey={GOOGLE_MAPS_KEY}>
              <Map center={{ lat: tempLat, lng: tempLng }} defaultZoom={14} mapId="PICKER_MAP" onClick={(e) => { if(e.detail.latLng) { setTempLat(e.detail.latLng.lat); setTempLng(e.detail.latLng.lng); setTempAlamat(`Titik Terpilih (${e.detail.latLng.lat.toFixed(5)})`); } }}>
                <MapRecenterController lat={tempLat} lng={tempLng} />
                <AdvancedMarker position={{ lat: tempLat, lng: tempLng }} draggable onDragEnd={(e) => { if(e.latLng) { setTempLat(e.latLng.lat()); setTempLng(e.latLng.lng()); } }}><Pin scale={1.2} /></AdvancedMarker>
              </Map>
            </APIProvider>
          </div>
          <div className="p-4 bg-white border-t space-y-3">
            <p className="text-xs font-bold text-gray-700">{tempAlamat}</p>
            <button onClick={handleConfirmMapPicker} className="w-full py-3 bg-[#034F2A] text-white font-black rounded-xl uppercase text-xs">Pilih Lokasi Ini</button>
          </div>
        </div>
      )}
    </div>
  );
}
