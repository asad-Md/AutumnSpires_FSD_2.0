"use client";

import { useEffect, useRef, useState } from "react";
import { useUserStore } from "@/store/userStore";

const HIDDEN_WIDTH = 0;
const MIN_AVATAR_WIDTH = 64;
const MIN_SNAP_PERCENT = 14; // percent of screen
const MAX_WIDTH_PERCENT = 40; // percent of screen
const COLLAPSE_THRESHOLD_OFFSET = 20; // additional pixels to consider collapsed

export default function useSidebarResize(initialWidth = 256) {
  const sidebarWidth = useUserStore((state) => state.sidebarWidth);
  const setSidebarWidthStore = useUserStore((state) => state.setSidebarWidth);
  const hasHydrated = useUserStore((state) => state._hasHydrated);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    function handleMouseMove(e) {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const screenWidth = window.innerWidth;
      const minSnapPx = (screenWidth * MIN_SNAP_PERCENT) / 100;
      const maxWidthPx = (screenWidth * MAX_WIDTH_PERCENT) / 100;

      if (newWidth <= 20) {
        setSidebarWidthStore(HIDDEN_WIDTH);
      } else if (newWidth < minSnapPx && newWidth > MIN_AVATAR_WIDTH) {
        setSidebarWidthStore(minSnapPx);
      } else if (newWidth <= MIN_AVATAR_WIDTH) {
        setSidebarWidthStore(MIN_AVATAR_WIDTH);
      } else if (newWidth >= maxWidthPx) {
        setSidebarWidthStore(maxWidthPx);
      } else {
        setSidebarWidthStore(newWidth);
      }
    }

    function handleMouseUp() {
      setIsResizing(false);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
      document.body.style.userSelect = "auto";
    };
  }, [isResizing]);

  const handleMouseDown = () => setIsResizing(true);

  const isCollapsed =
    sidebarWidth <= MIN_AVATAR_WIDTH + COLLAPSE_THRESHOLD_OFFSET;
  const isHidden = sidebarWidth === HIDDEN_WIDTH;

  return {
    sidebarRef,
    sidebarWidth,
    isResizing,
    setIsResizing,
    handleMouseDown,
    isCollapsed,
    isHidden,
    hasHydrated,
  };
}
