"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, Check, X, AlertCircle, UserPlus, UserRoundSearch, UserSearch } from "lucide-react";
import { useSnackbar } from "@/store/snackbarStore";
import { useUserStore } from "@/store/userStore";

export default function AddFriendBtn() {
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [requestStatus, setRequestStatus] = useState(null); // null, "sent", "error", "pending", "already_friend"
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const { user } = useUserStore();

  const handleSendRequest = async () => {
    if (!user) {
      showSnackbar("Please login to send friend requests", "error");
      return;
    }

    if (!searchInput.trim()) {
      showSnackbar("Please enter a username", "info");
      return;
    }

    setIsLoading(true);
    setRequestStatus(null);

    try {
      const response = await fetch("/api/friendship/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterUserId: user.id,
          addresseeUserName: searchInput.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Check the friendship status returned
        if (data.friendship.status === "accepted") {
          setRequestStatus("already_friend");
          showSnackbar("User already a friend", "success");
          setTimeout(() => {
            setIsAddingFriend(false);
            setSearchInput("");
            setRequestStatus(null);
          }, 1500);
        } else {
          setRequestStatus("sent");
          showSnackbar(`Friend request sent to ${searchInput}`, "success");
          setTimeout(() => {
            setIsAddingFriend(false);
            setSearchInput("");
            setRequestStatus(null);
          }, 1500);
        }
      } else if (response.status === 404) {
        setRequestStatus("error");
        showSnackbar("User not found", "error");
      } else if (data.error && data.error.includes("pending from requester")) {
        setRequestStatus("pending");
        showSnackbar("Request already pending", "info");
      } else if (data.error && data.error.includes("accepted")) {
        setRequestStatus("already_friend");
        showSnackbar("User already a friend", "success");
      } else {
        setRequestStatus("error");
        showSnackbar(data.error || "Failed to send request", "error");
      }

      // Reset all statuses after 1500ms
      setTimeout(() => {
        setRequestStatus(null);
      }, 1500);
    } catch (error) {
      console.error("Send request error:", error);
      setRequestStatus("error");
      showSnackbar("Failed to send friend request", "error");

      // Reset after 1500ms
      setTimeout(() => {
        setRequestStatus(null);
      }, 1500);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    setIsAddingFriend(false);
    setSearchInput("");
    setRequestStatus(null);
  };

  return (
    <div className="w-full my-2">
      <button
        onClick={() => setIsAddingFriend(!isAddingFriend)}
        className="w-full py-2 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/20 rounded-3xl text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        <UserSearch className="w-4 h-4" />
        Add Friend
      </button>

      <AnimatePresence>
        {isAddingFriend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 bg-white/5 border border-white/20 rounded-3xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-sm font-medium">
                  Add Friend
                </span>
                <button
                  onClick={() => {
                    setIsAddingFriend(false);
                    setSearchInput("");
                    setRequestStatus(null);
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 cursor-pointer text-white/70" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendRequest()}
                  placeholder="Enter username"
                  className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/20 rounded-full text-white text-sm placeholder-gray-400 outline-none focus:border-white/40 transition-colors"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  onClick={handleSendRequest}
                  disabled={isLoading}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {requestStatus === "sent" ||
                  requestStatus === "already_friend" ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : requestStatus === "error" ? (
                    <X className="w-4 h-4 text-red-400" />
                  ) : requestStatus === "pending" ? (
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
