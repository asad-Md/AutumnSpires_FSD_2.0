-- Add reply_to column to Chat table for message replies
-- This stores the reply reference as JSONB (id, content, senderName, sender_id)

ALTER TABLE public."Chat" 
ADD COLUMN IF NOT EXISTS reply_to JSONB DEFAULT NULL;

-- Create an index for faster lookups of replies
CREATE INDEX IF NOT EXISTS idx_chat_reply_to ON public."Chat" ((reply_to->>'id'));
