"use client";

import { useChatStore } from "@/store/chatStore";

export default function FriendItem({ friend, latestMessage }) {
  const { setSelectedChat, selectedChat } = useChatStore();
  const isSelected = selectedChat?.id === friend.id;

  const getAvatarDisplay = () => {
    if (friend.avatar_url) {
      return <img src={friend.avatar_url} alt={friend.username} className="w-full h-full rounded-full object-cover" />;
    }
    return <span className="text-white">{friend.username.charAt(0).toUpperCase()}</span>;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const hasUnreadMessage = latestMessage && !latestMessage.is_read && latestMessage.sender_id === friend.id;

  return (
    <div 
      onClick={() => setSelectedChat(friend)}
      className={`${isSelected ? 'bg-white/20 hover:bg-white/25' : 'hover:bg-white/15'}  rounded-4xl p-1.5 pr-2 mb-2 cursor-pointer relative transition-all duration-300 ease-in`}
    >
      <div className="flex items-stretch gap-1.5">
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-white to-black/30 flex items-center justify-center text-xl shrink-0">
          {getAvatarDisplay()}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1 pr-1">
            <span className="text-white text-sm font-medium truncate">
              {friend.username}
            </span>
            {latestMessage && (
              <span className="text-gray-500 text-[10px]">
                {formatTime(latestMessage.created_at)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-gray-400 text-xs truncate">
              {latestMessage ? latestMessage.content : friend.bio || 'No messages yet'}
            </p>
            {hasUnreadMessage && (
              <div className="w-2 h-2 bg-white rounded-full mr-1 shrink-0"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
