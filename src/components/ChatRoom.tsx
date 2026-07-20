import React, { useState, useEffect, useRef } from 'react';
import { OloluStore } from '../services/store';
import { ChatMessage, Pesanan } from '../types';
import { Send, X, Shield, Clock, Phone, Mic, Square, Play, Pause, Volume2, Camera, Image as ImageIcon } from 'lucide-react';
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
  const [pesanan, setPesanan] = useState<Pesanan | null>(null);
  const [inputText, setInputText] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Get other party's info
  const targetName = senderRole === 'penumpang' ? (pesanan?.namaSopir || 'Sopir Ololu') : (pesanan?.namaPenumpang || 'Penumpang');
  const targetPhone = senderRole === 'penumpang' ? pesanan?.nomorHpSopir : pesanan?.nomorHpPenumpang;

  useEffect(() => {
    // Load messages and order details
    const initChat = async () => {
      const order = await OloluStore.getPesananById(pesananId);
      setPesanan(order);
      const msgs = await OloluStore.getChatMessages(pesananId);
      setMessages(msgs);
    };

    initChat();

    // Subscribe to Supabase realtime websocket channel for chat messages
    const unsubscribeRealtime = ololuRealtime.subscribeToChat(pesananId, (newMsg: ChatMessage) => {
      console.log('⚡ [Realtime Chat] New chat message received via Supabase subscription:', newMsg);
      setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
    });

    return () => {
      unsubscribeRealtime();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pesananId]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    await OloluStore.sendChatMessage(pesananId, senderId, senderName, senderRole, inputText.trim());
    setInputText('');
    playPopSound();
  };

  const playPopSound = () => {
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

  // --- VOICE RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          // Send as voice message
          await OloluStore.sendChatMessage(pesananId, senderId, senderName, senderRole, "[Pesan Suara]", base64Audio);
          playPopSound();
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Gagal akses mik:", err);
      alert("Harap berikan izin akses mikrofon untuk mengirim pesan suara.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePickPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      input.setAttribute('capture', 'environment');
    }
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setIsSendingPhoto(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          await OloluStore.sendChatMessage(pesananId, senderId, senderName, senderRole, "[Foto]", undefined, base64);
          setIsSendingPhoto(false);
          playPopSound();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
                {msg.photoData ? (
                  <div className="space-y-2">
                    <img
                      src={msg.photoData}
                      className="rounded-lg max-h-48 w-full object-cover cursor-pointer hover:opacity-90"
                      onClick={() => window.open(msg.photoData, '_blank')}
                      alt="Gambar Chat"
                    />
                  </div>
                ) : msg.voiceData ? (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3 min-w-[180px]">
                      <button
                        onClick={() => {
                          const audio = new Audio(msg.voiceData);
                          audio.play();
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#E6F4EC] hover:bg-emerald-100 text-[#046A38]'}`}
                      >
                        <Play size={18} fill="currentColor" />
                      </button>
                      <div className="flex-1">
                        <div className={`h-1.5 rounded-full overflow-hidden ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
                          <div className={`h-full w-1/3 ${isMe ? 'bg-emerald-400' : 'bg-[#046A38]'}`}></div>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className={`text-[9px] font-bold ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>Pesan Suara</span>
                          <Volume2 size={10} className={isMe ? 'text-emerald-100' : 'text-gray-400'} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                )}

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
      <div className="p-3 bg-white border-t border-gray-150 flex items-center space-x-2 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
        {isRecording ? (
          <div className="flex-1 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-xs font-black text-red-600 uppercase tracking-widest">Merekam: {formatTime(recordingTime)}</span>
            </div>
            <button
              onClick={stopRecording}
              className="p-1.5 bg-red-500 text-white rounded-lg shadow-sm"
            >
              <Square size={14} fill="currentColor" />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handlePickPhoto}
              disabled={isSendingPhoto}
              className="p-2.5 bg-gray-50 text-gray-500 hover:bg-[#E6F4EC] hover:text-[#046A38] rounded-xl border border-gray-200 transition-all disabled:opacity-50"
              title="Kirim foto"
            >
              {isSendingPhoto ? <div className="w-4 h-4 border-2 border-t-[#046A38] rounded-full animate-spin"></div> : <Camera size={18} />}
            </button>
            <button
              onClick={startRecording}
              className="p-2.5 bg-gray-50 text-gray-500 hover:bg-[#E6F4EC] hover:text-[#046A38] rounded-xl border border-gray-200 transition-all"
              title="Kirim pesan suara"
            >
              <Mic size={18} />
            </button>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex-1 flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik pesan..."
                className="flex-1 p-2.5 bg-[#FAFBF9] border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#046A38] text-gray-800"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2.5 rounded-xl transition-all border flex items-center justify-center shrink-0 shadow-sm ${inputText.trim() ? 'bg-[#046A38] hover:bg-[#034F2A] text-white border-[#D4AF37]' : 'bg-gray-50 text-gray-300 border-gray-200'}`}
                title="Kirim pesan"
              >
                <Send size={15} />
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  );
}
