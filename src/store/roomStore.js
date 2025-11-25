import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useRoomStore = create(
  persist(
    (set, get) => ({
      rooms: [],
      currentRoom: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,
      _version: 2,

  setRooms: (rooms) => set({ rooms }),

  setCurrentRoom: (room) => set({ currentRoom: room }),

  addRoom: (room) =>
    set((state) => {
      const exists = state.rooms.some((r) => r.id === room.id);
      if (exists) return state;
      return { rooms: [...state.rooms, room] };
    }),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((room) => room.id !== roomId),
      currentRoom:
        state.currentRoom?.id === roomId ? null : state.currentRoom,
    })),

  updateRoom: (roomId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId ? { ...room, ...updates } : room
      ),
      currentRoom:
        state.currentRoom?.id === roomId
          ? { ...state.currentRoom, ...updates }
          : state.currentRoom,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),

  fetchRooms: async (userId) => {
    if (!userId) {
      console.log("[roomStore] fetchRooms called with no userId");
      return;
    }
    console.log("[roomStore] Fetching rooms for userId:", userId);
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`/api/room/list?userId=${userId}`);
      const result = await response.json();
      console.log("[roomStore] API response:", response.status, result);
      if (response.ok && result.success) {
        console.log("[roomStore] Setting rooms:", result.rooms);
        set({ rooms: result.rooms, isLoading: false });
      } else {
        console.error("[roomStore] Failed to fetch rooms:", result.error);
        set({ error: result.error || "Failed to fetch rooms", isLoading: false });
      }
    } catch (error) {
      console.error("[roomStore] Fetch rooms error:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  reset: () =>
    set({
      rooms: [],
      currentRoom: null,
      isLoading: false,
      error: null,
    }),

  setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
}),
    {
      name: "room-storage",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState, version) => {
        if (version < 2) {
          return {
            ...persistedState,
            rooms: [],
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

export default useRoomStore;
