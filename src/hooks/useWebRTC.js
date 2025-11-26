"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";
import { sendSignal, subscribeToSignals, markSignalConsumed } from "@/lib/signal";
import { supabase } from "@/lib/supabase";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

export function useWebRTC(roomId) {
  const { user } = useUserStore();
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // Map<userId, { stream, pc }>
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState({}); // Map<userId, boolean>
  const peersRef = useRef({}); // Ref to keep track of peers without re-renders
  const localStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef({}); // Queue ICE candidates until remote description is set
  const makingOfferRef = useRef({}); // Track if we're currently making an offer for each peer
  const ignoreOfferRef = useRef({}); // Track if we should ignore incoming offers during our negotiation
  const explicitVideoStateRef = useRef({}); // Track explicitly signaled video states (takes priority)
  const audioContextRef = useRef(null);
  const analyserNodesRef = useRef({}); // Map<userId, { analyser, dataArray }>
  const voiceDetectionIntervalRef = useRef(null);
  
  // Voice activity detection threshold (0-255, higher = less sensitive)
  const VOICE_THRESHOLD = 25; // Adjust this to filter out background noise

  // Set up audio analyser for a stream
  const setupAudioAnalyser = (userId, stream) => {
    if (!stream || analyserNodesRef.current[userId]) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyserNodesRef.current[userId] = { analyser, dataArray, source };
      
      console.log(`[VAD] Set up audio analyser for ${userId}`);
    } catch (err) {
      console.error(`[VAD] Error setting up audio analyser for ${userId}:`, err);
    }
  };
  
  // Clean up audio analyser for a user
  const cleanupAudioAnalyser = (userId) => {
    if (analyserNodesRef.current[userId]) {
      try {
        analyserNodesRef.current[userId].source?.disconnect();
      } catch (e) {}
      delete analyserNodesRef.current[userId];
    }
  };
  
  // Broadcast local speaking state to peers
  const broadcastSpeakingState = (isSpeaking) => {
    if (!user?.id || !roomId) return;
    
    // Send to all peers via signaling
    Object.keys(peersRef.current).forEach(peerId => {
      sendSignal({
        roomId,
        senderId: user.id,
        receiverId: peerId,
        type: "speaking-state",
        data: { speaking: isSpeaking },
      }).catch(err => console.error("Error sending speaking state:", err));
    });
  };
  
  // Track last speaking state to avoid spamming signals
  const lastSpeakingStateRef = useRef(false);
  
  // Voice activity detection loop - only detects LOCAL audio
  useEffect(() => {
    if (!roomId || !user?.id) return;
    
    // Start detection loop
    voiceDetectionIntervalRef.current = setInterval(() => {
      // Only check local user's audio
      const localAnalyser = analyserNodesRef.current[user.id];
      if (!localAnalyser?.analyser) return;
      
      const { analyser, dataArray } = localAnalyser;
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume (focus on voice frequency range ~300-3000Hz)
      let sum = 0;
      const voiceStart = 2;
      const voiceEnd = Math.min(16, dataArray.length);
      for (let i = voiceStart; i < voiceEnd; i++) {
        sum += dataArray[i];
      }
      const average = sum / (voiceEnd - voiceStart);
      
      const isSpeaking = average > VOICE_THRESHOLD;
      
      // Broadcast if state changed
      if (isSpeaking !== lastSpeakingStateRef.current) {
        lastSpeakingStateRef.current = isSpeaking;
        broadcastSpeakingState(isSpeaking);
        
        // Update local state too (for own display if needed)
        setSpeakingUsers(prev => ({
          ...prev,
          [user.id]: isSpeaking
        }));
      }
    }, 100); // Check every 100ms
    
    return () => {
      if (voiceDetectionIntervalRef.current) {
        clearInterval(voiceDetectionIntervalRef.current);
      }
    };
  }, [roomId, user?.id]);

  // Auto-start audio on mount
  useEffect(() => {
    if (user?.id && roomId) {
      startMedia({ audio: true, video: false }).catch(err => {
        console.log("Auto-start audio failed:", err);
      });
    }
  }, [user?.id, roomId]);

  // Initialize Local Stream (Lazy)
  const startMedia = async (constraints) => {
    try {
      // If we already have a stream, just return it
      if (localStreamRef.current) return localStreamRef.current;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      // Set up audio analyser for local voice activity detection
      if (user?.id && stream.getAudioTracks().length > 0) {
        setupAudioAnalyser(user.id, stream);
      }

      // Add tracks to existing peers using replaceTrack (transceivers already exist)
      for (const [peerId, { pc }] of Object.entries(peersRef.current)) {
        stream.getTracks().forEach((track) => {
          // Find existing transceiver for this track kind
          const transceiver = pc.getTransceivers().find(
            t => t.sender.track === null && t.receiver.track?.kind === track.kind
          );
          if (transceiver) {
            transceiver.sender.replaceTrack(track);
            console.log(`Replaced ${track.kind} track for ${peerId}`);
          } else {
            // Fallback to addTrack if no matching transceiver
            pc.addTrack(track, stream);
            console.log(`Added ${track.kind} track for ${peerId}`);
          }
        });
        
        // Manually trigger negotiation since onnegotiationneeded may not fire
        // Use locking to prevent conflicts with onnegotiationneeded
        if (makingOfferRef.current[peerId]) {
          console.log(`⚠️ Already making offer for ${peerId}, skipping manual negotiation`);
          continue;
        }

        // Check signaling state to prevent "have-remote-offer" errors
        if (pc.signalingState !== "stable") {
           console.log(`⚠️ Signaling state is ${pc.signalingState}, skipping manual negotiation for ${peerId}`);
           continue;
        }
        
        try {
          makingOfferRef.current[peerId] = true;
          console.log(`Manually triggering negotiation after adding tracks for ${peerId}`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await sendSignal({
            roomId,
            senderId: user.id,
            receiverId: peerId,
            type: "offer",
            data: pc.localDescription,
          });
        } catch (err) {
          console.error(`Error during manual negotiation for ${peerId}:`, err);
        } finally {
          makingOfferRef.current[peerId] = false;
        }
      }

      return stream;
    } catch (err) {
      console.error("Error accessing media devices:", err);
      return null;
    }
  };

  const toggleAudio = async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await startMedia({ audio: true, video: false });
      if (!stream) return false;
    }
    
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  };

  const toggleVideo = async () => {
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await startMedia({ audio: true, video: true });
      if (!stream) return false;
      // If we just started, ensure audio matches current mute state (which is likely muted if we are here)
      // But we don't have access to isMuted state here easily without passing it or checking track.
      // By default getUserMedia enables tracks.
      // We should probably disable audio if we are just starting video and haven't unmuted.
      // However, toggleVideo is usually independent.
      // Let's just disable audio by default if we are starting fresh from video toggle, 
      // assuming the user hasn't clicked unmute yet.
      stream.getAudioTracks().forEach(t => t.enabled = false);
      return true;
    }

    const videoTrack = stream.getVideoTracks()[0];
    
    if (videoTrack && videoTrack.readyState === 'live') {
      videoTrack.stop();
      stream.removeTrack(videoTrack);
      
      Object.entries(peersRef.current).forEach(([peerId, { pc }]) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(null);
        
        // Send signal that video is disabled
        sendSignal({
          roomId,
          senderId: user.id,
          receiverId: peerId,
          type: "video-state",
          data: { enabled: false }
        }).catch(e => console.error("Error sending video-state:", e));
      });
      
      setLocalStream(new MediaStream(stream.getTracks()));
      return false;
    } else {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        stream.addTrack(newVideoTrack);
        
        Object.entries(peersRef.current).forEach(([peerId, { pc }]) => {
          const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
          if (transceiver && transceiver.sender) {
             transceiver.sender.replaceTrack(newVideoTrack);
          } else {
             pc.addTrack(newVideoTrack, stream);
          }
          
          // Send signal that video is enabled
          sendSignal({
            roomId,
            senderId: user.id,
            receiverId: peerId,
            type: "video-state",
            data: { enabled: true }
          }).catch(e => console.error("Error sending video-state:", e));
        });
        
        setLocalStream(new MediaStream(stream.getTracks()));
        return true;
      } catch (err) {
        console.error("Error enabling video:", err);
        return false;
      }
    }
  };

  // Handle Presence and Signaling
  useEffect(() => {
    if (!roomId || !user) return;

    console.log("Initializing WebRTC for room:", roomId, "User:", user.id);

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Helper to create PeerConnection
    const createPeerConnection = (remoteUserId, isInitiator) => {
      console.log(`Creating PeerConnection for ${remoteUserId}. Initiator: ${isInitiator}`);
      if (peersRef.current[remoteUserId]) return peersRef.current[remoteUserId].pc;

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add transceivers for both audio and video upfront to avoid renegotiation issues
      // This ensures both directions are ready even if we don't have local tracks yet
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      pc.addTransceiver('video', { direction: 'sendrecv' });

      // Add local tracks if they exist
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          // Find the transceiver for this track kind and replace the sender's track
          const transceiver = pc.getTransceivers().find(
            t => t.sender.track === null && t.receiver.track?.kind === track.kind
          );
          if (transceiver) {
            transceiver.sender.replaceTrack(track);
          } else {
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            roomId,
            senderId: user.id,
            receiverId: remoteUserId,
            type: "ice-candidate",
            data: event.candidate,
          }).catch(err => console.error("Error sending ICE candidate:", err));
        }
      };

      // Handle remote stream
      pc.ontrack = async (event) => {
        console.log(`Received remote track from ${remoteUserId}`, event.track.kind);
        
        // Get stream from event, or create one if not available
        let stream = event.streams[0];
        if (!stream) {
          console.log(`No stream in ontrack event, creating new MediaStream for ${remoteUserId}`);
          stream = new MediaStream([event.track]);
        }
        
        // Update peer with stream immediately, preserving existing video state
        setPeers((prev) => {
          const existingPeer = prev[remoteUserId];
          const explicitState = explicitVideoStateRef.current[remoteUserId];
          
          // If we already have a stream, add the new track to it
          let peerStream = existingPeer?.stream || stream;
          if (existingPeer?.stream && existingPeer.stream !== stream) {
            // Add the new track to existing stream if it's not already there
            const existingTrackIds = existingPeer.stream.getTracks().map(t => t.id);
            if (!existingTrackIds.includes(event.track.id)) {
              existingPeer.stream.addTrack(event.track);
            }
            peerStream = existingPeer.stream;
          }
          
          // Determine video state priority:
          // 1. Explicit signaled state (highest priority)
          // 2. Existing peer state (if peer already exists)
          // 3. Track detection (only for initial setup)
          let isVideoEnabled;
          if (explicitState !== undefined) {
            isVideoEnabled = explicitState;
            console.log(`[ontrack] Using explicit video state for ${remoteUserId}:`, isVideoEnabled);
          } else if (existingPeer?.isVideoEnabled !== undefined) {
            isVideoEnabled = existingPeer.isVideoEnabled;
            console.log(`[ontrack] Preserving existing video state for ${remoteUserId}:`, isVideoEnabled);
          } else {
            const videoTrack = peerStream.getVideoTracks()[0];
            isVideoEnabled = videoTrack && videoTrack.enabled && !videoTrack.muted && videoTrack.readyState === 'live';
            console.log(`[ontrack] Using detected video state for ${remoteUserId}:`, isVideoEnabled);
          }
          
          return {
            ...prev,
            [remoteUserId]: { 
              ...existingPeer,
              stream: peerStream, 
              pc,
              username: existingPeer?.username || `User_${remoteUserId.slice(0, 8)}`,
              isVideoEnabled
            },
          };
        });
        
        // Set up audio analyser for voice activity detection
        if (event.track.kind === 'audio' && stream) {
          setupAudioAnalyser(remoteUserId, stream);
        }
        
        // Fetch user details asynchronously and update username only
        try {
          const { data: userDetails } = await supabase
            .from("User")
            .select("username, email")
            .eq("id", remoteUserId)
            .single();
          
          if (userDetails) {
            setPeers((prev) => {
              if (!prev[remoteUserId]) return prev;
              return {
                ...prev,
                [remoteUserId]: { 
                  ...prev[remoteUserId],
                  username: userDetails.username || userDetails.email?.split('@')[0] || prev[remoteUserId].username
                }
              };
            });
          }
        } catch (err) {
          console.error(`Error fetching user details for ${remoteUserId}:`, err);
        }
      };

      // Handle negotiation needed (for when we add tracks later)
      // Note: We use a flag to skip the initial onnegotiationneeded that fires from addTransceiver
      // The manual offer creation in presence handlers will handle the initial negotiation
      let initialNegotiationSkipped = false;
      pc.onnegotiationneeded = async () => {
        // Skip the first negotiation triggered by addTransceiver - we handle it manually
        if (!initialNegotiationSkipped && isInitiator) {
          initialNegotiationSkipped = true;
          console.log(`⏭️ Skipping initial onnegotiationneeded for ${remoteUserId} (will be handled manually)`);
          return;
        }
        
        // Prevent overlapping negotiations
        if (makingOfferRef.current[remoteUserId]) {
          console.log(`⚠️ Already making offer for ${remoteUserId}, skipping onnegotiationneeded`);
          return;
        }
        
        // Check signaling state to prevent "have-remote-offer" errors
        if (pc.signalingState !== "stable") {
           console.log(`⚠️ Signaling state is ${pc.signalingState}, skipping onnegotiationneeded for ${remoteUserId}`);
           return;
        }
        
        try {
          makingOfferRef.current[remoteUserId] = true;
          console.log(`Negotiation needed for ${remoteUserId}`);
          const offer = await pc.createOffer();
          
          // Double-check state hasn't changed during async operation
          if (pc.signalingState !== "stable") {
            console.log(`⚠️ Signaling state changed to ${pc.signalingState} during offer creation, aborting`);
            return;
          }
          
          await pc.setLocalDescription(offer);
          await sendSignal({
            roomId,
            senderId: user.id,
            receiverId: remoteUserId,
            type: "offer",
            data: pc.localDescription,
          });
        } catch (err) {
          console.error("Error during negotiation:", err);
        } finally {
          makingOfferRef.current[remoteUserId] = false;
        }
      };

      peersRef.current[remoteUserId] = { pc, stream: null };
      return pc;
    };

    // Subscribe to Presence
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        console.log("Presence sync:", state);
        setOnlineUsers(Object.keys(state));
        
        // We can also iterate here if needed, but 'join' event is usually sufficient for new peers.
        // However, for existing peers when we join, we need to check state.
        Object.keys(state).forEach(key => {
           if (key !== user.id && !peersRef.current[key]) {
             console.log("Found existing peer in presence:", key);
             // If we are the new joiner, we should probably wait for them to notice us?
             // Or we can initiate. Usually the new joiner initiates to existing peers.
             // Let's initiate to everyone we see who isn't us.
             createPeerConnection(key, true);
           }
        });
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("Presence join:", newPresences);
        setOnlineUsers((prev) => [...new Set([...prev, key])]);
        newPresences.forEach((presence) => {
          if (presence.user_id !== user.id) {
            console.log("New user joined:", presence.user_id);
            // Initiate call to new user
            const pc = createPeerConnection(presence.user_id, true);
            
            makingOfferRef.current[presence.user_id] = true;
            pc.createOffer()
              .then((offer) => pc.setLocalDescription(offer))
              .then(() => {
                return sendSignal({
                  roomId,
                  senderId: user.id,
                  receiverId: presence.user_id,
                  type: "offer",
                  data: pc.localDescription,
                });
              })
              .then(() => {
                makingOfferRef.current[presence.user_id] = false;
              })
              .catch((e) => {
                console.error("Error creating/sending offer:", e);
                makingOfferRef.current[presence.user_id] = false;
              });
          }
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("Presence leave:", leftPresences);
        setOnlineUsers((prev) => prev.filter(id => !leftPresences.some(p => p.user_id === id)));
        leftPresences.forEach((presence) => {
          // Clean up explicit video state
          delete explicitVideoStateRef.current[presence.user_id];
          
          if (peersRef.current[presence.user_id]) {
            peersRef.current[presence.user_id].pc.close();
            delete peersRef.current[presence.user_id];
            setPeers((prev) => {
              const newPeers = { ...prev };
              delete newPeers[presence.user_id];
              return newPeers;
            });
          }
        });
      })
      .subscribe(async (status) => {
        console.log("Subscription status:", status);
        if (status === "SUBSCRIBED") {
          const trackStatus = await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
          console.log("Track status:", trackStatus);
        }
      });

    // Subscribe to Signals
    const unsubscribeSignals = subscribeToSignals(roomId, user.id, async (signal) => {
      const { sender_id, type, data, id: signalId } = signal;
      console.log(`🎯 Processing signal: ${type} from ${sender_id}, signal ID: ${signalId}`);
      
      // Mark as consumed immediately
      await markSignalConsumed(signalId);

      let pc = peersRef.current[sender_id]?.pc;

      if (!pc) {
        // If receiving offer, we are not initiator
        if (type === "offer") {
          console.log(`Creating new PeerConnection for incoming offer from ${sender_id}`);
          pc = createPeerConnection(sender_id, false);
        } else {
          console.log(`⚠️ Ignoring ${type} signal from ${sender_id} - no PeerConnection exists`);
          return; // Ignore other signals if no PC exists
        }
      }

      try {
        if (type === "offer") {
          // Handle offer collision - if we're in the middle of making an offer, we need to rollback
          const isStable = pc.signalingState === "stable" || 
                          (pc.signalingState === "have-local-offer" && ignoreOfferRef.current[sender_id]);
          
          ignoreOfferRef.current[sender_id] = !isStable;
          
          if (!isStable) {
            console.log(`⚠️ Received offer while in ${pc.signalingState} state, will rollback`);
            // Rollback to stable state
            await pc.setLocalDescription({type: "rollback"});
            makingOfferRef.current[sender_id] = false;
          }
          
          console.log(`📝 Setting remote description (offer) from ${sender_id}`);
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            console.log(`✅ Remote description set, creating answer for ${sender_id}`);
          } catch (err) {
            console.error(`❌ Error setting remote offer from ${sender_id}:`, err.message);
            // Skip answering if we can't set remote description
            return;
          }
          
          // Process any pending ICE candidates
          if (pendingIceCandidatesRef.current[sender_id]?.length > 0) {
            console.log(`🧊 Processing ${pendingIceCandidatesRef.current[sender_id].length} pending ICE candidates for ${sender_id}`);
            for (const candidate of pendingIceCandidatesRef.current[sender_id]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error(`❌ Error adding pending ICE candidate for ${sender_id}:`, err);
              }
            }
            pendingIceCandidatesRef.current[sender_id] = [];
          }
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log(`📤 Sending answer to ${sender_id}`);
          await sendSignal({
            roomId,
            senderId: user.id,
            receiverId: sender_id,
            type: "answer",
            data: answer,
          });
          console.log(`✅ Answer sent to ${sender_id}`);
        } else if (type === "answer") {
          // Ignore answer if we're not expecting one
          if (pc.signalingState !== "have-local-offer") {
            console.log(`⚠️ Ignoring answer from ${sender_id} - not in 'have-local-offer' state (current: ${pc.signalingState})`);
            return;
          }
          
          console.log(`📝 Setting remote description (answer) from ${sender_id}`);
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          console.log(`✅ Remote description (answer) set for ${sender_id}`);
          
          // Process any pending ICE candidates
          if (pendingIceCandidatesRef.current[sender_id]?.length > 0) {
            console.log(`🧊 Processing ${pendingIceCandidatesRef.current[sender_id].length} pending ICE candidates for ${sender_id}`);
            for (const candidate of pendingIceCandidatesRef.current[sender_id]) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error(`❌ Error adding pending ICE candidate for ${sender_id}:`, err);
              }
            }
            pendingIceCandidatesRef.current[sender_id] = [];
          }
        } else if (type === "ice-candidate") {
          // Only add ICE candidate if remote description is set
          if (pc.remoteDescription) {
            try {
              console.log(`🧊 Adding ICE candidate from ${sender_id}`);
              await pc.addIceCandidate(new RTCIceCandidate(data));
              console.log(`✅ ICE candidate added for ${sender_id}`);
            } catch (err) {
              // Some ICE candidates may fail to add (e.g., incompatible or outdated)
              // This is normal and can be safely ignored in most cases
              console.warn(`⚠️ Failed to add ICE candidate from ${sender_id}:`, err.message);
            }
          } else {
            // Queue the ICE candidate for later
            console.log(`⏳ Queueing ICE candidate from ${sender_id} (remote description not set yet)`);
            if (!pendingIceCandidatesRef.current[sender_id]) {
              pendingIceCandidatesRef.current[sender_id] = [];
            }
            pendingIceCandidatesRef.current[sender_id].push(data);
          }
        } else if (type === "video-state") {
          console.log(`📹 Video state update from ${sender_id}: ${data.enabled}`);
          // Store in ref so ontrack respects this
          explicitVideoStateRef.current[sender_id] = data.enabled;
          setPeers((prev) => {
            if (!prev[sender_id]) {
              console.log(`⚠️ No peer found for ${sender_id}, storing video-state for later`);
              return prev;
            }
            return {
              ...prev,
              [sender_id]: { ...prev[sender_id], isVideoEnabled: data.enabled }
            };
          });
        } else if (type === "speaking-state") {
          // Update speaking state from remote peer
          setSpeakingUsers((prev) => ({
            ...prev,
            [sender_id]: data.speaking
          }));
        }
      } catch (err) {
        console.error(`❌ Error handling ${type} signal from ${sender_id}:`, err);
      }
    });

    return () => {
      unsubscribeSignals();
      supabase.removeChannel(channel);
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      Object.values(peersRef.current).forEach(({ pc }) => pc.close());
      peersRef.current = {};
      explicitVideoStateRef.current = {};
      setPeers({});
      
      // Clean up voice activity detection resources
      if (voiceDetectionIntervalRef.current) {
        clearInterval(voiceDetectionIntervalRef.current);
        voiceDetectionIntervalRef.current = null;
      }
      Object.keys(analyserNodesRef.current).forEach(cleanupAudioAnalyser);
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setSpeakingUsers({});
    };
  }, [roomId, user]); // Removed localStream dependency

  return { localStream, peers, toggleAudio, toggleVideo, onlineUsers, speakingUsers };
}
