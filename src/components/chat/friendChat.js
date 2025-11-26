"use client";

import { useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { useFriendChat } from "@/hooks/useFriendChat";
import {
  X,
  Send,
  UserMinus,
  Smile,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download,
  Lock,
  LockOpen,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import ImageModal from "@/components/common/ImageModal";

export default function FriendChat() {
  const { selectedChat, clearSelection } = useChatStore();
  const { user, removeFriend, onlineUsers } = useUserStore();
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null); // Track which message shows timestamp
  const [replyTo, setReplyTo] = useState(null); // Track message being replied to
  const [highlightedMessageId, setHighlightedMessageId] = useState(null); // Track message to highlight

  // Use the hook for real data
  const {
    messages,
    isLoading,
    sendMessage,
    messagesEndRef,
    isTyping,
    sendTyping,
    addReaction,
    uploadFile,
    e2eeEnabled,
  } = useFriendChat(selectedChat?.id);

  // Debug: log messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log(
        "[FriendChat] Last message in state:",
        lastMsg.id,
        "content:",
        lastMsg.content?.substring(0, 50)
      );
    }
  }, [messages]);

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
    // Ensure timestamp is treated as UTC if no timezone specified
    let date = new Date(timestamp);

    // If timestamp doesn't end with Z or timezone offset, treat as UTC
    if (
      typeof timestamp === "string" &&
      !timestamp.endsWith("Z") &&
      !timestamp.match(/[+-]\d{2}:\d{2}$/)
    ) {
      date = new Date(timestamp + "Z");
    }

    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Check if message is on a different day than previous
  const isNewDay = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;

    let currentDate = new Date(currentMsg.created_at);
    let prevDate = new Date(prevMsg.created_at);

    // Handle UTC parsing
    if (
      typeof currentMsg.created_at === "string" &&
      !currentMsg.created_at.endsWith("Z")
    ) {
      currentDate = new Date(currentMsg.created_at + "Z");
    }
    if (
      typeof prevMsg.created_at === "string" &&
      !prevMsg.created_at.endsWith("Z")
    ) {
      prevDate = new Date(prevMsg.created_at + "Z");
    }

    return currentDate.toDateString() !== prevDate.toDateString();
  };

  // Check if two messages are more than 5 minutes apart (same day only)
  const isNewTimeGroup = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    if (isNewDay(currentMsg, prevMsg)) return true; // New day = new group

    const currentTime = new Date(currentMsg.created_at);
    const prevTime = new Date(prevMsg.created_at);
    const diffMinutes = (currentTime - prevTime) / (1000 * 60);
    return diffMinutes >= 5;
  };

  // Format date for day separators (only shows day/date, not time)
  const formatDaySeparator = (timestamp) => {
    let date = new Date(timestamp);
    if (
      typeof timestamp === "string" &&
      !timestamp.endsWith("Z") &&
      !timestamp.match(/[+-]\d{2}:\d{2}$/)
    ) {
      date = new Date(timestamp + "Z");
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return "Today";
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  // Handle message click to toggle timestamp
  const handleMessageClick = (messageId) => {
    setSelectedMessageId(selectedMessageId === messageId ? null : messageId);
  };

  // Handle double-click to reply to a message
  const handleMessageDoubleClick = (chat) => {
    setReplyTo({
      id: chat.id,
      content: chat.content,
      sender_id: chat.sender_id,
      senderName: chat.sender_id === user?.id ? "You" : selectedChat?.username,
    });
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyTo(null);
  };

  // Scroll to and highlight a message (when clicking reply reference)
  const scrollToAndHighlight = (messageId) => {
    const replyEl = document.getElementById(`msg-${messageId}`);
    if (replyEl) {
      replyEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      // Remove highlight after animation
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 1500);
    }
  };

  // Find a message by ID (for displaying reply reference)
  const findMessageById = (id) => {
    return messages.find((m) => m.id === id || m.id === String(id));
  };

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("File size too large. Please select a file under 5MB.");
        return;
      }
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;

    // Store values and clear input immediately for faster typing
    const messageToSend = message.trim();
    const fileToSend = selectedFile;
    const replyToSend = replyTo;
    setMessage("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setReplyTo(null);

    let attachments = [];
    if (fileToSend) {
      const fileUrl = await uploadFile(fileToSend);
      if (fileUrl) {
        attachments.push({
          type: fileToSend.type.startsWith("image/") ? "image" : "file",
          url: fileUrl,
          name: fileToSend.name,
          size: fileToSend.size,
        });
      }
    }

    await sendMessage(messageToSend, attachments, replyToSend);
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
              <div className="flex items-center gap-2">
                <h2 className="text-white font-medium">
                  {selectedChat.username}
                </h2>
                {e2eeEnabled && (
                  <div
                    className="flex items-center gap-1 text-green-400"
                    title="End-to-end encrypted"
                  >
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>
              <p
                className={`text-xs ${
                  onlineUsers.includes(selectedChat.id)
                    ? "text-green-400"
                    : "text-gray-400"
                }`}
              >
                {onlineUsers.includes(selectedChat.id) ? "Online" : "Offline"}
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

        <div
          className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar"
          data-lenis-prevent
        >
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
              {messages.map((chat, index) => {
                const isCurrentUser = chat.sender_id === user?.id;
                const isPending = chat.pending;
                const isFailed = chat.failed;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                // Don't show time separator for pending messages
                const showTimeSeparator =
                  !isPending && isNewTimeGroup(chat, prevMessage);
                const showDaySeparator =
                  !isPending && isNewDay(chat, prevMessage);
                const isTimestampVisible = selectedMessageId === chat.id;

                // Check if next message is from same sender (for tighter grouping)
                const nextMessage =
                  index < messages.length - 1 ? messages[index + 1] : null;
                const isLastInGroup =
                  !nextMessage ||
                  nextMessage.sender_id !== chat.sender_id ||
                  isNewTimeGroup(nextMessage, chat);

                // Check if first in group (for rounded corners)
                const isFirstInGroup =
                  !prevMessage ||
                  prevMessage.sender_id !== chat.sender_id ||
                  showTimeSeparator;

                // Determine border radius based on position in group
                const getBorderRadius = () => {
                  if (isCurrentUser) {
                    // Right side messages (sent by me)
                    if (isFirstInGroup && isLastInGroup) return "rounded-3xl"; // Single message
                    if (isFirstInGroup) return "rounded-3xl rounded-br-lg"; // First in group
                    if (isLastInGroup) return "rounded-3xl rounded-tr-lg"; // Last in group
                    return "rounded-3xl rounded-r-lg"; // Middle message
                  } else {
                    // Left side messages (received)
                    if (isFirstInGroup && isLastInGroup) return "rounded-3xl"; // Single message
                    if (isFirstInGroup) return "rounded-3xl rounded-bl-lg"; // First in group
                    if (isLastInGroup) return "rounded-3xl rounded-tl-lg"; // Last in group
                    return "rounded-3xl rounded-l-lg"; // Middle message
                  }
                };

                return (
                  <div key={chat.id}>
                    {/* Day separator - shows when date changes */}
                    {showDaySeparator && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] text-gray-400 bg-white/5 px-4 py-1.5 rounded-full font-medium">
                          {formatDaySeparator(chat.created_at)}
                        </span>
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.15 }}
                      onDoubleClick={() => handleMessageDoubleClick(chat)}
                      className={`flex gap-2 w-full cursor-pointer ${
                        isLastInGroup ? "mb-2" : "mb-0.5"
                      } ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <div
                        className={`flex flex-col ${
                          isCurrentUser ? "items-end" : "items-start"
                        } max-w-[70%]`}
                      >
                        <div className="relative group w-full">
                          {/* Reply reference - show what message this is replying to */}
                          {chat.reply_to && (
                            <div
                              className={`mb-1 cursor-pointer ${
                                isCurrentUser ? "ml-auto" : "mr-auto"
                              }`}
                              onClick={() =>
                                scrollToAndHighlight(chat.reply_to.id)
                              }
                            >
                              <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] text-gray-400">
                                <div className="w-0.5 h-4 bg-white/40 rounded-full"></div>
                                <div className="min-w-0">
                                  <span className="font-medium text-white/70">
                                    {chat.reply_to.senderName}
                                  </span>
                                  <p className="truncate max-w-[180px] text-gray-500">
                                    {chat.reply_to.content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div
                            id={`msg-${chat.id}`}
                            onClick={() => handleMessageClick(chat.id)}
                            className={`relative px-4 py-2 ${getBorderRadius()} break-words whitespace-pre-wrap overflow-hidden cursor-pointer select-none transition-all duration-300 ${
                              isCurrentUser
                                ? "bg-white/5 text-white"
                                : "bg-white/30 text-white"
                            } ${isPending ? "opacity-70" : ""} ${
                              isFailed ? "message-failed" : ""
                            }`}
                          >
                            {/* Highlight overlay */}
                            {highlightedMessageId === chat.id && (
                              <div className="absolute inset-0 bg-white/40 rounded-[inherit] pointer-events-none animate-pulse" />
                            )}
                            {chat.attachments &&
                              chat.attachments.length > 0 && (
                                <div className="mb-2">
                                  {chat.attachments.map((att, index) =>
                                    att.type === "image" ? (
                                      <div
                                        key={index}
                                        className="relative group/image inline-block"
                                      >
                                        <img
                                          src={att.url}
                                          alt="Attachment"
                                          className="max-w-[200px] rounded-lg border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() =>
                                            setSelectedImage(att.url)
                                          }
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
                                      <div
                                        key={index}
                                        className="relative group/file"
                                      >
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
                                            <p className="text-sm font-medium text-white truncate">
                                              {att.name || "File"}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                              {(att.size / 1024).toFixed(1)} KB
                                            </p>
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
                                  )}
                                </div>
                              )}
                            <div className="flex items-center gap-1">
                              <p
                                className={`text-sm ${
                                  chat.decryptionFailed
                                    ? "text-red-400 italic"
                                    : ""
                                }`}
                              >
                                {chat.content}
                              </p>
                            </div>
                          </div>

                          {/* Reaction Picker Trigger */}
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 ${
                              isCurrentUser ? "-left-8" : "-right-8"
                            } opacity-0 group-hover:opacity-100 transition-opacity`}
                          >
                            <div className="relative group/picker">
                              <button className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <Smile className="w-4 h-4" />
                              </button>
                              <div
                                className={`absolute bottom-full ${
                                  isCurrentUser ? "right-0" : "left-0"
                                } pb-2 hidden group-hover/picker:block z-10`}
                              >
                                <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1 flex gap-1">
                                  {["👍", "❤️", "😂", "😮", "😢", "🔥"].map(
                                    (emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          addReaction(chat.id, emoji)
                                        }
                                        className="p-1.5 hover:bg-white/20 rounded-full text-lg transition-colors hover:scale-110"
                                      >
                                        {emoji}
                                      </button>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Reactions Display */}
                          {chat.reactions &&
                            Object.keys(chat.reactions).length > 0 && (
                              <div
                                className={`flex gap-1 mt-1 flex-wrap ${
                                  isCurrentUser
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                {Object.entries(chat.reactions).map(
                                  ([emoji, users]) => {
                                    if (!users || users.length === 0)
                                      return null;
                                    const isReactedByMe = users.includes(
                                      user?.id
                                    );
                                    return (
                                      <button
                                        key={emoji}
                                        onClick={() =>
                                          addReaction(chat.id, emoji)
                                        }
                                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                                          isReactedByMe
                                            ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                                        }`}
                                      >
                                        <span>{emoji}</span>
                                        <span className="opacity-70">
                                          {users.length}
                                        </span>
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            )}
                        </div>
                        {/* Timestamp - only show on click, not for pending/sending */}
                        {isTimestampVisible && !isPending && (
                          <motion.span
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-[10px] text-gray-500 mt-1 px-2 flex items-center gap-1"
                          >
                            {isFailed ? (
                              <span className="text-red-400">
                                Failed to send
                              </span>
                            ) : (
                              formatTime(chat.created_at)
                            )}
                          </motion.span>
                        )}
                      </div>
                    </motion.div>
                  </div>
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

        {/* Reply preview */}
        {replyTo && (
          <div className="mx-3 mt-2 px-3 py-2 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <div className="w-0.5 h-8 bg-white/40 rounded-full shrink-0 mt-0.5"></div>
                <div className="min-w-0">
                  <span className="text-xs font-medium text-white/70">
                    {replyTo.senderName}
                  </span>
                  <p className="text-sm text-gray-400 truncate max-w-[250px]">
                    {replyTo.content}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelReply}
                className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

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
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-8 w-8 rounded object-cover border border-white/20"
                  />
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
                  if (items[i].kind === "file") {
                    const file = items[i].getAsFile();
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert(
                          "File size too large. Please paste a file under 5MB."
                        );
                        return;
                      }
                      setSelectedFile(file);
                      if (file.type.startsWith("image/")) {
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
      <ImageModal src={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}
