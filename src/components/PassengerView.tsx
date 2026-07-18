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

const LUMAJANG_HOTSPOTS = [
  { name: "Alun-Alun Lumajang", description: "Jl. Alun-Alun Barat, Lumajang", lat: -8.1331, lng: 113.2240 },
  { name: "Mie Gacoan Lumajang", description: "Jl. Kyai Muksin, Lumajang", lat: -8.1312, lng: 113.2215 },
  { name: "Pasar Baru Lumajang", description: "Jl. Kyai Muksin, Lumajang", lat: -8.1385, lng: 113.2208 },
  { name: "Stasiun Klakah Lumajang", description: "Klakah, Lumajang", lat: -8.0125, lng: 113.2512 },
  { name: "Terminal Minak Koncar Lumajang", description: "Wonorejo, Kedungjajang, Lumajang", lat: -8.1065, lng: 113.2389 },
  { name: "Kawasan Wonorejo Terpadu", description: "Wonorejo, Lumajang", lat: -8.1141, lng: 113.2452 }
];

function MapRecenterController({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) map.panTo({ lat, lng });
  }, [map, lat, lng]);
  return null;
}

function MapPickerSearch({
  query, setQuery, onSelectSuggestion, suggestions, setSuggestions
}: {
  query: string; setQuery: (q: string) => void; onSelectSuggestion: (s: any) => void; suggestions: any[]; setSuggestions: (s: any[]) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setIsSearching(true);
    if (placesLib) {
      placesLib.Place.searchByText({ textQuery: query + " Lumajang", fields: ['displayName', 'location', 'formattedAddress'], maxResultCount: 5 })
        .then(({ places }) => {
          setIsSearching(false);
          if (places && places.length > 0) {
            setSuggestions(places.map(p => ({ name: p.displayName || '', description: p.formattedAddress || '', lat: p.location?.lat() || 0, lng: p.location?.lng() || 0 })));
          } else setSuggestions(LUMAJANG_HOTSPOTS);
        }).catch(() => { setIsSearching(false); setSuggestions(LUMAJANG_HOTSPOTS); });
    } else { setIsSearching(false); setSuggestions(LUMAJANG_HOTSPOTS); }
  };

  return (
    <div className="space-y-2">
      <div className="flex space-x-1.5">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Cari lokasi..." className="flex-1 p-2.5 bg-gray-50 border rounded-xl text-xs" />
        <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2.5 bg-[#046A38] text-white text-xs font-black rounded-xl">{isSearching ? '...' : <Search size={14} />}</button>
      </div>
      {suggestions.length > 0 && (
        <div className="max-h-40 overflow-y-auto border rounded-xl bg-white shadow-sm divide-y">
          {suggestions.map((s, idx) => (
            <button key={idx} onClick={() => onSelectSuggestion(s)} className="w-full text-left p-2.5 hover:bg-gray-50 flex items-start space-x-2 text-xs">
              <MapPin size={14} className="text-gray-400 mt-0.5" />
              <div><span className="font-bold block">{s.name}</span><span className="text-[10px] text-gray-500">{s.description}</span></div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LiveDriversMap() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // 1. Subscribe Driver Online
    const unsubscribe = ololuRealtime.subscribeToDriversOnline((state) => {
      const active: any[] = [];
      Object.keys(state).forEach(id => {
        const p = state[id]?.[0];
        if (p?.lat && p?.lng) active.push({ id, nama: p.nama, lat: p.lat, lng: p.lng, jenisMotor: p.jenisMotor });
      });
      setDrivers(active);
    });

    // 2. Lacak Lokasi User (Titik Hijau)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.warn("Peta radar gagal ambil lokasi:", err),
      { enableHighAccuracy: true }
    );

    return () => {
      unsubscribe();
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return (
    <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-sm space-y-3 text-left">
      <div className="flex justify-between items-center">
        <div><h3 className="text-sm font-black">Pantau Driver Terdekat</h3><p className="text-[10px] text-gray-400">Real-time GPS Mitra OLOLU</p></div>
        <div className="bg-[#E6F4EC] px-2.5 py-1 rounded-full text-[#034F2A] text-[10px] font-black">🛵 {drivers.length} Online</div>
      </div>
      <div className="h-64 rounded-2xl overflow-hidden border relative bg-gray-50">
        <APIProvider apiKey={GOOGLE_MAPS_KEY || ''}>
          <Map
            defaultCenter={KOORDINAT_LUMAJANG}
            center={userLoc || KOORDINAT_LUMAJANG}
            defaultZoom={14}
            mapId="LIVE_MAP"
            disableDefaultUI
            gestureHandling="cooperative"
          >
            {userLoc && (
              <>
                <MapRecenterController lat={userLoc.lat} lng={userLoc.lng} />
                <AdvancedMarker position={userLoc}>
                  <Pin background="#046A38" scale={0.8} borderColor="white" />
                </AdvancedMarker>
              </>
            )}

            {drivers.map(d => (
              <AdvancedMarker key={d.id} position={{ lat: d.lat || KOORDINAT_LUMAJANG.lat, lng: d.lng || KOORDINAT_LUMAJANG.lng }}>
                <div className="bg-white text-[14px] p-1 rounded-full shadow border-2 border-[#0A8A4E] w-7 h-7 flex items-center justify-center">🛵</div>
              </AdvancedMarker>
            ))}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

export default function PassengerView({ onNotifyAdminPanic, onLogout, onRoleChange, lockedOrderId }: PassengerViewProps) {
  useEffect(() => { console.log("PassengerView Mounted"); }, []);
  const [profile, setProfile] = useState<any>(null);
  const isSuperUser = profile?.nomorHp === '6285156766317';
  const [config, setConfig] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<Pesanan | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Pesanan[]>([]);
  const [viewMode, setViewMode] = useState<'home' | 'booking' | 'history' | 'profile'>('home');
  const [subLayanan, setSubLayanan] = useState<'ojek' | 'kirim' | 'belanja' | 'makanan' | 'wisata' | 'market'>('ojek');
  const [pilihanKendaraan, setPilihanKendaraan] = useState<'motor' | 'mobil'>('motor');
  const [selectedLayanan, setSelectedLayanan] = useState<'ojek' | 'makanan' | 'paket' | 'barang_besar' | 'mobil'>('ojek');
  const [asalAlamat, setAsalAlamat] = useState('Pilih lokasi penjemputan...');
  const [asalLat, setAsalLat] = useState(KOORDINAT_LUMAJANG.lat);
  const [asalLng, setAsalLng] = useState(KOORDINAT_LUMAJANG.lng);
  const [pembayaranTunai, setPembayaranTunai] = useState(true);
  const [stops, setStops] = useState<any[]>([{ id: 'stop-1', alamat: 'Tentukan tujuan...', lat: -8.1385, lng: 113.2208, items: [] }]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [ratingVal, setRatingVal] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [ratingsSubmitted, setRatingsSubmitted] = useState(false);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);

  // Item Input State
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [activeItemStopId, setActiveItemStopId] = useState<string | null>(null);
  const [itemsAwal, setItemsAwal] = useState<any[]>([]);

  const mapsLib = useMapsLibrary('routes');

  useEffect(() => {
    if (!mapsLib || !asalLat || stops.length === 0) return;

    const directionsService = new google.maps.DirectionsService();
    const waypoints = stops.slice(0, -1).map(s => ({ location: { lat: s.lat, lng: s.lng }, stopover: true }));
    const destination = stops[stops.length - 1];

    directionsService.route({
      origin: { lat: asalLat, lng: asalLng },
      destination: { lat: destination.lat, lng: destination.lng },
      waypoints: waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result?.routes[0]?.legs) {
        let total = 0;
        result.routes[0].legs.forEach(leg => {
          total += leg.distance?.value || 0;
        });
        setRouteDistance(total / 1000);
      }
    });
  }, [mapsLib, asalLat, asalLng, stops]);

  const [mapPickerTarget, setMapPickerTarget] = useState<'asal' | string | null>(null);
  const [tempLat, setTempLat] = useState(KOORDINAT_LUMAJANG.lat);
  const [tempLng, setTempLng] = useState(KOORDINAT_LUMAJANG.lng);
  const [tempAlamat, setTempAlamat] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const p = await OloluStore.getProfilLogin();
      setProfile(p);
      const cfg = await OloluStore.getPengaturan();
      setConfig(cfg);
      if (p) {
        const orders = await OloluStore.getAllPesanan();
        setHistoryOrders(orders.filter(o => o.idPenumpang === p.id));
      }
      if (lockedOrderId) {
        const order = await OloluStore.getPesananById(lockedOrderId);
        if (order) { setActiveOrder(order); ololuRealtime.requestStateSync(lockedOrderId); }
      }
    };
    init();
    const unsub = OloluStore.subscribeToStore(init);
    return () => unsub();
  }, [lockedOrderId]);

  useEffect(() => {
    if (!activeOrder) return;
    const unsub = ololuRealtime.subscribeToTrip(activeOrder.id, (data) => {
      if (data.type === 'location') setDriverLoc(data.coords);
      else if (data.type === 'accepted' || data.type === 'full-sync') {
        setActiveOrder(prev => prev ? ({ ...prev, status: data.status || 'sopir_ditemukan', idSopir: data.driver.id, namaSopir: data.driver.nama, platNomorSopir: data.driver.platNomor, tahapAktif: data.tahapAktif ?? prev.tahapAktif }) : null);
      } else if (data.type === 'status_update') setActiveOrder(prev => prev ? ({ ...prev, status: data.status }) : null);
      else if (data.type === 'parking_update') setActiveOrder(prev => prev ? ({ ...prev, daftarTujuan: prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, pilihanParkir: data.choice } : s) }) : null);
      else if (data.type === 'stop_complete') setActiveOrder(prev => prev ? ({ ...prev, daftarTujuan: prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, status: 'selesai' as any } : s), tahapAktif: data.nextTahap }) : null);
      else if (data.type === 'nota_update') setActiveOrder(prev => prev ? ({ ...prev, daftarTujuan: prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, nota: data.nota } : s) }) : null);
    });
    return () => unsub();
  }, [activeOrder?.id]);

  const selectSubLayanan = (sub: any) => {
    setSubLayanan(sub);
    if (sub === 'ojek') setSelectedLayanan(pilihanKendaraan === 'mobil' ? 'mobil' : 'ojek');
    else if (sub === 'kirim') setSelectedLayanan('paket');
    else if (sub === 'wisata') setSelectedLayanan('barang_besar');
    else setSelectedLayanan('makanan');

    // Auto-fill delivery address with current location if Food/Shopping/Market
    if (sub === 'makanan' || sub === 'belanja' || sub === 'market') {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setStops([{
          id: 'stop-1',
          alamat: `Rumah Anda (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
          lat: latitude,
          lng: longitude,
          items: []
        }]);
      });
      setAsalAlamat('Pilih Restoran / Toko...');
      setItemsAwal([]);
    } else {
       setStops([{ id: 'stop-1', alamat: 'Tentukan tujuan...', lat: -8.1385, lng: 113.2208, items: [] }]);
       setAsalAlamat('Pilih lokasi penjemputan...');
    }
  };

  const toggleKendaraan = (v: 'motor' | 'mobil') => {
    setPilihanKendaraan(v);
    if (subLayanan === 'ojek') {
      setSelectedLayanan(v === 'mobil' ? 'mobil' : 'ojek');
    }
  };

  const hitungTotalJarak = () => {
    if (routeDistance !== null) return routeDistance;
    let total = 0, prevLat = asalLat, prevLng = asalLng;
    stops.forEach(st => { total += (Math.abs(st.lat - prevLat) + Math.abs(st.lng - prevLng)) * 111 * 0.75; prevLat = st.lat; prevLng = st.lng; });
    return total;
  };

  const hitungHarga = () => {
    if (!config) return 0;
    const j = hitungTotalJarak();
    const jarakBulat = Math.max(1, Math.ceil(j));
    let h = 0, s = config.biayaPerStopTambahan, m = 0;

    if (selectedLayanan === 'ojek') {
      h = jarakBulat <= config.ojekBatasKmTarifDasar ? config.ojekTarifDasar : (jarakBulat * config.ojekTarifPerKm);
      s = config.ojekBiayaPerStop;
      m = config.ojekTarifMinimum;
    }
    else if (selectedLayanan === 'mobil') {
      h = jarakBulat <= config.mobilBatasKmTarifDasar ? config.mobilTarifDasar : (jarakBulat * config.mobilTarifPerKm);
      s = config.mobilBiayaPerStop;
      m = config.mobilTarifMinimum;
    }
    else if (selectedLayanan === 'makanan') {
      h = jarakBulat <= config.makananBatasKmTarifDasar ? config.makananTarifDasar : (jarakBulat * config.makananTarifPerKm);
      s = config.makananBiayaPerStop;
      m = config.makananTarifMinimum;
    }
    else if (selectedLayanan === 'paket') {
      h = jarakBulat <= config.paketBatasKmTarifDasar ? config.paketTarifDasar : (jarakBulat * config.paketTarifPerKm);
      s = config.paketBiayaPerStop;
      m = config.paketTarifMinimum;
    }
    else {
      h = jarakBulat <= config.barangBesarBatasKmTarifDasar ? config.barangBesarTarifDasar : (jarakBulat * config.barangBesarTarifPerKm);
      s = config.barangBesarBiayaPerStop;
      m = config.barangBesarTarifMinimum;
    }

    return Math.max(h, m) + (stops.length > 1 ? (stops.length - 1) * s : 0);
  };

  const handleAddStop = () => {
    if (stops.length >= 5) return;
    const newStop = { id: `stop-${Date.now()}`, alamat: 'Tentukan tujuan...', lat: -8.1385, lng: 113.2208, items: [] };

    if (isFoodLike) {
      // Insert BEFORE the last stop (which is the Home/Delivery address)
      const newStops = [...stops];
      newStops.splice(stops.length - 1, 0, newStop);
      setStops(newStops);
    } else {
      setStops([...stops, newStop]);
    }
  };

  const handleRemoveStop = (id: string) => {
    if (stops.length > 1) {
      setStops(stops.filter(s => s.id !== id));
    }
  };

  const handleAddItem = (stopId: string | 'asal') => {
    if (!newItemName.trim()) return;
    const newItem = {
      id: `item-${Date.now()}`,
      namaBarang: newItemName.trim(),
      jumlah: parseInt(newItemQty) || 1,
      perkiraanHarga: 0
    };

    if (stopId === 'asal') {
      setItemsAwal(prev => [...prev, newItem]);
    } else {
      setStops(prev => prev.map(s => {
        if (s.id === stopId) {
          return { ...s, items: [...(s.items || []), newItem] };
        }
        return s;
      }));
    }
    setNewItemName('');
    setNewItemQty('1');
  };

  const handleRemoveItem = (stopId: string | 'asal', itemId: string) => {
    if (stopId === 'asal') {
      setItemsAwal(prev => prev.filter(it => it.id !== itemId));
    } else {
      setStops(prev => prev.map(s => {
        if (s.id === stopId) {
          return { ...s, items: (s.items || []).filter((it: any) => it.id !== itemId) };
        }
        return s;
      }));
    }
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
    setMapSearchQuery('');
    setSuggestions([]);

    // Otomatis deteksi lokasi jika alamat masih default/kosong
    if (asalAlamat === 'Pilih lokasi penjemputan...' || (target !== 'asal' && !stops.find(s => s.id === target)?.alamat) || tempAlamat === 'Tentukan tujuan...') {
       handleUseCurrentLocation();
    }
  };

  const handleConfirmMapPicker = () => {
    if (mapPickerTarget === 'asal') {
      setAsalLat(tempLat);
      setAsalLng(tempLng);
      setAsalAlamat(tempAlamat);
    } else {
      setStops(stops.map(s => s.id === mapPickerTarget ? { ...s, lat: tempLat, lng: tempLng, alamat: tempAlamat } : s));
    }
    setMapPickerTarget(null);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung deteksi lokasi.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setTempLat(latitude);
        setTempLng(longitude);
        setTempAlamat(`Lokasi Saya (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
      },
      (err) => {
        alert("Gagal mendapatkan lokasi: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  const [isBooking, setIsBooking] = useState(false);

  const handlePesan = async () => {
    if (!profile) return;
    setIsBooking(true);
    try {
      const jRaw = hitungTotalJarak();
      const jBulat = Math.max(1, Math.ceil(jRaw));
      const h = hitungHarga();
      console.log("Memulai proses pemesanan...", { selectedLayanan, h, jBulat });

      const order = await OloluStore.buatPesanan({
        jenisLayanan: selectedLayanan,
        idPenumpang: profile.id,
        asalAlamat, asalLat, asalLng,
        jarakKm: jBulat,
        itemsAwal: itemsAwal,
        totalBayarAkhir: h,
        pembayaranTunai,
        tarifPerjalananMurni: h
      }, stops.map((s, i) => ({ ...s, urutan: i + 1 })));

      if (order) {
        console.log("Pesanan berhasil dibuat!", order);
        OloluStore.setLocalOrderLock({ orderId: order.id, role: 'penumpang' });
        setActiveOrder(order as any);
      } else {
        alert("Gagal membuat pesanan. Pastikan koneksi internet stabil dan data lokasi sudah benar.");
      }
    } catch (err: any) {
      console.error("Error saat memesan:", err);
      alert("Terjadi kesalahan sistem: " + err.message);
    } finally {
      setIsBooking(false);
    }
  };

  if (!profile || !config) return <div className="flex flex-col items-center justify-center min-h-[400px]"><div className="w-10 h-10 border-4 border-t-[#046A38] rounded-full animate-spin"></div><p className="mt-4 text-xs font-bold text-gray-400">Memuat Ololu...</p></div>;

  if (activeOrder) return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 relative">
      <div className="bg-[#046A38] text-white p-4 text-center border-b-2 border-[#D4AF37] sticky top-0 z-40">
        <p className="text-[10px] uppercase font-bold text-[#F5E6A8]">{activeOrder.nomorPesanan}</p>
        <h2 className="text-lg font-bold">{activeOrder.status?.replace('_', ' ').toUpperCase()}</h2>
      </div>
      <div className="w-full h-72 border-b">
        <APIProvider apiKey={GOOGLE_MAPS_KEY}>
          <Map
            defaultCenter={{ lat: activeOrder.asalLat || KOORDINAT_LUMAJANG.lat, lng: activeOrder.asalLng || KOORDINAT_LUMAJANG.lng }}
            defaultZoom={13}
            mapId="ORDER_MAP"
          >
            <AdvancedMarker position={{ lat: activeOrder.asalLat || 0, lng: activeOrder.asalLng || 0 }}>
              <Pin background="#046A38" scale={0.8} />
            </AdvancedMarker>
            {(driverLoc || activeOrder.idSopir) && (
              <AdvancedMarker position={driverLoc || { lat: activeOrder.asalLat || KOORDINAT_LUMAJANG.lat, lng: activeOrder.asalLng || KOORDINAT_LUMAJANG.lng }}>
                <div className="text-2xl drop-shadow-md">🛵</div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      </div>
      <div className="p-4 space-y-4 text-left">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#D4AF37]">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Total Tagihan</span>
          <p className="text-2xl font-black text-[#B8941F]">Rp {activeOrder.totalBayarAkhir.toLocaleString('id-ID')}</p>
        </div>
        {activeOrder.namaSopir && (
          <div className="bg-white p-4 rounded-xl border flex items-center justify-between">
            <div className="flex items-center space-x-3"><div className="bg-[#E6F4EC] p-2 rounded-full text-[#046A38]"><Car size={20} /></div><div><h4 className="text-xs font-bold text-gray-500 uppercase">Sopir Mitra</h4><h3 className="text-sm font-bold">{activeOrder.namaSopir}</h3><p className="text-[10px] font-mono text-emerald-600">{activeOrder.platNomorSopir}</p></div></div>
            <div className="flex space-x-2"><button onClick={() => setIsChatOpen(true)} className="bg-[#E6F4EC] p-2 rounded-full text-[#046A38]"><MessageCircle size={18} /></button><a href={`tel:${activeOrder.nomorHpSopir}`} className="bg-[#E6F4EC] p-2 rounded-full text-[#046A38]"><Phone size={18} /></a></div>
          </div>
        )}
        <button onClick={() => { navigator.geolocation.getCurrentPosition(async (pos) => { await OloluStore.tambahEmergency(activeOrder.id, profile.nama, profile.nomorHp, 'penumpang', pos.coords.latitude, pos.coords.longitude); onNotifyAdminPanic(profile.nama, 'Darurat SOS'); alert("🚨 SOS Terkirim!"); }); }} className="w-full py-3 bg-red-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">🚨 PANIK / SOS</button>
        {(activeOrder.status === 'selesai' || activeOrder.status === 'dibatalkan') && (
          <div className="bg-white p-5 rounded-2xl border shadow-md text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="text-4xl">{activeOrder.status === 'selesai' ? '🎉' : '❌'}</div>
            <h2 className="font-bold">{activeOrder.status === 'selesai' ? 'Pesanan Selesai!' : 'Pesanan Dibatalkan'}</h2>
            {!ratingsSubmitted && activeOrder.status === 'selesai' && (
              <div className="space-y-3">
                <div className="flex justify-center space-x-1">{[1,2,3,4,5].map(v => <Star key={v} size={24} onClick={() => setRatingVal(v)} className={v <= ratingVal ? 'text-yellow-400 fill-current cursor-pointer' : 'text-gray-300 cursor-pointer'} />)}</div>
                <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Tulis ulasan..." className="w-full p-2 border rounded-lg text-xs" rows={2} />
                <button onClick={async () => { await OloluStore.tambahRating(activeOrder.id, activeOrder.idSopir!, profile.nama, ratingVal, reviewText); setRatingsSubmitted(true); }} className="w-full py-2 bg-[#046A38] text-white rounded-lg text-xs font-bold">Kirim Rating</button>
              </div>
            )}
            <button onClick={() => setActiveOrder(null)} className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold">Tutup</button>
          </div>
        )}
      </div>
      {isChatOpen && <ChatRoom pesananId={activeOrder.id} senderId={profile.id} senderName={profile.nama} senderRole="penumpang" onClose={() => setIsChatOpen(false)} />}
    </div>
  );

  if (viewMode === 'profile') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      <div className="bg-[#046A38] text-white p-8 rounded-b-[40px] text-center relative shadow-lg">
        <button onClick={() => setViewMode('home')} className="absolute left-6 top-6 bg-white/10 p-2 rounded-full"><Home size={16} /></button>
        <div className="w-24 h-24 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/30 overflow-hidden">{profile?.fotoProfil ? <img src={profile.fotoProfil} className="w-full h-full object-cover" /> : <User size={48} />}</div>
        <h2 className="text-xl font-black">{profile?.nama}</h2><p className="text-emerald-100 text-xs">{profile?.nomorHp}</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-white p-4 rounded-3xl border space-y-4 text-left">
          <button className="w-full flex justify-between text-sm font-bold text-gray-700"><span>Edit Profil</span> <ChevronRight size={16} /></button>
          <button className="w-full flex justify-between text-sm font-bold text-gray-700"><span>Keamanan Akun</span> <ChevronRight size={16} /></button>
        </div>
        <button onClick={onLogout} className="w-full py-4 bg-red-50 text-red-600 font-black rounded-3xl border-2 border-red-100">Keluar Akun</button>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-lg">
        <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center text-gray-400"><Home size={18} /><span className="text-[8px] font-bold">Beranda</span></button>
        <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center text-gray-400"><Bike size={18} /><span className="text-[8px] font-bold">Ojek</span></button>
        <button onClick={() => setViewMode('history')} className="flex-1 flex flex-col items-center text-gray-400"><History size={18} /><span className="text-[8px] font-bold">Riwayat</span></button>
        <button className="flex-1 flex flex-col items-center text-[#046A38]"><User size={18} /><span className="text-[8px] font-bold">Profil</span></button>
      </nav>
    </div>
  );

  if (viewMode === 'history') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      <div className="bg-[#046A38] text-white p-6 rounded-b-3xl border-b border-[#D4AF37] relative text-left">
        <button onClick={() => setViewMode('home')} className="absolute right-4 top-6 bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold">← Beranda</button>
        <h1 className="text-xl font-black">Riwayat Order</h1>
      </div>
      <div className="p-4 space-y-3 text-left">
        {historyOrders.length === 0 ? <p className="text-center text-gray-400 py-10 italic">Belum ada riwayat pesanan.</p> : historyOrders.map(p => {
          if (!p) return null;
          return (
            <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-150 space-y-2 shadow-xs">
              <div className="flex justify-between border-b pb-2"><span className="text-[10px] font-mono text-gray-400">#{p.nomorPesanan || '0000'}</span><span className="text-[10px] font-black uppercase text-[#046A38]">{p.status || 'Pending'}</span></div>
              <p className="text-xs text-gray-700 truncate">{p.asalAlamat || 'Alamat tidak tersedia'}</p>
              <div className="flex justify-between items-center"><span className="text-sm font-black text-[#B8941F]">Rp {(p.totalBayarAkhir || 0).toLocaleString('id-ID')}</span><span className="text-[9px] text-gray-400 font-bold">{p.waktuDibuat ? new Date(p.waktuDibuat).toLocaleDateString('id-ID') : '-'}</span></div>
            </div>
          );
        })}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center px-6 z-50 max-w-[420px] mx-auto shadow-lg">
        <button onClick={() => setViewMode('home')} className="flex-1 flex flex-col items-center text-gray-400"><Home size={18} /><span className="text-[8px] font-bold">Beranda</span></button>
        <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="flex-1 flex flex-col items-center text-gray-400"><Bike size={18} /><span className="text-[8px] font-bold">Ojek</span></button>
        <button className="flex-1 flex flex-col items-center text-[#046A38]"><History size={18} /><span className="text-[8px] font-bold">Riwayat</span></button>
        <button onClick={() => setViewMode('profile')} className="flex-1 flex flex-col items-center text-gray-400"><User size={18} /><span className="text-[8px] font-bold">Profil</span></button>
      </nav>
    </div>
  );

  if (viewMode === 'home') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 pt-2">
      <div className="p-5 text-left">
        <div className="bg-white p-6 rounded-[32px] border border-gray-150 shadow-sm space-y-4">
          <div className="flex justify-between items-start"><div><span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full uppercase">Halo 👋</span><h3 className="text-lg font-black mt-2">Sobat {profile?.nama}!</h3><p className="text-xs text-gray-500 leading-relaxed">Mau bepergian atau kirim barang di Lumajang hari ini?</p></div><span className="text-2xl">🛵</span></div>
          <div className="pt-2 border-t space-y-2"><button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="w-full py-3.5 bg-emerald-600 text-white font-black rounded-2xl shadow-md uppercase text-xs tracking-wider border-b-4 border-emerald-800">Mulai Order Sekarang</button>
          {isSuperUser && <button onClick={() => onRoleChange('admin')} className="w-full py-3 bg-amber-500 text-[#046A38] font-black rounded-2xl shadow-md uppercase text-xs">Dashboard Admin</button>}</div>
        </div>
      </div>
      <div className="px-5"><LiveDriversMap /></div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t flex items-center justify-around h-16 z-[100] shadow-lg">
        <button onClick={() => setViewMode('home')} className="text-[#046A38] flex flex-col items-center"><Home size={20} /><span className="text-[8px] font-black">Beranda</span></button>
        <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="text-gray-400 flex flex-col items-center"><Bike size={20} /><span className="text-[8px] font-bold">Ojek</span></button>
        <button onClick={() => setViewMode('history')} className="text-gray-400 flex flex-col items-center"><History size={20} /><span className="text-[8px] font-bold">Riwayat</span></button>
        <button onClick={() => setViewMode('profile')} className="text-gray-400 flex flex-col items-center"><User size={20} /><span className="text-[8px] font-bold">Profil</span></button>
      </nav>
    </div>
  );

  const isFoodLike = subLayanan === 'makanan' || subLayanan === 'belanja' || subLayanan === 'market';

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20">
      <div className="bg-[#046A38] text-white p-4 rounded-b-3xl border-b-2 border-[#D4AF37] relative flex flex-col items-start text-left shadow-md">
        <button onClick={() => setViewMode('home')} className="absolute right-4 top-5 bg-white/10 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest">← Batal</button>
        <div className="flex items-center space-x-1"><span className="text-[10px] text-[#D4AF37] font-black">OLOLU</span><span className="text-[8px] text-emerald-100 uppercase">| Lumajang</span></div>
        <h1 className="text-base font-black uppercase leading-tight mt-1">{subLayanan}</h1>
        <p className="text-[10px] text-emerald-100/80 uppercase tracking-tighter">Formulir Pemesanan Layanan</p>
      </div>

      <div className="p-3 space-y-3 text-left">
        {/* PILIHAN KENDARAAN (MOTOR/MOBIL) */}
        {(subLayanan === 'ojek' || subLayanan === 'kirim') && (
           <div className="flex bg-white p-1 rounded-2xl border border-gray-150 shadow-sm gap-1">
              <button
                onClick={() => toggleKendaraan('motor')}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center transition-all ${pilihanKendaraan === 'motor' ? 'bg-[#E6F4EC] text-[#046A38] border-[#046A38] border shadow-sm' : 'text-gray-400'}`}
              >
                <Bike size={20} className={pilihanKendaraan === 'motor' ? 'animate-bounce' : ''} />
                <span className="text-[9px] font-black uppercase mt-1">Ololu-Ride (Motor)</span>
              </button>
              <button
                onClick={() => toggleKendaraan('mobil')}
                className={`flex-1 py-3 rounded-xl flex flex-col items-center justify-center transition-all ${pilihanKendaraan === 'mobil' ? 'bg-[#E6F4EC] text-[#046A38] border-[#046A38] border shadow-sm' : 'text-gray-400'}`}
              >
                <Car size={20} className={pilihanKendaraan === 'mobil' ? 'animate-bounce' : ''} />
                <span className="text-[9px] font-black uppercase mt-1">Ololu-Car (Mobil)</span>
              </button>
           </div>
        )}

        <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-xl border border-gray-150 shadow-xs">
          {['ojek', 'kirim', 'belanja', 'makanan', 'wisata', 'market'].map(s => (
            <button key={s} onClick={() => selectSubLayanan(s as any)} className={`flex flex-col items-center py-2 rounded-lg transition-all ${subLayanan === s ? 'bg-[#E6F4EC] text-[#046A38] font-black' : 'text-gray-400'}`}>
              <div className="text-[10px] font-bold">{s === 'ojek' ? '🛵' : s === 'kirim' ? '📦' : s === 'belanja' ? '🛒' : s === 'makanan' ? '🍔' : s === 'wisata' ? '🗺️' : '🏪'}</div>
              <span className="text-[7px] uppercase tracking-tighter mt-1">{s}</span>
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
              {isFoodLike ? 'Pilih Restoran / Toko 1' : 'Lokasi Penjemputan'}
            </label>
            <div className="relative">
              <input readOnly onClick={() => handleOpenMapPicker('asal')} value={asalAlamat} className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs font-bold cursor-pointer" />
              <MapPin size={14} className="absolute right-3 top-2.5 text-[#046A38]" />
            </div>

            {/* Input Menu di Atas (Khusus Makanan/Belanja/Market) */}
            {isFoodLike && (
              <div className="pl-4 border-l-2 border-emerald-100 space-y-2 mt-2">
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    placeholder="Ketik Menu / Barang..."
                    value={activeItemStopId === 'asal' ? newItemName : ''}
                    onChange={(e) => { setActiveItemStopId('asal'); setNewItemName(e.target.value); }}
                    className="flex-1 p-2 bg-white border rounded-lg text-[10px]"
                  />
                  <input
                    type="number"
                    min="1"
                    value={activeItemStopId === 'asal' ? newItemQty : '1'}
                    onChange={(e) => { setActiveItemStopId('asal'); setNewItemQty(e.target.value); }}
                    className="w-12 p-2 bg-white border rounded-lg text-[10px] text-center"
                  />
                  <button
                    onClick={() => handleAddItem('asal')}
                    className="p-2 bg-[#046A38] text-white rounded-lg shadow-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {itemsAwal.length > 0 && (
                  <div className="space-y-1">
                    {itemsAwal.map((it: any) => (
                      <div key={it.id} className="bg-emerald-50/50 p-1.5 px-2.5 rounded-lg flex justify-between items-center border border-emerald-100/50">
                        <span className="text-[10px] font-bold text-emerald-800">{it.jumlah}x {it.namaBarang}</span>
                        <button onClick={() => handleRemoveItem('asal', it.id)} className="text-red-400 p-1"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="space-y-2 border-t pt-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {isFoodLike ? 'Titik Antar / Resto Lain' : 'Tujuan / Destinasi'}
              </label>
              <button onClick={handleAddStop} className="text-[#046A38] text-[9px] font-black uppercase bg-emerald-50 px-2 py-0.5 rounded-full">+ Tambah Stop</button>
            </div>

            {stops.map((s, idx) => {
              const isLastStop = idx === stops.length - 1;
              const stopLabel = isFoodLike
                ? (isLastStop ? 'Alamat Pengantaran (Rumah Anda)' : `Pilih Restoran / Toko ${idx + 2}`)
                : `Tujuan / Destinasi ${idx + 1}`;
              const showItems = isFoodLike && !isLastStop;

              return (
                <div key={s.id} className="space-y-2">
                  <label className="text-[8px] font-bold text-gray-300 uppercase block ml-1">{stopLabel}</label>
                  <div className="flex space-x-2 items-center">
                    <div className="relative flex-1"><input readOnly onClick={() => handleOpenMapPicker(s.id)} value={s.alamat} className="w-full p-2.5 bg-gray-50 border rounded-xl text-xs cursor-pointer" /><MapPin size={12} className="absolute right-3 top-2.5 text-[#D4AF37]" /></div>
                    {stops.length > 1 && <button onClick={() => handleRemoveStop(s.id)} className="p-2 text-red-500 bg-red-50 rounded-lg"><Trash2 size={14} /></button>}
                  </div>

                  {/* Kolom Input Item (Hanya untuk Restoran tambahan) */}
                  {showItems && (
                    <div className="ml-2 pl-4 border-l-2 border-gray-100 space-y-2">
                      <div className="flex space-x-1.5">
                        <input
                          type="text"
                          placeholder="Nama Menu / Barang..."
                          value={activeItemStopId === s.id ? newItemName : ''}
                          onChange={(e) => { setActiveItemStopId(s.id); setNewItemName(e.target.value); }}
                          className="flex-1 p-2 bg-white border rounded-lg text-[10px]"
                        />
                        <input
                          type="number"
                          min="1"
                          value={activeItemStopId === s.id ? newItemQty : '1'}
                          onChange={(e) => { setActiveItemStopId(s.id); setNewItemQty(e.target.value); }}
                          className="w-12 p-2 bg-white border rounded-lg text-[10px] text-center"
                        />
                        <button
                          onClick={() => handleAddItem(s.id)}
                          className="p-2 bg-[#046A38] text-white rounded-lg shadow-sm"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* List Item yang sudah ditambah */}
                      {s.items && s.items.length > 0 && (
                        <div className="space-y-1">
                          {s.items.map((it: any) => (
                            <div key={it.id} className="bg-emerald-50/50 p-1.5 px-2.5 rounded-lg flex justify-between items-center border border-emerald-100/50 animate-in fade-in slide-in-from-left-2">
                              <span className="text-[10px] font-bold text-emerald-800">{it.jumlah}x {it.namaBarang}</span>
                              <button onClick={() => handleRemoveItem(s.id, it.id)} className="text-red-400 p-1"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-dashed">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-600">Estimasi Biaya Perjalanan:</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Total Jarak: {Math.ceil(hitungTotalJarak())} KM</span>
            </div>
            <span className="text-lg font-black text-[#B8941F]">Rp {hitungHarga().toLocaleString('id-ID')}</span>
          </div>
        </div>

        <button
          onClick={handlePesan}
          disabled={isBooking || asalAlamat === 'Pilih lokasi penjemputan...' || stops.some(s => s.alamat === 'Tentukan tujuan...')}
          className={`w-full py-3.5 ${isBooking ? 'bg-gray-400' : 'bg-[#034F2A]'} text-white font-black rounded-2xl text-xs uppercase tracking-widest border-b-4 ${isBooking ? 'border-gray-500' : 'border-emerald-900'} shadow-lg active:scale-95 transition-all`}
        >
          {isBooking ? 'Memproses Pesanan...' : 'Konfirmasi Pesanan'}
        </button>
      </div>

      {mapPickerTarget && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="bg-[#034F2A] text-white p-4 flex justify-between items-center border-b border-[#D4AF37]">
            <div><h3 className="font-bold text-xs uppercase tracking-widest">Pilih Lokasi Peta</h3><p className="text-[9px] text-emerald-100">Geser pin ke lokasi yang tepat</p></div>
            <button onClick={() => setMapPickerTarget(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
          </div>
          <div className="p-3 shadow-sm bg-white"><MapPickerSearch query={mapSearchQuery} setQuery={setMapSearchQuery} suggestions={suggestions} setSuggestions={setSuggestions} onSelectSuggestion={(s) => { setTempLat(s.lat); setTempLng(s.lng); setTempAlamat(s.name); setMapSearchQuery(s.name); setSuggestions([]); }} /></div>
          <div className="flex-1 relative bg-gray-50">
            <APIProvider apiKey={GOOGLE_MAPS_KEY}>
              <Map center={{ lat: tempLat, lng: tempLng }} defaultZoom={14} mapId="PICKER_MAP" onClick={(e) => { if(e.detail.latLng) { setTempLat(e.detail.latLng.lat); setTempLng(e.detail.latLng.lng); setTempAlamat(`Titik Terpilih (${e.detail.latLng.lat.toFixed(5)}, ${e.detail.latLng.lng.toFixed(5)})`); } }}>
                <MapRecenterController lat={tempLat} lng={tempLng} />
                <AdvancedMarker position={{ lat: tempLat, lng: tempLng }} draggable onDragEnd={(e) => { if(e.latLng) { setTempLat(e.latLng.lat()); setTempLng(e.latLng.lng()); setTempAlamat(`Titik Terpilih (${e.latLng.lat().toFixed(5)}, ${e.latLng.lng().toFixed(5)})`); } }}><Pin scale={1.2} background={mapPickerTarget === 'asal' ? '#046A38' : '#D4AF37'} /></AdvancedMarker>
              </Map>
            </APIProvider>

            {/* Tombol Lokasi Saat Ini */}
            <button
              onClick={handleUseCurrentLocation}
              className="absolute bottom-6 right-6 bg-white p-3 rounded-full shadow-2xl border border-gray-100 text-[#046A38] hover:bg-gray-50 active:scale-90 transition-all z-10"
              title="Gunakan Lokasi Saat Ini"
            >
              <Navigation size={20} fill="currentColor" />
            </button>
          </div>
          <div className="p-4 bg-white border-t space-y-3">
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-start justify-between space-x-2">
              <div className="flex items-start space-x-2">
                <MapPin size={16} className="text-[#046A38] mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Alamat Terpilih</span>
                  <p className="text-xs font-bold text-gray-800 leading-snug">{tempAlamat || 'Silakan pilih lokasi...'}</p>
                </div>
              </div>
              <button
                onClick={handleUseCurrentLocation}
                className="bg-white p-2 rounded-lg border shadow-sm text-[#046A38] active:scale-95 transition-all"
                title="Deteksi Lokasi"
              >
                <Zap size={14} fill="currentColor" />
              </button>
            </div>
            <button onClick={handleConfirmMapPicker} className="w-full py-4 bg-[#034F2A] text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-md">Pilih Lokasi Ini</button>
          </div>
        </div>
      )}
    </div>
  );
}
