"use client";

import { useEffect, useState, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";

export function useFriendChat(friendId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, updateFriend } = useUserStore();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!friendId || !user) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/chat?userId=${user.id}&friendId=${friendId}`
        );
        const data = await response.json();
        if (data.success) {
          setMessages(data.chats);

          // Mark unread messages as read
          const unreadIds = data.chats
            .filter((m) => !m.is_read && m.sender_id === friendId)
            .map((m) => m.id);

          if (unreadIds.length > 0) {
            await supabase
              .from("Chat")
              .update({ is_read: true })
              .in("id", unreadIds);

            // Update local store for sidebar
            const lastMsg = data.chats[data.chats.length - 1];
            if (lastMsg) {
              updateFriend(friendId, {
                latestMessage: { ...lastMsg, is_read: true },
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to new messages - use two separate filters for better reliability
    const channel = supabase
      .channel(`chat:${user.id}:${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Chat",
          filter: `sender_id=eq.${user.id}`,
        },
        async (payload) => {
          // Only process if receiver is our friend
          if (payload.new.receiver_id !== friendId) return;

          const { data: receiverData } = await supabase
            .from("User")
            .select("id, username, avatar_url")
            .eq("id", payload.new.receiver_id)
            .single();

          const messageWithDetails = {
            ...payload.new,
            sender: {
              id: user.id,
              username: user.username,
              avatar_url: user.avatar_url,
            },
            receiver: receiverData,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, messageWithDetails];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Chat",
          filter: `sender_id=eq.${friendId}`,
        },
        async (payload) => {
          // Only process if receiver is us
          if (payload.new.receiver_id !== user.id) return;

          const { data: senderData } = await supabase
            .from("User")
            .select("id, username, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          const messageWithDetails = {
            ...payload.new,
            sender: senderData,
            receiver: {
              id: user.id,
              username: user.username,
              avatar_url: user.avatar_url,
            },
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, messageWithDetails];
          });

          // Mark as read
          await supabase
            .from("Chat")
            .update({ is_read: true })
            .eq("id", payload.new.id);

          updateFriend(friendId, {
            latestMessage: { ...payload.new, is_read: true },
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Chat",
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((chat) =>
              chat.id === payload.new.id ? { ...chat, ...payload.new } : chat
            )
          );
        }
      )
      .subscribe((status, err) => {
        console.log("🔌 Realtime subscription status:", status);
        if (err) console.error("❌ Realtime subscription error:", err);
      });

    return () => {
      console.log("🔌 Cleaning up realtime channel");
      supabase.removeChannel(channel);
    };
  }, [friendId, user]);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!friendId || !user) return;

    const channelId = `typing:${[user.id, friendId].sort().join("-")}`;
    const channel = supabase.channel(channelId);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setIsTyping(true);
          // Clear existing timeout
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          // Set new timeout to clear typing status
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [friendId, user]);

  const sendMessage = async (content, attachments = []) => {
    if ((!content.trim() && attachments.length === 0) || !user || !friendId) return;

    try {
      const { error } = await supabase.from("Chat").insert([
        {
          sender_id: user.id,
          receiver_id: friendId,
          content: content.trim(),
          attachments,
        },
      ]);

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const uploadFile = async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  };

  const sendTyping = async () => {
    if (!user || !friendId) return;
    const channelId = `typing:${[user.id, friendId].sort().join("-")}`;
    await supabase.channel(channelId).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id },
    });
  };

  const addReaction = async (messageId, emoji) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc("toggle_chat_reaction", {
        p_message_id: messageId,
        p_user_id: user.id,
        p_emoji: emoji,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  return { messages, isLoading, sendMessage, messagesEndRef, isTyping, sendTyping, addReaction, uploadFile };
}
