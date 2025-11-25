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

    console.log("[Friendship API] Fetching friendships for userId:", userId);

    // Fetch friendships where user is either requester or addressee and status is accepted
    const { data: friendships, error: friendshipError } = await supabaseAdmin
      .from("Friendship")
      .select("*")
      .or(`requesterId.eq.${userId},addresseeId.eq.${userId}`)
      .eq("status", "accepted")
      .order("createdAt", { ascending: false });

    console.log("[Friendship API] Raw friendships data:", friendships);
    console.log("[Friendship API] Friendship error:", friendshipError);

    if (friendshipError) {
      console.error("Fetch friendships error:", friendshipError);
      return NextResponse.json(
        { error: `Failed to fetch friendships: ${friendshipError.message}` },
        { status: 500 }
      );
    }

    if (!friendships || friendships.length === 0) {
      console.log("[Friendship API] No friendships found");
      return NextResponse.json({
        success: true,
        friends: [],
      });
    }

    // Extract friend IDs (the other person in each friendship)
    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );

    console.log("[Friendship API] Extracted friend IDs:", friendIds);

    if (friendIds.length === 0) {
      return NextResponse.json({
        success: true,
        friends: [],
      });
    }

    // Fetch user details for all friends
    const { data: friends, error: friendsError } = await supabaseAdmin
      .from("User")
      .select("id, username, email, avatar_url, bio, created_at")
      .in("id", friendIds);

    if (friendsError) {
      console.error("Fetch friends error:", friendsError);
      return NextResponse.json(
        { error: `Failed to fetch friends: ${friendsError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      friends,
    });
  } catch (error) {
    console.error("Fetch friends error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch friends" },
      { status: 500 }
    );
  }
}
