/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseInstance;
}

type RealtimeCallback = (payload: any) => void;

class RealtimeService {
  private listeners: Map<string, Set<RealtimeCallback>> = new Map();
  private supabaseChannel: any = null;

  constructor() {
    this.initSupabaseChannel();
  }

  private initSupabaseChannel() {
    try {
      const supabase = getSupabase();
      if (supabase) {
        this.supabaseChannel = supabase.channel('ololu-orders', {
          config: {
            broadcast: { self: true },
          },
        });

        this.supabaseChannel
          .on('broadcast', { event: 'new-order' }, (payload: any) => {
            console.log('[Supabase Realtime] Received broadcast new-order event:', payload);
            this.triggerLocal('new-order', payload.payload);
          })
          .on('broadcast', { event: 'chat-message' }, (payload: any) => {
            console.log('[Supabase Realtime] Received broadcast chat-message event:', payload);
            if (payload.payload && payload.payload.pesananId) {
              this.triggerLocal(`chat:${payload.payload.pesananId}`, payload.payload.message);
            }
          })
          .on('broadcast', { event: 'trip-update' }, (payload: any) => {
            console.log('[Supabase Realtime] Received trip-update:', payload);
            if (payload.payload && payload.payload.orderId) {
              this.triggerLocal(`trip:${payload.payload.orderId}`, payload.payload.data);
            }
          })
          .on('broadcast', { event: 'sync-request' }, (payload: any) => {
            console.log('[Supabase Realtime] Received sync-request:', payload);
            if (payload.payload && payload.payload.orderId) {
              this.triggerLocal(`sync-req:${payload.payload.orderId}`, payload.payload);
            }
          })
          .on('presence', { event: 'sync' }, () => {
            const state = this.supabaseChannel.presenceState();
            this.triggerLocal('presence-sync', state);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
            this.triggerLocal('presence-join', { key, newPresences });
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
            this.triggerLocal('presence-leave', { key, leftPresences });
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'emergency_reports',
          }, (payload: any) => {
            console.log('[Supabase Realtime] NEW EMERGENCY REPORT:', payload);
            if (payload.new) {
              this.triggerLocal('new-emergency', payload.new);
            }
          })
          .subscribe((status: string) => {
            console.log(`[Supabase Realtime] Channel subscription status: ${status}`);
          });
      }
    } catch (err) {
      console.warn('[Supabase Realtime] Failed to initialize Supabase Realtime Channel:', err);
    }
  }

  public subscribeToNewOrders(callback: RealtimeCallback): () => void {
    if (!this.listeners.has('new-order')) {
      this.listeners.set('new-order', new Set());
    }
    this.listeners.get('new-order')!.add(callback);

    return () => {
      this.listeners.get('new-order')?.delete(callback);
    };
  }

  public broadcastNewOrder(orderData: any) {
    console.log('[Realtime] Broadcasting new order:', orderData);
    
    // 1. Send via Supabase if configured
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'new-order',
          payload: orderData,
        });
      } catch (err) {
        console.error('[Supabase Realtime] Failed to send broadcast:', err);
      }
    }

    // 2. Always trigger locally so that single-window simulation works instantly
    this.triggerLocal('new-order', orderData);
  }

  public subscribeToChat(pesananId: string, callback: RealtimeCallback): () => void {
    const key = `chat:${pesananId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Also check for database real-time table inserts on a hypothetical 'chat_messages' table
    let dbSubscription: any = null;
    try {
      const supabase = getSupabase();
      if (supabase) {
        dbSubscription = supabase
          .channel(`db-chat-${pesananId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `id_pesanan=eq.${pesananId}`
          }, (payload: any) => {
            console.log('[Supabase Realtime] DB chat message received:', payload);
            if (payload.new) {
              const mapped = {
                id: payload.new.id,
                idPesanan: payload.new.id_pesanan,
                senderId: payload.new.sender_id,
                senderName: payload.new.sender_name,
                senderRole: payload.new.sender_role,
                message: payload.new.message,
                timestamp: payload.new.created_at || payload.new.timestamp || new Date().toISOString()
              };
              this.triggerLocal(key, mapped);
            }
          })
          .subscribe();
      }
    } catch (err) {
      console.warn('[Supabase Realtime] Database real-time chat subscription failed:', err);
    }

    return () => {
      this.listeners.get(key)?.delete(callback);
      if (dbSubscription) {
        try {
          dbSubscription.unsubscribe();
        } catch (e) {}
      }
    };
  }

  public broadcastChatMessage(pesananId: string, message: any) {
    console.log('[Realtime] Broadcasting chat message:', message);
    if (this.supabaseChannel) {
      try {
        this.supabaseChannel.send({
          type: 'broadcast',
          event: 'chat-message',
          payload: { pesananId, message },
        });
      } catch (err) {
        console.error('[Supabase Realtime] Failed to broadcast chat message:', err);
      }
    }
    this.triggerLocal(`chat:${pesananId}`, message);
  }

  // --- TRIP UPDATES (BROADCAST) ---
  public subscribeToTrip(orderId: string, callback: RealtimeCallback): () => void {
    const key = `trip:${orderId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  public broadcastTripUpdate(orderId: string, data: any) {
    if (this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: 'trip-update',
        payload: { orderId, data },
      });
    }
    this.triggerLocal(`trip:${orderId}`, data);
  }

  // --- STATE SYNC (RE-SYNC AFTER F5) ---
  public subscribeToSyncRequest(orderId: string, callback: RealtimeCallback): () => void {
    const key = `sync-req:${orderId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => this.listeners.get(key)?.delete(callback);
  }

  public requestStateSync(orderId: string) {
    if (this.supabaseChannel) {
      this.supabaseChannel.send({
        type: 'broadcast',
        event: 'sync-request',
        payload: { orderId },
      });
    }
  }

  // --- PRESENCE (RADAR DRIVERS) ---
  public trackDriverPresence(driverId: string, data: any) {
    if (this.supabaseChannel) {
      this.supabaseChannel.track({
        id: driverId,
        ...data,
        online_at: new Date().toISOString(),
      });
    }
  }

  public subscribeToDriversOnline(callback: RealtimeCallback): () => void {
    const events = ['presence-sync', 'presence-join', 'presence-leave'];
    events.forEach(e => {
      if (!this.listeners.has(e)) this.listeners.set(e, new Set());
      this.listeners.get(e)!.add(callback);
    });

    return () => {
      events.forEach(e => this.listeners.get(e)?.delete(callback));
    };
  }

  // --- EMERGENCY REPORTS ---
  public subscribeToEmergencies(callback: RealtimeCallback): () => void {
    if (!this.listeners.has('new-emergency')) {
      this.listeners.set('new-emergency', new Set());
    }
    this.listeners.get('new-emergency')!.add(callback);

    return () => {
      this.listeners.get('new-emergency')?.delete(callback);
    };
  }

  private triggerLocal(event: string, data: any) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error('[Realtime] Error executing subscriber callback:', e);
        }
      });
    }
  }
}

export const ololuRealtime = new RealtimeService();
