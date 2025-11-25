-- Enable RLS on Signal table (if not already)
alter table "public"."Signal" enable row level security;

-- Policy for INSERT: Allow authenticated users to insert signals where they are the sender
drop policy if exists "signal_insert_policy" on public."Signal";
create policy "signal_insert_policy"
  on public."Signal"
  for insert
  with check (
    auth.uid()::text = sender_id
  );

-- Policy for UPDATE: Allow users to update signals they received (to mark as consumed)
drop policy if exists "signal_update_policy" on public."Signal";
create policy "signal_update_policy"
  on public."Signal"
  for update
  using (
    auth.uid()::text = receiver_id
  )
  with check (
    auth.uid()::text = receiver_id
  );

-- Policy for SELECT: Allow users to see signals they sent or received
drop policy if exists "signal_select_policy" on public."Signal";
create policy "signal_select_policy"
  on public."Signal"
  for select
  using (
    auth.uid()::text = sender_id 
    or auth.uid()::text = receiver_id
  );
