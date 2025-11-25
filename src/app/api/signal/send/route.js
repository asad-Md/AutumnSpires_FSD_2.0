import { NextResponse } from "next/server";
import { sendSignal } from "@/lib/signal";

export async function POST(request) {
  try {
    const body = await request.json();
    const { roomId, senderId, receiverId, type, data } = body;

    if (!roomId || !senderId || !receiverId || !type || !data) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: roomId, senderId, receiverId, type, data",
        },
        { status: 400 }
      );
    }

    const signal = await sendSignal({
      roomId,
      senderId,
      receiverId,
      type,
      data,
    });

    return NextResponse.json({
      success: true,
      signal,
    });
  } catch (error) {
    console.error("Signal send error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send signal" },
      { status: 500 }
    );
  }
}
