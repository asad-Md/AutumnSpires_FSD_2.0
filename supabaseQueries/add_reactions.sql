-- Add reactions column to Chat table
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "reactions" jsonb DEFAULT '{}'::jsonb;

-- Add reactions column to Message table (for rooms)
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "reactions" jsonb DEFAULT '{}'::jsonb;

-- Function to toggle reaction on a Friend Chat message
CREATE OR REPLACE FUNCTION toggle_chat_reaction(
  p_message_id bigint,
  p_user_id text,
  p_emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reactions jsonb;
  user_list jsonb;
BEGIN
  -- Get current reactions
  SELECT reactions INTO current_reactions FROM "Chat" WHERE id = p_message_id;
  
  -- Initialize if null
  IF current_reactions IS NULL THEN
    current_reactions := '{}'::jsonb;
  END IF;

  -- Get list of users for this emoji
  user_list := current_reactions -> p_emoji;
  
  IF user_list IS NULL THEN
    -- First reaction with this emoji
    user_list := '[]'::jsonb;
  END IF;

  -- Check if user already reacted
  IF user_list @> to_jsonb(p_user_id) THEN
    -- Remove user (toggle off)
    -- Postgres doesn't have a simple "remove from array" for jsonb, so we filter
    user_list := (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements_text(user_list) elem
      WHERE elem <> p_user_id
    );
    
    -- If list is empty (or null after filter), set to empty array
    IF user_list IS NULL THEN
      user_list := '[]'::jsonb;
    END IF;
  ELSE
    -- Add user (toggle on)
    user_list := user_list || to_jsonb(p_user_id);
  END IF;

  -- Update the reactions jsonb
  current_reactions := jsonb_set(current_reactions, ARRAY[p_emoji], user_list);

  -- Update the table
  UPDATE "Chat" 
  SET reactions = current_reactions 
  WHERE id = p_message_id;
END;
$$;

-- Function to toggle reaction on a Room Message
CREATE OR REPLACE FUNCTION toggle_room_message_reaction(
  p_message_id bigint,
  p_user_id text,
  p_emoji text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_reactions jsonb;
  user_list jsonb;
BEGIN
  -- Get current reactions
  SELECT reactions INTO current_reactions FROM "Message" WHERE id = p_message_id;
  
  -- Initialize if null
  IF current_reactions IS NULL THEN
    current_reactions := '{}'::jsonb;
  END IF;

  -- Get list of users for this emoji
  user_list := current_reactions -> p_emoji;
  
  IF user_list IS NULL THEN
    -- First reaction with this emoji
    user_list := '[]'::jsonb;
  END IF;

  -- Check if user already reacted
  IF user_list @> to_jsonb(p_user_id) THEN
    -- Remove user (toggle off)
    user_list := (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements_text(user_list) elem
      WHERE elem <> p_user_id
    );
    
    -- If list is empty (or null after filter), set to empty array
    IF user_list IS NULL THEN
      user_list := '[]'::jsonb;
    END IF;
  ELSE
    -- Add user (toggle on)
    user_list := user_list || to_jsonb(p_user_id);
  END IF;

  -- Update the reactions jsonb
  current_reactions := jsonb_set(current_reactions, ARRAY[p_emoji], user_list);

  -- Update the table
  UPDATE "Message" 
  SET reactions = current_reactions 
  WHERE id = p_message_id;
END;
$$;
