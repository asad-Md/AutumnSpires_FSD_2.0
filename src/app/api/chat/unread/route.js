import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const { data: unreadChats, error } = await supabase
      .from("Chat")
      .select("sender_id")
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    const unreadCount = unreadChats.reduce((acc, chat) => {
      acc[chat.sender_id] = (acc[chat.sender_id] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Get unread count error:", error);
    return NextResponse.json(
      { error: "Failed to get unread count" },
      { status: 500 }
    );
  }
}
