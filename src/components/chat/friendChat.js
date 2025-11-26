"use client";

import { useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { useFriendChat } from "@/hooks/useFriendChat";
import { X, Send, UserMinus, Smile, Paperclip, Image as ImageIcon, FileText, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import ImageModal from "@/components/common/ImageModal";

export default function FriendChat() {
  const { selectedChat, clearSelection } = useChatStore();
  const { user, removeFriend, onlineUsers } = useUserStore();
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  
  // Use the hook for real data
  const { messages, isLoading, sendMessage, messagesEndRef, isTyping, sendTyping, addReaction, uploadFile } = useFriendChat(selectedChat?.id);

  const handleUnfriend = async () => {
    if (
      confirm(
        `Are you sure you want to remove ${selectedChat.username} as a friend?`
      )
    ) {
      await removeFriend(user.id, selectedChat.id);
      clearSelection();
    }
  };

  // Scroll to bottom when messages change (handled by hook ref, but we can ensure it here too if needed)
  // The hook exposes messagesEndRef which we place at the bottom.

  if (!selectedChat) return null;

  const getAvatarDisplay = (u) => {
    if (u?.avatar_url) {
      return (
        <img
          src={u.avatar_url}
          alt={u.username}
          className="w-full h-full rounded-full object-cover"
        />
      );
    }
    return (
      <span className="text-white text-sm">
        {u?.username?.charAt(0).toUpperCase()}
      </span>
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size too large. Please select a file under 5MB.");
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

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;

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

    await sendMessage(message.trim(), attachments);
    setMessage("");
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="flex-1 flex flex-col h-screen w-full bg-transparent p-2">
      <div className="flex flex-col h-full w-full rounded-4xl bg-white/8">
        <div className="flex items-center justify-between p-3 rounded-t-4xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-white/20 to-white/5 flex items-center justify-center">
              {getAvatarDisplay(selectedChat)}
            </div>
            <div>
              <h2 className="text-white font-medium">
                {selectedChat.username}
              </h2>
              <p className={`text-xs ${onlineUsers.includes(selectedChat.id) ? 'text-green-400' : 'text-gray-400'}`}>
                {onlineUsers.includes(selectedChat.id) ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUnfriend}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-red-400 hover:text-red-300"
              aria-label="Unfriend"
              title="Unfriend"
            >
              <UserMinus className="w-5 h-5" />
            </button>
            <button
              onClick={clearSelection}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5 text-white/70" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
          {isLoading ? (
             <div className="flex items-center justify-center h-full">
               <div className="text-gray-400">Loading...</div>
             </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Start chatting with {selectedChat.username}</p>
            </div>
          ) : (
            <>
              {messages.map((chat) => {
                const isCurrentUser = chat.sender_id === user?.id;
                return (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2 ${
                      isCurrentUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* <div className='w-8 h-8 rounded-full bg-linear-to-br from-white/20 to-white/5 flex items-center justify-center shrink-0'>
                      {getAvatarDisplay(chat.sender)}
                    </div> */}
                    <div
                      className={`flex flex-col ${
                        isCurrentUser ? "items-end" : "items-start"
                      } max-w-[70%]`}
                    >
                      <div className="relative group">
                        <div
                          className={`px-4 py-2 rounded-3xl ${
                            isCurrentUser
                              ? "bg-white/5 text-white"
                              : "bg-white/30 text-white"
                          }`}
                        >
                          {chat.attachments && chat.attachments.length > 0 && (
                            <div className="mb-2">
                              {chat.attachments.map((att, index) => (
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
                          <p className="text-sm">{chat.content}</p>
                        </div>
                        
                        {/* Reaction Picker Trigger */}
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isCurrentUser ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <div className="relative group/picker">
                            <button className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                              <Smile className="w-4 h-4" />
                            </button>
                          <div className={`absolute bottom-full ${isCurrentUser ? 'right-0' : 'left-0'} pb-2 hidden group-hover/picker:block z-10`}>
                            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1 flex gap-1">
                              {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => addReaction(chat.id, emoji)}
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
                        {chat.reactions && Object.keys(chat.reactions).length > 0 && (
                          <div className={`flex gap-1 mt-1 flex-wrap ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(chat.reactions).map(([emoji, users]) => {
                                if (!users || users.length === 0) return null;
                                const isReactedByMe = users.includes(user?.id);
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => addReaction(chat.id, emoji)}
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
                      <span className="text-[10px] text-gray-500 mt-1 px-2">
                        {formatTime(chat.created_at)}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={messagesEndRef} />
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 ml-4 mb-2"
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs text-gray-400">Typing...</span>
                </motion.div>
              )}
            </>
          )}
        </div>

        <div className="p-3 border-white/10">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            
            {(previewUrl || selectedFile) && (
              <div className="relative group">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-8 w-8 rounded object-cover border border-white/20" />
                ) : (
                  <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center border border-white/20">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                )}
                <button 
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
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                sendTyping();
              }}
              onPaste={(e) => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].kind === 'file') {
                    const file = items[i].getAsFile();
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert("File size too large. Please paste a file under 5MB.");
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
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm"
            />
            <button
              onClick={handleSend}
              className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              disabled={!message.trim() && !selectedFile}
            >
              <Send className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
      </div>
      <ImageModal 
        src={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </div>
  );
}
