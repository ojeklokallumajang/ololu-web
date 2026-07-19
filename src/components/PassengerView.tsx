/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ArrowRight,
  FileText
} from 'lucide-react';
import OloluLogo from './OloluLogo';
import { ololuRealtime } from '../services/supabaseClient';
import { generateReceipt } from '../utils/receiptGenerator';
import MapDirections from './MapDirections';

interface PassengerViewProps {
  onNotifyAdminPanic: (pelapor: string, tipe: string) => void;
  onLogout: () => void;
  onRoleChange: (role: any) => void;
  lockedOrderId?: string;
}

const LUMAJANG_HOTSPOTS: any[] = [];

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
  const mapsLib = useMapsLibrary('places');
  const [isSearching, setIsSearching] = useState(false);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setSessionToken(new google.maps.places.AutocompleteSessionToken());
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = () => {
    if (!query.trim()) return;
    const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = query.match(coordRegex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      onSelectSuggestion({ name: "Lokasi dari Link", description: `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
      setQuery(''); setSuggestions([]); return;
    }
    const queryRegex = /query=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const qMatch = query.match(queryRegex);
    if (qMatch) {
       const lat = parseFloat(qMatch[1]);
       const lng = parseFloat(qMatch[2]);
       onSelectSuggestion({ name: "Lokasi dari Share Link", description: `Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
       setQuery(''); setSuggestions([]); return;
    }
    if (query.length < 3) { setSuggestions([]); return; }
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsSearching(true);
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions({
        input: query, sessionToken: sessionToken || undefined, componentRestrictions: { country: 'id' },
        locationRestriction: { north: -7.9, south: -8.3, east: 113.4, west: 113.1 }
      }, (predictions, status) => {
        setIsSearching(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.map(p => ({ id: p.place_id, name: p.structured_formatting.main_text, description: p.description, isPrediction: true })));
        } else setSuggestions([]);
      });
    }
  };

  const handleSelect = (s: any) => {
    if (s.isPrediction && window.google) {
      const div = document.createElement('div');
      const service = new google.maps.places.PlacesService(div);
      service.getDetails({ placeId: s.id, fields: ['geometry', 'formatted_address'], sessionToken: sessionToken || undefined }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          onSelectSuggestion({ name: s.name, description: place.formatted_address || s.description, lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
          setSessionToken(new google.maps.places.AutocompleteSessionToken());
        }
      });
    } else onSelectSuggestion(s);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari di Lumajang..." className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl text-sm font-bold outline-none" />
        <div className="absolute right-4 top-3 text-gray-400">{isSearching ? <div className="w-4 h-4 border-2 border-t-[#046A38] rounded-full animate-spin"></div> : <Search size={18} />}</div>
      </div>
      {suggestions.length > 0 && (
        <div className="max-h-60 overflow-y-auto border-2 border-gray-100 rounded-2xl bg-white shadow-xl divide-y">
          {suggestions.map((s, idx) => (<button key={idx} onClick={() => handleSelect(s)} className="w-full text-left p-3.5 hover:bg-emerald-50 flex items-start space-x-3 transition-colors"><div className="bg-emerald-100 p-2 rounded-xl text-[#046A38]"><MapPin size={16} /></div><div className="flex-1 min-w-0"><span className="font-black text-gray-800 block text-xs truncate">{s.name}</span><span className="text-[10px] text-gray-500 truncate block">{s.description}</span></div></button>))}
        </div>
      )}
    </div>
  );
}

function LiveDriversMap() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = ololuRealtime.subscribeToDriversOnline((state) => {
      const active: any[] = [];
      Object.keys(state).forEach(id => {
        const p = state[id]?.[0];
        if (p?.lat && p?.lng) active.push({ id, nama: p.nama, lat: p.lat, lng: p.lng });
      });
      setDrivers(active);
    });
    OloluStore.getPengaturan().then(setConfig);
    const watchId = navigator.geolocation.watchPosition((pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }), null, { enableHighAccuracy: true });
    return () => { unsubscribe(); navigator.geolocation.clearWatch(watchId); };
  }, []);

  return (
    <div className="bg-white p-4 rounded-3xl border border-gray-150 shadow-sm space-y-3">
      <div className="flex justify-between items-center"><div><h3 className="text-sm font-black">Driver Terdekat</h3></div><div className="bg-[#E6F4EC] px-2.5 py-1 rounded-full text-[#034F2A] text-[10px] font-black">🛵 {drivers.length} Online</div></div>
      <div className="h-48 rounded-2xl overflow-hidden border bg-gray-50 relative">
        <APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY}>
          <Map defaultCenter={KOORDINAT_LUMAJANG} center={userLoc || KOORDINAT_LUMAJANG} defaultZoom={14} mapId="LIVE_MAP" disableDefaultUI>
            {userLoc && <AdvancedMarker position={userLoc}><Pin background="#046A38" scale={0.8} /></AdvancedMarker>}
            {drivers.map(d => (<AdvancedMarker key={d.id} position={{ lat: d.lat, lng: d.lng }}><div className="bg-white text-[14px] p-1 rounded-full shadow border-2 border-[#0A8A4E] w-7 h-7 flex items-center justify-center">🛵</div></AdvancedMarker>))}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

export default function PassengerView({ onNotifyAdminPanic, onLogout, onRoleChange, lockedOrderId }: PassengerViewProps) {
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
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [activeItemStopId, setActiveItemStopId] = useState<string | null>(null);
  const [itemsAwal, setItemsAwal] = useState<any[]>([]);
  const [mapPickerTarget, setMapPickerTarget] = useState<'asal' | string | null>(null);
  const [tempLat, setTempLat] = useState(KOORDINAT_LUMAJANG.lat);
  const [tempLng, setTempLng] = useState(KOORDINAT_LUMAJANG.lng);
  const [tempAlamat, setTempAlamat] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const mapsLib = useMapsLibrary('routes');

  useEffect(() => {
    if (!mapsLib || !asalLat || stops.length === 0) return;
    const directionsService = new google.maps.DirectionsService();
    directionsService.route({
      origin: { lat: asalLat, lng: asalLng },
      destination: { lat: stops[stops.length-1].lat, lng: stops[stops.length-1].lng },
      waypoints: stops.slice(0,-1).map(s => ({ location: { lat: s.lat, lng: s.lng }, stopover: true })),
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result?.routes[0]?.legs) {
        let total = 0; result.routes[0].legs.forEach(leg => total += leg.distance?.value || 0);
        setRouteDistance(total / 1000);
      }
    });
  }, [mapsLib, asalLat, asalLng, stops]);

  useEffect(() => {
    const init = async () => {
      try {
        const p = await OloluStore.getProfilLogin(); if (!p) return;
        setProfile(p);
        const cfg = await OloluStore.getPengaturan(); setConfig(cfg);
        const orders = await OloluStore.getAllPesanan(); setHistoryOrders(orders.filter(o => o.idPenumpang === p.id));
        if (lockedOrderId) { const order = await OloluStore.getPesananById(lockedOrderId); if (order) { setActiveOrder(order); ololuRealtime.requestStateSync(lockedOrderId); } }
      } catch (err) { console.error(err); }
    };
    init(); const unsub = OloluStore.subscribeToStore(init); return () => unsub();
  }, [lockedOrderId]);

  useEffect(() => {
    if (!activeOrder) return;
    const unsub = ololuRealtime.subscribeToTrip(activeOrder.id, (data) => {
      if (data.type === 'location') setDriverLoc(data.coords);
      else if (data.type === 'accepted') { new Audio('https://assets.mixkit.co/active_storage/sfx/1360/1360-preview.mp3').play().catch(()=>null); setActiveOrder(prev => prev ? ({ ...prev, status: 'sopir_ditemukan', idSopir: data.driver.id, namaSopir: data.driver.nama, platNomorSopir: data.driver.platNomor }) : null); }
      else if (data.type === 'status_update') { setActiveOrder(prev => prev ? ({ ...prev, status: data.status }) : null); if (data.status === 'selesai') OloluStore.setLocalOrderLock(null); }
      else if (data.type === 'nota_update') setActiveOrder(prev => prev ? ({ ...prev, daftarTujuan: prev.daftarTujuan.map(s => s.id === data.stopId ? { ...s, nota: data.nota } : s) }) : null);
      else if (data.type === 'nota_awal_update') setActiveOrder(prev => prev ? ({ ...prev, notaAwal: data.nota }) : null);
    });
    return () => unsub();
  }, [activeOrder?.id]);

  const hitungTotalJarak = () => routeDistance || 1;

  const getTarifBreakdown = () => {
    if (!config) return { base: 0, perKm: 0, min: 0, multiStop: 0, total: 0, commission: 10 };
    const j = hitungTotalJarak(); const jarakBulat = Math.max(1, Math.ceil(j));
    let h = 0, s = config.biayaPerStopTambahan, m = 0, perKm = 0, base = 0, comm = 10;
    if (selectedLayanan === 'ojek') { base = config.ojekTarifDasar; perKm = config.ojekTarifPerKm; h = jarakBulat <= config.ojekBatasKmTarifDasar ? base : (jarakBulat * perKm); s = config.ojekBiayaPerStop; m = config.ojekTarifMinimum; comm = config.ojekPersenJasa; }
    else if (selectedLayanan === 'mobil') { base = config.mobilTarifDasar; perKm = config.mobilTarifPerKm; h = jarakBulat <= config.mobilBatasKmTarifDasar ? base : (jarakBulat * perKm); s = config.mobilBiayaPerStop; m = config.mobilTarifMinimum; comm = config.mobilPersenJasa; }
    else if (selectedLayanan === 'makanan') { base = config.makananTarifDasar; perKm = config.makananTarifPerKm; h = jarakBulat <= config.makananBatasKmTarifDasar ? base : (jarakBulat * perKm); s = config.makananBiayaPerStop; m = config.makananTarifMinimum; comm = config.makananPersenJasa; }
    else if (selectedLayanan === 'paket') { base = config.paketTarifDasar; perKm = config.paketTarifPerKm; h = jarakBulat <= config.paketBatasKmTarifDasar ? base : (jarakBulat * perKm); s = config.paketBiayaPerStop; m = config.paketTarifMinimum; comm = config.paketPersenJasa; }
    else { base = config.barangBesarTarifDasar; perKm = config.barangBesarTarifPerKm; h = jarakBulat <= config.barangBesarBatasKmTarifDasar ? base : (jarakBulat * perKm); s = config.barangBesarBiayaPerStop; m = config.barangBesarTarifMinimum; comm = config.barangBesarPersenJasa; }
    const multiStop = (stops.length > 1 ? (stops.length - 1) * s : 0); const murni = Math.max(h, m);
    return { base, perKm, min: m, multiStop, commission: comm, total: murni + multiStop };
  };

  const liveTotal = useMemo(() => {
    if (!activeOrder || !config) return 0;
    const totalParkir = activeOrder.daftarTujuan.reduce((sum, s) => sum + (s.pilihanParkir === 'parkir_biasa' ? config.biayaParkirBiasa : s.pilihanParkir === 'parkir_pasar' ? config.biayaParkirPasar : 0), 0);
    const totalNota = (activeOrder.notaAwal?.totalToko || 0) + activeOrder.daftarTujuan.reduce((sum, s) => sum + (s.nota?.totalToko || 0), 0);
    return activeOrder.totalBayarAkhir + totalParkir + totalNota;
  }, [activeOrder, config]);

  const selectSubLayanan = (sub: any) => {
    setSubLayanan(sub);
    if (sub === 'ojek') setSelectedLayanan(pilihanKendaraan === 'mobil' ? 'mobil' : 'ojek');
    else if (sub === 'kirim') setSelectedLayanan('paket');
    else if (sub === 'wisata') setSelectedLayanan('barang_besar');
    else setSelectedLayanan('makanan');
    if (sub === 'makanan' || sub === 'belanja' || sub === 'market') {
      navigator.geolocation.getCurrentPosition((pos) => setStops([{ id: 'stop-1', alamat: `Rumah (${pos.coords.latitude.toFixed(5)})`, lat: pos.coords.latitude, lng: pos.coords.longitude, items: [] }]));
      setAsalAlamat('Pilih Toko...'); setItemsAwal([]);
    } else { setStops([{ id: 'stop-1', alamat: 'Tentukan tujuan...', lat: -8.1385, lng: 113.2208, items: [] }]); setAsalAlamat('Pilih penjemputan...'); }
  };

  const handlePesan = async () => {
    if (!profile) return; const breakdown = getTarifBreakdown();
    const order = await OloluStore.buatPesanan({
      jenisLayanan: selectedLayanan, idPenumpang: profile.id, asalAlamat, asalLat, asalLng, jarakKm: Math.ceil(hitungTotalJarak()), itemsAwal,
      tarifDasar: breakdown.base, tarifPerKm: breakdown.perKm, tarifMinimum: breakdown.min, tambahanTujuan: breakdown.multiStop,
      biayaLayananPersen: breakdown.commission, totalBayarAkhir: breakdown.total, pembayaranTunai, tarifPerjalananMurni: breakdown.total - breakdown.multiStop
    }, stops.map((s, i) => ({ ...s, urutan: i + 1 })));
    if (order) { OloluStore.setLocalOrderLock({ orderId: order.id, role: 'penumpang' }); setActiveOrder(order as any); }
  };

  if (activeOrder) return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen text-left">
      <div className="bg-[#046A38] text-white p-4 text-center border-b-2 border-[#D4AF37] sticky top-0 z-40">
        <p className="text-[10px] font-bold text-[#F5E6A8]">{activeOrder.nomorPesanan}</p>
        <h2 className="text-lg font-bold uppercase">{activeOrder.status?.replace('_',' ')}</h2>
      </div>
      <div className="w-full h-72 border-b">
        <APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY}>
          <Map defaultCenter={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }} defaultZoom={13} mapId="ORDER_MAP">
            <MapDirections origin={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }} destination={{ lat: stops[stops.length-1].lat, lng: stops[stops.length-1].lng }} waypoints={activeOrder.daftarTujuan.slice(0,-1).map(s=>({ location:{lat:s.lat, lng:s.lng}, stopover:true }))} />
            <AdvancedMarker position={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }}><Pin background="#046A38" /></AdvancedMarker>
            {activeOrder.daftarTujuan.map((st, idx) => (<AdvancedMarker key={st.id} position={{ lat: st.lat, lng: st.lng }}><Pin background="#D4AF37" glyphText={(idx+1).toString()} /></AdvancedMarker>))}
            {driverLoc && <AdvancedMarker position={driverLoc}><div className="text-2xl">🛵</div></AdvancedMarker>}
          </Map>
        </APIProvider>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-[#D4AF37]"><span className="text-[10px] text-gray-400 font-bold uppercase">Tagihan Anda</span><p className="text-2xl font-black text-[#B8941F]">Rp {liveTotal.toLocaleString('id-ID')}</p></div>
        {activeOrder.namaSopir && <div className="bg-white p-4 rounded-xl border flex justify-between"><div><h4 className="text-xs font-bold text-gray-400 uppercase">Driver</h4><h3 className="text-sm font-bold">{activeOrder.namaSopir}</h3></div><div className="flex space-x-2"><button onClick={() => setIsChatOpen(true)} className="p-2 bg-emerald-50 text-[#046A38] rounded-full"><MessageCircle size={20} /></button><a href={`tel:${activeOrder.nomorHpSopir}`} className="p-2 bg-emerald-50 text-[#046A38] rounded-full"><Phone size={20} /></a></div></div>}
        <button onClick={() => OloluStore.tambahEmergency(activeOrder.id, profile.nama, profile.nomorHp, 'penumpang', 0, 0)} className="w-full py-3 bg-red-600 text-white font-black rounded-xl text-xs">🚨 SOS</button>
        {activeOrder.status === 'selesai' && <div className="bg-white p-6 rounded-2xl border shadow-xl text-center space-y-4"><h2>🎉 SELESAI!</h2><button onClick={() => setActiveOrder(null)} className="w-full py-3 bg-[#046A38] text-white rounded-xl font-bold">Tutup</button></div>}
      </div>
      {isChatOpen && <ChatRoom pesananId={activeOrder.id} senderId={profile.id} senderName={profile.nama} senderRole="penumpang" onClose={() => setIsChatOpen(false)} />}
    </div>
  );

  if (viewMode === 'home') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-20 pt-2 text-left">
      <div className="p-5">
        <div className="bg-white p-6 rounded-[32px] border shadow-sm space-y-4">
          <h3 className="text-lg font-black">Halo {profile?.nama}!</h3>
          <button onClick={() => { selectSubLayanan('ojek'); setViewMode('booking'); }} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase text-xs tracking-widest border-b-4 border-emerald-900">Pesan Sekarang</button>
          {isSuperUser && <button onClick={() => onRoleChange('admin')} className="w-full py-3 bg-amber-500 text-white font-black rounded-2xl uppercase text-xs">Admin Panel</button>}
        </div>
      </div>
      <div className="px-5"><LiveDriversMap /></div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t flex justify-around items-center h-16 z-50">
        <button onClick={() => setViewMode('home')} className="text-[#046A38]"><Home size={20} /></button>
        <button onClick={() => setViewMode('history')} className="text-gray-400"><History size={20} /></button>
        <button onClick={() => setViewMode('profile')} className="text-gray-400"><User size={20} /></button>
      </nav>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen text-left pb-20">
      <div className="bg-[#046A38] text-white p-4 rounded-b-3xl border-b-2 border-[#D4AF37] flex justify-between items-center shadow-md">
        <h1 className="text-base font-black uppercase">{subLayanan}</h1>
        <button onClick={() => setViewMode('home')} className="bg-white/10 px-3 py-1 rounded-lg text-[9px] font-bold">← BATAL</button>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-white p-4 rounded-2xl border shadow-sm space-y-4">
          <label className="text-[9px] font-black text-gray-400 uppercase">Jemput Di Mana?</label>
          <input readOnly onClick={() => setMapPickerTarget('asal')} value={asalAlamat} className="w-full p-3 bg-gray-50 border rounded-xl text-xs font-bold" />
          <div className="pt-2 border-t">
            <label className="text-[9px] font-black text-gray-400 uppercase">Tujuan Pengantaran</label>
            {stops.map((s, i) => (<div key={s.id} className="mt-2 flex space-x-2"><input readOnly onClick={() => setMapPickerTarget(s.id)} value={s.alamat} className="flex-1 p-3 bg-gray-50 border rounded-xl text-xs font-bold" /></div>))}
          </div>
          <div className="flex justify-between items-center border-t pt-3"><span className="text-xs font-bold text-gray-400">Total Biaya:</span><span className="text-lg font-black text-[#B8941F]">Rp {getTarifBreakdown().total.toLocaleString('id-ID')}</span></div>
        </div>
        <button onClick={handlePesan} className="w-full py-4 bg-[#034F2A] text-white font-black rounded-2xl text-xs uppercase tracking-widest border-b-4 border-emerald-900 shadow-xl">Konfirmasi Pesanan</button>
      </div>

      {mapPickerTarget && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col">
          <div className="bg-[#034F2A] text-white p-4 flex justify-between items-center"><h3>PILIH LOKASI</h3><button onClick={() => setMapPickerTarget(null)}><X size={24} /></button></div>
          <div className="p-3"><MapPickerSearch query={mapSearchQuery} setQuery={setMapSearchQuery} suggestions={suggestions} setSuggestions={setSuggestions} onSelectSuggestion={(s) => { setTempLat(s.lat); setTempLng(s.lng); setTempAlamat(s.name); setMapSearchQuery(s.name); setSuggestions([]); }} /></div>
          <div className="flex-1 relative bg-gray-50">
            <APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY}><Map center={{ lat: tempLat, lng: tempLng }} defaultZoom={14} mapId="PICKER_MAP"><AdvancedMarker position={{ lat: tempLat, lng: tempLng }} draggable onDragEnd={(e) => { if(e.latLng) { setTempLat(e.latLng.lat()); setTempLng(e.latLng.lng()); fetchAddress(e.latLng.lat(), e.latLng.lng()); } }}><Pin scale={1.2} /></AdvancedMarker></Map></APIProvider>
          </div>
          <div className="p-4 bg-white border-t"><button onClick={() => { if (mapPickerTarget === 'asal') { setAsalLat(tempLat); setAsalLng(tempLng); setAsalAlamat(tempAlamat); } else { setStops(stops.map(s => s.id === mapPickerTarget ? { ...s, lat: tempLat, lng: tempLng, alamat: tempAlamat } : s)); } setMapPickerTarget(null); }} className="w-full py-4 bg-[#034F2A] text-white font-black rounded-2xl uppercase text-xs">PILIH LOKASI INI</button></div>
        </div>
      )}
    </div>
  );
}
