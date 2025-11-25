import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useChatStore = create(
  persist(
    (set) => ({
      selectedChat: null,
      chats: [
        // Mock data removed. Real data is fetched via hooks.
      ],
      
      setSelectedChat: (chat) => set({ selectedChat: chat, selectedRoom: null }),
      setSelectedRoom: (room) => set({ selectedRoom: room, selectedChat: null }),
      clearSelection: () => set({ selectedChat: null, selectedRoom: null }),
      
      getLatestMessageForFriend: (friendId) => {
        const state = useChatStore.getState();
        const friendChats = state.chats.filter(
          (chat) => chat.sender_id === friendId || chat.receiver_id === friendId
        );
        if (friendChats.length === 0) return null;
        return friendChats[friendChats.length - 1];
      },
      
      addMessage: (content, receiverId) => {
        set((state) => {
          const newMessage = {
            id: state.chats.length + 1,
            sender_id: "current_user",
            receiver_id: receiverId,
            content: content,
            created_at: new Date().toISOString(),
            edited_at: null,
            is_read: true,
            sender: {
              id: "current_user",
              username: "You",
              avatar_url: null
            }
          };
          return { chats: [...state.chats, newMessage] };
        });
      },
      
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
    }),
    {
      name: "chat-storage",
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          return {
            ...persistedState,
            chats: [],
            selectedChat: null,
            selectedRoom: null,
          };
        }
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
