import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { requesterUserId, addresseeUserName } = await request.json();

    if (!requesterUserId || !addresseeUserName) {
      return NextResponse.json(
        { success: false, error: "requesterUserId and addresseeUserName are required" },
        { status: 400 }
      );
    }

    // Look up user by username using admin client
    const { data: users, error: lookupError } = await supabaseAdmin
      .from("User")
      .select("id, username")
      .ilike("username", addresseeUserName.trim())
      .limit(1);

    if (lookupError) {
      console.error("Supabase lookup error:", lookupError);
      throw lookupError;
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const addresseeUserId = users[0].id;

    if (requesterUserId === addresseeUserId) {
      return NextResponse.json(
        { success: false, error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // Check if friendship already exists (both directions)
    const { data: existingFriendship, error: fetchError } = await supabaseAdmin
      .from("Friendship")
      .select("id, status, requesterId, addresseeId")
      .or(
        `and(requesterId.eq.${requesterUserId},addresseeId.eq.${addresseeUserId}),and(requesterId.eq.${addresseeUserId},addresseeId.eq.${requesterUserId})`
      );

    if (fetchError) {
      console.error("Supabase fetch error:", fetchError);
      throw fetchError;
    }

    // Handle existing friendship scenarios
    if (existingFriendship && existingFriendship.length > 0) {
      const existing = existingFriendship[0];

      if (existing.status === "accepted") {
        return NextResponse.json(
          { success: true, friendship: existing, message: "User already a friend" },
          { status: 200 }
        );
      }

      // If pending request from same requester
      if (existing.status === "pending" && existing.requesterId === requesterUserId) {
        return NextResponse.json(
          { success: false, error: "Friendship request already pending from requester" },
          { status: 409 }
        );
      }

      // If pending request from addressee (reverse direction) - accept it
      if (existing.status === "pending" && existing.requesterId === addresseeUserId) {
        const { data: updatedFriendship, error: updateError } = await supabaseAdmin
          .from("Friendship")
          .update({ status: "accepted" })
          .eq("id", existing.id)
          .select()
          .single();

        if (updateError) {
          console.error("Supabase update error:", updateError);
          throw updateError;
        }

        return NextResponse.json({
          success: true,
          friendship: updatedFriendship,
          message: "Friendship request accepted",
        });
      }
    }

    // Create new friendship request using admin client
    const { data: friendship, error: createError } = await supabaseAdmin
      .from("Friendship")
      .insert({
        requesterId: requesterUserId,
        addresseeId: addresseeUserId,
        status: "pending",
      })
      .select()
      .single();

    if (createError) {
      console.error("Supabase create error:", createError);
      throw createError;
    }

    return NextResponse.json({
      success: true,
      friendship,
      message: "Friend request sent successfully",
    });
  } catch (error) {
    console.error("Send friend request error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}
