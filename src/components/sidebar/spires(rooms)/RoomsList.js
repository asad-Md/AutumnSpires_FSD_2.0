import { motion } from "motion/react";
import RoomItem from "./RoomItem";
import useRoomStore from "@/store/roomStore";

export default function RoomsList({ isCollapsed = false, searchText = "" }) {
  const rooms = useRoomStore((state) => state.rooms);

  const q = (searchText || "").trim().toLowerCase();
  const filtered = q
    ? rooms.filter((r) => {
        return (
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      })
    : rooms;

  return (
    <motion.div
      className={`flex-1 overflow-y-auto ${isCollapsed ? "px-0 py-2" : "px-2"}`}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {filtered.map((room) => (
        <RoomItem key={room.id} room={room} isCollapsed={isCollapsed} />
      ))}
    </motion.div>
  );
}
