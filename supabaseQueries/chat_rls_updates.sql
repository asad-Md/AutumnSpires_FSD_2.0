-- Chat table: Add INSERT and UPDATE policies

-- Allow users to insert chats only when:
-- 1. They are the sender
-- 2. They are friends with the receiver (accepted friendship exists)
CREATE POLICY "chat_insert_policy"
  ON public."Chat"
  FOR INSERT
  WITH CHECK (
    "sender_id" = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public."Friendship" f
      WHERE
        (
          (f."requesterId" = auth.uid()::text AND f."addresseeId" = "receiver_id")
          OR (f."requesterId" = "receiver_id" AND f."addresseeId" = auth.uid()::text)
        )
        AND f."status" = 'accepted'
    )
  );

-- Allow receivers to update their own chats (e.g., mark as read)
CREATE POLICY "chat_update_policy"
  ON public."Chat"
  FOR UPDATE
  USING ("receiver_id" = auth.uid()::text)
  WITH CHECK ("receiver_id" = auth.uid()::text);
