import React, { useEffect, useRef, useState } from 'react';
import socketService from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

interface VideoStreamProps {
  role: 'publisher' | 'viewer';
  roomId: string; // e.g., `patient_<patientCode>`
  muted?: boolean;
  className?: string;
}

const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const VideoStream: React.FC<VideoStreamProps> = ({ role, roomId, muted = false, className }) => {
  const { token } = useAuth();
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const offerFallbackTimer = useRef<number | null>(null);
  const madeOfferRef = useRef<boolean>(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    // Ensure socket connection
    if (token) {
      socketService.ensure(token);
    }
  }, [token]);

  useEffect(() => {
    if (!roomId) return;

    // Nudge socket to be ready for this effect's run
    if (token) {
      socketService.ensure(token);
    }

    const socket = socketService.getSocket();
    if (!socket) return;

    // Join signaling room
    console.log('[VideoStream] join_room', { role, roomId });
    socketService.joinRoom(roomId);
    setJoined(true);

    // Create RTCPeerConnection
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (pcRef.current?.signalingState === 'closed') return;
      if (e.candidate) {
        console.log('[VideoStream] onicecandidate -> sending');
        socketService.sendIceCandidate(roomId, e.candidate.toJSON());
      }
    };

    // Show remote stream
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (remoteRef.current) {
        remoteRef.current.srcObject = stream;
        remoteRef.current.playsInline = true;
        // Try to play; if blocked, mute and retry without await
        const attemptPlay = (video: HTMLVideoElement) => {
          const p = (video as any).play?.();
          if (p && typeof p.then === 'function') {
            p.catch(() => {
              console.warn('[VideoStream] remote autoplay blocked, muting and retrying');
              video.muted = true;
              const p2 = (video as any).play?.();
              if (p2 && typeof p2.then === 'function') {
                p2.catch(() => {});
              }
            });
          }
        };
        attemptPlay(remoteRef.current);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[VideoStream] connectionState', pc.connectionState);
    };
    pc.onsignalingstatechange = () => {
      console.log('[VideoStream] signalingState', pc.signalingState);
    };

    const setupPublisher = async () => {
      // Log devices for debugging conflicts
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        console.log('[VideoStream] videoinput devices', cams.map(c => ({ label: c.label, deviceId: c.deviceId })));
      } catch {}

      const constraintVariants: MediaStreamConstraints[] = [
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];

      let media: MediaStream | null = null;
      let lastErr: any = null;
      for (let i = 0; i < constraintVariants.length; i++) {
        try {
          console.log('[VideoStream] getUserMedia try', constraintVariants[i]);
          media = await navigator.mediaDevices.getUserMedia(constraintVariants[i]);
          break;
        } catch (e) {
          lastErr = e;
          console.warn('[VideoStream] getUserMedia failed for variant', i, e);
          // If AbortError, wait briefly and retry next variant
          if ((e as any)?.name === 'AbortError') {
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }
      if (!media) throw lastErr || new Error('Unable to acquire camera');

      localStreamRef.current = media;
      // If PC was closed between request and now, recreate
      if (!pcRef.current || pcRef.current.signalingState === 'closed') {
        console.warn('[VideoStream] PC closed before addTrack, recreating');
        const newPc = new RTCPeerConnection({ iceServers });
        pcRef.current = newPc;
        newPc.onicecandidate = (e) => {
          if (newPc.signalingState === 'closed') return;
          if (e.candidate) socketService.sendIceCandidate(roomId, e.candidate.toJSON());
        };
        newPc.ontrack = (e) => {
          const [stream] = e.streams;
          if (remoteRef.current) remoteRef.current.srcObject = stream;
        };
      }
      console.log('[VideoStream] adding local tracks');
      media.getTracks().forEach((t) => pcRef.current!.addTrack(t, media));
      if (localRef.current) {
        localRef.current.srcObject = media;
        localRef.current.muted = true; // avoid autoplay block
        localRef.current.playsInline = true;
        try { await (localRef.current as any).play?.(); } catch {}
      }

      // Auto-offer fallback in case viewer's ready was missed
      if (role === 'publisher') {
        offerFallbackTimer.current = window.setTimeout(async () => {
          if (!pcRef.current) return;
          if (!pcRef.current.localDescription && !madeOfferRef.current) {
            try {
              console.log('[VideoStream] auto-offer fallback');
              const offer = await pcRef.current.createOffer();
              await pcRef.current.setLocalDescription(offer);
              socketService.sendOffer(roomId, offer);
              madeOfferRef.current = true;
            } catch (e) {
              console.warn('[VideoStream] auto-offer failed', e);
            }
          }
        }, 1200);
      }
    };

    const handleReady = async () => {
      if (role !== 'publisher') return;
      if (!pcRef.current) return;
      if (madeOfferRef.current) {
        console.log('[VideoStream] offer already made, skipping');
        return;
      }
      console.log('[VideoStream] creating offer');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketService.sendOffer(roomId, offer);
      madeOfferRef.current = true;
    };

    const handleOffer = async ({ sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (role !== 'viewer') return;
      if (!pcRef.current) return;
      console.log('[VideoStream] setRemoteDescription(offer)');
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketService.sendAnswer(roomId, answer);
    };

    const handleAnswer = async ({ sdp }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (role !== 'publisher') return;
      if (!pcRef.current) return;
      console.log('[VideoStream] setRemoteDescription(answer)');
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    };

    const handleIce = async ({ candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!pcRef.current) return;
      try {
        console.log('[VideoStream] addIceCandidate');
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    };

    // Bind signaling listeners
    socketService.onReady(handleReady);
    socketService.onOffer(handleOffer);
    socketService.onAnswer(handleAnswer);
    socketService.onIceCandidate(handleIce);

    // If viewer, announce readiness so publisher can create offer
    if (role === 'viewer') {
      console.log('[VideoStream] viewer ready');
      socketService.ready(roomId);
    }

    // If publisher, get media
    if (role === 'publisher') {
      console.log('[VideoStream] setting up publisher');
      setupPublisher().catch((e) => console.error('getUserMedia failed', e));
    }

    return () => {
      // Cleanup media
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.getSenders().forEach((s) => {
        try { s.track && s.track.stop(); } catch {}
      });
      if (pcRef.current && pcRef.current.signalingState !== 'closed') {
        console.log('[VideoStream] closing PC');
        pcRef.current.close();
      }
      pcRef.current = null;

      if (offerFallbackTimer.current) {
        window.clearTimeout(offerFallbackTimer.current);
        offerFallbackTimer.current = null;
      }

      madeOfferRef.current = false;

      // Unbind signaling
      const s = socketService.getSocket();
      s?.off('webrtc_ready', handleReady as any);
      s?.off('webrtc_offer', handleOffer as any);
      s?.off('webrtc_answer', handleAnswer as any);
      s?.off('webrtc_ice_candidate', handleIce as any);

      setJoined(false);
    };
  }, [roomId, role, token]);

  return (
    <div className={className}>
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {role === 'publisher' && (
          <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}
        {role === 'viewer' && (
          <video ref={remoteRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
        )}
        {!joined && (
          <div className="absolute inset-0 flex items-center justify-center text-white">Connecting...</div>
        )}
      </div>
    </div>
  );
};

export default VideoStream;
