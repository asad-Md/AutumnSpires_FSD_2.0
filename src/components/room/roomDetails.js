"use client";

import { useChatStore } from "@/store/chatStore";
import { useSnackbar } from "@/store/snackbarStore";
import { X, Share2, Copy, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export default function RoomDetails() {
  const { selectedRoom, clearSelection } = useChatStore();
  const { showSnackbar } = useSnackbar();
  const router = useRouter();

  if (!selectedRoom) return null;

  const handleCopyLink = () => {
    if (selectedRoom?.id) {
      const shareUrl = `${window.location.origin}/auth?roomCode=${selectedRoom.id}`;
      navigator.clipboard.writeText(shareUrl);
      showSnackbar("Room invite link copied!", "success");
    }
  };

  const handleCopyCode = () => {
    if (selectedRoom?.id) {
      navigator.clipboard.writeText(selectedRoom.id);
      showSnackbar("Room code copied!", "success");
    }
  };

  const handleJoinRoom = () => {
    window.open(`/room/${selectedRoom.id}`, '_blank');
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-transparent p-2">
      <div className="flex flex-col h-full w-full rounded-4xl bg-white/8">
        <div className="flex items-center justify-between p-3 rounded-t-4xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-white to-black/30 flex items-center justify-center text-lg">
              {selectedRoom.icon || "🏰"}
            </div>
            <div>
              <h2 className="text-white font-semibold">{selectedRoom.name}</h2>
              <p className="text-gray-400 text-sm">{selectedRoom.memberCount} members</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyLink}
              className="p-2.5 hover:bg-white/10 rounded-full transition-colors"
              title="Copy Invite Link"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleCopyCode}
              className="p-2.5 hover:bg-white/10 rounded-full transition-colors"
              title="Copy Room Code"
            >
              <Copy className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={clearSelection}
              className="p-2.5 mr-1 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Close room"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col">
          <div className="bg-white/4 rounded-4xl p-6 mb-4 border border-white/10">
            <h3 className="text-white font-semibold text-lg mb-2">About this Room</h3>
            <p className="text-gray-400">{selectedRoom.description}</p>
          </div>

          <div className="bg-white/4 rounded-4xl p-6 border border-white/10 mb-auto">
            <h3 className="text-white font-semibold text-lg mb-4">Room Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Members</span>
                <span className="text-white">{selectedRoom.memberCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status</span>
                <span className="text-white">{selectedRoom.hasActivity ? "Active" : "Quiet"}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleJoinRoom}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold text-lg shadow-lg shadow-white/20 hover:shadow-white/40 transition-all duration-300 flex items-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
              <LogIn className="w-5 h-5" />
              <span>Enter Room Space</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

