"use client";

import { useChatStore } from "@/store/chatStore";

export default function RoomItem({ room, isCollapsed = false }) {
  const { setSelectedRoom, selectedRoom } = useChatStore();
  const isSelected = selectedRoom?.name === room.name;

  if (isCollapsed) {
    return (
      <div
        onClick={() => setSelectedRoom(room)}
        className={`${
          isSelected ? "bg-white/15" : "hover:bg-white/10"
        } rounded-full p-2 mb-2 cursor-pointer transition-all duration-300 ease-in flex justify-center relative`}
      >
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-white to-black/30 flex items-center justify-center text-xl shrink-0 relative">
          {room.icon}
          {room.hasActivity && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-black/20"></div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setSelectedRoom(room)}
      className={`${
        isSelected ? "bg-white/15 hover:bg-white/25" : "hover:bg-white/10"
      } rounded-4xl p-1.5 pr-3 mb-2 cursor-pointer relative transition-all duration-300 ease-in`}
    >
      <div className="flex items-start gap-1.5">
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-white to-black/30 flex items-center justify-center text-xl shrink-0">
          {room.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white text-sm font-medium truncate">
              {room.name}
            </span>
            <span className="text-gray-500 text-xs">
              {room.memberCount} members
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-gray-400 text-xs truncate">{room.description}</p>
            {room.hasActivity && (
              <div className="w-2 h-2 bg-white rounded-full shrink-0"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
