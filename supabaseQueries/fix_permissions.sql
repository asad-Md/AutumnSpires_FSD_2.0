-- 1. Fix User RLS to allow reading other users (for chat names and avatars)
drop policy if exists "user_select_policy" on public."User";

create policy "user_select_policy"
  on public."User"
  for select
  using ( auth.role() = 'authenticated' );

-- 2. Enable Realtime for Signal table (for WebRTC signaling)
-- Check if table is already in publication to avoid error, or just try adding it.
-- Supabase doesn't support "IF NOT EXISTS" for publication tables easily in standard SQL script without PL/pgSQL.
-- But usually running it again is fine or throws a harmless error if already added.
-- However, to be safe and clean:

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'Signal'
  ) then
    alter publication supabase_realtime add table "public"."Signal";
  end if;
end;
$$;
