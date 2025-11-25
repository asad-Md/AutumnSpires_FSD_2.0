import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { indexedDBStorage } from '@/lib/storage';

export const useSidebarStore = create(
  persist(
    (set) => ({
      activeTab: 'Friends',
      searchText: '',
      
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSearchText: (text) => set({ searchText: text }),
      
      reset: () => set({ activeTab: 'Friends', searchText: '' }),
    }),
    {
      name: 'sidebar-storage',
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
);
