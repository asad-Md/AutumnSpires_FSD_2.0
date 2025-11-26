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

  const sendMessage = async (content, attachments = []) => {
    if ((!content.trim() && attachments.length === 0) || !user || !roomId) return;

    try {
      const { error } = await supabase.from("Message").insert({
        room_id: roomId,
        user_id: user.id,
        content: content.trim(),
        attachments,
      });

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Message",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            )
          );
        }
      )
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

  const addReaction = async (messageId, emoji) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc("toggle_room_message_reaction", {
        p_message_id: messageId,
        p_user_id: user.id,
        p_emoji: emoji,
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  return { messages, isLoading, sendMessage, messagesEndRef, typingUsers, sendTyping, addReaction, uploadFile };
}
