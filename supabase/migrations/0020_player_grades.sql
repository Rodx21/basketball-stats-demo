-- Migration: player_grades
-- Internal player ranking. kind = 'grade' → a defensive error or a positive play by one of our
-- players (category = 'def_error' | 'positive', option = action, actor = player, score = signed points).
-- Rule events (-rule points), bad shots (-1), turnovers committed (-1) and forced (+1) are derived
-- from the rows that already exist, so they are not stored twice.
alter table live_scout_events drop constraint if exists live_scout_events_kind_check;
alter table live_scout_events add constraint live_scout_events_kind_check
  check (kind in ('scout', 'our_off', 'our_def', 'lineup', 'rule', 'grade'));
alter table live_scout_events add column if not exists score int;
