-- Migration: live_scouting
-- Pre-game scouting notes per situation category (mirrors the Word scouting doc)
-- and in-game situation tracking (tap an option, mark if it went well for us).

create table if not exists scouting_category_notes (
  team_id uuid references teams(id) on delete cascade not null,
  category text not null,
  body text,
  updated_at timestamptz default now(),
  primary key (team_id, category)
);

create table if not exists live_scout_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade not null,
  category text not null,
  option text not null,
  outcome text check (outcome in ('good', 'bad')),
  period int not null default 1,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_live_scout_events_game on live_scout_events(game_id);

alter table scouting_category_notes enable row level security;
alter table live_scout_events enable row level security;

create policy "Owner can manage scouting_category_notes"
  on scouting_category_notes for all
  using (
    exists (select 1 from teams t where t.id = scouting_category_notes.team_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from teams t where t.id = scouting_category_notes.team_id and t.user_id = auth.uid())
  );

create policy "Owner can manage live_scout_events"
  on live_scout_events for all
  using (
    exists (select 1 from games g where g.id = live_scout_events.game_id and g.user_id = auth.uid())
  )
  with check (
    exists (select 1 from games g where g.id = live_scout_events.game_id and g.user_id = auth.uid())
  );
