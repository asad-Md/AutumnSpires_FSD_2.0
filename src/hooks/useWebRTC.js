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
  const peersRef = useRef({}); // Ref to keep track of peers without re-renders
  const localStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef({}); // Queue ICE candidates until remote description is set
  const makingOfferRef = useRef({}); // Track if we're currently making an offer for each peer
  const ignoreOfferRef = useRef({}); // Track if we should ignore incoming offers during our negotiation

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

      // Add tracks to existing peers and manually trigger negotiation
      for (const [peerId, { pc }] of Object.entries(peersRef.current)) {
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
        
        // Manually trigger negotiation since onnegotiationneeded may not fire
        // Use locking to prevent conflicts with onnegotiationneeded
        if (makingOfferRef.current[peerId]) {
          console.log(`⚠️ Already making offer for ${peerId}, skipping manual negotiation`);
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

      // Add local tracks if they exist
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
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
        
        // Fetch user details for the remote user
        const { data: userDetails, error: userError } = await supabase
          .from("User")
          .select("username, email")
          .eq("id", remoteUserId)
          .single();
        
        if (userError) {
          console.error(`Error fetching user details for ${remoteUserId}:`, userError);
        } else {
          console.log(`User details for ${remoteUserId}:`, userDetails);
        }
        
        const stream = event.streams[0];
        const videoTrack = stream.getVideoTracks()[0];
        // Initial video state
        let isVideoEnabled = videoTrack && videoTrack.enabled && !videoTrack.muted && videoTrack.readyState === 'live';

        // Listen for track changes to update UI
        event.track.onmute = () => {
          console.log(`Track ${event.track.kind} muted from ${remoteUserId}`);
          if (event.track.kind === 'video') {
            setPeers((prev) => ({
              ...prev,
              [remoteUserId]: { ...prev[remoteUserId], isVideoEnabled: false }
            }));
          }
        };
        
        event.track.onunmute = () => {
          console.log(`Track ${event.track.kind} unmuted from ${remoteUserId}`);
          if (event.track.kind === 'video') {
            setPeers((prev) => ({
              ...prev,
              [remoteUserId]: { ...prev[remoteUserId], isVideoEnabled: true }
            }));
          }
        };
        
        event.track.onended = () => {
          console.log(`Track ${event.track.kind} ended from ${remoteUserId}`);
          if (event.track.kind === 'video') {
            setPeers((prev) => ({
              ...prev,
              [remoteUserId]: { ...prev[remoteUserId], isVideoEnabled: false }
            }));
          }
        };
        
        // Listen for stream track changes
        stream.onaddtrack = (e) => {
          console.log(`Track added to stream for ${remoteUserId}`, e.track.kind);
          if (e.track.kind === 'video') {
             setPeers((prev) => ({
              ...prev,
              [remoteUserId]: { ...prev[remoteUserId], isVideoEnabled: !e.track.muted }
            }));
          }
        };
        
        stream.onremovetrack = (e) => {
          console.log(`Track removed from stream for ${remoteUserId}`, e.track.kind);
          if (e.track.kind === 'video') {
             setPeers((prev) => ({
              ...prev,
              [remoteUserId]: { ...prev[remoteUserId], isVideoEnabled: false }
            }));
          }
        };
        
        setPeers((prev) => ({
          ...prev,
          [remoteUserId]: { 
            stream, 
            pc,
            username: userDetails?.username || userDetails?.email?.split('@')[0] || `User_${remoteUserId.slice(0, 8)}`,
            isVideoEnabled: prev[remoteUserId]?.isVideoEnabled || isVideoEnabled // Keep existing state if available or use new
          },
        }));
      };

      // Handle negotiation needed (for when we add tracks later)
      pc.onnegotiationneeded = async () => {
        // Prevent overlapping negotiations
        if (makingOfferRef.current[remoteUserId]) {
          console.log(`⚠️ Already making offer for ${remoteUserId}, skipping onnegotiationneeded`);
          return;
        }
        
        try {
          makingOfferRef.current[remoteUserId] = true;
          console.log(`Negotiation needed for ${remoteUserId}`);
          const offer = await pc.createOffer();
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
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          console.log(`✅ Remote description set, creating answer for ${sender_id}`);
          
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
          setPeers((prev) => ({
            ...prev,
            [sender_id]: { ...prev[sender_id], isVideoEnabled: data.enabled }
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
      setPeers({});
    };
  }, [roomId, user]); // Removed localStream dependency

  return { localStream, peers, toggleAudio, toggleVideo, onlineUsers };
}
