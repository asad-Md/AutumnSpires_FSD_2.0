"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, X } from "lucide-react";
import PlainBtn from "@/components/buttons/PlainBtn";
import FormInput from "@/components/auth/FormInput";
import { useUserStore } from "@/store/userStore";
import useRoomStore from "@/store/roomStore";
import { useSnackbar } from "@/store/snackbarStore";

function AddRoomModal({ onClose }) {
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [activeTab, setActiveTab] = useState("create");
  const [createRef, setCreateRef] = useState(null);
  const [joinRef, setJoinRef] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);

  const user = useUserStore((state) => state.user);
  const addRoom = useRoomStore((state) => state.addRoom);
  const showSnackbar = useSnackbar((state) => state.showSnackbar);

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    
    if (!user?.id) {
      showSnackbar("You must be logged in to create a room", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/room/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: roomName,
          description,
          createdBy: user.id,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addRoom(result.room);
        setCreatedRoom(result.room);
        setShowSuccess(true);
      } else {
        showSnackbar(result.error || "Failed to create room", "error");
      }
    } catch (error) {
      console.error("Room creation error:", error);
      showSnackbar("An error occurred while creating the room", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      showSnackbar("You must be logged in to join a room", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/room/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomCode,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addRoom(result.room);
        if (result.message === "Already a member") {
          showSnackbar(`You are already in "${result.room.name}"`, "info");
        } else {
          showSnackbar(`Joined room "${result.room.name}"!`, "success");
        }
        onClose();
      } else {
        showSnackbar(result.error || "Failed to join room", "error");
      }
    } catch (error) {
      console.error("Room join error:", error);
      showSnackbar("An error occurred while joining the room", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (createdRoom?.id) {
      navigator.clipboard.writeText(createdRoom.id);
      showSnackbar("Room code copied to clipboard!", "success", 2000);
    }
  };

  const handleDone = () => {
    onClose();
  };

  if (showSuccess && createdRoom) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="absolute inset-0 bg-black/70 backdrop-blur-2xl"
          aria-hidden="true"
          onClick={handleDone}
        />
        <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/5 px-8 py-8 shadow-2xl">
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 text-white/70 transition hover:text-white"
            onClick={handleDone}
          >
            <X className="h-5 w-5" />
          </button>

          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">
                Room Created!
              </h2>
              <p className="text-sm text-white/60">
                Share this code with friends to invite them
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/20 bg-black/30 p-5">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-white/50">
                  Room Name
                </p>
                <p className="text-lg font-semibold text-white">
                  {createdRoom.name}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-white/50">
                  Host
                </p>
                <p className="text-sm text-white/80">{user?.username}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-white/50">
                Room Code
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-xl border border-white/20 bg-black/40 px-4 py-3 font-mono text-sm text-white/90 break-all">
                  {createdRoom.id}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDone}
                className="flex-1 rounded-2xl border border-white/30 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                Done
              </button>
              <button
                disabled
                className="flex-1 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white/40 cursor-not-allowed"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-2xl"
        aria-hidden="true"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-white/5 px-6 py-6 shadow-2xl flex flex-col items-center gap-4">
        <button
          type="button"
          aria-label="Close add room"
          className="absolute right-4 top-4 text-white/70 transition hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-1 text-center w-full">
          <h2 className="text-lg font-semibold text-white">Create a new room</h2>
          <p className="text-sm text-white/60">Give it a name so your friends can find it.</p>
        </div>

        <div className="mx-auto w-fit bg-black/80 rounded-full border border-white/20 px-1 py-1 relative flex items-center gap-1">
          {createRef && joinRef && (
            <motion.div
              className="absolute inset-y-1 rounded-full bg-white/80 shadow-lg border border-white/40"
              initial={false}
              animate={{
                x: (activeTab === "create" ? createRef.offsetLeft : joinRef.offsetLeft) - 2,
                width:
                  activeTab === "create"
                    ? createRef.offsetWidth
                    : joinRef.offsetWidth,
                height:
                  activeTab === "create"
                    ? createRef.offsetHeight
                    : joinRef.offsetHeight,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <PlainBtn
            buttonRef={setCreateRef}
            onClick={() => setActiveTab("create")}
            isActive={activeTab === "create"}
            className="px-5"
          >
            Create
          </PlainBtn>
          <PlainBtn
            buttonRef={setJoinRef}
            onClick={() => setActiveTab("join")}
            isActive={activeTab === "join"}
            className="px-5"
          >
            Join
          </PlainBtn>
        </div>

        <div className="relative min-h-[220px] w-full">
          <AnimatePresence mode="wait">
            {activeTab === "create" ? (
              <motion.div
                key="create"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={handleCreateSubmit}
                >
                  <FormInput
                    type="text"
                    placeholder="Room name"
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    required
                    className="w-full"
                  />
                  <label className="text-xs uppercase tracking-[0.2em] text-white/70">
                    Description
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="mt-2 w-full resize-none rounded-2xl border border-white/20 bg-black/30 px-4 py-2 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
                      placeholder="Optional description"
                      rows={3}
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="rounded-2xl border border-white/30 px-4 py-2 text-sm text-white/70 transition hover:border-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold text-white drop-shadow-lg transition hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Creating..." : "Create room"}
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="join"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <form
                  className="flex flex-col gap-4"
                  onSubmit={handleJoinSubmit}
                >
                  <FormInput
                    type="text"
                    placeholder="Room code"
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value)}
                    required
                    className="w-full"
                  />
                  <p className="text-xs text-white/60">Enter a code from a friend to jump into their room.</p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="rounded-2xl border border-white/30 px-4 py-2 text-sm text-white/70 transition hover:border-white/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-2xl bg-white/20 px-4 py-2 text-sm font-semibold text-white drop-shadow-lg transition hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Joining..." : "Join room"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AddRoomBtn() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const overflow = isModalOpen ? "hidden" : "";
    document.body.style.overflow = overflow;
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <>
      <button
        aria-label="Add Room"
        className="w-full bg-white/15 hover:bg-white/25 text-white/90 py-2.5 px-4 rounded-3xl flex items-center justify-center gap-2 transition-all duration-300 ease-in-out mt-2 mb-4"
        onClick={() => setIsModalOpen(true)}
      >
        <Send className="h-4 w-4" />
        <span className="text-sm">Add Room</span>
      </button>
      {isModalOpen && <AddRoomModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
