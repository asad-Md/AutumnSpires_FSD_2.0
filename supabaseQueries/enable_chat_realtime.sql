-- Enable realtime for Chat table
-- This is required for Supabase Realtime to work properly

-- Set replica identity to FULL so we get all column values in realtime updates
ALTER TABLE public."Chat" REPLICA IDENTITY FULL;

-- Enable realtime publication (if not already enabled globally)
-- Run this if you need to enable realtime specifically for Chat
-- Note: In newer Supabase projects, realtime might be enabled by default

-- You can verify realtime is enabled by checking:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- If Chat is not in the list, run:
ALTER PUBLICATION supabase_realtime ADD TABLE public."Chat";
