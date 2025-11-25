import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { requestId, action } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: "Request ID and action are required" },
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    if (action === "accept") {
      // Update status to accepted
      await prisma.friendship.update({
        where: { id: requestId },
        data: { status: "accepted" },
      });

      // We also need to ensure the reverse friendship exists or is handled?
      // In this schema, Friendship is directional (requester -> addressee).
      // If we want bidirectional friendship, we might need another record or just treat the single record as friendship.
      // Usually, for simple systems, checking both directions or having two records is common.
      // Given the schema has `receivedRequests` and `sentRequests`, let's assume one record with status 'accepted' implies friendship.
      // However, if the app logic expects two records, we might need to create the reverse one.
      // Let's stick to updating the status for now as per the plan.
    } else if (action === "reject") {
      // Delete the request
      await prisma.friendship.delete({
        where: { id: requestId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error responding to friend request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
