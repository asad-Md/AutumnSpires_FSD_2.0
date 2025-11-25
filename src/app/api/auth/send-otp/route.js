import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendOTPEmail } from "@/lib/email";
import { generateOTP, generateToken, getOTPExpiry } from "@/lib/otp";

export async function POST(request) {
  try {
    const { email, username, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: "Email and type are required" },
        { status: 400 }
      );
    }

    if (type === "signup" && !username) {
      return NextResponse.json(
        { error: "Username is required for signup" },
        { status: 400 }
      );
    }

    if (type === "login") {
      const { data: userExists, error: userError } = await supabaseAdmin
        .from("User")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (userError) {
        console.error("Supabase error:", userError);
        return NextResponse.json({ error: "Database error: " + userError.message }, { status: 500 });
      }

      if (!userExists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
    }

    if (type === "signup") {
      const { data: existingUser } = await supabaseAdmin
        .from("User")
        .select("*")
        .or(`email.eq.${email},username.eq.${username}`)
        .maybeSingle();

      if (existingUser) {
        return NextResponse.json(
          {
            error:
              existingUser.email === email
                ? "Email already registered"
                : "Username already taken",
          },
          { status: 409 }
        );
      }
    }

    // Rate limiting check
    const { data: recentOTP } = await supabaseAdmin
      .from("OTP")
      .select("created_at")
      .eq("email", email)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOTP) {
      const lastSentTime = new Date(recentOTP.created_at).getTime();
      const now = Date.now();
      const timeDiff = now - lastSentTime;
      const cooldown = 60 * 1000; // 1 minute

      if (timeDiff < cooldown) {
        const remainingSeconds = Math.ceil((cooldown - timeDiff) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingSeconds}s before requesting another code` },
          { status: 429 }
        );
      }
    }

    await supabaseAdmin
      .from("OTP")
      .delete()
      .eq("email", email)
      .eq("type", type)
      .eq("verified", false);

    const otp = generateOTP();
    const token = generateToken();
    const expiresAt = getOTPExpiry().toISOString();

    const { data: insertedOTP, error: insertError } = await supabaseAdmin
      .from("OTP")
      .insert({
        id: crypto.randomUUID(),
        email,
        otp,
        token,
        type,
        username: type === "signup" ? username : null,
        expires_at: expiresAt,
      })
      .select();

    if (insertError) {
      console.error("Failed to insert OTP:", insertError);
      return NextResponse.json({ error: "Failed to create OTP: " + insertError.message }, { status: 500 });
    }

    if (!insertedOTP || insertedOTP.length === 0) {
      console.error("No OTP record returned after insert");
      return NextResponse.json({ error: "Failed to create OTP record" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const magicLink = `${baseUrl}/auth/verify-magic?token=${token}`;

    await sendOTPEmail(email, otp, type, magicLink);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      email,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
