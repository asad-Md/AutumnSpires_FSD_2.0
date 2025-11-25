"use client";

import { useEffect, useState, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";

export function useFriendChat(friendId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserStore();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
        scrollToBottom();
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
          scrollToBottom();
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
          scrollToBottom();
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

  const sendMessage = async (content) => {
    if (!content.trim() || !user || !friendId) return;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender_id: user.id,
          receiver_id: friendId,
          content: content.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // We don't need to manually add to state if subscription works,
      // but for instant feedback we could.
      // However, subscription is fast enough usually.
      // Let's rely on subscription to keep it simple and consistent.
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  return { messages, isLoading, sendMessage, messagesEndRef };
}
