"use client";

import { useEffect, useRef, useState } from "react";
import { useSnackbar } from "@/store/snackbarStore";
import { useUserStore } from "@/store/userStore";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useRoomMessages } from "@/hooks/useRoomMessages";
import { X, Share2, Copy, Mic, MicOff, Video as VideoIcon, VideoOff, Send, MessageSquare, ChevronLeft, Grid, Smile, Paperclip, FileText, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import useRoomStore from "@/store/roomStore";
import ImageModal from "@/components/common/ImageModal";

const VideoPlayer = ({ stream, muted = false, label }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [stream]);

  return (
    <div className="relative bg-black/60 rounded-xl overflow-hidden aspect-video border border-white/10 shadow-lg">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white backdrop-blur-sm">
        {label}
      </div>
    </div>
  );
};

const AudioPlayer = ({ stream }) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return <audio ref={audioRef} autoPlay playsInline controls={false} />;
};

export default function RoomPage() {
  const { roomId } = useParams();
  const router = useRouter();
  const { showSnackbar } = useSnackbar();
  const { user } = useUserStore();
  const { rooms, currentRoom, setCurrentRoom } = useRoomStore();
  
  // WebRTC and Room Messages hooks - must be called before any early returns
  const { localStream, peers, toggleAudio, toggleVideo, onlineUsers, speakingUsers } = useWebRTC(roomId);
  const { 
    messages, 
    isLoading: messagesLoading, 
    sendMessage, 
    messagesEndRef, 
    typingUsers, 
    sendTyping, 
    addReaction, 
    uploadFile 
  } = useRoomMessages(roomId);
  
  // All useState and useRef hooks must be called before any early returns
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [isVideoGridOpen, setIsVideoGridOpen] = useState(false);
  const [gridSize, setGridSize] = useState({ width: 500, height: 400 });
  const [selectedImage, setSelectedImage] = useState(null);
  const fileInputRef = useRef(null);
  
  // Compute video stream stats
  const activeVideoStreams = Object.values(peers).filter(p => p.isVideoEnabled).length;
  const hasActiveVideo = !isVideoOff || activeVideoStreams > 0;
  
  // Find and set the current room based on roomId
  useEffect(() => {
    if (roomId && rooms.length > 0) {
      const foundRoom = rooms.find(r => r.id === roomId);
      if (foundRoom) {
        setCurrentRoom(foundRoom);
      }
    }
  }, [roomId, rooms, setCurrentRoom]);
  
  const room = currentRoom;
  
  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        Loading room...
      </div>
    );
  }

  const handleCopyLink = () => {
    if (room?.id) {
      const shareUrl = `${window.location.origin}/auth?roomCode=${room.id}`;
      navigator.clipboard.writeText(shareUrl);
      showSnackbar("Room invite link copied!", "success");
    }
  };

  const handleCopyCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      showSnackbar("Room code copied!", "success");
    }
  };

  const handleLeave = () => {
    router.push("/home");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showSnackbar("File size too large. Please select a file under 5MB.", "error");
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    let attachments = [];
    if (selectedFile) {
      const fileUrl = await uploadFile(selectedFile);
      if (fileUrl) {
        attachments.push({ 
          type: selectedFile.type.startsWith('image/') ? 'image' : 'file', 
          url: fileUrl,
          name: selectedFile.name,
          size: selectedFile.size
        });
      }
    }

    await sendMessage(newMessage, attachments);
    setNewMessage("");
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleToggleAudio = async () => {
    const enabled = await toggleAudio();
    setIsMuted(!enabled);
  };

  const handleToggleVideo = async () => {
    const enabled = await toggleVideo();
    setIsVideoOff(!enabled);
    if (enabled) {
      setIsVideoGridOpen(true);
    }
  };

  return (
    <div className="relative h-screen w-full bg-black/90 overflow-hidden">
      {/* Cozy Room Background / Placeholder */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center opacity-10">
          <div className="text-9xl mb-4">{room.icon || ""}</div>
          <h1 className="text-6xl font-bold text-white">{room.name}</h1>
        </div>
      </div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-10 pointer-events-none">
        <div className="bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/10 pointer-events-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-linear-to-br from-white to-black/30 flex items-center justify-center text-lg">
            {room.icon || "🏰"}
          </div>
          <div>
            <h2 className="text-white font-semibold">{room.name}</h2>
            <p className="text-gray-400 text-xs">{room.memberCount} members • {onlineUsers.length} online</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
           {/* Video Grid Toggle Indicator */}
           {hasActiveVideo && !isVideoGridOpen && (
            <button 
              onClick={() => setIsVideoGridOpen(true)}
              className="flex items-center gap-2 bg-indigo-500/80 hover:bg-indigo-600/80 text-white px-4 py-2 rounded-full backdrop-blur-md transition-all animate-pulse"
            >
              <VideoIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{activeVideoStreams + (isVideoOff ? 0 : 1)} Streaming</span>
            </button>
          )}

          <div className="bg-black/20 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex gap-1">
            <button onClick={handleCopyLink} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Share Link">
              <Share2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={handleCopyCode} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Copy Code">
              <Copy className="w-4 h-4 text-white" />
            </button>
            <button onClick={handleLeave} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Leave Room">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Draggable Video Grid */}
      <AnimatePresence>
        {isVideoGridOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            drag
            dragMomentum={false}
            className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col"
            style={{ 
              width: gridSize.width, 
              height: gridSize.height
            }}
          >
            {/* Grid Header / Drag Handle */}
            <div className="p-3 border-b border-white/10 flex justify-between items-center cursor-move bg-white/5">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-gray-400" />
                <span className="text-white text-sm font-medium">Video Grid</span>
              </div>
              <button 
                onClick={() => setIsVideoGridOpen(false)}
                className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Grid Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 h-full">
                {/* Local User */}
                {!isVideoOff && localStream && (
                  <VideoPlayer 
                    stream={localStream} 
                    muted={true} 
                    label={`${user?.username || "Me"} (You)`} 
                  />
                )}
                
                {/* Remote Peers Video */}
                {Object.entries(peers)
                  .filter(([_, peer]) => peer.isVideoEnabled)
                  .map(([peerId, { stream, username }]) => (
                    <VideoPlayer 
                      key={`video-${peerId}`} 
                      stream={stream} 
                      muted={true} // Audio is handled by AudioPlayer
                      label={username || `User ${peerId.slice(0, 8)}`} 
                    />
                  ))}

                {/* Remote Peers Audio (Always render to ensure we can hear them) */}
                {Object.entries(peers).map(([peerId, { stream }]) => (
                  <AudioPlayer key={`audio-${peerId}`} stream={stream} />
                ))}
                
                {/* Placeholder if empty */}
                {isVideoOff && Object.values(peers).filter(p => p.isVideoEnabled).length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center text-gray-500 h-full min-h-[200px]">
                    <VideoOff className="w-12 h-12 mb-2 opacity-50" />
                    <p>No active video streams</p>
                  </div>
                )}
              </div>
            </div>

            {/* Resize Handle (Simple implementation) */}
            <motion.div 
              drag
              dragMomentum={false}
              onDrag={(event, info) => {
                setGridSize(prev => ({
                  width: Math.max(300, prev.width + info.delta.x),
                  height: Math.max(200, prev.height + info.delta.y)
                }));
              }}
              className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center"
            >
              <div className="w-2 h-2 bg-white/30 rounded-full" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Chat Card */}
      <motion.div
        drag
        dragConstraints={{ left: 0, right: 0, top: -200, bottom: 200 }}
        dragMomentum={false}
        animate={{ 
          width: isChatCollapsed ? "60px" : "380px",
          x: 0
        }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col transition-all duration-300"
        style={{ height: "50vh" }}
      >
        {/* Chat Header */}
        <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
          {!isChatCollapsed && <span className="text-white text-sm font-medium ml-2">Room Chat</span>}
          <button 
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            className="p-1.5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors mx-auto"
          >
            {isChatCollapsed ? <MessageSquare className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {!isChatCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messagesLoading ? (
                <div className="text-center text-gray-500 text-sm mt-4">Loading...</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col w-full ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] text-gray-400">{msg.sender?.username || "Unknown"}</span>
                    </div>
                    <div className="relative group max-w-[85%]">
                      <div className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap overflow-hidden ${
                        msg.user_id === user?.id 
                          ? 'bg-blue-500/40 text-white rounded-tr-sm' 
                          : 'bg-white/10 text-gray-200 rounded-tl-sm'
                      }`}>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-2">
                            {msg.attachments.map((att, index) => (
                              att.type === 'image' ? (
                                <div key={index} className="relative group/image inline-block">
                                  <img 
                                    src={att.url} 
                                    alt="Attachment" 
                                    className="max-w-[200px] rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setSelectedImage(att.url)}
                                  />
                                  <a 
                                    href={att.url} 
                                    download 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover/image:opacity-100 transition-opacity"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              ) : (
                                <div key={index} className="relative group/file">
                                  <a 
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-black/20 hover:bg-black/30 p-3 rounded-lg border border-white/10 transition-colors"
                                  >
                                    <div className="p-2 bg-white/10 rounded-lg">
                                      <FileText className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white truncate">{att.name || "File"}</p>
                                      <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                  </a>
                                  <a 
                                    href={att.url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-1/2 -translate-y-1/2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover/file:opacity-100 transition-opacity"
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </a>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                        <span className="inline">{msg.content}</span>
                      </div>

                      {/* Reaction Picker Trigger */}
                      <div className={`absolute top-1/2 -translate-y-1/2 ${msg.user_id === user?.id ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <div className="relative group/picker">
                          <button className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                            <Smile className="w-4 h-4" />
                          </button>
                          <div className={`absolute bottom-full ${msg.user_id === user?.id ? 'right-0' : 'left-0'} pb-2 hidden group-hover/picker:block z-10`}>
                            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1 flex gap-1">
                              {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  className="p-1.5 hover:bg-white/20 rounded-full text-lg transition-colors hover:scale-110"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reactions Display */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex gap-1 mt-1 flex-wrap ${msg.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(msg.reactions).map(([emoji, users]) => {
                              if (!users || users.length === 0) return null;
                              const isReactedByMe = users.includes(user?.id);
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(msg.id, emoji)}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                    isReactedByMe 
                                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-200' 
                                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="opacity-70">{users.length}</span>
                                </button>
                              );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
              {typingUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 ml-2 mb-2"
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {typingUsers.map((u) => u.username).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
                  </span>
                </motion.div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/20">
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-gray-400 hover:text-white"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {(previewUrl || selectedFile) && (
                  <div className="relative group">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover border border-white/20" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2 h-2 text-white" />
                    </button>
                  </div>
                )}

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTyping();
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData.items;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].kind === 'file') {
                        const file = items[i].getAsFile();
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            showSnackbar("File size too large. Please paste a file under 5MB.", "error");
                            return;
                          }
                          setSelectedFile(file);
                          if (file.type.startsWith('image/')) {
                            setPreviewUrl(URL.createObjectURL(file));
                          } else {
                            setPreviewUrl(null);
                          }
                        }
                      }
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim() && !selectedFile}
                  className="p-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full p-2 flex items-center gap-4 shadow-2xl">
          <button 
            onClick={handleToggleAudio}
            className={`p-4 rounded-full transition-all duration-300 ${
              isMuted 
                ? 'bg-white/10 hover:bg-white/20 text-gray-400' 
                : 'bg-white text-black shadow-lg shadow-white/20'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          
          <button 
            onClick={handleToggleVideo}
            className={`p-4 rounded-full transition-all duration-300 ${
              isVideoOff 
                ? 'bg-white/10 hover:bg-white/20 text-gray-400' 
                : 'bg-white text-black shadow-lg shadow-white/20'
            }`}
            title={isVideoOff ? "Start Video" : "Stop Video"}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <VideoIcon className="w-6 h-6" />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-1" />

          <button 
            onClick={() => setIsVideoGridOpen(!isVideoGridOpen)}
            className={`p-4 rounded-full transition-all duration-300 ${
              isVideoGridOpen 
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' 
                : 'bg-white/10 hover:bg-white/20 text-gray-400'
            }`}
            title="Toggle Video Grid"
          >
            <Grid className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Voice Activity Indicator - shows remote users who are speaking */}
      <AnimatePresence>
        {Object.keys(speakingUsers || {}).some(userId => speakingUsers[userId] && userId !== user?.id) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-30"
          >
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 shadow-2xl">
              <div className="flex items-center gap-2">
                {Object.entries(speakingUsers || {})
                  .filter(([odifier, isSpeaking]) => isSpeaking && odifier !== user?.id)
                  .map(([speakerId]) => {
                    const peerData = peers[speakerId];
                    const displayName = peerData?.username || `User_${speakerId.slice(0, 6)}`;
                    
                    return (
                      <motion.div
                        key={speakerId}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="relative"
                        title={displayName}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ring-2 ring-green-400 ring-offset-2 ring-offset-black/60 bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-green-400/30">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-black/60"
                        />
                      </motion.div>
                    );
                  })}
                <div className="ml-1 flex items-center gap-1">
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-1.5 h-4 bg-green-400 rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-1.5 h-6 bg-green-400 rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-1.5 h-4 bg-green-400 rounded-full"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal 
          src={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </div>
  );
}
