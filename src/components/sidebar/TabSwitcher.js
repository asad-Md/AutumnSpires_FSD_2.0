"use client";

import { useState } from "react";
import { motion } from "motion/react";
import PlainBtn from "@/components/buttons/PlainBtn";

export default function TabSwitcher({ activeTab, setActiveTab }) {
  const [friendsRef, setFriendsRef] = useState(null);
  const [roomsRef, setRoomsRef] = useState(null);

  return (
    <div className="bg-black rounded-4xl border border-gray-800/40 flex items-center mb-4 p-1 relative gap-1">
      {/* Animated background indicator */}
      {friendsRef && roomsRef && (
        <motion.div
          className="absolute bg-white border border-white/30 rounded-full"
          initial={false}
          animate={{
            x:
              (activeTab === "Friends"
                ? friendsRef.offsetLeft
                : roomsRef.offsetLeft) - 4,
            width:
              activeTab === "Friends"
                ? friendsRef.offsetWidth
                : roomsRef.offsetWidth,
            height:
              activeTab === "Friends"
                ? friendsRef.offsetHeight
                : roomsRef.offsetHeight,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        />
      )}

      <PlainBtn
        buttonRef={setFriendsRef}
        onClick={() => setActiveTab("Friends")}
        isActive={activeTab === "Friends"}
      >
        Friends
      </PlainBtn>
      <PlainBtn
        buttonRef={setRoomsRef}
        onClick={() => setActiveTab("Rooms")}
        isActive={activeTab === "Rooms"}
      >
        Rooms
      </PlainBtn>
    </div>
  );
}
