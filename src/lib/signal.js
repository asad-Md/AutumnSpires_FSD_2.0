import { supabase } from "@/lib/supabase";

export async function sendSignal({ roomId, senderId, receiverId, type, data }) {
  console.log(`📤 Sending signal: ${type} from ${senderId} to ${receiverId} in room ${roomId}`);

  const { data: signal, error } = await supabase
    .from("Signal")
    .insert({
      room_id: roomId,
      sender_id: senderId,
      receiver_id: receiverId,
      type,
      data,
      consumed: false,
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ Failed to send signal ${type}:`, error);
    throw new Error(`Failed to send signal: ${error.message}`);
  }

  console.log(`✅ Signal ${type} sent successfully, ID: ${signal.id}`);
  return signal;
}

export async function getUnconsumedSignals(userId, roomId) {

  const { data, error } = await supabase
    .from("Signal")
    .select("*")
    .eq("room_id", roomId)
    .eq("receiver_id", userId)
    .eq("consumed", false)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch signals: ${error.message}`);
  }

  return data;
}

export async function markSignalConsumed(signalId) {

  const { error } = await supabase
    .from("Signal")
    .update({ consumed: true })
    .eq("id", signalId);

  if (error) {
    throw new Error(`Failed to mark signal consumed: ${error.message}`);
  }
}

export function subscribeToSignals(roomId, userId, onSignal) {
  console.log(`🔔 Subscribing to signals for user ${userId} in room ${roomId}`);

  const channel = supabase
    .channel(`room:${roomId}:signals:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Signal",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        console.log(`📥 Received signal notification:`, payload.new);
        // Filter by room_id in the callback since postgres_changes only supports single-column filters
        if (payload.new.room_id === roomId) {
          console.log(`✅ Signal for correct room, processing: ${payload.new.type} from ${payload.new.sender_id}`);
          onSignal(payload.new);
        } else {
          console.log(`⚠️ Signal for wrong room (expected ${roomId}, got ${payload.new.room_id}), ignoring`);
        }
      }
    )
    .subscribe((status) => {
      console.log(`📡 Signal subscription status for user ${userId}:`, status);
    });

  return () => {
    console.log(`🔕 Unsubscribing from signals for user ${userId} in room ${roomId}`);
    supabase.removeChannel(channel);
  };
}
