"use client";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import useRoomStore from "@/store/roomStore";
import { useEffect, useState } from "react";
import FriendChat from "@/components/chat/friendChat";
import RoomDetails from "@/components/room/roomDetails";

export default function HomePage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated, friends, fetchFriends } = useUserStore();
    const { selectedChat, selectedRoom, _hasHydrated: chatHydrated } = useChatStore();
    const { rooms, fetchRooms, _hasHydrated: roomsHydrated } = useRoomStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        if (_hasHydrated) {
            setIsChecking(false);
            if (!isAuthenticated) {
                router.push("/auth");
            }
        }
    }, [_hasHydrated, isAuthenticated, router]);

    // Lazy load rooms and friends when empty
    useEffect(() => {
        if (user?.id && _hasHydrated && roomsHydrated) {
            // Always fetch to ensure sync with DB and clear potential duplicates
            fetchRooms(user.id);
            fetchFriends(user.id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, _hasHydrated, roomsHydrated]);

    if (isChecking || !isAuthenticated || !user || !chatHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                {/* <div className="text-center">
                    <div className="animate-pulse text-2xl font-bold mb-4">Loading...</div>
                </div> */}
            </div>
        );
    }

    if (selectedChat) {
        return <FriendChat />;
    }

    if (selectedRoom) {
        return <RoomDetails />;
    }

    return (
        <div className="flex flex-col items-center justify-center p-4 h-full">
            <div className="text-center">
                <p className="text-2xl mb-2">
                    Hello, <span className="text-yellow font-semibold">{user.username}</span>!
                </p>
                <p className="text-white mb-8">
                    Welcome to Autshire
                </p>
                
                <div className="bg-white/5 border border-white/10 rounded-lg p-6 max-w-md mx-auto">
                    <h3 className="text-lg font-semibold mb-4">Get Started</h3>
                    <p className="text-sm text-gray-300 mb-4">
                        Select a friend to start chatting or join a room to connect with the community.
                    </p>
                    <div className="text-xs text-gray-400">
                        <p>Member since: {new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}