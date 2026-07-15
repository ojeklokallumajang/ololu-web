import React, { useState, useEffect, useRef } from 'react';
import { OloluStore } from '../services/store';
import { ChatMessage } from '../types';
import { Send, X, Shield, Clock, Phone } from 'lucide-react';
import { ololuRealtime } from '../services/supabaseClient';

interface ChatRoomProps {
  pesananId: string;
  senderId: string;
  senderName: string;
  senderRole: 'penumpang' | 'sopir';
  onClose: () => void;
}

export default function ChatRoom({ pesananId, senderId, senderName, senderRole, onClose }: ChatRoomProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Get other party's info
  const pesanan = OloluStore.getPesanan(pesananId);
  const targetName = senderRole === 'penumpang' ? (pesanan?.namaSopir || 'Sopir Ololu') : (pesanan?.namaPenumpang || 'Penumpang');
  const targetPhone = senderRole === 'penumpang' ? pesanan?.nomorHpSopir : pesanan?.nomorHpPenumpang;

  useEffect(() => {
    // Load messages initially
    const loadMsgs = () => {
      const msgs = OloluStore.getChatMessages(pesananId);
      setMessages(msgs);
    };

    loadMsgs();

    // Subscribe to Supabase realtime websocket channel for chat messages
    const unsubscribeRealtime = ololuRealtime.subscribeToChat(pesananId, (newMsg: ChatMessage) => {
      console.log('⚡ [Realtime Chat] New chat message received via Supabase subscription:', newMsg);
      OloluStore.addIncomingChatMessage(newMsg);
    });

    // Subscribe to store updates for real-time chat UI updates
    const unsubscribeStore = OloluStore.subscribeToStore(() => {
      loadMsgs();
    });

    return () => {
      unsubscribeRealtime();
      unsubscribeStore();
    };
  }, [pesananId]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    OloluStore.sendChatMessage(pesananId, senderId, senderName, senderRole, inputText.trim());
    setInputText('');

    // Play visual/audio pop
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  };

  return (
    <div className="absolute inset-0 bg-[#FAFBF9] z-[200] flex flex-col h-full animate-in slide-in-from-bottom duration-250">
      
      {/* CHAT HEADER */}
      <div className="bg-[#046A38] text-white p-4 border-b-3 border-[#D4AF37] flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center space-x-3 text-left">
          <div className="bg-[#034F2A] text-[#D4AF37] font-black text-xs w-9 h-9 rounded-full flex items-center justify-center border-2 border-[#D4AF37]">
            {targetName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-[9px] text-[#D4AF37] tracking-widest font-black uppercase leading-none">
              {senderRole === 'penumpang' ? '🚘 MITRA DRIVER' : '🛵 PENUMPANG'}
            </h4>
            <h3 className="text-sm font-black tracking-tight leading-normal">{targetName}</h3>
            <span className="text-[9px] text-emerald-100/80 leading-none">
              {pesanan?.nomorPesanan}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {targetPhone && (
            <a
              href={`tel:${targetPhone}`}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
              title="Hubungi telepon"
            >
              <Phone size={14} />
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            title="Tutup Chat"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* DISKLAIMER STORAGE 31 HARI */}
      <div className="bg-[#E6F4EC] px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-[10px] text-[#046A38] shrink-0">
        <div className="flex items-center space-x-1.5 font-bold">
          <Shield size={11} className="text-[#046A38]" />
          <span>Chat enkripsi lokal (Tersimpan 31 hari)</span>
        </div>
        <div className="flex items-center space-x-1 font-semibold text-gray-400">
          <Clock size={10} />
          <span>Auto-Delete</span>
        </div>
      </div>

      {/* CHAT BUBBLES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin bg-gray-50/50">
        
        {/* WELCOME ASSISTANT NOTE */}
        <div className="bg-white p-3.5 rounded-2xl border border-gray-150 text-center max-w-[280px] mx-auto text-[10px] text-gray-500 leading-relaxed shadow-3xs space-y-1.5">
          <span className="text-lg block">💬</span>
          <p className="font-bold text-gray-700">Mulai Percakapan Internal</p>
          <p>
            Gunakan ruang chat ini untuk berkordinasi tentang detail jemputan, pesanan belanja, atau rute pengiriman paket Anda.
          </p>
        </div>

        {messages.map((msg) => {
          const isMe = msg.senderRole === senderRole;
          const timeStr = new Date(msg.timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
            >
              <div className="flex items-baseline space-x-1">
                <span className="text-[8px] font-bold text-gray-400">
                  {isMe ? 'Anda' : msg.senderName}
                </span>
              </div>
              
              <div
                className={`p-3 rounded-2xl max-w-[260px] text-xs font-medium text-left leading-relaxed shadow-3xs transition-all ${
                  isMe
                    ? 'bg-[#046A38] text-white rounded-tr-none border border-[#034F2A]'
                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-150'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.message}</p>
                <span
                  className={`block text-[8px] text-right mt-1.5 font-mono ${
                    isMe ? 'text-emerald-200' : 'text-gray-400'
                  }`}
                >
                  {timeStr}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messageEndRef} />
      </div>

      {/* CHAT INPUT BAR */}
      <form
        onSubmit={handleSend}
        className="p-3 bg-white border-t border-gray-150 flex items-center space-x-2 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom,0px))]"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan koordinasi..."
          className="flex-1 p-2.5 bg-[#FAFBF9] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#046A38] text-gray-800"
        />
        <button
          type="submit"
          className="bg-[#046A38] hover:bg-[#034F2A] text-white p-2.5 rounded-xl transition-all border border-[#D4AF37] flex items-center justify-center shrink-0 shadow-sm"
          title="Kirim pesan"
        >
          <Send size={15} />
        </button>
      </form>

    </div>
  );
}
