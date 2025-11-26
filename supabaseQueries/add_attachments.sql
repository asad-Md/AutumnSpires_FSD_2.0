-- Add attachments column to Chat table
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;

-- Add attachments column to Message table (for rooms)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "attachments" jsonb DEFAULT '[]'::jsonb;

-- Create a new storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Policy to allow authenticated users to view images
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-attachments');

-- Policy to allow users to delete their own uploads (optional but good practice)
CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid() = owner);
