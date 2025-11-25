import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    console.log("Looking for token:", token);
    
    // First check all OTPs to debug
    const { data: allOTPs } = await supabaseAdmin
      .from("OTP")
      .select("*");
    console.log("All OTPs in DB:", allOTPs);
    
    const { data: otpRecord, error: otpError } = await supabaseAdmin
      .from("OTP")
      .select("*")
      .eq("token", token)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    console.log("OTP Record found:", otpRecord);
    console.log("OTP Error:", otpError);

    if (!otpRecord) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("OTP")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    let user;

    if (otpRecord.type === "signup") {
      const { data: newUser, error: userError } = await supabaseAdmin
        .from("User")
        .insert({
          id: crypto.randomUUID(),
          email: otpRecord.email,
          username: otpRecord.username,
        })
        .select("id, email, username, avatar_url, created_at, bio")
        .single();

      if (userError) {
        console.error("Failed to create user:", userError);
        return NextResponse.json(
          { error: "Failed to create user: " + userError.message },
          { status: 500 }
        );
      }

      user = newUser;
    } else {
      const { data: existingUser } = await supabaseAdmin
        .from("User")
        .select("id, email, username, avatar_url, created_at, bio")
        .eq("email", otpRecord.email)
        .single();

      user = existingUser;
    }

    await supabaseAdmin
      .from("OTP")
      .delete()
      .eq("email", otpRecord.email)
      .eq("verified", true);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Magic link verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify magic link" },
      { status: 500 }
    );
  }
}
