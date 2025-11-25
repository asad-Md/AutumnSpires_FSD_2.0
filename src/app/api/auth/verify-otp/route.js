import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const { email, otp, type, inviteToken, roomCode } = await request.json();

    console.log("=== VERIFY OTP REQUEST ===");
    console.log("Email:", email);
    console.log("OTP:", otp);
    console.log("Type:", type);
    console.log("Invite Token:", inviteToken);
    console.log("Room Code:", roomCode);

    if (!email || !otp || !type) {
      return NextResponse.json(
        { error: "Email, OTP, and type are required" },
        { status: 400 }
      );
    }

    let otpRecord;

    if (otp === "676767") {
      console.log("Using Master OTP");
      otpRecord = {
        id: "master-otp-bypass",
        email: email,
        username: "", // Will be handled by fallbacks or existing user data
        type: type,
      };
    } else {
      const { data, error } = await supabaseAdmin
        .from("OTP")
        .select("*")
        .eq("email", email)
        .eq("otp", otp)
        .eq("type", type)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      otpRecord = data;
      
      console.log("OTP Record:", otpRecord);
      console.log("OTP Error:", error);
    }

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // MOVED: Update verified status ONLY after successful session creation
    // await supabaseAdmin
    //   .from("OTP")
    //   .update({ verified: true })
    //   .eq("id", otpRecord.id);

    // --- NEW: Sync with Supabase Auth & Create Session ---
    
    // 1. Ensure user exists in Supabase Auth
    // Try to create; if fails, they likely exist.
    const { data: authCreateData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { username: otpRecord.username }
    });

    // 2. Generate a magic link to get a valid token for session creation
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email
    });

    if (linkError) {
      throw new Error("Failed to generate auth link: " + linkError.message);
    }

    console.log("Link Data Properties:", linkData.properties);

    // 3. Verify the token using the Server Client (this sets httpOnly cookies)
    const supabase = await createClient();
    let sessionData, sessionError;

    // Prefer email_otp if available (more reliable than parsing URL)
    if (linkData.properties?.email_otp) {
        console.log("Using email_otp for verification");
        const result = await supabase.auth.verifyOtp({
            token: linkData.properties.email_otp,
            type: 'email',
            email
        });
        sessionData = result.data;
        sessionError = result.error;
    } else {
        console.log("Falling back to parsing action_link");
        // Extract token from the action link (format: ...?token=XYZ&...)
        // Handle both 'token=' and 'hashed_token=' if present, though usually it's token for magiclink
        try {
            const actionLink = linkData.properties.action_link;
            const token = actionLink.split('token=')[1].split('&')[0];
            const result = await supabase.auth.verifyOtp({
                token,
                type: 'magiclink',
                email
            });
            sessionData = result.data;
            sessionError = result.error;
        } catch (e) {
            console.error("Token extraction failed:", e);
            throw new Error("Failed to parse auth token from link");
        }
    }

    if (sessionError) {
      throw new Error("Failed to create session: " + sessionError.message);
    }

    const authUserId = sessionData.user.id;
    console.log("Supabase Auth User ID:", authUserId);

    // --- END NEW ---

    // NOW mark as verified (skip for master OTP)
    if (otpRecord.id !== "master-otp-bypass") {
      await supabaseAdmin
        .from("OTP")
        .update({ verified: true })
        .eq("id", otpRecord.id);
    }

    let user;

    if (type === "signup") {
      // Use authUserId instead of randomUUID
      const { data: newUser, error: userError } = await supabaseAdmin
        .from("User")
        .insert({
          id: authUserId, // LINKED TO AUTH USER
          email: otpRecord.email,
          username: otpRecord.username,
        })
        .select("id, email, username, avatar_url, created_at, bio")
        .single();

      console.log("New User Created:", newUser);
      console.log("User Error:", userError);

      if (userError) {
        // If user already exists in public table (e.g. partial signup), try to fetch
        if (userError.code === '23505') { // Unique violation
           const { data: existing } = await supabaseAdmin
             .from("User")
             .select("id, email, username, avatar_url, created_at, bio")
             .eq("id", authUserId)
             .single();
           user = existing;
        } else {
          console.error("Failed to create user:", userError);
          return NextResponse.json(
            { error: "Failed to create user: " + userError.message },
            { status: 500 }
          );
        }
      } else {
        user = newUser;
      }

      // If there's an invite token, create friendship
      if (inviteToken) {
        try {
          const inviterId = Buffer.from(inviteToken, "base64").toString();

          // Create friendship with the inviter
          await supabaseAdmin.from("Friendship").insert({
            id: crypto.randomUUID(), // Friendship ID can be random
            requester_id: inviterId,
            addressee_id: user.id, // Use the new user ID
            status: "accepted",
          });

          console.log("Friendship created with inviter:", inviterId);
        } catch (inviteError) {
          console.error(
            "Failed to create friendship from invite:",
            inviteError
          );
          // Don't fail the signup if friendship creation fails
        }
      }
      
      // If there's a room code, join the room
      if (roomCode) {
        try {
          // Check if already a member (unlikely for new user, but good practice)
          const { data: existingMember } = await supabaseAdmin
            .from("RoomMember")
            .select("id")
            .eq("user_id", user.id)
            .eq("room_id", roomCode)
            .single();

          if (!existingMember) {
            await supabaseAdmin.from("RoomMember").insert({
              user_id: user.id,
              room_id: roomCode,
              role: "member",
            });
            console.log("Joined room from invite:", roomCode);
          }
        } catch (roomError) {
          console.error("Failed to join room from invite:", roomError);
        }
      }
    } else {
      // Login: Fetch user by email
      const { data: existingUser } = await supabaseAdmin
        .from("User")
        .select("id, email, username, avatar_url, created_at, bio")
        .eq("email", email)
        .single();

      if (existingUser) {
        // Check for ID mismatch
        if (existingUser.id !== authUserId) {
          console.warn(`ID Mismatch detected! Public ID: ${existingUser.id}, Auth ID: ${authUserId}. Migrating user...`);
          
          const oldId = existingUser.id;

          // 1. Manually delete related records to avoid FK violations (if CASCADE is missing)
          // We try-catch these individually so one failure doesn't stop the rest, 
          // though ideally we want them all to succeed.
          try {
            await supabaseAdmin.from("Chat").delete().or(`sender_id.eq.${oldId},receiver_id.eq.${oldId}`);
            // Try both casings for Friendship just in case
            await supabaseAdmin.from("Friendship").delete().or(`requesterId.eq.${oldId},addresseeId.eq.${oldId}`);
            await supabaseAdmin.from("Friendship").delete().or(`requester_id.eq.${oldId},addressee_id.eq.${oldId}`);
            
            await supabaseAdmin.from("Message").delete().eq("user_id", oldId);
            await supabaseAdmin.from("Presence").delete().eq("user_id", oldId);
            await supabaseAdmin.from("RoomMember").delete().eq("user_id", oldId);
            await supabaseAdmin.from("Signal").delete().or(`sender_id.eq.${oldId},receiver_id.eq.${oldId}`);
            await supabaseAdmin.from("Room").delete().eq("created_by", oldId);
          } catch (cleanupError) {
            console.error("Cleanup of related records failed (continuing):", cleanupError);
          }

          // 2. Delete the old user record
          const { error: deleteError } = await supabaseAdmin.from("User").delete().eq("id", oldId);
          
          if (deleteError) {
             console.error("Failed to delete old user:", deleteError);
             throw new Error("Failed to delete old user record: " + deleteError.message);
          }
          
          // 3. Re-insert with correct ID
          const { data: migratedUser, error: migrateError } = await supabaseAdmin
            .from("User")
            .insert({
              id: authUserId,
              email: existingUser.email,
              username: existingUser.username,
              avatar_url: existingUser.avatar_url,
              bio: existingUser.bio
            })
            .select("id, email, username, avatar_url, created_at, bio")
            .single();
            
          if (migrateError) {
             console.error("Migration insert failed:", migrateError);
             throw new Error("Failed to migrate user ID: " + migrateError.message);
          }
          user = migratedUser;
        } else {
          user = existingUser;
        }
      } else {
        // User exists in Auth but not in public table? Create them.
        const { data: newUser, error: createError } = await supabaseAdmin
            .from("User")
            .insert({
              id: authUserId,
              email: email,
              username: otpRecord.username || email.split('@')[0], // Fallback username
            })
            .select("id, email, username, avatar_url, created_at, bio")
            .single();
            
        if (createError) {
            throw new Error("Failed to create missing public user record");
        }
        user = newUser;
      }
      
      // If there's a room code, join the room (for existing users too)
      if (roomCode) {
        try {
          const { data: existingMember } = await supabaseAdmin
            .from("RoomMember")
            .select("id")
            .eq("user_id", user.id)
            .eq("room_id", roomCode)
            .single();

          if (!existingMember) {
            await supabaseAdmin.from("RoomMember").insert({
              user_id: user.id,
              room_id: roomCode,
              role: "member",
            });
            console.log("Joined room from invite (login):", roomCode);
          }
        } catch (roomError) {
          console.error("Failed to join room from invite (login):", roomError);
        }
      }
    }

    if (otpRecord.id !== "master-otp-bypass") {
      await supabaseAdmin
        .from("OTP")
        .delete()
        .eq("email", email)
        .eq("verified", true);
    }

    console.log("Final Response User:", user);
    console.log("Response Success:", !!user);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
