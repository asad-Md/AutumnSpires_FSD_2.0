"use client";

import { useSnackbar } from "@/store/snackbarStore";
import { X } from "lucide-react";

export default function Snackbar() {
  const { message, type, isOpen, closeSnackbar } = useSnackbar();

  if (!isOpen) return null;

  const bgColor = {
    info: "bg-blue-200/80",
    success: "bg-green-200/80",
    error: "bg-red-200/80",
  }[type] || "bg-blue-200/80";

  return (
    <div className={`fixed bottom-20 left-4 max-w-64 z-50 ${bgColor} text-white px-4 py-3 rounded-lg flex items-center justify-between gap-3 backdrop-blur-sm shadow-lg`}>
      <span className="text-sm">{message}</span>
      <button
        onClick={closeSnackbar}
        className="hover:bg-white/20 p-1 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
