import { get, set, del, clear } from 'idb-keyval';

export const indexedDBStorage = {
  getItem: async (name) => {
    return (await get(name)) || null;
  },
  setItem: async (name, value) => {
    await set(name, value);
  },
  removeItem: async (name) => {
    await del(name);
  },
};

export const clearAllStores = async () => {
  await clear();
};
