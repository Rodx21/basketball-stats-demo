-- Migration: staff_sharing
-- Lets other coaches (staff) work on the head account's data.
-- A staff member maps to an owner; every policy now compares "whose team is this row"
-- (owner_of(row.user_id)) with "whose team am I on" (data_owner()).

create table if not exists staff_members (
  member_id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  constraint staff_not_self check (member_id <> owner_id)
);

alter table staff_members enable row level security;

create policy "Members and owners can see memberships"
  on staff_members for select
  using (member_id = auth.uid() or owner_id = auth.uid());

-- Team account a given user belongs to (their owner if staff, else themselves).
create or replace function public.owner_of(uid uuid) returns uuid
language sql stable security definer set search_path = public
as $$ select coalesce((select owner_id from staff_members where member_id = uid), uid) $$;

-- Team account of the signed-in user.
create or replace function public.data_owner() returns uuid
language sql stable security definer set search_path = public
as $$ select public.owner_of(auth.uid()) $$;

-- Tables with their own user_id
drop policy if exists "Owner can manage teams" on teams;
create policy "Team can manage teams" on teams for all
  using (owner_of(user_id) = data_owner()) with check (owner_of(user_id) = data_owner());

drop policy if exists "Owner can manage seasons" on seasons;
create policy "Team can manage seasons" on seasons for all
  using (owner_of(user_id) = data_owner()) with check (owner_of(user_id) = data_owner());

drop policy if exists "Owner can manage games" on games;
create policy "Team can manage games" on games for all
  using (owner_of(user_id) = data_owner()) with check (owner_of(user_id) = data_owner());

drop policy if exists "Owner can manage live_options" on live_options;
create policy "Team can manage live_options" on live_options for all
  using (owner_of(user_id) = data_owner()) with check (owner_of(user_id) = data_owner());

-- Tables scoped through teams
drop policy if exists "Owner can manage players" on players;
create policy "Team can manage players" on players for all
  using (exists (select 1 from teams t where t.id = players.team_id and owner_of(t.user_id) = data_owner()))
  with check (exists (select 1 from teams t where t.id = players.team_id and owner_of(t.user_id) = data_owner()));

drop policy if exists "Owner can manage scouting_clips" on scouting_clips;
create policy "Team can manage scouting_clips" on scouting_clips for all
  using (exists (select 1 from teams t where t.id = scouting_clips.team_id and owner_of(t.user_id) = data_owner()))
  with check (exists (select 1 from teams t where t.id = scouting_clips.team_id and owner_of(t.user_id) = data_owner()));

drop policy if exists "Owner can manage scouting_notes" on scouting_notes;
create policy "Team can manage scouting_notes" on scouting_notes for all
  using (exists (select 1 from teams t where t.id = scouting_notes.team_id and owner_of(t.user_id) = data_owner()))
  with check (exists (select 1 from teams t where t.id = scouting_notes.team_id and owner_of(t.user_id) = data_owner()));

drop policy if exists "Owner can manage scouting_category_notes" on scouting_category_notes;
create policy "Team can manage scouting_category_notes" on scouting_category_notes for all
  using (exists (select 1 from teams t where t.id = scouting_category_notes.team_id and owner_of(t.user_id) = data_owner()))
  with check (exists (select 1 from teams t where t.id = scouting_category_notes.team_id and owner_of(t.user_id) = data_owner()));

-- Tables scoped through games
drop policy if exists "Owner can manage game_events" on game_events;
create policy "Team can manage game_events" on game_events for all
  using (exists (select 1 from games g where g.id = game_events.game_id and owner_of(g.user_id) = data_owner()))
  with check (exists (select 1 from games g where g.id = game_events.game_id and owner_of(g.user_id) = data_owner()));

drop policy if exists "Owner can manage player_game_stats" on player_game_stats;
create policy "Team can manage player_game_stats" on player_game_stats for all
  using (exists (select 1 from games g where g.id = player_game_stats.game_id and owner_of(g.user_id) = data_owner()))
  with check (exists (select 1 from games g where g.id = player_game_stats.game_id and owner_of(g.user_id) = data_owner()));

drop policy if exists "Owner can manage live_scout_events" on live_scout_events;
create policy "Team can manage live_scout_events" on live_scout_events for all
  using (exists (select 1 from games g where g.id = live_scout_events.game_id and owner_of(g.user_id) = data_owner()))
  with check (exists (select 1 from games g where g.id = live_scout_events.game_id and owner_of(g.user_id) = data_owner()));

-- Both coaches' iPads see each other's possessions live.
alter publication supabase_realtime add table live_scout_events;
