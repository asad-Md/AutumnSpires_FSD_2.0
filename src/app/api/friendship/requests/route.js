import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { success: false, error: "User ID is required" },
      { status: 400 }
    );
  }

  try {
    const requests = await prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: "pending",
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            avatar_url: true,
            bio: true,
          },
        },
      },
    });

    // Format the response to be cleaner
    const formattedRequests = requests.map((req) => ({
      requestId: req.id,
      requester: req.requester,
      createdAt: req.createdAt,
    }));

    return NextResponse.json({ success: true, requests: formattedRequests });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
