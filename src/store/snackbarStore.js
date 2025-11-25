import { create } from "zustand";

export const useSnackbar = create((set) => ({
  message: "",
  type: "info", // "info", "success", "error"
  isOpen: false,

  showSnackbar: (message, type = "info", duration = 3000) => {
    set({ message, type, isOpen: true });
    if (duration > 0) {
      setTimeout(() => {
        set({ isOpen: false });
      }, duration);
    }
  },

  closeSnackbar: () => set({ isOpen: false }),
}));
