-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."User" (id, username, email, avatar_url)
  values (
    new.id::text,
    new.raw_user_meta_data ->> 'username',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- Trigger to call the function on new user creation
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users who are missing from public.User
insert into public."User" (id, username, email, avatar_url)
select 
  id::text, 
  coalesce(raw_user_meta_data ->> 'username', email), -- Fallback to email if username is missing
  email, 
  raw_user_meta_data ->> 'avatar_url'
from auth.users
where id::text not in (select id from public."User");
