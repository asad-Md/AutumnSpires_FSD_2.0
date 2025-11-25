import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin"; // Use admin for friendship check if needed, or just use authenticated client

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const friendId = searchParams.get("friendId");

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: "userId and friendId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Authorization: Ensure the requesting user is the userId param
    if (user.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You can only fetch your own chats" },
        { status: 403 }
      );
    }

    // Security: Check if they are friends
    const { data: friendship, error: friendshipError } = await supabaseAdmin
      .from("Friendship")
      .select("id")
      .or(`and(requesterId.eq.${userId},addresseeId.eq.${friendId}),and(requesterId.eq.${friendId},addresseeId.eq.${userId})`)
      .eq("status", "accepted")
      .single();

    if (friendshipError || !friendship) {
      return NextResponse.json(
        { error: "You are not friends with this user" },
        { status: 403 }
      );
    }

    const { data: chats, error } = await supabase
      .from("Chat")
      .select(`
        *,
        sender:User!Chat_sender_id_fkey(id, username, avatar_url),
        receiver:User!Chat_receiver_id_fkey(id, username, avatar_url)
      `)
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, chats });
  } catch (error) {
    console.error("Fetch chats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { sender_id, receiver_id, content } = await request.json();

    if (!sender_id || !receiver_id || !content) {
      return NextResponse.json(
        { error: "sender_id, receiver_id, and content are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Authorization: Ensure the sender is the authenticated user
    if (user.id !== sender_id) {
      return NextResponse.json(
        { error: "Forbidden: You can only send messages as yourself" },
        { status: 403 }
      );
    }

    // Security: Check if they are friends
    const { data: friendship, error: friendshipError } = await supabaseAdmin
      .from("Friendship")
      .select("id")
      .or(`and(requesterId.eq.${sender_id},addresseeId.eq.${receiver_id}),and(requesterId.eq.${receiver_id},addresseeId.eq.${sender_id})`)
      .eq("status", "accepted")
      .single();

    if (friendshipError || !friendship) {
      return NextResponse.json(
        { error: "You are not friends with this user" },
        { status: 403 }
      );
    }

    const { data: chat, error } = await supabase
      .from("Chat")
      .insert({
        sender_id,
        receiver_id,
        content,
      })
      .select(`
        *,
        sender:User!Chat_sender_id_fkey(id, username, avatar_url),
        receiver:User!Chat_receiver_id_fkey(id, username, avatar_url)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, chat });
  } catch (error) {
    console.error("Send chat error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const { userId, friendId } = await request.json();

    if (!userId || !friendId) {
      return NextResponse.json(
        { error: "userId and friendId are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Authorization: Ensure the user marking as read is the authenticated user
    if (user.id !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("Chat")
      .update({ is_read: true })
      .eq("sender_id", friendId)
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark as read error:", error);
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    );
  }
}
