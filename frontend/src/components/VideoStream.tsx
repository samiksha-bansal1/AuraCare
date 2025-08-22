import React, { useEffect, useRef, useState } from 'react';
import socketService from '../services/socket';
import { useAuth } from '../contexts/AuthContext';

interface VideoStreamProps {
  role: 'publisher' | 'viewer';
  roomId: string; // e.g., `patient_<patientCode>`
  muted?: boolean;
  className?: string;
}

const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

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
      try {
        console.log('[VideoStream] setting up publisher');

        // Close existing peer connection and streams
        if (pcRef.current) {
          console.log('[VideoStream] closing existing peer connection');
          pcRef.current.ontrack = null;
          pcRef.current.onicecandidate = null;
          pcRef.current.oniceconnectionstatechange = null;
          pcRef.current.close();
          pcRef.current = null;
        }

        // Stop any existing tracks
        if (localStreamRef.current) {
          console.log('[VideoStream] stopping existing tracks');
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }

        // Create new peer connection
        console.log('[VideoStream] creating new peer connection');
        const pc = new RTCPeerConnection({ 
          iceServers,
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceCandidatePoolSize: 10
        });
        
        // Set up event handlers
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('[VideoStream] ICE candidate:', event.candidate);
            socketService.sendIceCandidate(roomId, event.candidate);
          }
        };

        pc.ontrack = (event) => {
          console.log('[VideoStream] received remote track');
          if (remoteRef.current && event.streams[0]) {
            remoteRef.current.srcObject = event.streams[0];
          }
        };

        pc.oniceconnectionstatechange = () => {
          console.log(`[VideoStream] ICE connection state: ${pc.iceConnectionState}`);
        };

        pcRef.current = pc;

        // Get user media
        console.log('[VideoStream] requesting user media');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user'
          },
          audio: false
        });

        console.log('[VideoStream] got user media, adding tracks');
        localStreamRef.current = stream;
        
        // Add tracks to peer connection
        stream.getTracks().forEach((track) => {
          console.log(`[VideoStream] adding track: ${track.kind}`);
          if (pcRef.current) {
            pcRef.current.addTrack(track, stream);
          }
        });

        // Set up local video element
        if (localRef.current) {
          console.log('[VideoStream] setting up local video element');
          localRef.current.srcObject = stream;
          localRef.current.muted = true;
          localRef.current.playsInline = true;
          
          // Handle autoplay
          const playPromise = localRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.error('[VideoStream] Error playing video:', error);
            });
          }
        }
      } catch (e) {
        console.error('[VideoStream] getUserMedia failed', e);
      }
    };

    const handleReady = async () => {
      if (role !== 'publisher') return;
      if (!pcRef.current) {
        console.error('[VideoStream] No peer connection available');
        return;
      }
      
      if (madeOfferRef.current) {
        console.log('[VideoStream] Offer already made, skipping');
        return;
      }

      try {
        console.log('[VideoStream] Creating offer');
        const offer = await pcRef.current.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: false
        });
        
        console.log('[VideoStream] Setting local description');
        await pcRef.current.setLocalDescription(offer);
        
        console.log('[VideoStream] Sending offer to server');
        socketService.sendOffer(roomId, offer);
        madeOfferRef.current = true;
      } catch (error) {
        console.error('[VideoStream] Error in handleReady:', error);
      }
    };

    const handleOffer = async ({ sdp, from }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) {
        console.error('[VideoStream] No peer connection available for offer');
        return;
      }
      
      console.log(`[VideoStream] Received offer from ${from}`);
      
      try {
        console.log('[VideoStream] Setting remote description');
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        
        console.log('[VideoStream] Creating answer');
        const answer = await pcRef.current.createAnswer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: false
        });
        
        console.log('[VideoStream] Setting local description');
        await pcRef.current.setLocalDescription(answer);
        
        console.log('[VideoStream] Sending answer');
        socketService.sendAnswer(roomId, answer);
      } catch (error) {
        console.error('[VideoStream] Error handling offer:', error);
      }
    };

    const handleAnswer = async ({ sdp, from }: { from: string; sdp: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) {
        console.error('[VideoStream] No peer connection available for answer');
        return;
      }
      
      console.log(`[VideoStream] Received answer from ${from}`);
      
      try {
        const remoteDesc = new RTCSessionDescription(sdp);
        console.log('[VideoStream] Setting remote description');
        await pcRef.current.setRemoteDescription(remoteDesc);
      } catch (error) {
        console.error('[VideoStream] Error handling answer:', error);
      }
    };

    const handleIceCandidate = async ({ candidate, from }: { from: string; candidate: RTCIceCandidateInit }) => {
      if (!pcRef.current) {
        console.error('[VideoStream] No peer connection available for ICE candidate');
        return;
      }
      
      try {
        if (candidate) {
          console.log(`[VideoStream] Adding ICE candidate from ${from}`);
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          console.log('[VideoStream] Received null ICE candidate - end of candidates');
        }
      } catch (error) {
        if (!(error instanceof Error && error.toString().includes('OperationError'))) {
          console.error('[VideoStream] Error adding ICE candidate:', error);
        }
      }
    };

    // Set up socket event listeners
    socketService.onOffer(handleOffer);
    socketService.onAnswer(handleAnswer);
    socketService.onIceCandidate(handleIceCandidate);

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
      console.log('[VideoStream] cleaning up');
      
      // Clean up peer connection
      if (pcRef.current) {
        try {
          // Close all RTCPeerConnection event handlers
          pcRef.current.onicecandidate = null;
          pcRef.current.ontrack = null;
          pcRef.current.oniceconnectionstatechange = null;
          pcRef.current.onsignalingstatechange = null;
          pcRef.current.onicegatheringstatechange = null;
          pcRef.current.onnegotiationneeded = null;
          
          // Close the connection
          pcRef.current.close();
        } catch (error) {
          console.error('[VideoStream] Error closing peer connection:', error);
        }
        pcRef.current = null;
      }
      
      // Clean up local media stream
      if (localStreamRef.current) {
        try {
          localStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
        } catch (error) {
          console.error('[VideoStream] Error stopping tracks:', error);
        }
        localStreamRef.current = null;
      }
      
      // Clean up video elements
      if (localRef.current) {
        try {
          localRef.current.pause();
          localRef.current.srcObject = null;
          localRef.current.load();
        } catch (error) {
          console.error('[VideoStream] Error cleaning up local video element:', error);
        }
      }
      
      if (remoteRef.current) {
        try {
          remoteRef.current.pause();
          remoteRef.current.srcObject = null;
          remoteRef.current.load();
        } catch (error) {
          console.error('[VideoStream] Error cleaning up remote video element:', error);
        }
      }
      
      // Clean up socket listeners
      try {
        socketService.offOffer(handleOffer);
        socketService.offAnswer(handleAnswer);
        socketService.offIceCandidate(handleIceCandidate);
      } catch (error) {
        console.error('[VideoStream] Error cleaning up socket listeners:', error);
      }
      
      console.log('[VideoStream] cleanup complete');
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
