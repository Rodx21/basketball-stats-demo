-- Migration: scouting_reports
-- Per-opponent scouting: video clips organized by offense/defense category,
-- plus free-text game plan / personnel / tendencies notes.

create table if not exists scouting_clips (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  section text not null check (section in ('offense', 'defense')),
  category text not null check (category in (
    'transition', 'motion', 'pnr_set', 'off_reb', 'slob', 'blob', 'ato',
    'transition_def', 'pnr_def', 'zone', 'press', 'anomalies', 'def_reb'
  )),
  video_url text not null,
  note text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_scouting_clips_team on scouting_clips(team_id);

create table if not exists scouting_notes (
  team_id uuid primary key references teams(id) on delete cascade,
  game_plan_fastbreak text,
  game_plan_pnr text,
  game_plan_targets text,
  personnel text,
  offensive_tendencies text,
  defensive_tendencies text,
  updated_at timestamptz default now()
);

alter table scouting_clips enable row level security;
alter table scouting_notes enable row level security;

-- scouting_clips: via teams.user_id
create policy "Owner can manage scouting_clips"
  on scouting_clips for all
  using (
    exists (select 1 from teams t where t.id = scouting_clips.team_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from teams t where t.id = scouting_clips.team_id and t.user_id = auth.uid())
  );

-- scouting_notes: via teams.user_id
create policy "Owner can manage scouting_notes"
  on scouting_notes for all
  using (
    exists (select 1 from teams t where t.id = scouting_notes.team_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from teams t where t.id = scouting_notes.team_id and t.user_id = auth.uid())
  );
