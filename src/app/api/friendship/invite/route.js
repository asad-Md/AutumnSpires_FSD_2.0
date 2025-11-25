import { NextResponse } from "next/server";
import { sendInviteEmail } from "@/lib/email";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { inviterEmail, inviterUsername, inviteeEmail } =
      await request.json();

    if (!inviterEmail || !inviterUsername || !inviteeEmail) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if invitee already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: inviteeEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User already has an account" },
        { status: 400 }
      );
    }

    // Get inviter's ID
    const inviter = await prisma.user.findUnique({
      where: { email: inviterEmail },
    });

    if (!inviter) {
      return NextResponse.json(
        { success: false, error: "Inviter not found" },
        { status: 404 }
      );
    }

    // Create invite token (store inviter's ID)
    const inviteToken = Buffer.from(inviter.id).toString("base64");
    
    // Get the base URL from headers or environment
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    
    const signupLink = `${baseUrl}/auth?invite=${inviteToken}`;

    // Send invite email
    await sendInviteEmail(inviteeEmail, inviterUsername, signupLink);

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error sending invite:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
