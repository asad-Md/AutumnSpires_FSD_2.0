"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function useRealtimeChats(userId, friendId) {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !friendId) return;

    const fetchInitialChats = async () => {
      try {
        const response = await fetch(
          `/api/chat?userId=${userId}&friendId=${friendId}`
        );
        const data = await response.json();
        if (data.success) {
          setChats(data.chats);
        }
      } catch (error) {
        console.error("Error fetching chats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialChats();

    const channel = supabase
      .channel("chat-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Chat",
          filter: `sender_id=eq.${userId},receiver_id=eq.${friendId}`,
        },
        (payload) => {
          setChats((prev) => [...prev, payload.new]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Chat",
          filter: `sender_id=eq.${friendId},receiver_id=eq.${userId}`,
        },
        (payload) => {
          setChats((prev) => [...prev, payload.new]);
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
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === payload.new.id ? payload.new : chat
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, friendId]);

  return { chats, isLoading, setChats };
}

export function useUnreadCount(userId) {
  const [unreadCount, setUnreadCount] = useState({});

  useEffect(() => {
    if (!userId) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(`/api/chat/unread?userId=${userId}`);
        const data = await response.json();
        if (data.success) {
          setUnreadCount(data.unreadCount);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    const channel = supabase
      .channel("unread-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Chat",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return unreadCount;
}
