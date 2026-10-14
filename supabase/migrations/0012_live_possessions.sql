-- Migration: live_possessions
-- Extends live_scout_events so a row can also be one possession with points,
-- for points-per-possession analysis of our plays and their actions.
--   kind = 'scout'   → situation observation (existing rows, good/bad outcome)
--   kind = 'our_off' → our possession: category = play group, option = our play
--   kind = 'our_def' → their possession: category/option = their action

alter table live_scout_events add column if not exists kind text not null default 'scout'
  check (kind in ('scout', 'our_off', 'our_def'));
alter table live_scout_events add column if not exists points int check (points between 0 and 4);
alter table live_scout_events add column if not exists turnover boolean not null default false;
-- Defense on the floor for that possession (theirs on our_off, ours on our_def).
alter table live_scout_events add column if not exists defense text;
-- Opponent player involved (who scored / who was attacked).
alter table live_scout_events add column if not exists player text;
