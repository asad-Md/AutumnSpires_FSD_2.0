import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { roomCode, userId } = body;

    if (!roomCode || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: roomCode, userId" },
        { status: 400 }
      );
    }

    const { data: room, error: roomError } = await supabaseAdmin
      .from("Room")
      .select("*")
      .eq("id", roomCode)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Invalid room code" },
        { status: 404 }
      );
    }

    const { data: existingMember } = await supabaseAdmin
      .from("RoomMember")
      .select("id")
      .eq("user_id", userId)
      .eq("room_id", roomCode)
      .single();

    if (existingMember) {
      return NextResponse.json({
        success: true,
        room,
        message: "Already a member",
      });
    }

    const { error: memberError } = await supabaseAdmin
      .from("RoomMember")
      .insert({
        user_id: userId,
        room_id: roomCode,
        role: "member",
      });

    if (memberError) {
      console.error("Room member insert error:", memberError);
      return NextResponse.json(
        { error: `Failed to join room: ${memberError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Room join error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join room" },
      { status: 500 }
    );
  }
}
