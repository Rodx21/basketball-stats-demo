-- Migration: lineups_rules_shot_quality
-- Live tracker accountability:
--   kind = 'lineup' → starters / substitution (category = 'ours' | 'theirs', on_court_* = the five after it)
--   kind = 'rule'   → one of our players broke a team rule (option = rule, actor = player, penalty = points lost)
-- Every event also snapshots who was on the floor, and possessions record our player who finished them,
-- whether the play broke down, and whether the shot was a bad one (no flag = good shot).

alter table live_scout_events drop constraint if exists live_scout_events_kind_check;
alter table live_scout_events add constraint live_scout_events_kind_check
  check (kind in ('scout', 'our_off', 'our_def', 'lineup', 'rule'));

alter table live_scout_events add column if not exists actor text;
alter table live_scout_events add column if not exists broken boolean not null default false;
alter table live_scout_events add column if not exists bad_shot boolean not null default false;
alter table live_scout_events add column if not exists on_court_ours text[];
alter table live_scout_events add column if not exists on_court_theirs text[];
alter table live_scout_events add column if not exists penalty int check (penalty > 0);

-- Team rules: breaking one costs the player points; following it earns nothing.
create table if not exists accountability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  label text not null,
  points int not null default 1 check (points > 0),
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, label)
);

alter table accountability_rules enable row level security;

create policy "Team can manage accountability_rules" on accountability_rules for all
  using (owner_of(user_id) = data_owner()) with check (owner_of(user_id) = data_owner());
