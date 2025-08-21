import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private lastToken: string | null = null;

  connect(token: string) {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    this.lastToken = token;
    // Close any existing socket to avoid parallel connections with wrong auth
    if (this.socket) {
      try { this.socket.off(); } catch {}
      try { this.socket.disconnect(); } catch {}
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('Socket.IO connection error:', error);
      // If auth failed, try reconnecting with the last token after a short delay
      if (error?.message === 'Authentication error' && this.lastToken) {
        setTimeout(() => {
          // Only retry if not connected
          if (!this.socket || !this.socket.connected) {
            this.connect(this.lastToken!);
          }
        }, 800);
      }
    });

    return this.socket;
  }

  ensure(token: string) {
    // If no socket or not connected, or token changed, reconnect with the provided token
    const needsReconnect = !this.socket || !this.socket.connected || (this.socket.auth as any)?.token !== token;
    if (needsReconnect) {
      this.connect(token);
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // --- WebRTC signaling helpers ---
  joinRoom(roomId: string) {
    this.socket?.emit('join_room', { roomId });
  }

  onReady(cb: (payload: { from: string }) => void) {
    this.socket?.on('webrtc_ready', cb);
  }

  ready(roomId: string) {
    this.socket?.emit('webrtc_ready', { roomId });
  }

  onOffer(cb: (payload: { from: string; sdp: any }) => void) {
    this.socket?.on('webrtc_offer', cb);
  }

  sendOffer(roomId: string, sdp: any) {
    this.socket?.emit('webrtc_offer', { roomId, sdp });
  }

  onAnswer(cb: (payload: { from: string; sdp: any }) => void) {
    this.socket?.on('webrtc_answer', cb);
  }

  sendAnswer(roomId: string, sdp: any) {
    this.socket?.emit('webrtc_answer', { roomId, sdp });
  }

  onIceCandidate(cb: (payload: { from: string; candidate: RTCIceCandidateInit }) => void) {
    this.socket?.on('webrtc_ice_candidate', cb);
  }

  sendIceCandidate(roomId: string, candidate: RTCIceCandidateInit) {
    this.socket?.emit('webrtc_ice_candidate', { roomId, candidate });
  }

  // Emit vital signs update (for staff)
  emitVitalSignsUpdate(data: any) {
    if (this.socket) {
      this.socket.emit('vital_signs_update', data);
    }
  }

  // Emit family content sharing
  emitShareContent(data: any) {
    if (this.socket) {
      this.socket.emit('share_content', data);
    }
  }

  // Listen for vital signs updates
  onVitalSigns(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('vital_signs', callback);
    }
  }

  // Listen for new content from family
  onNewContent(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('new_content', callback);
    }
  }

  // Listen for critical alerts
  onCriticalAlert(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('critical_alert', callback);
    }
  }

  // Listen for emotion updates
  onEmotionUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('emotion_update', callback);
    }
  }

  // Listen for family content shared notifications
  onFamilyContentShared(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('family_content_shared', callback);
    }
  }
}

export const socketService = new SocketService();
export default socketService;
