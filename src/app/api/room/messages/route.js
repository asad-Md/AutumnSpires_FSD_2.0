import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  if (!roomId) {
    return NextResponse.json(
      { success: false, error: "Room ID is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Check if user is member of the room
  const { data: membership, error: memberError } = await supabase
    .from("RoomMember")
    .select("id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (memberError || !membership) {
    return NextResponse.json(
      { success: false, error: "You are not a member of this room" },
      { status: 403 }
    );
  }

  const { data: messages, error } = await supabase
    .from("Message")
    .select(`
      *,
      sender:User!user_id(id, username, avatar_url)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, messages });
}
