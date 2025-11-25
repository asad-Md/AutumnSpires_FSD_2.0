import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, description, createdBy } = body;

    if (!name || !createdBy) {
      return NextResponse.json(
        { error: "Missing required fields: name, createdBy" },
        { status: 400 }
      );
    }
    const roomId = crypto.randomUUID();

    const { data: room, error: roomError } = await supabaseAdmin
      .from("Room")
      .insert({
        id: roomId,
        name,
        description: description || null,
        created_by: createdBy,
        is_private: false,
      })
      .select()
      .single();

    if (roomError) {
      console.error("Room insert error:", roomError);
      return NextResponse.json(
        { error: `Failed to create room: ${roomError.message}` },
        { status: 500 }
      );
    }

    const { error: memberError } = await supabaseAdmin
      .from("RoomMember")
      .insert({
        user_id: createdBy,
        room_id: roomId,
        role: "admin",
      });

    if (memberError) {
      console.error("Room member insert error:", memberError);
      return NextResponse.json(
        { error: `Failed to add room member: ${memberError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room,
    });
  } catch (error) {
    console.error("Room creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create room" },
      { status: 500 }
    );
  }
}
