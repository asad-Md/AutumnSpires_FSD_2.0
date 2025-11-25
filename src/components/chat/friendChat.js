"use client";

import { useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { useFriendChat } from "@/hooks/useFriendChat";
import { X, Send, UserMinus } from "lucide-react";
import { useState, useEffect } from "react";

export default function FriendChat() {
  const { selectedChat, clearSelection } = useChatStore();
  const { user, removeFriend } = useUserStore();
  const [message, setMessage] = useState("");
  
  // Use the hook for real data
  const { messages, isLoading, sendMessage, messagesEndRef } = useFriendChat(selectedChat?.id);

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

  const handleSend = async () => {
    if (message.trim()) {
      await sendMessage(message.trim());
      setMessage("");
    }
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
              <p className="text-green-400 text-xs">Online</p>
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
                  <div
                    key={chat.id}
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
                      <div
                        className={`px-4 py-2 rounded-3xl ${
                          isCurrentUser
                            ? "bg-white/5 text-white"
                            : "bg-white/30 text-white"
                        }`}
                      >
                        <p className="text-sm">{chat.content}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 px-2">
                        {formatTime(chat.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="p-3 border-white/10">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm"
            />
            <button
              onClick={handleSend}
              className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
