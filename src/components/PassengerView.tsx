/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  FileText,
  LogOut,
  Map as MapIcon,
  Tag,
  LayoutGrid,
  ClipboardList,
  Edit2
} from 'lucide-react';
import { ololuRealtime } from '../services/supabaseClient';
import { generateReceipt } from '../utils/receiptGenerator';
import MapDirections from './MapDirections';

interface PassengerViewProps {
  onNotifyAdminPanic: (pelapor: string, tipe: string) => void;
  onLogout: () => void;
  onRoleChange: (role: any) => void;
  lockedOrderId?: string;
}

// --- SUB-COMPONENT: DRIVER RADAR ---
function LiveDriversMap({ config }: { config: any }) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const unsubscribe = ololuRealtime.subscribeToDriversOnline((state) => {
      const active: any[] = [];
      Object.keys(state).forEach(id => {
        const presence = state[id]?.[0];
        if (presence?.lat && presence?.lng) {
          active.push({ id, nama: presence.nama, lat: presence.lat, lng: presence.lng });
        }
      });
      setDrivers(active);
    });
    const watchId = navigator.geolocation.watchPosition((pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }), null, { enableHighAccuracy: true });
    return () => { unsubscribe(); navigator.geolocation.clearWatch(watchId); };
  }, []);

  return (
    <div className="bg-white p-4 rounded-[32px] border border-gray-150 shadow-sm space-y-3">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-black uppercase tracking-tight flex items-center space-x-2 text-gray-800"><Compass size={16} className="text-emerald-600" /><span>Driver Sekitar</span></h3>
        <div className="bg-[#E6F4EC] px-2.5 py-1 rounded-full text-[#034F2A] text-[10px] font-black uppercase tracking-widest text-emerald-900">🛵 {drivers.length} Online</div>
      </div>
      <div className="h-48 rounded-2xl overflow-hidden border bg-gray-50 relative shadow-inner">
        <APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY}>
          <Map defaultCenter={KOORDINAT_LUMAJANG} center={userLoc || KOORDINAT_LUMAJANG} defaultZoom={14} mapId="LIVE_MAP_PASSENGER" disableDefaultUI>
            {userLoc && <AdvancedMarker position={userLoc}><Pin background="#046A38" scale={0.8} /></AdvancedMarker>}
            {drivers.map(d => (<AdvancedMarker key={d.id} position={{ lat: d.lat, lng: d.lng }}><div className="bg-white p-1 rounded-full shadow-lg border-2 border-[#0A8A4E] w-8 h-8 flex items-center justify-center text-lg">🛵</div></AdvancedMarker>))}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: LOCATION PICKER ---
function MapPickerSearch({ query, setQuery, onSelectSuggestion, suggestions, setSuggestions, config }: any) {
  const [isSearching, setIsSearching] = useState(false);
  const [sessionToken, setSessionToken] = useState<any>(null);

  useEffect(() => {
    if (window.google?.maps?.places) setSessionToken(new google.maps.places.AutocompleteSessionToken());
  }, []);

  useEffect(() => {
    const t = setTimeout(handleSearch, 500);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = async () => {
    if (!query.trim() || query.length < 3) { setSuggestions([]); return; }

    // --- GOOGLE MAPS LINK DETECTION ---
    if (query.includes('google.com/maps') || query.includes('maps.app.goo.gl') || query.includes('goo.gl/maps')) {
      // Regex for coordinates in full URL: @-8.123,113.123
      const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const match = query.match(coordRegex);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        onSelectSuggestion({ name: "Lokasi dari Link Maps", description: "Koordinat: " + lat + ", " + lng, lat, lng });
        setQuery("Lokasi dari Link Maps");
        setSuggestions([]);
        return;
      }

      // If it's a short link or doesn't have coordinates, we try to use it as a query in findPlaceFromQuery
      if (window.google?.maps?.places) {
        setIsSearching(true);
        const ds = new google.maps.places.PlacesService(document.createElement('div'));
        ds.findPlaceFromQuery({ query, fields: ['name', 'geometry', 'formatted_address'] }, (results, status) => {
          setIsSearching(false);
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            onSelectSuggestion({ name: results[0].name, description: results[0].formatted_address, lat: loc.lat(), lng: loc.lng() });
            setQuery(results[0].name || "Lokasi dari Link");
            setSuggestions([]);
          }
        });
        return;
      }
    }

    if (window.google?.maps?.places) {
      setIsSearching(true);
      new google.maps.places.AutocompleteService().getPlacePredictions({
        input: query, sessionToken, componentRestrictions: { country: 'id' },
        locationRestriction: { north: -7.9, south: -8.3, east: 113.4, west: 113.1 }
      }, (p, s) => {
        setIsSearching(false);
        if (s === 'OK' && p) setSuggestions(p.map(x => ({ id: x.place_id, name: x.structured_formatting.main_text, description: x.description, isPrediction: true })));
      });
    }
  };

  const handleSelect = (s: any) => {
    if (s.isPrediction && window.google?.maps?.places) {
      const ds = new google.maps.places.PlacesService(document.createElement('div'));
      ds.getDetails({ placeId: s.id, fields: ['geometry', 'formatted_address'], sessionToken }, (p, st) => {
        if (st === 'OK' && p?.geometry?.location) {
          onSelectSuggestion({ name: s.name, description: p.formatted_address, lat: p.geometry.location.lat(), lng: p.geometry.location.lng() });
          setSessionToken(new google.maps.places.AutocompleteSessionToken());
        }
      });
    } else onSelectSuggestion(s);
  };

  return (
    <div className="space-y-2 text-left text-gray-800 relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nama tempat, alamat, atau link Google Maps..."
          className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-[#046A38] rounded-2xl text-sm font-bold outline-none text-gray-800"
        />
        <div className="absolute right-4 top-4 text-gray-400">
          {isSearching ? <div className="w-4 h-4 border-2 border-t-[#046A38] rounded-full animate-spin"></div> : <Search size={20} />}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[1000] max-h-60 overflow-y-auto border-2 border-gray-100 rounded-2xl bg-white shadow-2xl divide-y text-gray-800 animate-in fade-in slide-in-from-top-2 duration-200">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSelect(s)} className="w-full text-left p-4 hover:bg-emerald-50 flex items-start space-x-3 transition-colors text-gray-800">
              <div className="bg-emerald-100 p-2 rounded-xl text-[#046A38]"><MapPin size={18} /></div>
              <div className="flex-1 min-w-0">
                <span className="font-black text-gray-800 block text-xs truncate">{s.name}</span>
                <span className="text-[10px] text-gray-500 truncate block">{s.description}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- MAIN PASSENGER VIEW ---
export default function PassengerView({ onNotifyAdminPanic, onLogout, onRoleChange, lockedOrderId }: PassengerViewProps) {
  const [profile, setProfile] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<Pesanan | null>(null);
  const [driverLoc, setDriverLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [historyOrders, setHistoryOrders] = useState<Pesanan[]>([]);
  const [viewMode, setViewMode] = useState<'home' | 'booking' | 'history' | 'profile'>('home');
  const [subLayanan, setSubLayanan] = useState<any>('ojek');
  const [selectedLayanan, setSelectedLayanan] = useState<any>('ojek');
  const [asalAlamat, setAsalAlamat] = useState('Pilih lokasi penjemputan...');
  const [asalLat, setAsalLat] = useState(KOORDINAT_LUMAJANG.lat);
  const [asalLng, setAsalLng] = useState(KOORDINAT_LUMAJANG.lng);

  // ITEMS MANAGEMENT
  const [itemsAwal, setItemsAwal] = useState<ItemBelanja[]>([]);
  const [stops, setStops] = useState<any[]>([{ id: 'stop-1', alamat: 'Tentukan tujuan...', lat: -8.1385, lng: 113.2208, items: [] }]);

  // ITEMS MODAL STATE
  const [showItemModal, setShowItemModal] = useState<{ target: 'asal' | string } | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');

  const [pembayaranTunai, setPembayaranTunai] = useState(true);
  const [routeDistance, setRouteDistance] = useState<number>(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [mapPickerTarget, setMapPickerTarget] = useState<'asal' | string | null>(null);
  const [tempLat, setTempLat] = useState(KOORDINAT_LUMAJANG.lat);
  const [tempLng, setTempLng] = useState(KOORDINAT_LUMAJANG.lng);
  const [tempAlamat, setTempAlamat] = useState('');
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const mapsLib = useMapsLibrary('routes');
  const isSuperUser = profile?.nomorHp === '6285156766317';

  useEffect(() => {
    const init = async () => {
      const p = await OloluStore.getProfilLogin(); if (!p) return; setProfile(p);
      const c = await OloluStore.getPengaturan(); setConfig(c);
      const orders = await OloluStore.getAllPesanan(); setHistoryOrders(orders.filter(o => o.idPenumpang === p.id));
      if (lockedOrderId) { const o = await OloluStore.getPesananById(lockedOrderId); if (o) { setActiveOrder(o); ololuRealtime.requestStateSync(lockedOrderId); } }
    };
    init(); const u = OloluStore.subscribeToStore(init); return () => u();
  }, [lockedOrderId]);

  useEffect(() => {
    if (!activeOrder) return;
    const u = ololuRealtime.subscribeToTrip(activeOrder.id, (d) => {
      if (d.type === 'location') setDriverLoc(d.coords);
      else if (d.type === 'accepted') { new Audio('https://assets.mixkit.co/active_storage/sfx/1360/1360-preview.mp3').play().catch(()=>null); setActiveOrder(prev => prev ? ({ ...prev, status: 'sopir_ditemukan', idSopir: d.driver.id, namaSopir: d.driver.nama, platNomorSopir: d.driver.platNomor }) : null); }
      else if (d.type === 'status_update') { setActiveOrder(prev => prev ? ({ ...prev, status: d.status }) : null); if (d.status === 'selesai') OloluStore.setLocalOrderLock(null); }
    });
    return () => u();
  }, [activeOrder?.id]);

  useEffect(() => {
    if (!mapsLib || !asalLat || stops.length === 0) return;
    const ds = new google.maps.DirectionsService();
    ds.route({ origin: { lat: asalLat, lng: asalLng }, destination: { lat: stops[stops.length-1].lat, lng: stops[stops.length-1].lng }, waypoints: stops.slice(0,-1).map(s=>({location:{lat:s.lat,lng:s.lng},stopover:true})), travelMode: google.maps.TravelMode.DRIVING }, (res, st) => {
      if (st === 'OK' && res?.routes[0]?.legs) { let t = 0; res.routes[0].legs.forEach(l => t += l.distance?.value || 0); setRouteDistance(t/1000); }
    });
  }, [mapsLib, asalLat, asalLng, stops]);

  const getTarifBreakdown = () => {
    if (!config) return { total: 0, commission: 10, base: 0, perKm: 0, min: 0, multi: 0, malam: 0 };
    const j = Math.ceil(routeDistance || 1);
    let h = 0, s = 0, m = 0, perKm = 0, base = 0, comm = 10, perKmJauh = 0, batasJauh = 999;
    const serv = selectedLayanan;

    base = config[`${serv}TarifDasar`] || 10000;
    perKm = config[`${serv}TarifPerKm`] || 3000;
    perKmJauh = config[`${serv}TarifPerKmJauh`] || perKm;
    batasJauh = config[`${serv}BatasKmJauh`] || 10;
    m = config[`${serv}TarifMinimum`] || 10000;
    s = config[`${serv}BiayaPerStop`] || 3000;
    comm = config[`${serv}PersenJasa`] || 10;

    h = j <= (config[`${serv}BatasKmTarifDasar`] || 3) ? base : (j <= batasJauh ? (j * perKm) : (j * perKmJauh));
    const multi = (stops.length > 1 ? (stops.length - 1) * s : 0);
    let total = Math.max(h, m) + multi;

    let malamSur = 0;
    if (config.malamAktif) {
      const now = new Date(); const hour = now.getHours();
      const [mS] = (config.malamMulai || "22:00").split(':').map(Number);
      const [mE] = (config.malamSelesai || "05:00").split(':').map(Number);
      const isMalam = mS > mE ? (hour >= mS || hour < mE) : (hour >= mS && hour < mE);
      if (isMalam) { malamSur = config.malamTambahanFlat || 5000; total += malamSur; }
    }
    return { total, commission: comm, base, perKm, min: m, multi, malam: malamSur };
  };

  const handleAddStop = () => { if (stops.length < 5) setStops([...stops, { id: `stop-${Date.now()}`, alamat: 'Tentukan tujuan...', lat: KOORDINAT_LUMAJANG.lat, lng: KOORDINAT_LUMAJANG.lng, items: [] }]); else alert("Maksimal 5 tujuan!"); };
  const handleRemoveStop = (id: string) => { if (stops.length > 1) setStops(stops.filter(s => s.id !== id)); };

  const selectSubLayanan = (id: any) => {
    if (config && !config[`layanan${id.charAt(0).toUpperCase()+id.slice(1)}Aktif`]) {
      alert("Layanan ini sedang tidak tersedia."); return;
    }
    setSubLayanan(id); setSelectedLayanan(id); setViewMode('booking');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !showItemModal) return;
    const item: ItemBelanja = { id: `it-${Date.now()}`, namaBarang: newItemName, jumlah: parseInt(newItemQty) || 1, perkiraanHarga: 0 };
    if (showItemModal.target === 'asal') setItemsAwal([...itemsAwal, item]);
    else setStops(stops.map(s => s.id === showItemModal.target ? { ...s, items: [...s.items, item] } : s));
    setNewItemName(''); setNewItemQty('1'); setShowItemModal(null);
  };

  const handleRemoveItem = (target: 'asal' | string, itemId: string) => {
    if (target === 'asal') setItemsAwal(itemsAwal.filter(i => i.id !== itemId));
    else setStops(stops.map(s => s.id === target ? { ...s, items: s.items.filter((i:any) => i.id !== itemId) } : s));
  };

  const handlePesan = async () => {
    if (!profile) return; const b = getTarifBreakdown();
    const o = await OloluStore.buatPesanan({
      jenisLayanan: selectedLayanan, idPenumpang: profile.id, asalAlamat, asalLat, asalLng, itemsAwal, jarakKm: Math.ceil(routeDistance || 1),
      tarifDasar: b.base, tarifPerKm: b.perKm, tarifMinimum: b.min, tambahanTujuan: b.multi, biayaLayananPersen: b.commission, biayaMalamTambahan: b.malam, totalBayarAkhir: b.total, pembayaranTunai, tarifPerjalananMurni: b.total - b.multi - b.malam
    }, stops.map((s, i) => ({ ...s, urutan: i + 1 })));
    if (o) { OloluStore.setLocalOrderLock({ orderId: o.id, role: 'penumpang' }); setActiveOrder(o as any); }
  };

  // --- RENDER: ORDER SCREEN ---
  if (activeOrder) return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen text-left text-gray-800">
      <div className="bg-[#046A38] text-white p-5 text-center border-b-2 border-[#D4AF37] sticky top-0 z-40 shadow-lg"><p className="text-[10px] font-black text-[#F5E6A8] tracking-widest text-white">{activeOrder.nomorPesanan}</p><h2 className="text-lg font-black uppercase tracking-tighter text-white">{activeOrder.status?.replace('_',' ')}</h2></div>
      <div className="h-80 w-full border-b shadow-inner"><APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY}><Map defaultCenter={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }} defaultZoom={14} mapId="ORDER_MAP_PASSENGER"><MapDirections origin={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }} destination={{ lat: activeOrder.daftarTujuan[activeOrder.daftarTujuan.length-1].lat, lng: activeOrder.daftarTujuan[activeOrder.daftarTujuan.length-1].lng }} waypoints={activeOrder.daftarTujuan.slice(0,-1).map(s=>({location:{lat:s.lat,lng:s.lng},stopover:true}))} /><AdvancedMarker position={{ lat: activeOrder.asalLat, lng: activeOrder.asalLng }}><Pin background="#046A38" /></AdvancedMarker>{activeOrder.daftarTujuan.map((st, idx) => (<AdvancedMarker key={st.id} position={{ lat: st.lat, lng: st.lng }}><Pin background="#D4AF37" glyphText={(idx+1).toString()} /></AdvancedMarker>))}{driverLoc && <AdvancedMarker position={driverLoc}><div className="text-3xl animate-bounce">🛵</div></AdvancedMarker>}</Map></APIProvider></div>
      <div className="p-5 space-y-5"><div className="bg-white p-5 rounded-3xl border-l-8 border-[#D4AF37] shadow-xl"><span className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Tagihan Pembayaran</span><p className="text-4xl font-black text-[#B8941F] tracking-tighter mt-1">Rp {activeOrder.totalBayarAkhir?.toLocaleString('id-ID')}</p></div>{activeOrder.namaSopir && <div className="bg-white p-5 rounded-3xl border flex justify-between items-center shadow-md"><div><h4 className="text-[10px] font-black text-gray-400 uppercase leading-none">Driver</h4><h3 className="text-base font-black text-gray-800 uppercase mt-1 leading-none">{activeOrder.namaSopir}</h3><p className="text-[10px] text-[#046A38] font-bold mt-0.5">{activeOrder.platNomorSopir}</p></div><div className="flex space-x-2"><button onClick={() => setIsChatOpen(true)} className="p-3 bg-emerald-50 text-[#046A38] rounded-2xl shadow-sm"><MessageCircle size={24} /></button><a href={`tel:${activeOrder.nomorHpSopir}`} className="p-3 bg-emerald-50 text-[#046A38] rounded-2xl shadow-sm"><Phone size={24} /></a></div></div>}<button onClick={() => OloluStore.tambahEmergency(activeOrder.id, profile.nama, profile.nomorHp, 'penumpang', 0, 0)} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg uppercase tracking-widest text-xs flex items-center justify-center space-x-2 text-white"><AlertTriangle size={18} /><span>SOS DARURAT</span></button>{activeOrder.status === 'selesai' && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 text-center"><div className="bg-white p-8 rounded-[40px] shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 text-gray-800"><div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto shadow-inner text-4xl">🎉</div><h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">Order Selesai!</h2><div className="flex flex-col space-y-3"><button onClick={() => generateReceipt(activeOrder)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg text-white">E-Nota Digital</button><button onClick={() => setActiveOrder(null)} className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg text-white">Kembali</button></div></div></div>)}</div>
      {isChatOpen && <ChatRoom pesananId={activeOrder.id} senderId={profile.id} senderName={profile.nama} senderRole="penumpang" onClose={() => setIsChatOpen(false)} />}
    </div>
  );

  // --- RENDER: HOME ---
  if (viewMode === 'home') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-24 text-left text-gray-800">
      <div className="p-6 space-y-6 text-left">
        <div className="bg-[#034F2A] p-7 rounded-[40px] shadow-xl relative overflow-hidden text-white text-left">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/10 rounded-full -translate-y-16 translate-x-16 pointer-events-none text-white"></div>
           <div className="relative z-10 flex justify-between items-start text-white"><div><h3 className="text-xl font-black tracking-tight leading-none text-white">Halo, {profile?.nama}!</h3><p className="text-[10px] text-emerald-100/70 mt-2 font-bold uppercase tracking-widest leading-relaxed text-white">Butuh pengantaran atau <br/> titip belanja hari ini?</p></div><div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner text-white">👋</div></div>
           {isSuperUser && <button onClick={() => onRoleChange('admin')} className="mt-6 w-full py-3 bg-[#D4AF37] text-[#034F2A] font-black rounded-2xl uppercase text-[9px] tracking-widest flex items-center justify-center space-x-2 shadow-lg text-emerald-900"><ShieldCheck size={14} /><span>DASHBOARD ADMIN</span></button>}
        </div>

        <div className="grid grid-cols-4 gap-4 px-1 text-gray-800 text-left">
           {[
             { id: 'ojek', label: 'Ride', icon: <Bike size={24} />, color: 'bg-emerald-500' },
             { id: 'mobil', label: 'Car', icon: <Car size={24} />, color: 'bg-blue-500' },
             { id: 'makanan', label: 'Food', icon: <ShoppingBag size={24} />, color: 'bg-amber-500' },
             { id: 'paket', label: 'Send', icon: <Package size={24} />, color: 'bg-indigo-500' },
             { id: 'belanja', label: 'Shop', icon: <ShoppingCart size={24} />, color: 'bg-rose-500' },
             { id: 'cargo', label: 'Cargo', icon: <MapIcon size={24} />, color: 'bg-purple-500' },
             { id: 'market', label: 'Market', icon: <Store size={24} />, color: 'bg-orange-500' },
             { id: 'lainnya', label: 'Extra', icon: <Plus size={24} />, color: 'bg-gray-400' },
           ].map(serv => (
             <button
                key={serv.id}
                onClick={() => selectSubLayanan(serv.id)}
                className={`flex flex-col items-center space-y-2 group transition-opacity ${config && !config[`layanan${serv.id.charAt(0).toUpperCase()+serv.id.slice(1)}Aktif`] ? 'opacity-30 grayscale' : 'opacity-100'}`}
             >
                <div className={`${serv.color} text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-active:scale-90 transition-transform text-white`}>{serv.icon}</div>
                <span className="text-[10px] font-black text-gray-700 text-center leading-tight uppercase tracking-tighter text-gray-800">{serv.label}</span>
             </button>
           ))}
        </div>
        <LiveDriversMap config={config} />
      </div>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-gray-100 flex justify-around items-center h-20 z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] px-6 text-gray-800"><button onClick={() => setViewMode('home')} className="flex flex-col items-center space-y-1 text-[#046A38] text-gray-800"><Home size={26} /><span className="text-[9px] font-black uppercase">Beranda</span></button><button onClick={() => setViewMode('history')} className="flex flex-col items-center space-y-1 text-gray-300 text-gray-800"><History size={26} /><span className="text-[9px] font-black uppercase">Riwayat</span></button><button onClick={() => setViewMode('profile')} className="flex flex-col items-center space-y-1 text-gray-300 text-gray-800"><User size={26} /><span className="text-[9px] font-black uppercase">Profil</span></button></nav>
    </div>
  );

  // --- RENDER: HISTORY ---
  if (viewMode === 'history') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-24 text-left text-gray-800">
       <div className="bg-[#034F2A] text-white p-5 border-b-2 border-[#D4AF37] shadow-xl sticky top-0 z-40 flex items-center space-x-3 text-white"><History size={20} className="text-[#D4AF37] text-white" /><h1 className="text-base font-black uppercase tracking-widest text-white">Riwayat Perjalanan</h1></div>
       <div className="p-4 space-y-3 text-gray-800">{historyOrders.map(p => (
          <div key={p.id} className="bg-white p-5 rounded-3xl border border-gray-150 shadow-sm space-y-3 text-gray-800 text-left"><div className="flex justify-between items-start text-gray-800"><div><div className="flex items-center space-x-2 text-gray-800"><p className="text-sm font-black text-gray-800 leading-none">#{p.nomorPesanan}</p><span className={`text-[8px] font-black px-2 py-0.5 rounded-lg text-white ${p.status === 'selesai' ? 'bg-emerald-500' : p.status === 'dibatalkan' ? 'bg-red-500' : 'bg-amber-400'}`}>{p.status.toUpperCase()}</span></div><p className="text-[10px] text-gray-400 font-bold mt-1">{new Date(p.waktuDibuat).toLocaleString('id-ID')}</p></div><p className="text-sm font-black text-[#046A38]">Rp {p.totalBayarAkhir?.toLocaleString()}</p></div><div className="text-[11px] text-gray-600 font-medium space-y-1.5 pt-2 border-t border-dashed text-left"><p className="flex items-start space-x-2 text-gray-800"><MapPin size={12} className="text-emerald-500 shrink-0 mt-0.5" /><span className="truncate">{p.asalAlamat}</span></p><p className="flex items-start space-x-2 text-gray-800"><ArrowRight size={12} className="text-blue-500 shrink-0 mt-0.5" /><span className="truncate">{p.daftarTujuan[p.daftarTujuan.length-1].alamat}</span></p></div>{p.status === 'selesai' && <button onClick={() => generateReceipt(p)} className="w-full py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-center space-x-2 hover:text-emerald-600 transition-all text-gray-800"><FileText size={14} /><span>Download Nota</span></button>}</div>
       ))}</div>
       <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-gray-100 flex justify-around items-center h-20 z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] px-6 text-gray-800"><button onClick={() => setViewMode('home')} className="flex flex-col items-center space-y-1 text-gray-300 text-gray-800"><Home size={24} /><span className="text-[9px] font-black uppercase">Beranda</span></button><button onClick={() => setViewMode('history')} className="flex flex-col items-center space-y-1 text-[#046A38] text-gray-800"><History size={24} /><span className="text-[9px] font-black uppercase">Riwayat</span></button><button onClick={() => setViewMode('profile')} className="flex flex-col items-center space-y-1 text-gray-300 text-gray-800"><User size={24} /><span className="text-[9px] font-black uppercase">Profil</span></button></nav>
    </div>
  );

  // --- VIEW: PROFILE ---
  if (viewMode === 'profile') return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen pb-24 text-left text-gray-800">
       <div className="bg-[#034F2A] p-10 rounded-b-[60px] shadow-2xl relative overflow-hidden text-center text-white text-left"><div className="w-28 h-28 bg-white/20 rounded-[40px] flex items-center justify-center mx-auto border-4 border-white/30 shadow-2xl mb-5 text-5xl text-white">👤</div><h2 className="text-2xl font-black tracking-tight text-white">{profile?.nama}</h2><p className="text-emerald-100/70 text-sm font-bold uppercase tracking-widest mt-1 text-white">{profile?.nomorHp}</p></div>
       <div className="p-8 space-y-6 text-gray-800 text-left"><div className="bg-white p-6 rounded-[40px] border border-gray-150 shadow-sm divide-y divide-gray-100 text-gray-800"><div className="py-4 flex justify-between items-center text-gray-800"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-gray-400">Total Perjalanan</span><span className="text-sm font-black text-gray-700 text-gray-800">{historyOrders.length} Trip</span></div><div className="py-4 flex justify-between items-center text-gray-800"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-gray-400">Status Akun</span><span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full uppercase text-emerald-700">Verified</span></div></div><button onClick={onLogout} className="w-full py-5 bg-red-50 text-red-600 font-black rounded-[32px] uppercase text-xs tracking-widest flex items-center justify-center space-x-3 active:scale-95 transition-all text-red-600"><LogOut size={18} /><span>Keluar Aplikasi</span></button></div>
       <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] bg-white border-t border-gray-100 flex justify-around items-center h-20 z-50 shadow-[0_-10px_25px_rgba(0,0,0,0.05)] px-6 text-gray-800"><button onClick={() => setViewMode('home')} className="flex flex-col items-center space-y-1 text-gray-300 text-gray-800"><Home size={24} /><span className="text-[9px] font-black uppercase">Beranda</span></button><button onClick={() => setViewMode('history')} className="flex flex-col items-center space-y-1 text-gray-300 text-gray-800"><History size={24} /><span className="text-[9px] font-black uppercase">Riwayat</span></button><button onClick={() => setViewMode('profile')} className="flex flex-col items-center space-y-1 text-[#046A38] text-gray-800"><User size={24} /><span className="text-[9px] font-black uppercase">Profil</span></button></nav>
    </div>
  );

  // --- RENDER: BOOKING ---
  const breakdown = getTarifBreakdown();
  return (
    <div className="max-w-md mx-auto bg-[#FAFBF9] min-h-screen text-left pb-24 text-gray-800">
      <div className="bg-[#034F2A] text-white p-5 rounded-b-[40px] border-b-2 border-[#D4AF37] flex justify-between items-center shadow-xl sticky top-0 z-40 text-left text-white"><div className="flex items-center space-x-3 text-white"><div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-xl shadow-inner text-white">📍</div><h1 className="text-base font-black uppercase tracking-widest text-white leading-none">{subLayanan.toUpperCase()}</h1></div><button onClick={() => setViewMode('home')} className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest text-white">BATAL</button></div>

      <div className="p-5 space-y-5 animate-in fade-in duration-300 text-left text-gray-800">
        <div className="bg-white p-6 rounded-[32px] border border-gray-150 shadow-sm space-y-6 text-left text-gray-800">

          {/* ORIGIN / PICKUP */}
          <div className="space-y-3 text-left">
             <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest ml-1 block">Penjemputan / Toko Utama</label>
             <button onClick={() => setMapPickerTarget('asal')} className="w-full p-4 bg-gray-50 border-2 border-transparent hover:border-emerald-500 rounded-2xl text-left flex items-center justify-between transition-all text-gray-800"><div className="flex items-center space-x-3 min-w-0 text-gray-800"><MapPin size={20} className="text-emerald-600" /><span className="text-xs font-bold text-gray-800 truncate">{asalAlamat}</span></div><ChevronRight size={18} className="text-gray-300" /></button>

             {/* LIST BARANG ORIGIN */}
             <div className="space-y-2 text-left">
                {itemsAwal.length > 0 && (
                   <div className="flex flex-wrap gap-2 px-1 text-left">
                      {itemsAwal.map(it => (<div key={it.id} className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center space-x-1">{it.namaBarang} (x{it.jumlah}) <button onClick={()=>handleRemoveItem('asal', it.id)} className="ml-2 text-red-400 hover:text-red-600">✕</button></div>))}
                   </div>
                )}
                <button onClick={()=>setShowItemModal({target:'asal'})} className="flex items-center space-x-1.5 text-[10px] font-black text-[#046A38] uppercase tracking-widest ml-1 hover:underline active:scale-95"><Plus size={14} /><span>Tambah Daftar Belanjaan</span></button>
             </div>
          </div>

          {/* STOPS */}
          <div className="space-y-4 pt-2 border-t-2 border-dashed text-left text-gray-800">
            <div className="flex justify-between items-center ml-1 text-gray-800"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-gray-400">Tujuan & Mampir</label><span className="text-[9px] font-black text-gray-300 uppercase text-gray-300">{stops.length} Lokasi</span></div>
            {stops.map((s, i) => (
              <div key={s.id} className="space-y-2 text-left text-gray-800">
                <div className="flex space-x-2 animate-in slide-in-from-left-2 duration-300 text-gray-800 text-left">
                  <button onClick={() => setMapPickerTarget(s.id)} className="flex-1 p-4 bg-gray-50 border-2 border-transparent hover:border-emerald-500 rounded-2xl text-left flex items-center space-x-4 transition-all min-w-0 text-gray-800"><div className="bg-amber-100 p-2 rounded-xl text-amber-600 text-[10px] font-black w-8 h-8 flex items-center justify-center shadow-inner text-amber-600">{i + 1}</div><span className="text-xs font-bold text-gray-800 truncate">{s.alamat}</span></button>
                  {stops.length > 1 && (<button onClick={() => handleRemoveStop(s.id)} className="p-4 bg-red-50 text-red-500 rounded-2xl shadow-sm text-red-500"><Trash2 size={20} /></button>)}
                </div>
                {/* LIST BARANG PER STOP */}
                <div className="pl-4 space-y-2 text-left">
                   {s.items?.length > 0 && (
                      <div className="flex flex-wrap gap-2 text-left">
                         {s.items.map((it:any) => (<div key={it.id} className="bg-amber-50 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-amber-100 flex items-center space-x-1">{it.namaBarang} (x{it.jumlah}) <button onClick={()=>handleRemoveItem(s.id, it.id)} className="ml-2 text-red-400 hover:text-red-600">✕</button></div>))}
                      </div>
                   )}
                   <button onClick={()=>setShowItemModal({target:s.id})} className="flex items-center space-x-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline active:scale-95"><Plus size={14} /><span>Tambah Pesanan Di Sini</span></button>
                </div>
              </div>
            ))}
            {stops.length < 5 && (<button onClick={handleAddStop} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center space-x-2 bg-white text-gray-400"><Plus size={16} /><span>Tambah Perhentian / Stop</span></button>)}
          </div>

          <div className="pt-4 border-t-2 border-dashed space-y-3 text-left">
             <div className="space-y-1 text-left"><div className="flex justify-between text-[10px] font-black uppercase text-gray-400"><span>Tarif Layanan ({Math.ceil(routeDistance || 1)} KM)</span><span>Rp {(breakdown.total - breakdown.multi - breakdown.malam).toLocaleString()}</span></div>{breakdown.multi > 0 && <div className="flex justify-between text-[10px] font-black uppercase text-emerald-600"><span>Multi-Stop ({stops.length - 1}x)</span><span>+ Rp {breakdown.multi.toLocaleString()}</span></div>}{breakdown.malam > 0 && <div className="flex justify-between text-[10px] font-black uppercase text-amber-600"><span>Shift Malam</span><span>+ Rp {breakdown.malam.toLocaleString()}</span></div>}</div>
             <div className="flex justify-between items-end text-left text-gray-800"><div><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Estimasi</span><p className="text-3xl font-black text-[#B8941F] tracking-tighter mt-1">Rp {breakdown.total.toLocaleString('id-ID')}</p></div><button onClick={()=>setPembayaranTunai(!pembayaranTunai)} className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center space-x-2 active:scale-95 transition-all text-emerald-700 shadow-sm"><Tag size={12} className="text-emerald-600" /><span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{pembayaranTunai ? '💵 TUNAI' : '📱 DOMPET'}</span></button></div>
          </div>
        </div>
        <button onClick={handlePesan} className="w-full py-5 bg-[#034F2A] text-white font-black rounded-[32px] text-xs uppercase tracking-[0.3em] border-b-8 border-emerald-900 shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-4 text-white"><Zap size={20} className="fill-current text-white" /><span>KONFIRMASI PESANAN</span></button>
      </div>

      {/* MODAL: ADD ITEM SHOPPING LIST */}
      {showItemModal && (
        <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-gray-800 text-left">
           <form onSubmit={handleAddItem} className="bg-white w-full max-w-xs rounded-[40px] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 text-left">
              <div className="flex justify-between items-center border-b pb-3"><h3 className="font-black text-sm uppercase tracking-tight text-gray-800">Catatan Belanja / Menu</h3><button type="button" onClick={()=>setShowItemModal(null)}><X size={20} className="text-gray-400"/></button></div>
              <div className="space-y-4">
                 <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Nama Barang / Pesanan</label><input autoFocus type="text" value={newItemName} onChange={(e)=>setNewItemName(e.target.value)} placeholder="cth: Nasi Goreng Spesial" className="w-full p-3.5 bg-gray-50 border rounded-2xl outline-none text-xs font-bold text-gray-800" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase ml-1">Jumlah</label><input type="number" value={newItemQty} onChange={(e)=>setNewItemQty(e.target.value)} className="w-full p-3.5 bg-gray-50 border rounded-2xl outline-none text-xs font-bold text-gray-800" /></div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#034F2A] text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all text-white">MASUKKAN LIST</button>
           </form>
        </div>
      )}

      {/* MAP PICKER MODAL */}
      {mapPickerTarget && (
        <div className="fixed inset-0 z-[1500] bg-white flex flex-col text-left text-gray-800 animate-in fade-in duration-300">
          <div className="bg-[#034F2A] text-white p-5 flex justify-between items-center shadow-lg">
            <div className="flex items-center space-x-3">
               <MapIcon size={20} />
               <h3 className="font-black uppercase tracking-widest text-sm">Tentukan Lokasi</h3>
            </div>
            <button onClick={() => setMapPickerTarget(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">
               <X size={24} />
            </button>
          </div>

          <div className="p-5 border-b shadow-sm space-y-4">
             <MapPickerSearch
               query={mapSearchQuery}
               setQuery={setMapSearchQuery}
               suggestions={suggestions}
               setSuggestions={setSuggestions}
               config={config}
               onSelectSuggestion={(s:any) => {
                 setTempLat(s.lat);
                 setTempLng(s.lng);
                 setTempAlamat(s.name);
                 setMapSearchQuery(s.name);
                 setSuggestions([]);
               }}
             />
             <button
               onClick={() => {
                 navigator.geolocation.getCurrentPosition((pos) => {
                   setTempLat(pos.coords.latitude);
                   setTempLng(pos.coords.longitude);
                   setTempAlamat(`Lokasi Saya (${pos.coords.latitude.toFixed(5)})`);
                   setMapSearchQuery('');
                 });
               }}
               className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 border border-emerald-100 active:scale-95 transition-all"
             >
                <Navigation size={14} className="fill-current" />
                <span>Gunakan Lokasi Saat Ini</span>
             </button>
          </div>

          <div className="flex-1 relative bg-gray-100 shadow-inner">
            <APIProvider apiKey={config?.googleMapsKey || GOOGLE_MAPS_KEY} libraries={['places']}>
              <Map
                center={{ lat: tempLat, lng: tempLng }}
                defaultZoom={15}
                mapId="PICKER_MAP_PRO_PASSENGER"
                disableDefaultUI
              >
                <AdvancedMarker position={{ lat: tempLat, lng: tempLng }} draggable onDragEnd={(e:any) => { if(e.latLng) { setTempLat(e.latLng.lat()); setTempLng(e.latLng.lng()); setTempAlamat(`Lokasi Kustom (${e.latLng.lat().toFixed(5)})`); } }}>
                   <Pin scale={1.3} background="#046A38" borderColor="#fff" />
                </AdvancedMarker>
              </Map>
            </APIProvider>

            {/* ADDRESS OVERLAY ON MAP */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-4 rounded-3xl border shadow-2xl space-y-3">
               <div className="flex items-start space-x-3">
                  <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><MapPin size={20} /></div>
                  <div className="min-w-0 flex-1">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Lokasi Terpilih</span>
                     <p className="text-xs font-bold text-gray-800 truncate">{tempAlamat || "Geser pin ke lokasi..."}</p>
                  </div>
               </div>
               <button
                 onClick={() => {
                   if (mapPickerTarget === 'asal') { setAsalLat(tempLat); setAsalLng(tempLng); setAsalAlamat(tempAlamat); }
                   else { setStops(stops.map(s => s.id === mapPickerTarget ? { ...s, lat: tempLat, lng: tempLng, alamat: tempAlamat } : s)); }
                   setMapPickerTarget(null); setMapSearchQuery('');
                 }}
                 className="w-full py-4 bg-[#034F2A] text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl border-b-4 border-emerald-900 active:scale-95"
               >
                 KONFIRMASI LOKASI INI
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
