"use client";

import { useState, useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { motion, AnimatePresence } from "motion/react";
import { Check, X, Users } from "lucide-react";

export default function FriendRequests() {
  const { user, friendRequests, fetchFriendRequests, respondToFriendRequest } =
    useUserStore();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchFriendRequests(user.id);
    }
  }, [user?.id, fetchFriendRequests]);

  return (
    <div className="w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 px-4 cursor-pointer bg-white/5 hover:bg-white/10 border border-white/20 rounded-3xl text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Users className="w-4 h-4" />
        Friend Requests
        {friendRequests.length > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-1">
            {friendRequests.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2 bg-white/5 border border-white/20 rounded-3xl flex flex-col gap-2 max-h-60 overflow-y-auto">
              {friendRequests.length === 0 ? (
                <div className="text-center text-gray-400 text-xs py-2">
                  No pending requests
                </div>
              ) : (
                friendRequests.map((req) => (
                  <motion.div
                    key={req.requestId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-white/10 rounded-xl p-2 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                      {req.requester.avatar_url ? (
                        <img
                          src={req.requester.avatar_url}
                          alt={req.requester.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        req.requester.username.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {req.requester.username}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() =>
                            respondToFriendRequest(req.requestId, "accept")
                          }
                          className="p-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                          title="Accept"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() =>
                            respondToFriendRequest(req.requestId, "reject")
                          }
                          className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
