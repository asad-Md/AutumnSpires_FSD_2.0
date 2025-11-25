"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserPlus, X, Send } from "lucide-react";
import { useSnackbar } from "@/store/snackbarStore";
import { useUserStore } from "@/store/userStore";

export default function InviteFriendBtn() {
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const { user } = useUserStore();

  const handleSendInvite = async () => {
    if (!user) {
      showSnackbar("Please login to send invites", "error");
      return;
    }

    if (!email.trim()) {
      showSnackbar("Please enter an email address", "info");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showSnackbar("Please enter a valid email address", "error");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/friendship/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviterEmail: user.email,
          inviterUsername: user.username,
          inviteeEmail: email.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        showSnackbar("Invitation sent successfully!", "success");
        setEmail("");
        setIsInviting(false);
      } else {
        showSnackbar(data.error || "Failed to send invitation", "error");
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      showSnackbar("Failed to send invitation", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={() => setIsInviting(!isInviting)}
        className="w-full py-2 px-4 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/20 rounded-3xl text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        <UserPlus className="w-4 h-4" />
        Invite Friend
      </button>

      <AnimatePresence>
        {isInviting && (
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
                  Invite Friend
                </span>
                <button
                  onClick={() => {
                    setIsInviting(false);
                    setEmail("");
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 cursor-pointer text-white/70" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendInvite()}
                  placeholder="friend@example.com"
                  className="flex-1 min-w-0 px-3 py-2 bg-white/5 border border-white/20 rounded-full text-white text-sm placeholder-gray-400 outline-none focus:border-white/40 transition-colors"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  onClick={handleSendInvite}
                  disabled={isLoading}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full shrink-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
