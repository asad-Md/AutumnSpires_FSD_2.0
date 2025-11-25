import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { userId, friendId } = await request.json();

    if (!userId || !friendId) {
      return NextResponse.json(
        { success: false, error: "User ID and Friend ID are required" },
        { status: 400 }
      );
    }

    // Find the friendship record
    // Since we don't know who was the requester and who was the addressee, we check both combinations
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: friendId },
          { requesterId: friendId, addresseeId: userId },
        ],
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { success: false, error: "Friendship not found" },
        { status: 404 }
      );
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing friend:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
