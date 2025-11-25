import { motion } from "motion/react";
import FriendItem from "./FriendItem";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";

export default function FriendsList({ searchText = "" }) {
  const friends = useUserStore((state) => state.friends);
  const getLatestMessageForFriend = useChatStore(
    (state) => state.getLatestMessageForFriend
  );

  const q = (searchText || "").trim().toLowerCase();
  const filtered = q
    ? friends.filter((f) => {
        return (
          (f.username && f.username.toLowerCase().includes(q)) ||
          (f.email && f.email.toLowerCase().includes(q))
        );
      })
    : friends;

  return (
    <div className="flex-1 overflow-y-auto px-2">
      {filtered.map((friend) => {
        const storeMessage = getLatestMessageForFriend(friend.id);
        const apiMessage = friend.latestMessage;
        
        let latestMessage = apiMessage;
        if (storeMessage) {
            if (!apiMessage || new Date(storeMessage.created_at) > new Date(apiMessage.created_at)) {
                latestMessage = storeMessage;
            }
        }
        return (
          <FriendItem
            key={friend.id}
            friend={friend}
            latestMessage={latestMessage}
          />
        );
      })}
    </div>
  );
}
