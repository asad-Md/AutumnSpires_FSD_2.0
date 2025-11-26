"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";
import { useE2EE } from "@/hooks/useE2EE";
import {
  encryptMessage,
  decryptMessage,
  createEncryptedPayload,
  parseEncryptedContent,
} from "@/lib/crypto";

export function useFriendChat(friendId) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [e2eeEnabled, setE2eeEnabled] = useState(false);
  const { user, updateFriend } = useUserStore();
  const messagesEndRef = useRef(null);

  // Store user in ref to avoid effect re-runs when user object reference changes
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Extract stable userId to use in dependency arrays
  const userId = user?.id;

  // E2EE hook
  const {
    isInitialized: e2eeInitialized,
    keyVersion,
    getSharedKey,
    isFriendE2EEEnabled,
  } = useE2EE(user?.id);

  // Refs to avoid stale closures in realtime handlers
  const e2eeInitializedRef = useRef(e2eeInitialized);
  const getSharedKeyRef = useRef(getSharedKey);

  useEffect(() => {
    e2eeInitializedRef.current = e2eeInitialized;
  }, [e2eeInitialized]);

  useEffect(() => {
    getSharedKeyRef.current = getSharedKey;
  }, [getSharedKey]);

  // Debug log for E2EE state
  useEffect(() => {
    console.log(
      "[E2EE] State - userId:",
      user?.id,
      "e2eeInitialized:",
      e2eeInitialized,
      "friendId:",
      friendId
    );
  }, [user?.id, e2eeInitialized, friendId]);

  // Check if E2EE is enabled for this conversation
  useEffect(() => {
    const checkE2EE = async () => {
      if (!friendId || !e2eeInitialized) {
        setE2eeEnabled(false);
        return;
      }
      const friendHasE2EE = await isFriendE2EEEnabled(friendId);
      setE2eeEnabled(friendHasE2EE);
    };
    checkE2EE();
  }, [friendId, e2eeInitialized, isFriendE2EEEnabled]);

  // Decrypt a single message
  const decryptMessageContent = useCallback(
    async (message) => {
      if (!message.content) return message;

      const encryptedData = parseEncryptedContent(message.content);
      console.log(
        "[E2EE] Checking message:",
        message.id,
        "isEncrypted:",
        !!encryptedData
      );

      if (!encryptedData) {
        // Not encrypted, return as-is
        return message;
      }

      try {
        // Determine who we need the shared key with
        const otherUserId =
          message.sender_id === user?.id
            ? message.receiver_id
            : message.sender_id;

        console.log("[E2EE] Getting shared key for:", otherUserId);
        const sharedKey = await getSharedKey(otherUserId);
        console.log("[E2EE] Shared key obtained:", !!sharedKey);

        if (!sharedKey) {
          return {
            ...message,
            content: "[Unable to decrypt - missing key]",
            decryptionFailed: true,
          };
        }

        const decryptedContent = await decryptMessage(
          encryptedData.ciphertext,
          encryptedData.iv,
          sharedKey
        );

        console.log(
          "[E2EE] Decrypted successfully:",
          decryptedContent.substring(0, 20) + "..."
        );
        return { ...message, content: decryptedContent, isEncrypted: true };
      } catch (err) {
        console.error("[E2EE] Decryption error:", err);
        return {
          ...message,
          content: "[Decryption failed]",
          decryptionFailed: true,
        };
      }
    },
    [user?.id, getSharedKey]
  );

  // Decrypt all messages in a batch - always try to decrypt encrypted messages
  const decryptMessages = useCallback(
    async (msgs) => {
      console.log("[E2EE] decryptMessages called, msgCount:", msgs.length);

      // Try to decrypt each message that looks encrypted
      const decrypted = await Promise.all(
        msgs.map(async (message) => {
          if (!message.content) return message;

          const encryptedData = parseEncryptedContent(message.content);

          // Log first few chars of content to debug
          if (message.content.includes("encrypted")) {
            console.log(
              "[E2EE] Message",
              message.id,
              "content preview:",
              message.content.substring(0, 80)
            );
            console.log("[E2EE] parseEncryptedContent result:", encryptedData);
          }

          if (!encryptedData) {
            // Not encrypted, return as-is
            return message;
          }

          try {
            // Determine who we need the shared key with
            const otherUserId =
              message.sender_id === user?.id
                ? message.receiver_id
                : message.sender_id;

            const sharedKey = await getSharedKey(otherUserId);
            if (!sharedKey) {
              console.log("[E2EE] No shared key yet for:", otherUserId);
              // Return encrypted content as-is, will be decrypted later
              return message;
            }

            const decryptedContent = await decryptMessage(
              encryptedData.ciphertext,
              encryptedData.iv,
              sharedKey
            );

            console.log("[E2EE] Decrypted message:", message.id);
            return { ...message, content: decryptedContent, isEncrypted: true };
          } catch (err) {
            console.error(
              "[E2EE] Decryption error for message:",
              message.id,
              err.name,
              err.message
            );
            console.error(
              "[E2EE] This usually means the message was encrypted with different keys (key mismatch)"
            );
            // Preserve original content for future retry attempts
            return {
              ...message,
              originalContent: message.content, // Save original encrypted content
              content: "[Decryption failed - key mismatch]",
              decryptionFailed: true,
            };
          }
        })
      );

      return decrypted;
    },
    [user?.id, getSharedKey]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track messages in a ref so we can access them without adding to dependencies
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Re-decrypt messages when E2EE becomes initialized or when keys change (keyVersion)
  useEffect(() => {
    if (!e2eeInitialized) {
      return;
    }

    // Small delay to ensure messages have been fetched
    const timeoutId = setTimeout(async () => {
      const currentMessages = messagesRef.current;
      if (!currentMessages || currentMessages.length === 0) {
        console.log("[E2EE] No messages to decrypt yet");
        return;
      }

      // Check if any message needs decryption (is still encrypted JSON or failed before)
      const hasEncryptedMessages = currentMessages.some((msg) => {
        if (!msg.content) return false;
        // Try to re-decrypt if it's encrypted OR if it previously failed (has originalContent)
        const encryptedData = parseEncryptedContent(msg.content);
        return encryptedData !== null || msg.originalContent;
      });

      if (!hasEncryptedMessages) {
        console.log("[E2EE] No encrypted messages to decrypt");
        return;
      }

      console.log(
        "[E2EE] Re-decrypting messages, count:",
        currentMessages.length,
        "keyVersion:",
        keyVersion
      );

      const decrypted = await Promise.all(
        currentMessages.map(async (message) => {
          if (!message.content && !message.originalContent) return message;

          // If message already decrypted successfully and has no originalContent (not a retry), skip
          if (message.isEncrypted && !message.originalContent) {
            return message;
          }

          // Use originalContent if available (for retries), otherwise use content
          const contentToDecrypt = message.originalContent || message.content;
          const encryptedData = parseEncryptedContent(contentToDecrypt);

          if (!encryptedData) return message;

          try {
            const otherUserId =
              message.sender_id === user?.id
                ? message.receiver_id
                : message.sender_id;

            const sharedKey = await getSharedKey(otherUserId);
            if (!sharedKey) {
              console.log("[E2EE] No shared key for:", otherUserId);
              return {
                ...message,
                content: "[Unable to decrypt - missing key]",
                originalContent: contentToDecrypt,
                decryptionFailed: true,
              };
            }

            const decryptedContent = await decryptMessage(
              encryptedData.ciphertext,
              encryptedData.iv,
              sharedKey
            );

            console.log("[E2EE] Re-decrypted message:", message.id);
            return {
              ...message,
              content: decryptedContent,
              isEncrypted: true,
              decryptionFailed: false,
              originalContent: undefined, // Clear originalContent on success
            };
          } catch (err) {
            console.error("[E2EE] Re-decrypt error:", err);
            return {
              ...message,
              content: "[Decryption failed - key mismatch]",
              originalContent: contentToDecrypt, // Preserve original for future retries
              decryptionFailed: true,
            };
          }
        })
      );

      setMessages(decrypted);
      console.log("[E2EE] Re-decrypt effect - setMessages called");
    }, 500); // Wait 500ms for messages to load

    return () => clearTimeout(timeoutId);
  }, [e2eeInitialized, keyVersion, getSharedKey, userId]);

  useEffect(() => {
    if (!friendId || !userId) return;

    const currentUser = userRef.current;
    if (!currentUser) return;

    const fetchMessages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/chat?userId=${userId}&friendId=${friendId}`
        );
        const data = await response.json();
        if (data.success) {
          // Decrypt messages if E2EE is initialized
          const processedMessages = await decryptMessages(data.chats);
          setMessages(processedMessages);
          console.log(
            "[E2EE] Initial fetch - setMessages called, last msg:",
            processedMessages[processedMessages.length - 1]?.content?.substring(
              0,
              30
            )
          );

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
    console.log("[E2EE] fetchMessages triggered for friendId:", friendId);

    // Subscribe to new messages - use two separate filters for better reliability
    const subscriptionId = Math.random().toString(36).substring(7);
    console.log("[E2EE] Creating subscription:", subscriptionId);
    const channel = supabase
      .channel(`chat:${userId}:${friendId}:${subscriptionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Chat",
          filter: `sender_id=eq.${userId}`,
        },
        async (payload) => {
          // Only process if receiver is our friend
          if (payload.new.receiver_id !== friendId) return;

          const currentUser = userRef.current;
          if (!currentUser) return;

          const { data: receiverData } = await supabase
            .from("User")
            .select("id, username, avatar_url")
            .eq("id", payload.new.receiver_id)
            .single();

          let messageWithDetails = {
            ...payload.new,
            sender: {
              id: currentUser.id,
              username: currentUser.username,
              avatar_url: currentUser.avatar_url,
            },
            receiver: receiverData,
          };

          // Use ref to get latest e2eeInitialized value (avoid stale closure)
          const isE2EEReady = e2eeInitializedRef.current;
          console.log(
            "[E2EE] Sender realtime - e2eeInitialized:",
            isE2EEReady,
            "content:",
            messageWithDetails.content?.substring(0, 50)
          );

          // Always try to decrypt if E2EE is ready
          if (isE2EEReady) {
            const encryptedData = parseEncryptedContent(
              messageWithDetails.content
            );
            if (encryptedData) {
              try {
                const sharedKey = await getSharedKeyRef.current(friendId);
                if (sharedKey) {
                  const decryptedContent = await decryptMessage(
                    encryptedData.ciphertext,
                    encryptedData.iv,
                    sharedKey
                  );
                  messageWithDetails = {
                    ...messageWithDetails,
                    content: decryptedContent,
                    isEncrypted: true,
                  };
                  console.log(
                    "[E2EE] Sender realtime decrypted:",
                    decryptedContent.substring(0, 30)
                  );
                }
              } catch (err) {
                console.error("[E2EE] Sender realtime decrypt error:", err);
              }
            }
          }

          setMessages((prev) => {
            // Skip if we already have this message (by real ID)
            if (prev.some((m) => m.id === payload.new.id)) {
              console.log(
                "[E2EE] Sender realtime - message already exists, skipping:",
                payload.new.id
              );
              return prev;
            }
            // Also skip if this is our own message (we added it optimistically)
            // The optimistic message will be updated by sendMessage when it gets the real ID
            if (payload.new.sender_id === currentUser.id) {
              // Check if we have a pending message with matching content/time
              const hasPendingMatch = prev.some(
                (m) =>
                  m.pending &&
                  m.sender_id === payload.new.sender_id &&
                  m.receiver_id === payload.new.receiver_id
              );
              if (hasPendingMatch) {
                console.log(
                  "[E2EE] Sender realtime - skipping, have pending optimistic message"
                );
                return prev;
              }
            }
            console.log(
              "[E2EE] Sender realtime - adding message to state:",
              messageWithDetails.id,
              "content:",
              messageWithDetails.content?.substring(0, 30)
            );
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
          const currentUser = userRef.current;
          if (!currentUser) return;
          if (payload.new.receiver_id !== currentUser.id) return;

          const { data: senderData } = await supabase
            .from("User")
            .select("id, username, avatar_url")
            .eq("id", payload.new.sender_id)
            .single();

          let messageWithDetails = {
            ...payload.new,
            sender: senderData,
            receiver: {
              id: currentUser.id,
              username: currentUser.username,
              avatar_url: currentUser.avatar_url,
            },
          };

          // Use ref to get latest e2eeInitialized value (avoid stale closure)
          const isE2EEReady = e2eeInitializedRef.current;
          console.log(
            "[E2EE] Receiver realtime - e2eeInitialized:",
            isE2EEReady,
            "content:",
            messageWithDetails.content?.substring(0, 50)
          );

          // Always try to decrypt if E2EE is ready
          if (isE2EEReady) {
            const encryptedData = parseEncryptedContent(
              messageWithDetails.content
            );
            if (encryptedData) {
              try {
                const sharedKey = await getSharedKeyRef.current(friendId);
                if (sharedKey) {
                  const decryptedContent = await decryptMessage(
                    encryptedData.ciphertext,
                    encryptedData.iv,
                    sharedKey
                  );
                  messageWithDetails = {
                    ...messageWithDetails,
                    content: decryptedContent,
                    isEncrypted: true,
                  };
                  console.log(
                    "[E2EE] Receiver realtime decrypted:",
                    decryptedContent.substring(0, 30)
                  );
                }
              } catch (err) {
                console.error("[E2EE] Receiver realtime decrypt error:", err);
              }
            }
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) {
              console.log(
                "[E2EE] Receiver realtime - message already exists, skipping:",
                payload.new.id
              );
              return prev;
            }
            console.log(
              "[E2EE] Receiver realtime - adding message to state:",
              messageWithDetails.id,
              "content:",
              messageWithDetails.content?.substring(0, 30)
            );
            return [...prev, messageWithDetails];
          });

          // Mark as read
          await supabase
            .from("Chat")
            .update({ is_read: true })
            .eq("id", payload.new.id);

          // Use decrypted content for sidebar update
          updateFriend(friendId, {
            latestMessage: { ...messageWithDetails, is_read: true },
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
          console.log(
            "[E2EE] UPDATE event received for message:",
            payload.new.id
          );
          // Only update non-content fields to avoid overwriting decrypted content
          setMessages((prev) =>
            prev.map((chat) => {
              if (chat.id === payload.new.id) {
                // Keep the existing content (which may be decrypted), only update other fields
                const { content, ...otherFields } = payload.new;
                console.log(
                  "[E2EE] UPDATE - preserving content:",
                  chat.content?.substring(0, 30)
                );
                return { ...chat, ...otherFields };
              }
              return chat;
            })
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
  }, [friendId, userId]); // Use stable userId instead of user object

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
    if ((!content.trim() && attachments.length === 0) || !user || !friendId)
      return;

    // Generate a temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(7)}`;
    const now = new Date().toISOString();

    // Create optimistic message
    const optimisticMessage = {
      id: tempId,
      sender_id: user.id,
      receiver_id: friendId,
      content: content.trim(), // Show unencrypted content locally
      attachments,
      created_at: now,
      is_read: false,
      pending: true, // Mark as pending for UI feedback
      sender: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
      },
    };

    // Immediately add to UI (optimistic update)
    setMessages((prev) => [...prev, optimisticMessage]);
    scrollToBottom();

    try {
      let messageContent = content.trim();

      // Encrypt if E2EE is enabled
      if (e2eeEnabled && e2eeInitialized && messageContent) {
        const sharedKey = await getSharedKey(friendId);
        if (sharedKey) {
          const { ciphertext, iv } = await encryptMessage(
            messageContent,
            sharedKey
          );
          messageContent = JSON.stringify(
            createEncryptedPayload(ciphertext, iv)
          );
        }
      }

      const { data, error } = await supabase
        .from("Chat")
        .insert([
          {
            sender_id: user.id,
            receiver_id: friendId,
            content: messageContent,
            attachments,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...optimisticMessage,
                id: data.id,
                pending: false,
                created_at: data.created_at,
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Error sending message:", error);
      // Mark message as failed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, pending: false, failed: true } : msg
        )
      );
    }
  };

  const uploadFile = async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("chat-attachments")
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

  return {
    messages,
    isLoading,
    sendMessage,
    messagesEndRef,
    isTyping,
    sendTyping,
    addReaction,
    uploadFile,
    e2eeEnabled,
  };
}
