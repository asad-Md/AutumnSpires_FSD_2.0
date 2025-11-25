"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSidebarStore } from "@/store/sidebarStore";
import SidebarHeader from "./SidebarHeader";
import TabSwitcher from "./TabSwitcher";
import SearchButton from "./SearchInput";
import AddFriendBtn from "./AddFriendBtn";
import InviteFriendBtn from "./InviteFriendBtn";
import AddRoomBtn from "./AddRoomBtn";
import FriendsList from "./friends/FriendsList";
import FriendRequests from "./friends/FriendRequests";
import RoomsList from "./spires(rooms)/RoomsList";
import UserProfile from "./UserProfile";
import SidebarSkeleton from "./SidebarSkeleton";
import useSidebarResize from "@/hooks/useSidebarResize";

export default function Sidebar() {
  const { activeTab, setActiveTab, searchText, setSearchText } = useSidebarStore();
  const {
    sidebarRef,
    sidebarWidth,
    handleMouseDown,
    isCollapsed,
    isHidden,
    hasHydrated,
  } = useSidebarResize(256);

  if (!hasHydrated) {
    return <SidebarSkeleton />;
  }

  return (
    <>
      <div
        ref={sidebarRef}
        className="bg-black/20 h-screen flex flex-col relative transition-none overflow-hidden"
        style={{
          width: `${sidebarWidth}px`,
          display: isHidden ? "none" : "flex",
        }}
      >
        {!isCollapsed && (
          <div className="p-4 flex flex-col align-middle justify-center">
            <SidebarHeader />
            <TabSwitcher activeTab={activeTab} setActiveTab={setActiveTab} />
            <SearchButton
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={
                activeTab === "Friends" ? "Search friends" : "Search rooms"
              }
            />
            {activeTab === "Friends" && (
              <>
                <FriendRequests />
                <AddFriendBtn />
                <InviteFriendBtn />
              </>
            )}
            {activeTab === "Rooms" && <AddRoomBtn />}
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "Friends" ? (
            <motion.div
              key="friends-tab"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <FriendsList isCollapsed={isCollapsed} searchText={searchText} />
            </motion.div>
          ) : (
            <RoomsList
              key="rooms"
              isCollapsed={isCollapsed}
              searchText={searchText}
            />
          )}
        </AnimatePresence>

        <UserProfile isCollapsed={isCollapsed} />

        {/* Resize Handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-ew-resize transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1 h-10 bg-white/10 group-hover:bg-white/30 group-active:bg-white/40 rounded-full transition-colors" />
        </div>
      </div>

      {/* Show resize handle when sidebar is hidden */}
      {isHidden && (
        <div
          className="absolute top-0 left-0 w-1 h-full cursor-ew-resize transition-colors group z-50"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 left-4 -translate-y-1/2 w-1 h-10 bg-white/10 group-hover:bg-white/30 group-active:bg-white/40 rounded-full transition-colors" />
        </div>
      )}
    </>
  );
}
