import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required field: userId" },
        { status: 400 }
      );
    }

    console.log("[Room API] Fetching rooms for userId:", userId);

    const { data, error } = await supabaseAdmin
      .from("RoomMember")
      .select(
        `
        room_id,
        joined_at,
        role,
        Room (
          id,
          name,
          description,
          created_at,
          created_by,
          is_private
        )
      `
      )
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    console.log("[Room API] Raw room data:", data);
    console.log("[Room API] Room error:", error);

    if (error) {
      console.error("Fetch rooms error:", error);
      return NextResponse.json(
        { error: `Failed to fetch rooms: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log("[Room API] No rooms found");
      return NextResponse.json({
        success: true,
        rooms: [],
      });
    }

    const rooms = data.map((item) => ({
      ...item.Room,
      userRole: item.role,
      joinedAt: item.joined_at,
    }));

    console.log("[Room API] Processed rooms:", rooms);

    return NextResponse.json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error("Fetch rooms error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
