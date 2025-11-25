import { NextResponse } from "next/server";
import { getUnconsumedSignals, markSignalConsumed } from "@/lib/signal";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, roomId } = body;

    if (!userId || !roomId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, roomId" },
        { status: 400 }
      );
    }

    const signals = await getUnconsumedSignals(userId, roomId);

    return NextResponse.json({
      success: true,
      signals,
    });
  } catch (error) {
    console.error("Signal fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch signals" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { signalId } = body;

    if (!signalId) {
      return NextResponse.json(
        { error: "Missing required field: signalId" },
        { status: 400 }
      );
    }

    await markSignalConsumed(signalId);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Signal consume error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark signal consumed" },
      { status: 500 }
    );
  }
}
