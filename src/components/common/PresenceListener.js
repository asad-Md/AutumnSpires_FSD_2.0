"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";
import { supabase } from "@/lib/supabase";

export default function PresenceListener() {
  const user = useUserStore((state) => state.user);
  const setOnlineUsers = useUserStore((state) => state.setOnlineUsers);

  useEffect(() => {
    if (!user?.id) return;

    console.log("Initializing global presence for user:", user.id);

    const channel = supabase.channel("global_presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        // console.log("Global presence sync:", state);
        setOnlineUsers(Object.keys(state));
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        // console.log("Global presence join:", key);
        setOnlineUsers((prev) => [...new Set([...prev, key])]);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        // console.log("Global presence leave:", leftPresences);
        setOnlineUsers((prev) =>
          prev.filter((id) => !leftPresences.some((p) => p.user_id === id))
        );
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, setOnlineUsers]);

  return null;
}
