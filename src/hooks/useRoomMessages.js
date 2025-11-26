"use client";

import { useEffect, useState, useRef } from "react";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";

export function useRoomMessages(roomId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useUserStore();
  const messagesEndRef = useRef(null);


  useEffect(() => {
    if (!roomId || !user) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/room/messages?roomId=${roomId}`);
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`room:${roomId}:messages`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Fetch sender details
          const { data: senderData } = await supabase
            .from("User")
            .select("id, username, avatar_url")
            .eq("id", newMessage.user_id)
            .single();

          const messageWithSender = {
            ...newMessage,
            sender: senderData || { id: newMessage.user_id, username: "Unknown" },
          };

          setMessages((prev) => [...prev, messageWithSender]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content) => {
    if (!content.trim() || !user || !roomId) return;

    try {
      const { error } = await supabase.from("Message").insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutsRef = useRef({});

  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`room:${roomId}:typing`);

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          setTypingUsers((prev) => {
            if (!prev.find((u) => u.id === payload.userId)) {
              return [...prev, { id: payload.userId, username: payload.username }];
            }
            return prev;
          });

          // Clear existing timeout for this user
          if (typingTimeoutsRef.current[payload.userId]) {
            clearTimeout(typingTimeoutsRef.current[payload.userId]);
          }

          // Set new timeout to remove user from typing list
          typingTimeoutsRef.current[payload.userId] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.id !== payload.userId));
            delete typingTimeoutsRef.current[payload.userId];
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
    };
  }, [roomId, user]);

  const sendTyping = async () => {
    if (!user || !roomId) return;
    await supabase.channel(`room:${roomId}:typing`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, username: user.username },
    });
  };

  return { messages, isLoading, sendMessage, messagesEndRef, typingUsers, sendTyping };
}
