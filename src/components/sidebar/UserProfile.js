"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import profileImg from "@/public/profile.png";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { LogOut } from "lucide-react";

export default function UserProfile() {
  const router = useRouter();
  const { user, clearUser } = useUserStore();
  const { clearSelection } = useChatStore();
  const [isHovered, setIsHovered] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    clearSelection();
    clearUser(); // This will navigate to / after clearing
  };

  return (
    <div 
      className="p-4 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10 shrink-0">
          <Image
            src={profileImg}
            alt={user.username}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {user.username}
          </p>
          <p className="text-gray-400 text-xs truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className={`p-2.5 hover:bg-red/20 rounded-full hover:bg-white/20 transition-all duration-200 ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
          }`}
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4 text-red" />
        </button>
      </div>
    </div>
  );
}
