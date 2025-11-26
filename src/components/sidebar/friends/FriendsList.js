import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import FriendItem from "./FriendItem";
import { useUserStore } from "@/store/userStore";
import { useChatStore } from "@/store/chatStore";
import { useE2EE } from "@/hooks/useE2EE";
import { parseEncryptedContent, decryptMessage } from "@/lib/crypto";

export default function FriendsList({ searchText = "" }) {
  const friends = useUserStore((state) => state.friends);
  const onlineUsers = useUserStore((state) => state.onlineUsers);
  const user = useUserStore((state) => state.user);
  const chats = useChatStore((state) => state.chats);
  const getLatestMessageForFriend = useChatStore(
    (state) => state.getLatestMessageForFriend
  );
  
  const { isInitialized: e2eeInitialized, getSharedKey } = useE2EE(user?.id);
  const [decryptedMessages, setDecryptedMessages] = useState({});
  
  // Use ref for getSharedKey to avoid stale closures
  const getSharedKeyRef = useRef(getSharedKey);
  useEffect(() => {
    getSharedKeyRef.current = getSharedKey;
  }, [getSharedKey]);

  // Helper to decrypt a single message
  const decryptSingleMessage = useCallback(async (friendId, content) => {
    const encryptedData = parseEncryptedContent(content);
    if (!encryptedData) return null;
    
    try {
      const sharedKey = await getSharedKeyRef.current(friendId);
      if (sharedKey) {
        return await decryptMessage(
          encryptedData.ciphertext,
          encryptedData.iv,
          sharedKey
        );
      }
    } catch (err) {
      // Decryption failed
    }
    return null;
  }, []);

  // Decrypt latest messages for all friends - also react to chats changes
  useEffect(() => {
    if (!e2eeInitialized || !friends.length) return;
    
    const decryptLatestMessages = async () => {
      const decrypted = { ...decryptedMessages };
      let hasChanges = false;
      
      for (const friend of friends) {
        const storeMessage = getLatestMessageForFriend(friend.id);
        const apiMessage = friend.latestMessage;
        
        let latestMessage = apiMessage;
        if (storeMessage) {
          if (!apiMessage || new Date(storeMessage.created_at) > new Date(apiMessage.created_at)) {
            latestMessage = storeMessage;
          }
        }
        
        if (!latestMessage?.content) continue;
        
        // Check if this message needs decryption
        const encryptedData = parseEncryptedContent(latestMessage.content);
        if (!encryptedData) continue;
        
        // Check if we already decrypted this exact message
        const messageKey = `${friend.id}-${latestMessage.id}`;
        if (decrypted[messageKey]) {
          // Already decrypted, use friend.id as key for display
          decrypted[friend.id] = decrypted[messageKey];
          continue;
        }
        
        const decryptedContent = await decryptSingleMessage(friend.id, latestMessage.content);
        if (decryptedContent) {
          decrypted[friend.id] = decryptedContent;
          decrypted[messageKey] = decryptedContent; // Cache with message ID
          hasChanges = true;
        }
      }
      
      if (hasChanges || Object.keys(decrypted).length !== Object.keys(decryptedMessages).length) {
        setDecryptedMessages(decrypted);
      }
    };
    
    decryptLatestMessages();
  }, [e2eeInitialized, friends, chats, getLatestMessageForFriend, decryptSingleMessage]);

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
        
        // If we have a decrypted version, use it
        if (latestMessage && decryptedMessages[friend.id]) {
          latestMessage = { ...latestMessage, content: decryptedMessages[friend.id] };
        }
        
        const isOnline = onlineUsers.includes(friend.id);
        return (
          <FriendItem
            key={friend.id}
            friend={friend}
            latestMessage={latestMessage}
            isOnline={isOnline}
          />
        );
      })}
    </div>
  );
}
