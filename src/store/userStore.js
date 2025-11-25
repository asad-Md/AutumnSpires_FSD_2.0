import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { indexedDBStorage } from "@/lib/storage";

export const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      sidebarWidth: 256,
      _version: 2,

      friends: [],
      friendRequests: [],

      setUser: (userData) =>
        set({
          user: userData,
          isAuthenticated: true,
        }),

      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
          friends: [],
          friendRequests: [],
        });
        // Navigate to root after clearing
        window.location.href = "/";
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setFriends: (friends) => set({ friends }),

      fetchFriendRequests: async (userId) => {
        if (!userId) return;
        try {
          const response = await fetch(
            `/api/friendship/requests?userId=${userId}`
          );
          const result = await response.json();
          if (response.ok && result.success) {
            set({ friendRequests: result.requests });
          }
        } catch (error) {
          console.error("[userStore] Fetch friend requests error:", error);
        }
      },

      respondToFriendRequest: async (requestId, action) => {
        try {
          const response = await fetch("/api/friendship/respond", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requestId, action }),
          });

          if (response.ok) {
            // Remove the request from the list locally
            set((state) => ({
              friendRequests: state.friendRequests.filter(
                (req) => req.requestId !== requestId
              ),
            }));

            // If accepted, refresh the friends list
            if (action === "accept") {
              const userId = get().user?.id;
              if (userId) {
                await get().fetchFriends(userId);
              }
            }
          }
        } catch (error) {
          console.error("[userStore] Respond to friend request error:", error);
        }
      },

      removeFriend: async (userId, friendId) => {
        try {
          const response = await fetch("/api/friendship/unfriend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, friendId }),
          });

          if (response.ok) {
            set((state) => ({
              friends: state.friends.filter((f) => f.id !== friendId),
            }));
          }
        } catch (error) {
          console.error("[userStore] Remove friend error:", error);
        }
      },

      fetchFriends: async (userId) => {
        if (!userId) {
          console.log("[userStore] fetchFriends called with no userId");
          return;
        }
        console.log("[userStore] Fetching friends for userId:", userId);
        try {
          const response = await fetch(`/api/friendship/list?userId=${userId}`);
          const result = await response.json();
          console.log("[userStore] API response:", response.status, result);
          if (response.ok && result.success) {
            console.log("[userStore] Setting friends:", result.friends);
            set({ friends: result.friends });
          } else {
            console.error("[userStore] Failed to fetch friends:", result.error);
          }
        } catch (error) {
          console.error("[userStore] Fetch friends error:", error);
        }
      },

      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "user-storage",
      version: 2,
      storage: createJSONStorage(() => indexedDBStorage),
      migrate: (persistedState, version) => {
        if (version < 2) {
          return {
            ...persistedState,
            friends: [],
            _version: 2,
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
