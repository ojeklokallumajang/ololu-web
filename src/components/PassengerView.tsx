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

interface PassengerViewProps {
  onNotifyAdminPanic: () => void;
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

  // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

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

  // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

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

interface PassengerViewProps {
  onNotifyAdminPanic: () => void;
  onLogout: () => void;
  onRoleChange: (role: any) => void;
}

export default function PassengerView({ onNotifyAdminPanic, onLogout, onRoleChange, lockedOrderId }: PassengerViewProps) {
  // --- IN-APP STATE SINKRONISASI ---
  const [profile, setProfile] = useState<any>(null);
  const isSuperUser = profile?.nomorHp === '6285156766317';
  const [activeOrder, setActiveOrder] = useState<Pesanan | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [ratingsSubmitted, setRatingsSubmitted] = useState<boolean>(false);
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  
  // FORM PEMESANAN STATE
  const [viewMode, setViewMode] = useState<'home' | 'booking' | 'history' | 'profile'>('home');
  const [subLayanan, setSubLayanan] = useState<'ojek' | 'kirim' | 'belanja' | 'makanan' | 'wisata' | 'market'>('ojek');
  const [selectedLayanan, setSelectedLayanan] = useState<'ojek' | 'makanan' | 'paket' | 'barang_besar'>('ojek');
  const [asalAlamat, setAsalAlamat] = useState<string>('Alun-Alun Lumajang (Jl. Alun-Alun Barat)');
  
  // Custom Service Fields
  const [penerimaNama, setPenerimaNama] = useState<string>('');
  const [penerimaHp, setPenerimaHp] = useState<string>('');
  const [deskripsiPaket, setDeskripsiPaket] = useState<string>('');
  const [durasiWisata, setDurasiWisata] = useState<string>('6_jam');
  const [marketNamaBarang, setMarketNamaBarang] = useState<string>('');
  const [marketHargaCod, setMarketHargaCod] = useState<number>(0);

  const selectSubLayanan = (sub: 'ojek' | 'kirim' | 'belanja' | 'makanan' | 'wisata' | 'market') => {
    setSubLayanan(sub);
    if (sub === 'ojek') {
      setSelectedLayanan('ojek');
    } else if (sub === 'kirim') {
      setSelectedLayanan('paket');
    } else if (sub === 'belanja') {
      setSelectedLayanan('makanan');
    } else if (sub === 'makanan') {
      setSelectedLayanan('makanan');
    } else if (sub === 'wisata') {
      setSelectedLayanan('barang_besar');
    } else if (sub === 'market') {
      setSelectedLayanan('makanan');
    }
  };
  
  // --- STATE MAP PICKER MODAL ---
  const [mapPickerTarget, setMapPickerTarget] = useState<'asal' | string | null>(null); // null, 'asal', atau stopId
  const [tempLat, setTempLat] = useState<number>(KOORDINAT_LUMAJANG.lat);
  const [tempLng, setTempLng] = useState<number>(KOORDINAT_LUMAJANG.lng);
  const [tempAlamat, setTempAlamat] = useState<string>('');
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<{ name: string; description: string; lat: number; lng: number }[]>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung layanan lokasi (Geolocation).");
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latVal = position.coords.latitude;
        const lngVal = position.coords.longitude;
        setTempLat(latVal);
        setTempLng(lngVal);
        
        // Reverse geocode
        if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
            setIsLocating(false);
            if (status === 'OK' && results && results[0]) {
              setTempAlamat(results[0].formatted_address);
              setMapSearchQuery(results[0].formatted_address);
            } else {
              const customAlm = `Lokasi Saya (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
              setTempAlamat(customAlm);
              setMapSearchQuery(customAlm);
            }
          });
        } else {
          setIsLocating(false);
          const customAlm = `Lokasi Saya (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
          setTempAlamat(customAlm);
          setMapSearchQuery(customAlm);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn("Geolocation error:", error);
        alert(`Gagal mendapatkan lokasi: ${error.message}. Harap aktifkan GPS / izin lokasi di browser Anda.`);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleOpenMapPicker = (target: 'asal' | string) => {
    setMapPickerTarget(target);
    if (target === 'asal') {
      setTempLat(asalLat);
      setTempLng(asalLng);
      setTempAlamat(asalAlamat);
      setMapSearchQuery(asalAlamat);
    } else {
      const stop = stops.find(s => s.id === target);
      if (stop) {
        setTempLat(stop.lat);
        setTempLng(stop.lng);
        setTempAlamat(stop.alamat);
        setMapSearchQuery(stop.alamat);
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
      setStops(stops.map(s => {
        if (s.id === mapPickerTarget) {
          return {
            ...s,
            lat: tempLat,
            lng: tempLng,
            alamat: tempAlamat || `Titik Terpilih (${tempLat.toFixed(5)}, ${tempLng.toFixed(5)})`
          };
        }
        return s;
      }));
    }
    setMapPickerTarget(null);
  };
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

  const config = OloluStore.getPengaturan();

  useEffect(() => {
    const initPassenger = async () => {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);

      // RECOVERY: Jika ada kunci order (Refresh F5), ambil data dasar dari DB
      if (lockedOrderId) {
        const order = await OloluStore.getPesananById(lockedOrderId);
        if (order) {
          setActiveOrder(order);
          // Minta sinkronisasi dari sopir (jika sudah ada sopir)
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
      console.log("⚡ Trip Update Received:", data);

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
      }
    });

    return () => unsubscribe();
  }, [activeOrder?.id]);

  // DIAL OUT WHATSAPP UNTUK OTP / REGISTRASI SIMULASI
  const [namaReg, setNamaReg] = useState('');
  const [nomorHpReg, setNomorHpReg] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentLog, setOtpSentLog] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [regError, setRegError] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!namaReg || !nomorHpReg) {
      setRegError('Lengkapi semua isian!');
      return;
    }
    const otp = OloluStore.kirimFonnteOtp(nomorHpReg);
    setOtpSentLog(otp);
    setIsVerifyingOtp(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    const ok = OloluStore.verifikasiOtp(nomorHpReg, otpInput);
    if (ok) {
      const user = OloluStore.registerPengguna(namaReg, nomorHpReg, 'penumpang');
      OloluStore.setSesi({ userId: user.id, role: 'penumpang' });
      setProfile(user);
      setIsVerifyingOtp(false);
      setOtpSentLog(null);
    } else {
      setRegError('Kode OTP salah! Gunakan bypass code 999999 jika WA lambat.');
    }
  };

  // --- FORM INPUT MANAGEMENT ---
  const handleAddStop = () => {
    if (stops.length >= 5) return;
    const newId = `stop-${Date.now()}`;
    
    // Titik default sekitar Lumajang bergantian agar tampak realistis
    const randOffsets = [
      { alamat: 'Taman Toga Lumajang', lat: -8.1450, lng: 113.2080 },
      { alamat: 'Stasiun Klakah Lumajang', lat: -8.0125, lng: 113.2512 },
      { alamat: 'Terminal Minak Koncar', lat: -8.1065, lng: 113.2389 },
      { alamat: 'Kawasan Wonorejo Terpadu', lat: -8.1141, lng: 113.2452 }
    ];
    const itemIdx = stops.length % randOffsets.length;

    setStops([
      ...stops,
      {
        id: newId,
        alamat: randOffsets[itemIdx].alamat,
        lat: randOffsets[itemIdx].lat,
        lng: randOffsets[itemIdx].lng,
        items: []
      }
    ]);
  };

  const handleRemoveStop = (id: string) => {
    if (stops.length <= 1) return;
    setStops(stops.filter(s => s.id !== id));
  };

  const handleUpdateStopAlamat = (id: string, alamat: string) => {
    setStops(stops.map(s => {
      if (s.id === id) {
        // Mock beberapa lat/lng bergeser sedikit sesuai alamat ketikan agar peta terupdate
        const randLat = KOORDINAT_LUMAJANG.lat + (Math.random() - 0.5) * 0.015;
        const randLng = KOORDINAT_LUMAJANG.lng + (Math.random() - 0.5) * 0.015;
        return { ...s, alamat, lat: randLat, lng: randLng };
      }
      return s;
    }));
  };

  // ITEM MANAGEMENT PER STOP
  const handleAddItemToStop = (stopId: string) => {
    setStops(stops.map(s => {
      if (s.id === stopId) {
        if (s.items.length >= 5) return s; // Maksimal 5 item
        const newItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          namaBarang: 'Menu Makanan/Belanja',
          jumlah: 1,
          perkiraanHarga: 15000
        };
        return { ...s, items: [...s.items, newItem] };
      }
      return s;
    }));
  };

  const handleRemoveItemFromStop = (stopId: string, itemId: string) => {
    setStops(stops.map(s => {
      if (s.id === stopId) {
        return { ...s, items: s.items.filter(it => it.id !== itemId) };
      }
      return s;
    }));
  };

  const handleUpdateItem = (stopId: string, itemId: string, field: string, val: any) => {
    setStops(stops.map(s => {
      if (s.id === stopId) {
        const itemUpdated = s.items.map(it => {
          if (it.id === itemId) {
            return { ...it, [field]: val };
          }
          return it;
        });
        return { ...s, items: itemUpdated };
      }
      return s;
    }));
  };

  // HITUNG ESTIMASI JARAK & TARIF MURNI
  const hitungTotalJarak = (): number => {
    // Simulasi hitung jarak Manhattan antara asal dan stop berurutan
    let total = 0;
    let prevLat = asalLat;
    let prevLng = asalLng;

    stops.forEach(st => {
      const dLat = Math.abs(st.lat - prevLat);
      const dLng = Math.abs(st.lng - prevLng);
      // Konversi kasar derajat ke KM sekitar Lumajang (~111km per derajat)
      const dist = (dLat + dLng) * 111 * 0.75;
      total += dist;
      prevLat = st.lat;
      prevLng = st.lng;
    });

    const finalJarak = Math.ceil(total);
    return finalJarak === 0 && stops.length > 0 ? 1 : finalJarak;
  };

  const hitungEstimasiHarga = () => {
    let tarifDasar = 0;
    let tarifPerKm = 0;
    let tarifMinimum = 0;
    let batasKmTarifDasar = 3;

    switch (selectedLayanan) {
      case 'ojek':
        tarifDasar = config.ojekTarifDasar;
        tarifPerKm = config.ojekTarifPerKm;
        tarifMinimum = config.ojekTarifMinimum;
        batasKmTarifDasar = config.ojekBatasKmTarifDasar ?? 3;
        break;
      case 'makanan':
        tarifDasar = config.makananTarifDasar;
        tarifPerKm = config.makananTarifPerKm;
        tarifMinimum = config.makananTarifMinimum;
        batasKmTarifDasar = config.makananBatasKmTarifDasar ?? 3;
        break;
      case 'paket':
        tarifDasar = config.paketTarifDasar;
        tarifPerKm = config.paketTarifPerKm;
        tarifMinimum = config.paketTarifMinimum;
        batasKmTarifDasar = config.paketBatasKmTarifDasar ?? 3;
        break;
      case 'barang_besar':
        tarifDasar = config.barangBesarTarifDasar;
        tarifPerKm = config.barangBesarTarifPerKm;
        tarifMinimum = config.barangBesarTarifMinimum;
        batasKmTarifDasar = config.barangBesarBatasKmTarifDasar ?? 3;
        break;
    }

    const jarak = hitungTotalJarak();
    let tarifJarak = tarifDasar;
    if (jarak > batasKmTarifDasar) {
      const sisaJarakBulat = jarak - batasKmTarifDasar;
      tarifJarak += sisaJarakBulat * tarifPerKm;
    }
    if (tarifJarak < tarifMinimum) {
      tarifJarak = tarifMinimum;
    }

    // Rush Hour Surge
    if (config.rushHourAktif) {
      const sek = new Date();
      const jamMenit = `${sek.getHours().toString().padStart(2, '0')}:${sek.getMinutes().toString().padStart(2, '0')}`;
      if (jamMenit >= config.rushHourMulai && jamMenit <= config.rushHourSelesai) {
        tarifJarak += (tarifJarak * config.rushHourPersenKenaikan / 100);
      }
    }

    // Tambahan stop multi-tujuan (stop ke-2 s/d 5)
    const tambahanTujuan = stops.length > 1 ? (stops.length - 1) * config.biayaPerStopTambahan : 0;

    // Tambahan kelebihan item (> 5 item per stop)
    let tambahanItem = 0;
    stops.forEach(s => {
      let tot = 0;
      s.items.forEach(it => { tot += it.jumlah; });
      if (tot > 5) {
        tambahanItem += (tot - 5) * config.biayaKelebihanItem;
      }
    });

    return Math.round(tarifJarak + tambahanTujuan + tambahanItem);
  };

  const handlePesan = () => {
    if (!profile) return;
    const jarak = hitungTotalJarak();
    
    // Format descriptive details based on the selected sub-service
    let customAsalAlamat = asalAlamat;
    if (subLayanan === 'kirim') {
      customAsalAlamat = `${asalAlamat} [📦 Kirim Paket | Penerima: ${penerimaNama || '-'} (${penerimaHp || '-'}) | Isi: ${deskripsiPaket || '-'}]`;
    } else if (subLayanan === 'wisata') {
      const durLabel = durasiWisata === '6_jam' ? '6 Jam' : '12 Jam';
      customAsalAlamat = `${asalAlamat} [🗺️ Wisata Lumajang | Durasi: ${durLabel}]`;
    } else if (subLayanan === 'market') {
      customAsalAlamat = `${asalAlamat} [🏪 Market UMKM | Barang: ${marketNamaBarang || '-'} | COD: Rp ${marketHargaCod.toLocaleString('id-ID')}]`;
    } else if (subLayanan === 'belanja') {
      customAsalAlamat = `${asalAlamat} [🛒 Belanja Titip Pasar/Toko]`;
    } else if (subLayanan === 'makanan') {
      customAsalAlamat = `${asalAlamat} [🍔 Pesan Antar Makanan]`;
    }
    
    // Struktur stop yang dikirim ke database simulasi
    const stopsDb = stops.map(s => ({
      id: s.id,
      alamat: s.alamat,
      lat: s.lat,
      lng: s.lng,
      daftarItem: s.items.map(it => ({
        id: it.id,
        namaBarang: it.namaBarang,
        jumlah: it.jumlah,
        perkiraanHarga: it.perkiraanHarga
      }))
    }));

    const order = OloluStore.buatPesanan(
      selectedLayanan,
      profile.id,
      profile.nama,
      profile.nomorHp,
      customAsalAlamat,
      asalLat,
      asalLng,
      stopsDb,
      jarak,
      pembayaranTunai
    );

    setActiveOrder(order);
  };

  // TOMBOL PANIK / DARURAT PENUMPANG
  const handleTriggerPanic = () => {
    if (!activeOrder) return;
    // Deteksi lokasi koordinat browser
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const rep = OloluStore.tambahEmergency(
          activeOrder.id,
          profile?.nama || 'Penumpang Ololu',
          profile?.nomorHp || '0',
          'penumpang',
          pos.coords.latitude,
          pos.coords.longitude
        );
        onNotifyAdminPanic();
        alert(`🚨 TOMBOL PANIK DIAKTIFKAN!\nLokasi GPS Anda berhasil dilaporkan ke Admin Ololu. Bantuan darurat sedang dihubungi sekarang.`);
      },
      () => {
        const rep = OloluStore.tambahEmergency(
          activeOrder.id,
          profile?.nama || 'Penumpang Ololu',
          profile?.nomorHp || '0',
          'penumpang',
          activeOrder.asalLat,
          activeOrder.asalLng
        );
        onNotifyAdminPanic();
        alert(`🚨 TOMBOL PANIK DIAKTIFKAN!\nLokasi GPS gagal diakses browser, koordinat pesanan dikirim ke Admin. Bantuan sedang berjalan.`);
      }
    );
  };

  // SUBMIT RATING SETELAH PESANAN SELESAI
  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !activeOrder.idSopir) return;
    OloluStore.tambahRating(
      activeOrder.id,
      activeOrder.idSopir,
      profile?.nama || 'Penumpang Ololu',
      ratingVal,
      reviewText
    );
    setRatingsSubmitted(true);
  };

  // RESET TAMPILAN JIKA ORDER SELESAI/BATAL
  const handleBatalAtauTutup = () => {
    if (!activeOrder) return;
    if (activeOrder.status === 'selesai' || activeOrder.status === 'dibatalkan') {
      setActiveOrder(null);
    } else {
      // Pembatalan order aktif
      if (confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) {
        OloluStore.batalPesanan(activeOrder.id, 'penumpang', 'Dibatalkan oleh Penumpang via halaman lacak.');
        setActiveOrder(null);
      }
    }
  };

  // --- RENDERING VIEWS ---

  // JIKA PENUMPANG BELUM DAFTAR / LOGIN SIMULASI
  if (!profile) {
    // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-white p-6 rounded-2xl border-t-2 border-[#D4AF37] shadow-sm text-center">
          <span className="text-4xl">👋</span>
          <h2 className="text-xl font-bold text-[#046A38] mt-3 mb-1">Selamat Datang di OLOLU</h2>
          <p className="text-xs text-gray-500 mb-6">
            Ojek lokal & pengantaran terpercaya Lumajang. Masukkan identitas Anda untuk memesan langsung di web.
          </p>

          <form onSubmit={isVerifyingOtp ? handleVerifyOtp : handleRegister} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                disabled={isVerifyingOtp}
                value={namaReg}
                onChange={(e) => setNamaReg(e.target.value)}
                placeholder="cth. Achmad"
                className="w-full p-2.5 bg-[#FAFBF9] border border-gray-200 rounded-xl text-sm focus:outline-[#046A38]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nomor WhatsApp (WhatsApp Aktif)</label>
              <input
                type="tel"
                disabled={isVerifyingOtp}
                value={nomorHpReg}
                onChange={(e) => setNomorHpReg(e.target.value)}
                placeholder="cth. 6288212818616"
                className="w-full p-2.5 bg-[#FAFBF9] border border-gray-200 rounded-xl text-sm focus:outline-[#046A38]"
              />
              <p className="text-[10px] text-gray-400 mt-1">OTP 6-digit asli dikirim via WhatsApp Fonnte.</p>
            </div>

            {isVerifyingOtp && (
              <div className="bg-[#F5E6A8] p-3 rounded-xl border border-[#B8941F] space-y-2">
                <label className="block text-xs font-bold text-[#1A1A1A]">
                  Kode OTP WhatsApp (6 Digit)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Masukkan OTP"
                  className="w-full p-2 bg-white border border-[#B8941F] rounded-lg text-center tracking-widest font-bold font-mono focus:outline-[#046A38]"
                />
                <div className="text-[10px] text-[#6B7280]">
                  {otpSentLog ? (
                    <p className="font-semibold text-[#046A38]">
                      💬 DEVELOPMENT LOG: OTP Simulasi dikirim = <span className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border">{otpSentLog}</span> (Gunakan angka ini jika WhatsApp delay)
                    </p>
                  ) : (
                    <p>Membaca database OTP...</p>
                  )}
                </div>
              </div>
            )}

            {regError && <p className="text-xs text-[#DC2626] font-semibold">{regError}</p>}

            {isVerifyingOtp ? (
              <button
                type="submit"
                className="w-full py-3 bg-[#034F2A] hover:bg-[#046A38] text-white font-bold rounded-xl shadow-md transition-all border border-[#D4AF37]"
              >
                Verifikasi OTP & Masuk
              </button>
            ) : (
              <button
                type="submit"
                className="w-full py-3 bg-[#034F2A] hover:bg-[#046A38] text-white font-bold rounded-xl shadow-md transition-all border border-[#D4AF37]"
              >
                Kirim Kode OTP WhatsApp
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: SCREEN LACAK PESANAN (TERKUNCI KERAS & REAL-TIME)
  // =========================================================================
  if (activeOrder) {
    const isCompleted = activeOrder.status === 'selesai';
    const isCancelled = activeOrder.status === 'dibatalkan';
    const activeDriver = activeOrder.idSopir ? OloluStore.getSopir(activeOrder.idSopir) : null;
    const currentLoc = activeDriver?.lokasiSaatIni || { lat: activeOrder.asalLat, lng: activeOrder.asalLng };

    // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
      <div id="order-lacing-container" className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative">
        
        {/* BANNER STATUS UTAMA */}
        <div className="bg-[#046A38] text-white p-4 text-center border-b-2 border-[#D4AF37] sticky top-0 z-40">
          <p className="text-[10px] uppercase tracking-widest text-[#F5E6A8] font-bold">
            Pelacakan Aktif • {activeOrder.nomorPesanan}
          </p>
          <h2 className="text-lg font-bold font-sans mt-0.5">
            {activeOrder.status === 'mencari_sopir' && '🔍 Mencari Sopir Terdekat...'}
            {(activeOrder.status === 'sopir_ditemukan' || activeOrder.status === 'diproses') && '🛵 Sopir Sedang Menuju Titik Anda'}
            {activeOrder.status === 'dalam_perjalanan' && '🛣️ Sedang Dalam Perjalanan'}
            {activeOrder.status === 'selesai' && '✅ Pesanan Selesai'}
            {activeOrder.status === 'dibatalkan' && '❌ Pesanan Dibatalkan'}
          </h2>
        </div>

        {/* GOOGLE MAPS INTERAKTIF */}
        <div className="w-full h-72 relative shadow-sm border-b border-gray-200">
          <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }}
              defaultZoom={13}
              mapId="OLOLU_TRACKING_MAP"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Marker Titik Asal */}
              <AdvancedMarker position={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }} title="Asal Penjemputan">
                <Pin background="#046A38" glyphColor="#fff" scale={0.9} />
              </AdvancedMarker>

              {/* Marker Titik Stop Tujuan */}
              {activeOrder.daftarTujuan.map((stop, idx) => (
                <AdvancedMarker key={stop.id} position={{ lat: stop.lat, lng: stop.lng }} title={`Tujuan ${idx + 1}`}>
                  <Pin background="#D4AF37" glyphColor="#1A1A1A" glyphText={`${idx + 1}`} scale={0.9} />
                </AdvancedMarker>
              ))}

              {/* Marker Sopir (Jika sudah ditemukan) */}
              {activeOrder.idSopir && (
                <AdvancedMarker position={driverLoc || currentLoc} title="Posisi Sopir Ololu">
                  <div className="bg-white p-1 rounded-full border-2 border-[#0A8A4E] shadow-md flex items-center justify-center w-9 h-9">
                    <span className="text-lg">🛵</span>
                  </div>
                </AdvancedMarker>
              )}
            </Map>
          </APIProvider>
          
          {/* OVERLAY MAPS RE-CENTER */}
          <div className="absolute bottom-3 right-3 bg-white/95 p-1.5 rounded-lg border border-gray-200 shadow-sm text-[10px] text-gray-500 flex items-center space-x-1">
            <Clock size={12} className="text-[#046A38] animate-pulse" />
            <span>Simulasi GPS Realtime</span>
          </div>
        </div>

        <div className="p-4 space-y-4">
          
          {/* BANNER NOTA DAN TOTAL BAYAR SEKARANG */}
          <div className="bg-white p-4 rounded-xl shadow-xs border-l-4 border-[#D4AF37] space-y-1">
            <span className="text-[10px] text-[#6B7280] block font-semibold">TOTAL YANG WAJIB DIBAYAR</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-[#B8941F]">
                Rp {activeOrder.totalBayarAkhir.toLocaleString('id-ID')}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeOrder.pembayaranTunai ? 'bg-[#F5E6A8] text-[#B8941F]' : 'bg-[#E6F4EC] text-[#046A38]'}`}>
                {activeOrder.pembayaranTunai ? '💵 BAYAR TUNAI KE SOPIR' : '📱 DOMPET OLOLU'}
              </span>
            </div>
            {activeOrder.biayaParkirTotal > 0 || activeOrder.biayaNotaTotal > 0 ? (
              <div className="text-[10px] text-gray-500 pt-1 border-t border-dashed mt-2">
                Detail tambahan: Jarak (Rp {activeOrder.tarifPerjalananMurni.toLocaleString('id-ID')}) 
                {activeOrder.biayaParkirTotal > 0 && ` + Parkir (Rp ${activeOrder.biayaParkirTotal.toLocaleString('id-ID')})`}
                {activeOrder.biayaNotaTotal > 0 && ` + Nota Toko (Rp ${activeOrder.biayaNotaTotal.toLocaleString('id-ID')})`}
              </div>
            ) : null}
          </div>

          {/* DETAIL SOPIR YANG MENERIMA ORDER */}
          {activeDriver ? (
            <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-[#E6F4EC] p-2.5 rounded-full text-[#046A38]">
                  <Car size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-500">SOPIR MITRA OLOLU</h4>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">{activeOrder.namaSopir}</h3>
                  <p className="text-xs font-mono font-bold text-[#046A38] bg-[#E6F4EC] px-1.5 py-0.5 rounded inline-block mt-0.5">
                    {activeOrder.platNomorSopir || 'N 1234 XX'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="bg-[#E6F4EC] hover:bg-[#FAFBF9] text-[#046A38] p-2.5 rounded-full transition-all border border-gray-150 relative"
                  title="Hubungi Chat"
                >
                  <MessageCircle size={18} />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </button>
                <a
                  href={`tel:${activeOrder.nomorHpSopir}`}
                  className="bg-[#E6F4EC] hover:bg-[#FAFBF9] text-[#046A38] p-2.5 rounded-full transition-all border border-gray-150"
                  title="Hubungi Sopir"
                >
                  <Phone size={18} />
                </a>
              </div>
            </div>
          ) : (
            activeOrder.status === 'mencari_sopir' && (
              <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 text-center py-6 space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-t-[#046A38] border-r-transparent border-b-[#D4AF37] border-l-transparent mx-auto"></div>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  Sistem Autobid sedang mendistribusikan penawaran ke 3 sopir terdekat dalam radius {config.radiusPencarianSopirKm} KM...
                </p>
                <div className="bg-[#FAFBF9] p-2 rounded-lg text-[10px] text-gray-400 font-mono italic">
                  *Tip Simulasi: Jika sedang menguji, Anda bisa membuka menu "SOPIR" di kanan atas dan menekan "Mode Online" untuk meng-accept order ini secara manual!
                </div>
              </div>
            )
          )}

          {/* TIMELINE PROGRESS & PARKIR / NOTA REALTIME */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-gray-100 space-y-3">
            <h3 className="text-xs font-bold text-[#1A1A1A] border-b pb-2">TIMELINE PERJALANAN</h3>
            
            <div className="space-y-4">
              {/* Pickup Point */}
              <div className="flex items-start space-x-3 text-xs">
                <div className="flex flex-col items-center">
                  <span className="w-5 h-5 rounded-full bg-[#046A38] text-white font-bold flex items-center justify-center text-[9px]">
                    S
                  </span>
                  <div className="w-0.5 h-12 bg-gray-200"></div>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">Titik Penjemputan</h4>
                  <p className="text-gray-500 text-[11px]">{activeOrder.asalAlamat}</p>
                </div>
              </div>

              {/* Stop-over Points */}
              {activeOrder.daftarTujuan.map((stop, sIdx) => {
                const isStopSelesai = stop.status === 'selesai';
                const isAktif = sIdx === activeOrder.tahapAktif && activeOrder.status === 'dalam_perjalanan';

                // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
                  <div key={stop.id} className="flex items-start space-x-3 text-xs">
                    <div className="flex flex-col items-center">
                      <span className={`w-5 h-5 rounded-full font-bold flex items-center justify-center text-[9px] ${
                        isStopSelesai ? 'bg-[#059669] text-white' : isAktif ? 'bg-[#D4AF37] text-white animate-pulse' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {sIdx + 1}
                      </span>
                      {sIdx < activeOrder.daftarTujuan.length - 1 && <div className="w-0.5 h-20 bg-gray-200"></div>}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-baseline">
                        <h4 className="font-bold text-gray-800">Tujuan {sIdx + 1}</h4>
                        {isStopSelesai ? (
                          <span className="bg-[#E6F4EC] text-[#046A38] text-[9px] px-1.5 py-0.2 rounded-full font-bold">SELESAI</span>
                        ) : isAktif ? (
                          <span className="bg-[#F5E6A8] text-[#B8941F] text-[9px] px-1.5 py-0.2 rounded-full font-bold">SEDANG DITUJU</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.2 rounded-full">ANTRIAN</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-[11px]">{stop.alamat}</p>

                      {/* Info Item Belanja */}
                      {stop.daftarItem?.length > 0 && (
                        <div className="bg-[#FAFBF9] p-2 rounded-lg border border-gray-100 mt-1 space-y-0.5">
                          <span className="text-[10px] text-gray-400 font-semibold uppercase">Barang Pesanan ({stop.daftarItem.length}):</span>
                          {stop.daftarItem.map((it, itIdx) => (
                            <div key={it.id} className="text-[11px] text-gray-600 flex justify-between">
                              <span>- {it.namaBarang} (x{it.jumlah})</span>
                              <span className="text-gray-400">Est: Rp {it.perkiraanHarga.toLocaleString('id-ID')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* INFO PARKIR YANG DIKENAKAN REALTIME */}
                      <div className="flex items-center space-x-1.5 mt-1.5 text-[10px]">
                        <span className="font-bold text-gray-600">🅿️ Status Parkir:</span>
                        {stop.pilihanParkir === 'tidak_ada' && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Tidak Ada Parkir</span>}
                        {stop.pilihanParkir === 'parkir_biasa' && <span className="bg-[#F5E6A8] text-[#B8941F] font-bold px-2 py-0.5 rounded">Parkir Biasa (Rp {config.biayaParkirBiasa.toLocaleString('id-ID')})</span>}
                        {stop.pilihanParkir === 'parkir_pasar' && <span className="bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded">Parkir Pasar (Rp {config.biayaParkirPasar.toLocaleString('id-ID')})</span>}
                      </div>

                      {/* NOTA TOKO YANG DIUNGGAH SOPIR */}
                      {stop.nota && (
                        <div className="bg-[#E6F4EC] border border-[#0A8A4E]/30 p-2.5 rounded-lg mt-2 space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-[#046A38] uppercase">🧾 NOTA BELANJA MASUK</span>
                            <span className="text-gray-400">{new Date(stop.nota.waktuDicatat).toLocaleTimeString('id-ID')}</span>
                          </div>
                          <div className="text-[11px] text-gray-700">
                            <p><strong>Toko:</strong> {stop.nota.namaToko}</p>
                            <p><strong>Belanjaan:</strong> {stop.nota.rincianBarang}</p>
                            <div className="flex justify-between font-bold text-[#B8941F] mt-1 text-xs border-t border-dashed border-[#0A8A4E]/30 pt-1">
                              <span>Total Toko:</span>
                              <span>Rp {stop.nota.totalToko.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                          {stop.nota.fotoNota && (
                            <img
                              src={stop.nota.fotoNota}
                              alt="Nota Asli"
                              className="w-full h-32 object-cover rounded-md border border-[#0A8A4E]/20"
                            />
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOMBOL PANIK / EMERGENCY BANNER (TERKUNCI KERAS) */}
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 space-y-2">
            <div className="flex items-center space-x-2 text-red-600 font-bold text-xs">
              <AlertTriangle size={18} className="animate-bounce" />
              <span>SITUASI DARURAT DI JALAN?</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Tekan tombol di bawah untuk menyiarkan lokasi GPS real-time Anda langsung ke Dashboard Admin Ololu dan memicu alarm darurat bantuan.
            </p>
            <button
              onClick={handleTriggerPanic}
              className="w-full py-3 bg-[#DC2626] text-white font-black rounded-xl hover:bg-red-700 transition-all text-xs tracking-wider flex items-center justify-center space-x-2"
            >
              <AlertOctagon size={16} />
              <span>🚨 AKTIFKAN TOMBOL PANIK / SOS</span>
            </button>
          </div>

          {/* RATING & ULASAN POP-UP / MODAL JIKA ORDER SELESAI */}
          {(isCompleted || isCancelled) && (
            <div className="bg-white p-5 rounded-2xl border-t-4 border-[#046A38] shadow-md space-y-4 text-center">
              <div className="bg-[#E6F4EC] p-3 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-2xl">
                {isCompleted ? '🎉' : '❌'}
              </div>
              <h2 className="text-base font-bold text-[#1A1A1A]">
                {isCompleted ? 'Pesanan Selesai! Terima Kasih' : 'Pesanan Telah Dibatalkan'}
              </h2>
              
              {isCompleted && !ratingsSubmitted && (
                <form onSubmit={handleRatingSubmit} className="space-y-4 text-left border-t pt-3">
                  <p className="text-xs text-center text-gray-500">
                    Beri ulasan dan rating untuk sopir <strong>{activeOrder.namaSopir}</strong>:
                  </p>
                  
                  {/* STAR RATING */}
                  <div className="flex justify-center space-x-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingVal(star)}
                        className="transition-all"
                      >
                        <Star
                          size={28}
                          className={`${
                            star <= ratingVal ? 'text-[#D4AF37] fill-[#D4AF37]' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Komentar / Ulasan</label>
                    <textarea
                      rows={2}
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Bagikan pengalaman perjalanan Anda..."
                      className="w-full p-2 bg-[#FAFBF9] border rounded-lg text-xs focus:outline-[#046A38]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#034F2A] hover:bg-[#046A38] text-white font-bold rounded-xl text-xs border border-[#D4AF37]"
                  >
                    Kirim Penilaian Sopir
                  </button>
                </form>
              )}

              {ratingsSubmitted && (
                <p className="text-xs text-[#059669] font-semibold">
                  Ulasan Anda berhasil dikirim ke database! Terima kasih telah berkontribusi menjaga standar layanan Ololu.
                </p>
              )}

              <button
                onClick={handleBatalAtauTutup}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
              >
                Tutup & Kembali Ke Beranda
              </button>
            </div>
          )}

          {/* BATALKAN PESANAN SEBELUM JALAN */}
          {!isCompleted && !isCancelled && (
            <button
              onClick={handleBatalAtauTutup}
              className="w-full py-2.5 bg-[#FAFBF9] hover:bg-red-50 text-[#DC2626] border border-red-200 font-bold rounded-xl text-xs transition-all"
            >
              Batalkan Pesanan Ini
            </button>
          )}

          {/* CHAT ROOM OVERLAY */}
          {isChatOpen && (
            <ChatRoom
              pesananId={activeOrder.id}
              senderId={profile?.id || 'penumpang-id'}
              senderName={profile?.nama || 'Penumpang'}
              senderRole="penumpang"
              onClose={() => setIsChatOpen(false)}
            />
          )}

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FORM BOOKING BARU PENUMPANG (CAROUSEL & DETAILED FORMS)
  // =========================================================================
  const estimasiHarga = hitungEstimasiHarga();

  const getGreeting = () => {
    const hrs = new Date().getHours();
    if (hrs < 11) return 'Selamat Pagi';
    if (hrs < 15) return 'Selamat Siang';
    if (hrs < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  if (viewMode === 'history') {
    const passengerOrders = OloluStore.getAllPesanan().filter(p => p.idPenumpang === profile?.id);
    
    // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
      <div id="passenger-history" className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-[calc(100px+env(safe-area-inset-bottom,16px))] font-sans relative overflow-x-hidden text-left">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-[#046A38] to-[#0A8A4E] text-white p-5 rounded-b-3xl border-b border-[#D4AF37] space-y-1 relative">
          <button
            onClick={() => setViewMode('home')}
            className="absolute right-3 top-5 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg transition-all uppercase tracking-wider"
          >
            ← Beranda
          </button>
          <div className="flex items-center space-x-1">
            <span className="text-[10px] text-[#D4AF37] tracking-widest font-black uppercase">OLOLU</span>
            <span className="text-[8px] text-[#FAFBF9]/80 uppercase">| Riwayat Perjalanan</span>
          </div>
          <h1 className="text-lg font-black font-sans leading-tight">
            Riwayat Pesanan Anda
          </h1>
          <p className="text-[10px] text-emerald-100 leading-snug">
            Akun: <strong>{profile?.nama || 'Sobat OLOLU'}</strong> • Semua aktivitas perjalanan Anda di Lumajang.
          </p>
        </div>

        {/* CONTAINER PESANAN */}
        <div className="p-4 space-y-3">
          {passengerOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-gray-150 space-y-4 shadow-sm mt-4">
              <span className="text-4xl block">📝</span>
              <div>
                <h3 className="font-bold text-gray-700">Belum ada riwayat order</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                  Semua aktivitas bepergian, pesan makanan, dan kiriman Anda akan terekam di sini setelah Anda melakukan pemesanan.
                </p>
              </div>
              <button
                onClick={() => {
                  selectSubLayanan('ojek');
                  setViewMode('booking');
                }}
                className="py-2.5 px-6 bg-[#046A38] text-white font-bold rounded-2xl text-xs uppercase tracking-wider"
              >
                Pesan Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">DAFTAR AKTIVITAS ({passengerOrders.length})</h3>
              {passengerOrders.slice().reverse().map((p) => {
                const driverProfile = p.idSopir ? OloluStore.getProfil(p.idSopir) : null;
                const dateStr = p.waktuDibuat ? new Date(p.waktuDibuat).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Waktu tidak valid';

                // Layanan Badge Color
                let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                let serviceIcon = "🛵";
                if (p.jenisLayanan === 'makanan') {
                  badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                  serviceIcon = "🍔";
                } else if (p.jenisLayanan === 'paket') {
                  badgeClass = "bg-blue-50 text-blue-700 border-blue-100";
                  serviceIcon = "📦";
                } else if (p.jenisLayanan === 'barang_besar') {
                  badgeClass = "bg-purple-50 text-purple-700 border-purple-100";
                  serviceIcon = "🚗";
                }

                // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
                  <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs space-y-3 hover:border-gray-300 transition-all">
                    <div className="flex justify-between items-center pb-2.5 border-b border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{serviceIcon}</span>
                        <div>
                          <span className="text-[10px] text-gray-400 font-mono block leading-none">{p.nomorPesanan}</span>
                          <span className={`inline-block border text-[8px] font-black uppercase px-2 py-0.5 rounded-md mt-1 ${badgeClass}`}>
                            {p.jenisLayanan.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block">{dateStr}</span>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                          p.status === 'selesai' ? 'bg-green-50 text-green-700 border border-green-200' :
                          p.status === 'dibatalkan' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        }`}>
                          {p.status === 'selesai' ? '✓ Selesai' :
                           p.status === 'dibatalkan' ? '✕ Dibatalkan' :
                           '⏳ Diproses'}
                        </span>
                      </div>
                    </div>

                    {/* RUTE JALUR */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start space-x-2">
                        <span className="text-emerald-500 mt-0.5">🟢</span>
                        <div>
                          <p className="text-[9px] uppercase font-bold text-gray-400 leading-none">ASAL</p>
                          <p className="text-gray-700 leading-tight mt-0.5">{p.asalAlamat}</p>
                        </div>
                      </div>
                      {p.daftarTujuan && p.daftarTujuan.map((stop, sIdx) => (
                        <div key={stop.id} className="flex items-start space-x-2">
                          <span className="text-red-500 mt-0.5">🔴</span>
                          <div>
                            <p className="text-[9px] uppercase font-bold text-gray-400 leading-none">
                              {p.daftarTujuan.length > 1 ? `STOP ${sIdx + 1}` : 'TUJUAN'}
                            </p>
                            <p className="text-gray-700 leading-tight mt-0.5">{stop.alamat}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* DETAIL HARGA DAN SOPIR */}
                    <div className="bg-[#FAFBF9] p-3 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                      <div>
                        {driverProfile ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-base">🛵</span>
                            <div>
                              <p className="text-[9px] font-bold uppercase text-gray-400 leading-none">Mitra Driver</p>
                              <p className="text-gray-800 font-bold mt-0.5">{driverProfile.nama}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[9px] font-bold uppercase text-gray-400 leading-none">Mitra Driver</p>
                            <p className="text-gray-400 italic mt-0.5">Tidak ada / Batal</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold uppercase text-gray-400 leading-none">Total Bayar</p>
                        <p className="text-sm font-black text-[#B8941F] mt-0.5">
                          Rp {p.totalBayarAkhir.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>

                    {/* METODE PEMBAYARAN */}
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-dashed text-gray-400">
                      <span>Metode Pembayaran:</span>
                      <span className="font-bold text-gray-700">{p.pembayaranTunai ? '💵 TUNAI' : '📱 DOMPET'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM STICKY NAVIGATION BAR */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-150 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,14px))] px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-[100] flex justify-between items-center text-center h-[calc(56px+env(safe-area-inset-bottom,14px))]">
          <button 
            onClick={() => setViewMode('home')} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('kirim'); setViewMode('booking'); }} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <Package size={18} />
            <span className="text-[8px] font-bold mt-0.5">Kirim</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('belanja'); setViewMode('booking'); }} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <ShoppingCart size={18} />
            <span className="text-[8px] font-bold mt-0.5">Belanja</span>
          </button>

          <button 
            onClick={() => setViewMode('history')} 
            className={`flex-1 flex flex-col items-center justify-center transition-all ${viewMode === 'history' ? 'text-[#046A38]' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <History size={18} />
            <span className="text-[8px] font-extrabold mt-0.5">Riwayat</span>
          </button>

          <button
            onClick={() => setViewMode('profile')}
            className={`flex-1 flex flex-col items-center justify-center transition-all ${viewMode === 'profile' ? 'text-[#046A38]' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <User size={18} />
            <span className="text-[8px] font-bold mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  if (viewMode === 'home') {
    // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
      <div id="home-dashboard" className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-[calc(100px+env(safe-area-inset-bottom,16px))] font-sans relative overflow-x-hidden text-center pt-2">
        
        {/* SALAM & CTA MULAI ORDER */}
        <div className="p-5 pb-1 text-left">
          <div className="bg-white p-5 rounded-3xl border border-gray-150 shadow-[0_4px_20px_rgba(4,106,56,0.04)] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {getGreeting()} 👋
                </span>
                <h3 className="text-base font-black text-gray-800 tracking-tight mt-2.5">
                  Halo, {profile?.nama || 'Sobat OLOLU'}!
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed mt-1">
                  Butuh bepergian aman, kirim barang kilat, atau jasa belanja murah di Lumajang? Mitra kami siap melayani Anda sekarang.
                </p>
              </div>
              <span className="text-2xl mt-1">🛵</span>
            </div>

            <div className="pt-1 border-t border-gray-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  selectSubLayanan('ojek');
                  setViewMode('booking');
                }}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-md shadow-emerald-600/10 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 text-xs uppercase tracking-wider border-b-4 border-emerald-800"
              >
                <span>Mulai Order Sekarang</span>
                <span className="text-[10px] opacity-85 font-normal">→</span>
              </button>

              {/* TOMBOL DASHBOARD ADMIN - KHUSUS SUPERUSER */}
              {isSuperUser && (
                <button
                  onClick={() => onRoleChange('admin')}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-[#046A38] font-black rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 text-xs uppercase tracking-wider border-b-4 border-amber-700"
                >
                  <ShieldCheck size={16} />
                  <span>Buka Dashboard Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LOKASI DRIVER REALTIME & PETA JALANAN */}
        <div className="p-5 pt-4">
          <LiveDriversMap />
        </div>

        {/* BOTTOM STICKY NAVIGATION BAR */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-150 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,14px))] px-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-[100] flex justify-between items-center text-center h-[calc(56px+env(safe-area-inset-bottom,14px))]">
          
          <button 
            onClick={() => setViewMode('home')} 
            className="flex-1 flex flex-col items-center justify-center text-[#046A38] transition-all"
          >
            <Home size={18} />
            <span className="text-[8px] font-extrabold mt-0.5">Beranda</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('kirim'); setViewMode('booking'); }} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <Package size={18} />
            <span className="text-[8px] font-bold mt-0.5">Kirim</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('belanja'); setViewMode('booking'); }} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <ShoppingCart size={18} />
            <span className="text-[8px] font-bold mt-0.5">Belanja</span>
          </button>

          <button 
            onClick={() => setViewMode('history')} 
            className={`flex-1 flex flex-col items-center justify-center transition-all ${viewMode === 'history' ? 'text-[#046A38]' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>

          <button
            onClick={() => setViewMode('profile')}
            className={`flex-1 flex flex-col items-center justify-center transition-all ${viewMode === 'profile' ? 'text-[#046A38]' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <User size={18} />
            <span className="text-[8px] font-bold mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: PROFILE ---
  if (viewMode === 'profile') {
    // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg">
          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            {profile.fotoProfil ? (
              <img src={profile.fotoProfil} className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white" />
            )}
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  // --- VIEW: PROFILE ---
  if (viewMode === 'profile' && profile) {
    return (
      <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
        <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center shadow-lg relative">
           <button
            onClick={() => setViewMode('home')}
            className="absolute left-6 top-6 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-3 py-1 rounded-full transition-all uppercase tracking-wider border border-white/20"
          >
            ← Beranda
          </button>

          <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">
            <User size={48} className="text-white" />
          </div>
          <h2 className="text-xl font-black">{profile.nama}</h2>
          <p className="text-emerald-100 text-xs font-bold mt-1">{profile.nomorHp}</p>
          <div className="mt-3 inline-block px-3 py-1 bg-[#D4AF37] text-[#046A38] rounded-full text-[10px] font-black uppercase">
            {profile.peran === 'admin' ? 'Superuser' : 'Penumpang Setia'}
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <User size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Edit Profil</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button className="w-full flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-[#046A38] group-hover:text-white transition-all">
                  <ShieldCheck size={20} />
                </div>
                <span className="text-sm font-bold text-gray-700">Keamanan Akun</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>

          <button
            onClick={onLogout}
            className="w-full py-4 bg-red-50 text-red-600 font-black rounded-[24px] text-xs tracking-widest uppercase border-2 border-red-100 hover:bg-red-600 hover:text-white transition-all"
          >
            Keluar Akun (Logout)
          </button>
        </div>

        {/* BOTTOM TAB BAR */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <Bike size={18} />
            <span className="text-[8px] font-bold mt-0.5">Ojek</span>
          </button>
          <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all">
            <History size={18} />
            <span className="text-[8px] font-bold mt-0.5">Riwayat</span>
          </button>
          <button className="flex-1 flex flex-col items-center justify-center text-[#046A38] font-bold">
            <User size={18} />
            <span className="text-[8px] mt-0.5">Profil</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="booking-container" className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-[calc(100px+env(safe-area-inset-bottom,16px))]">
      
      {/* HEADER BANNER PENUMPANG */}
      <div className="bg-gradient-to-br from-[#046A38] to-[#0A8A4E] text-white p-3.5 rounded-b-2xl shadow-sm border-b border-[#D4AF37] space-y-1 relative">
        <button
          onClick={() => setViewMode('home')}
          className="absolute right-3 top-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-[9px] px-2 py-0.5 rounded-md transition-all uppercase tracking-wider"
        >
          ← Beranda
        </button>
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-[#D4AF37] tracking-widest font-black uppercase">OLOLU</span>
          <span className="text-[8px] text-[#FAFBF9]/80 uppercase">| Ololu-Ride & Send</span>
        </div>
        <h1 className="text-base font-black font-sans leading-tight">
          Formulir Pemesanan <span className="text-[#D4AF37]">{subLayanan.toUpperCase()}</span>
        </h1>
        <p className="text-[10px] text-emerald-100 leading-snug">
          Akun: <strong>{profile.nama}</strong> ({profile.nomorHp}) • Layanan lokal andalan Lumajang.
        </p>
      </div>

      <div className="p-3 space-y-3">
        
        {/* CAROUSEL MENU LAYANAN (6 SUB-LAYANAN TERPADU) */}
        <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl border border-gray-150 shadow-2xs">
          
          {/* OJEK */}
          <button
            onClick={() => selectSubLayanan('ojek')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
              subLayanan === 'ojek'
                ? 'bg-[#E6F4EC] border-[#046A38] text-[#034F2A] font-extrabold'
                : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Bike size={14} className={subLayanan === 'ojek' ? 'text-[#046A38]' : 'text-gray-400'} />
            <span className="text-[8px] text-center tracking-tighter mt-1 leading-none">Ojek</span>
          </button>

          {/* KIRIM */}
          <button
            onClick={() => selectSubLayanan('kirim')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
              subLayanan === 'kirim'
                ? 'bg-[#EBF5FF] border-[#007AFF] text-[#0051B3] font-extrabold'
                : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Package size={14} className={subLayanan === 'kirim' ? 'text-[#007AFF]' : 'text-gray-400'} />
            <span className="text-[8px] text-center tracking-tighter mt-1 leading-none">Kirim</span>
          </button>

          {/* BELANJA */}
          <button
            onClick={() => selectSubLayanan('belanja')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
              subLayanan === 'belanja'
                ? 'bg-[#EEFBF3] border-[#10B981] text-[#047857] font-extrabold'
                : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ShoppingCart size={14} className={subLayanan === 'belanja' ? 'text-[#10B981]' : 'text-gray-400'} />
            <span className="text-[8px] text-center tracking-tighter mt-1 leading-none">Belanja</span>
          </button>

          {/* MAKANAN */}
          <button
            onClick={() => selectSubLayanan('makanan')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
              subLayanan === 'makanan'
                ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#B45309] font-extrabold'
                : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ShoppingBag size={14} className={subLayanan === 'makanan' ? 'text-[#F59E0B]' : 'text-gray-400'} />
            <span className="text-[8px] text-center tracking-tighter mt-1 leading-none">Makanan</span>
          </button>

          {/* WISATA */}
          <button
            onClick={() => selectSubLayanan('wisata')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
              subLayanan === 'wisata'
                ? 'bg-[#F3E8FF] border-[#8B5CF6] text-[#6D28D9] font-extrabold'
                : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Compass size={14} className={subLayanan === 'wisata' ? 'text-[#8B5CF6]' : 'text-gray-400'} />
            <span className="text-[8px] text-center tracking-tighter mt-1 leading-none">Wisata</span>
          </button>

          {/* MARKET */}
          <button
            onClick={() => selectSubLayanan('market')}
            className={`flex flex-col items-center justify-center p-1.5 rounded-lg transition-all border ${
              subLayanan === 'market'
                ? 'bg-[#FFF1F2] border-[#F43F5E] text-[#BE123C] font-extrabold'
                : 'bg-white border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Store size={14} className={subLayanan === 'market' ? 'text-[#F43F5E]' : 'text-gray-400'} />
            <span className="text-[8px] text-center tracking-tighter mt-1 leading-none">Market</span>
          </button>

        </div>

        {/* NOTIFIKASI LAYANAN JIKA OFF OLEH ADMIN */}
        {((selectedLayanan === 'ojek' && !config.layananOjekAktif) ||
          (selectedLayanan === 'makanan' && !config.layananMakananAktif) ||
          (selectedLayanan === 'paket' && !config.layananPaketAktif) ||
          (selectedLayanan === 'barang_besar' && !config.layananBarangBesarAktif)) && (
          <div className="bg-red-50 p-2.5 rounded-xl border border-red-150 flex items-start space-x-1.5">
            <AlertTriangle className="text-[#DC2626] shrink-0" size={14} />
            <div>
              <h4 className="text-[10px] font-bold text-[#DC2626]">Layanan Sedang Dinonaktifkan</h4>
              <p className="text-[9px] text-gray-500 leading-snug">
                Mohon maaf, layanan {selectedLayanan.toUpperCase()} sedang offline oleh Admin sementara.
              </p>
            </div>
          </div>
        )}

        {/* INPUT FORMS (SANGAT KOMPAK) */}
        <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-2xs space-y-3">
          
          {/* SERVICE SUMMARY DESCRIPTION */}
          <div className="bg-[#FAFBF9] p-2 rounded-lg border border-gray-100 text-[10px] text-gray-500 leading-relaxed text-left">
            {subLayanan === 'ojek' && (
              <p>🛵 <strong>Ojek Orang:</strong> Antar jemput penumpang area Lumajang. Tarif dihitung presisi berdasarkan jarak tempuh aman rute terpilih.</p>
            )}
            {subLayanan === 'kirim' && (
              <p>📦 <strong>Kirim Paket:</strong> Jasa kurir instan kilat dokumen, makanan rumah, kue, atau barang dagangan. Tambahkan info penerima di bawah.</p>
            )}
            {subLayanan === 'belanja' && (
              <p>🛒 <strong>Titip Belanja:</strong> Titip beli barang harian di Pasar Baru, toko kelontong, atau swalayan. Sopir bayarkan dahulu belanjaan Anda.</p>
            )}
            {subLayanan === 'makanan' && (
              <p>🍔 <strong>Pesan Makanan:</strong> Pesan antar masakan, cemilan, depot, warung, atau cafe favorit Anda. Tambahkan menu pesanan di bawah.</p>
            )}
            {subLayanan === 'wisata' && (
              <p>🗺️ <strong>Sewa Kendaraan Wisata:</strong> Sewa motor/kendaraan untuk keliling wisata Lumajang (Ranu Klakah, B29, dll) lengkap dengan bahan bakar & sopir lokal.</p>
            )}
            {subLayanan === 'market' && (
              <p>🏪 <strong>Market UMKM:</strong> Pengiriman pesanan barang lokal. Bisa Cash on Delivery (COD) di mana sopir akan talangi harga barang ke penjual dahulu.</p>
            )}
          </div>

          {/* ASAL PENJEMPUTAN / LOKASI AWAL */}
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">
              <MapPin size={12} className="text-[#046A38]" />
              <span>
                {subLayanan === 'ojek' && 'Titik Penjemputan Penumpang'}
                {subLayanan === 'kirim' && 'Lokasi Pengambilan Paket (Asal)'}
                {subLayanan === 'belanja' && 'Alamat Pengantaran Belanjaan (Tujuan Akhir)'}
                {subLayanan === 'makanan' && 'Alamat Pengantaran Makanan (Tujuan Akhir)'}
                {subLayanan === 'wisata' && 'Titik Penjemputan / Mulai Sewa'}
                {subLayanan === 'market' && 'Lokasi Toko Penjual (Seller)'}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={asalAlamat}
                readOnly
                onClick={() => handleOpenMapPicker('asal')}
                placeholder="Pilih lokasi di peta..."
                className="w-full p-2 pr-8 bg-[#FAFBF9] border border-gray-200 rounded-lg text-xs cursor-pointer hover:bg-[#E6F4EC]/30 transition-colors focus:outline-none text-left font-semibold text-gray-800 leading-tight"
              />
              <button
                type="button"
                onClick={() => handleOpenMapPicker('asal')}
                className="absolute right-2.5 top-2.5 text-[#046A38] hover:text-[#034F2A]"
                title="Buka Peta"
              >
                <MapPin size={14} />
              </button>
            </div>
          </div>

          {/* DYNAMIC STOPS LIST (Maksimal 5) */}
          <div className="space-y-2 pt-2 border-t border-dashed border-gray-150">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left">
              <div className="flex items-center space-x-1">
                <Navigation size={12} className="text-[#D4AF37]" />
                <span>
                  {subLayanan === 'ojek' && 'Tujuan Pengantaran Penumpang'}
                  {subLayanan === 'kirim' && 'Alamat Penerima Paket (Tujuan)'}
                  {subLayanan === 'belanja' && 'Lokasi Toko / Pasar Tempat Belanja'}
                  {subLayanan === 'makanan' && 'Nama Warung / Depot / Restoran'}
                  {subLayanan === 'wisata' && 'Tujuan Perjalanan Wisata'}
                  {subLayanan === 'market' && 'Alamat Pengantaran Pembeli (Buyer)'}
                </span>
              </div>
              <span className="text-[9px] text-gray-400 lowercase font-normal">maks 5 stop</span>
            </div>

            <div className="space-y-2">
              {stops.map((stop, sIdx) => (
                <div key={stop.id} className="p-2 bg-[#FAFBF9] rounded-lg border border-gray-200 space-y-2 relative text-left">
                  
                  {/* Judul & Tombol Hapus Stop */}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-[#046A38] uppercase">
                      Lokasi Tujuan {sIdx + 1}
                    </span>
                    {stops.length > 1 && (
                      <button
                        onClick={() => handleRemoveStop(stop.id)}
                        className="text-red-500 hover:text-red-700 transition-all p-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Alamat Stop */}
                  <div className="relative">
                    <input
                      type="text"
                      value={stop.alamat}
                      readOnly
                      onClick={() => handleOpenMapPicker(stop.id)}
                      placeholder="Tentukan lokasi..."
                      className="w-full p-2 pr-8 bg-white border border-gray-200 rounded-md text-xs cursor-pointer hover:bg-yellow-50/30 transition-colors focus:outline-none text-left text-gray-700 leading-tight"
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenMapPicker(stop.id)}
                      className="absolute right-2 top-2 text-[#D4AF37] hover:text-[#B8941F]"
                      title="Buka Peta"
                    >
                      <MapPin size={12} />
                    </button>
                  </div>

                  {/* KHUSUS MAKANAN & BELANJA: INPUT ITEM UNTUK TIAP STOP */}
                  {(subLayanan === 'makanan' || subLayanan === 'belanja') && (
                    <div className="space-y-1.5 pt-1.5 border-t border-dashed border-gray-150">
                      <div className="flex justify-between items-center text-[9px] text-gray-500 font-bold">
                        <span>📋 DAFTAR BARANG/MAKANAN YANG DIBELI</span>
                        {stop.items.length < 5 && (
                          <button
                            onClick={() => handleAddItemToStop(stop.id)}
                            className="text-[#046A38] flex items-center space-x-0.5 hover:underline"
                          >
                            <Plus size={10} />
                            <span>Tambah Item</span>
                          </button>
                        )}
                      </div>

                      {stop.items.length === 0 ? (
                        <p className="text-[9px] text-gray-400 italic text-center py-1 bg-white rounded border border-gray-100">
                          Belum ada item belanjaan. Klik "Tambah Item".
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {stop.items.map((it) => (
                            <div key={it.id} className="grid grid-cols-12 gap-1 items-center">
                              {/* Nama Barang */}
                              <input
                                type="text"
                                value={it.namaBarang}
                                onChange={(e) => handleUpdateItem(stop.id, it.id, 'namaBarang', e.target.value)}
                                placeholder="Cth: Nasi Goreng / Gula 1kg"
                                className="col-span-6 p-1 bg-white border border-gray-200 rounded text-[10px] focus:outline-[#046A38]"
                              />
                              {/* Jumlah */}
                              <input
                                type="number"
                                min={1}
                                value={it.jumlah}
                                onChange={(e) => handleUpdateItem(stop.id, it.id, 'jumlah', parseInt(e.target.value) || 1)}
                                className="col-span-2 p-1 bg-white border border-gray-200 rounded text-center text-[10px]"
                                title="Qty"
                              />
                              {/* Estimasi Harga */}
                              <input
                                type="number"
                                step={1000}
                                value={it.perkiraanHarga}
                                onChange={(e) => handleUpdateItem(stop.id, it.id, 'perkiraanHarga', parseInt(e.target.value) || 0)}
                                className="col-span-3 p-1 bg-white border border-gray-200 rounded text-right text-[10px] text-[#B8941F]"
                                title="Estimasi Harga Satuan"
                              />
                              {/* Hapus Item */}
                              <button
                                onClick={() => handleRemoveItemFromStop(stop.id, it.id)}
                                className="col-span-1 text-red-500 hover:text-red-700 text-center flex items-center justify-center"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))}

              {/* Tambah Stop Button */}
              {stops.length < 5 && (
                <button
                  onClick={handleAddStop}
                  className="w-full py-1.5 bg-white border border-dashed border-gray-300 rounded-lg text-[10px] text-[#046A38] font-bold hover:bg-[#E6F4EC] transition-all flex items-center justify-center space-x-1"
                >
                  <Plus size={12} />
                  <span>Tambah Alamat Tujuan (+ Biaya Stop)</span>
                </button>
              )}
            </div>
          </div>

          {/* CUSTOM FIELD RENDERING BASED ON SUBLAYANAN */}
          {subLayanan === 'kirim' && (
            <div className="bg-[#FAFBF9] p-2.5 rounded-lg border border-gray-200 space-y-2 text-left">
              <span className="text-[10px] font-black text-[#007AFF] uppercase block">📦 INFO PENERIMA & ISI PAKET</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">Nama Penerima</label>
                  <input
                    type="text"
                    value={penerimaNama}
                    onChange={(e) => setPenerimaNama(e.target.value)}
                    placeholder="Nama Penerima"
                    className="w-full p-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">Nomor HP / WA</label>
                  <input
                    type="tel"
                    value={penerimaHp}
                    onChange={(e) => setPenerimaHp(e.target.value)}
                    placeholder="Cth: 0812345..."
                    className="w-full p-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">Isi Paket / Catatan Tambahan</label>
                <input
                  type="text"
                  value={deskripsiPaket}
                  onChange={(e) => setDeskripsiPaket(e.target.value)}
                  placeholder="Cth: Dokumen Penting, Kue Ultah"
                  className="w-full p-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800"
                />
              </div>
            </div>
          )}

          {subLayanan === 'wisata' && (
            <div className="bg-[#FAFBF9] p-2.5 rounded-lg border border-gray-200 space-y-2 text-left">
              <span className="text-[10px] font-black text-[#8B5CF6] uppercase block">🗺️ PAKET DURASI SEWA WISATA</span>
              <div>
                <label className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">Pilih Durasi Sewa Harian</label>
                <select
                  value={durasiWisata}
                  onChange={(e) => setDurasiWisata(e.target.value)}
                  className="w-full p-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 font-semibold focus:outline-[#8B5CF6]"
                >
                  <option value="6_jam">Paket Wisata Lokal 6 Jam (Rp 150.000 + Jarak)</option>
                  <option value="12_jam">Paket Wisata Lokal 12 Jam (Rp 250.000 + Jarak)</option>
                </select>
                <p className="text-[8px] text-gray-400 leading-relaxed mt-1">
                  *Sopir akan memandu perjalanan Anda ke tempat-tempat indah di Lumajang dengan rute ternyaman.
                </p>
              </div>
            </div>
          )}

          {subLayanan === 'market' && (
            <div className="bg-[#FAFBF9] p-2.5 rounded-lg border border-gray-200 space-y-2 text-left">
              <span className="text-[10px] font-black text-[#F43F5E] uppercase block">🏪 DETAIL JUAL-BELI / COD MARKET</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">Nama Barang UMKM</label>
                  <input
                    type="text"
                    value={marketNamaBarang}
                    onChange={(e) => setMarketNamaBarang(e.target.value)}
                    placeholder="Cth: Kripik Pisang 3bks"
                    className="w-full p-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[8px] text-gray-400 font-bold uppercase mb-0.5">Harga Barang Talangan COD (Rp)</label>
                  <input
                    type="number"
                    value={marketHargaCod || ''}
                    onChange={(e) => setMarketHargaCod(parseInt(e.target.value) || 0)}
                    placeholder="Cth: 45000"
                    className="w-full p-1.5 border border-gray-200 rounded-md text-xs bg-white text-gray-800 font-mono font-bold text-red-600"
                  />
                </div>
              </div>
              <p className="text-[8px] text-red-500/80 leading-snug">
                *Sopir akan membayar tunai ke Seller di lokasi pickup, lalu menagih total harga barang + tarif kirim ke Buyer di lokasi tujuan.
              </p>
            </div>
          )}

          {/* METODE PEMBAYARAN (KOMPAK) */}
          <div className="space-y-1 pt-1.5 border-t border-dashed border-gray-150 text-left">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Metode Pembayaran</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setPembayaranTunai(true)}
                className={`py-1.5 px-2.5 rounded-lg text-[10px] font-black border transition-all ${
                  pembayaranTunai
                    ? 'bg-[#034F2A] border-[#D4AF37] text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-[#FAFBF9]'
                }`}
              >
                💵 TUNAI KE SOPIR
              </button>
              <button
                onClick={() => setPembayaranTunai(false)}
                className={`py-1.5 px-2.5 rounded-lg text-[10px] font-black border transition-all ${
                  !pembayaranTunai
                    ? 'bg-[#034F2A] border-[#D4AF37] text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-[#FAFBF9]'
                }`}
              >
                📱 DOMPET OLOLU
              </button>
            </div>
          </div>

        </div>

        {/* TAMPILAN ESTIMASI TARIF & TOTAL (KOMPAK) */}
        <div className="bg-white p-3 rounded-xl border border-gray-150 shadow-2xs space-y-1.5 text-left">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500">Estimasi Jarak Tempuh:</span>
            <span className="font-bold text-gray-800">{hitungTotalJarak()} KM</span>
          </div>

          <div className="flex justify-between items-center text-[10px]">
            <span className="text-gray-500">Metode Pembayaran:</span>
            <span className="font-bold text-[#046A38]">{pembayaranTunai ? '💵 Tunai' : '📱 Dompet Ololu'}</span>
          </div>

          {subLayanan === 'wisata' && (
            <div className="flex justify-between items-center text-[10px] text-purple-700 font-bold">
              <span>Sewa Wisata ({durasiWisata === '6_jam' ? '6 Jam' : '12 Jam'}):</span>
              <span>Rp {durasiWisata === '6_jam' ? '150.000' : '250.000'}</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-dashed border-gray-150 pt-1.5">
            <span className="text-[11px] font-bold text-gray-800">Total Tarif Perjalanan:</span>
            <span className="text-base font-black text-[#B8941F]">
              Rp {(estimasiHarga + (subLayanan === 'wisata' ? (durasiWisata === '6_jam' ? 150000 : 250000) : 0)).toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-[8px] text-gray-400 italic leading-snug">
            *Belum termasuk tarif parkir (real-time perjalanan) dan total nota belanja / harga barang COD jika ada.
          </p>
        </div>

        {/* BUTTON PESAN (KOMPAK) */}
        <button
          onClick={handlePesan}
          disabled={
            (selectedLayanan === 'ojek' && !config.layananOjekAktif) ||
            (selectedLayanan === 'makanan' && !config.layananMakananAktif) ||
            (selectedLayanan === 'paket' && !config.layananPaketAktif) ||
            (selectedLayanan === 'barang_besar' && !config.layananBarangBesarAktif)
          }
          className={`w-full py-2.5 text-xs font-black text-white rounded-xl shadow-md border border-[#D4AF37] transition-all flex items-center justify-center space-x-1.5 tracking-wider uppercase ${
            ((selectedLayanan === 'ojek' && !config.layananOjekAktif) ||
            (selectedLayanan === 'makanan' && !config.layananMakananAktif) ||
            (selectedLayanan === 'paket' && !config.layananPaketAktif) ||
            (selectedLayanan === 'barang_besar' && !config.layananBarangBesarAktif))
              ? 'bg-gray-300 border-gray-200 cursor-not-allowed text-gray-400'
              : 'bg-[#034F2A] hover:bg-[#046A38]'
          }`}
        >
          <Navigation size={14} />
          <span>KONFIRMASI PESANAN SEKARANG</span>
        </button>

        {/* BOTTOM STICKY NAVIGATION BAR (MOBILE SAFE WITH COMPACT AREA) */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-white border-t border-gray-150 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,14px))] px-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-[40] flex justify-between items-center text-center h-[calc(56px+env(safe-area-inset-bottom,14px))]">
          
          <button 
            onClick={() => setViewMode('home')} 
            className="flex-1 flex flex-col items-center justify-center text-gray-400 hover:text-[#046A38] transition-all"
          >
            <Home size={18} />
            <span className="text-[8px] font-bold mt-0.5">Beranda</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} 
            className={`flex-1 flex flex-col items-center justify-center transition-all ${subLayanan === 'ojek' ? 'text-[#046A38] font-black' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <Bike size={18} />
            <span className="text-[8px] mt-0.5">Ojek</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('kirim'); setViewMode('booking'); }} 
            className={`flex-1 flex flex-col items-center justify-center transition-all ${subLayanan === 'kirim' ? 'text-[#046A38] font-black' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <Package size={18} />
            <span className="text-[8px] mt-0.5">Kirim</span>
          </button>

          <button 
            onClick={() => { selectSubLayanan('belanja'); setViewMode('booking'); }} 
            className={`flex-1 flex flex-col items-center justify-center transition-all ${subLayanan === 'belanja' ? 'text-[#046A38] font-black' : 'text-gray-400 hover:text-[#046A38]'}`}
          >
            <ShoppingCart size={18} />
            <span className="text-[8px] mt-0.5">Belanja</span>
          </button>

          <a 
            href="https://wa.me/6288212818616?text=Halo%20Admin%20Ololu%2C%20saya%20tertarik%20menggunakan%20layanan%20ojek%20Lokal%20Lumajang."
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex flex-col items-center justify-center text-[#10B981] hover:scale-105 transition-all"
          >
            <MessageCircle size={18} />
            <span className="text-[8px] font-bold mt-0.5 font-mono">WA</span>
          </a>

        </div>

      </div>

      {/* OVERLAY INTERAKTIF PILIH LOKASI PETA & PENCARIAN (FULL-SCREEN MODAL SIMULATION) */}
      {mapPickerTarget !== null && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header Modal */}
          <div className="bg-[#034F2A] text-white p-4 flex items-center justify-between border-b border-[#D4AF37]">
            <div className="flex items-center space-x-2">
              <MapPin size={18} className="text-[#D4AF37]" />
              <div className="text-left">
                <h3 className="font-bold text-xs">
                  {(() => {
                    if (mapPickerTarget === 'asal') {
                      if (subLayanan === 'ojek') return 'Tentukan Titik Penjemputan Penumpang';
                      if (subLayanan === 'kirim') return 'Tentukan Lokasi Pengambilan Paket';
                      if (subLayanan === 'belanja') return 'Tentukan Alamat Pengantaran Belanjaan';
                      if (subLayanan === 'makanan') return 'Tentukan Alamat Pengantaran Makanan';
                      if (subLayanan === 'wisata') return 'Tentukan Titik Penjemputan Sewa';
                      if (subLayanan === 'market') return 'Tentukan Lokasi Toko Penjual';
                      return 'Tentukan Titik Penjemputan';
                    } else {
                      if (subLayanan === 'ojek') return 'Tentukan Tujuan Pengantaran Penumpang';
                      if (subLayanan === 'kirim') return 'Tentukan Alamat Penerima Paket';
                      if (subLayanan === 'belanja') return 'Tentukan Lokasi Toko Tempat Belanja';
                      if (subLayanan === 'makanan') return 'Tentukan Lokasi Warung / Restoran';
                      if (subLayanan === 'wisata') return 'Tentukan Tujuan Perjalanan Wisata';
                      if (subLayanan === 'market') return 'Tentukan Alamat Pengantaran Pembeli';
                      return 'Tentukan Titik Tujuan';
                    }
                  })()}
                </h3>
                <p className="text-[10px] text-[#FAFBF9]/80 font-medium">Geser pin di peta atau cari alamat</p>
              </div>
            </div>
            <button
              onClick={() => setMapPickerTarget(null)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search Box Panel */}
          <div className="p-3 bg-white border-b border-gray-100 shadow-xs text-left space-y-2">
            <MapPickerSearch 
              query={mapSearchQuery}
              setQuery={setMapSearchQuery}
              suggestions={suggestions}
              setSuggestions={setSuggestions}
              onSelectSuggestion={(s) => {
                setTempLat(s.lat);
                setTempLng(s.lng);
                setTempAlamat(s.name);
                setMapSearchQuery(s.name);
                setSuggestions([]);
              }}
              onPerformSearch={() => {}}
            />
            
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-[#E6F4EC] hover:bg-[#FAFBF9] text-[#046A38] text-xs font-bold rounded-xl transition-all border border-[#046A38]/20"
            >
              <Compass size={14} className={isLocating ? 'animate-spin' : ''} />
              <span>{isLocating ? 'Mendapatkan Koordinat GPS...' : 'Gunakan Lokasi Saya Saat Ini (GPS)'}</span>
            </button>
          </div>

          {/* Map Area */}
          <div className="flex-1 relative bg-gray-50">
            <APIProvider apiKey={GOOGLE_MAPS_KEY} version="weekly">
              <Map
                center={{ lat: tempLat, lng: tempLng }}
                zoom={14}
                mapId="OLOLU_INTERACTIVE_PICKER_MAP"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                onClick={(e) => {
                  if (e.detail.latLng) {
                    const latVal = e.detail.latLng.lat;
                    const lngVal = e.detail.latLng.lng;
                    setTempLat(latVal);
                    setTempLng(lngVal);
                    
                    // Reverse geocode
                    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
                      const geocoder = new google.maps.Geocoder();
                      geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
                        if (status === 'OK' && results && results[0]) {
                          setTempAlamat(results[0].formatted_address);
                          setMapSearchQuery(results[0].formatted_address);
                        } else {
                          const customAlm = `Titik Terpilih (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
                          setTempAlamat(customAlm);
                          setMapSearchQuery(customAlm);
                        }
                      });
                    } else {
                      const customAlm = `Titik Terpilih (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
                      setTempAlamat(customAlm);
                      setMapSearchQuery(customAlm);
                    }
                  }
                }}
              >
                <MapRecenterController lat={tempLat} lng={tempLng} />

                <AdvancedMarker 
                  position={{ lat: tempLat, lng: tempLng }}
                  draggable={true}
                  title="Seret pin ini!"
                  onDragEnd={(e) => {
                    if (e.latLng) {
                      const latVal = e.latLng.lat();
                      const lngVal = e.latLng.lng();
                      setTempLat(latVal);
                      setTempLng(lngVal);

                      // Reverse geocode
                      if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
                        const geocoder = new google.maps.Geocoder();
                        geocoder.geocode({ location: { lat: latVal, lng: lngVal } }, (results, status) => {
                          if (status === 'OK' && results && results[0]) {
                            setTempAlamat(results[0].formatted_address);
                            setMapSearchQuery(results[0].formatted_address);
                          } else {
                            const customAlm = `Titik Terpilih (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
                            setTempAlamat(customAlm);
                            setMapSearchQuery(customAlm);
                          }
                        });
                      } else {
                        const customAlm = `Titik Terpilih (${latVal.toFixed(5)}, ${lngVal.toFixed(5)})`;
                        setTempAlamat(customAlm);
                        setMapSearchQuery(customAlm);
                      }
                    }
                  }}
                >
                  <Pin 
                    background={mapPickerTarget === 'asal' ? '#046A38' : '#D4AF37'} 
                    glyphColor={mapPickerTarget === 'asal' ? '#fff' : '#1a1a1a'} 
                    scale={1.1} 
                  />
                </AdvancedMarker>
              </Map>
            </APIProvider>

            {/* Instruction tooltip overlay */}
            <div className="absolute top-2 left-2 right-2 bg-[#034F2A]/90 backdrop-blur-xs text-white text-[9px] p-2 rounded-xl text-center font-bold shadow-md">
              🎯 Geser Pin hijau/kuning atau klik lokasi mana saja pada peta untuk menentukan posisi presisi!
            </div>
          </div>

          {/* Confirm Button Footer */}
          <div className="p-4 bg-white border-t border-gray-150 space-y-3 text-left">
            <div className="bg-[#FAFBF9] p-3 rounded-xl border border-gray-150 flex items-start space-x-2">
              <MapPin size={16} className={`shrink-0 ${mapPickerTarget === 'asal' ? 'text-[#046A38]' : 'text-[#D4AF37]'}`} />
              <div>
                <span className="text-[10px] text-gray-400 block font-bold uppercase">ALAMAT TERPILIH</span>
                <p className="text-xs font-bold text-gray-800 leading-snug">
                  {tempAlamat || 'Silakan pilih lokasi di peta'}
                </p>
                <span className="text-[9px] text-gray-400 font-mono">
                  Koordinat: {tempLat.toFixed(5)}, {tempLng.toFixed(5)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMapPickerTarget(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmMapPicker}
                className="w-full py-3 bg-[#034F2A] hover:bg-[#046A38] text-white text-xs font-black rounded-xl border border-[#D4AF37] shadow-sm transition-all uppercase tracking-wider"
              >
                PILIH LOKASI INI
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
