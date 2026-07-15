import React from 'react';
import ChatRoom from './ChatRoom';

interface ChatProps {
  pesananId: string;
  senderId: string;
  senderName: string;
  senderRole: 'penumpang' | 'sopir';
  onClose: () => void;
}

/**
 * Chat component designed with the OLOLU emerald-green (#046A38) and gold (#D4AF37) palette,
 * utilizing real-time Supabase WebSocket subscriptions.
 */
export default function Chat(props: ChatProps) {
  return <ChatRoom {...props} />;
}
