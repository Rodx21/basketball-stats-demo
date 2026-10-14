-- Removes schema that no application code reads or writes:
-- - league_season_averages: was meant to back a league-normalized PER: never
--   populated (0 rows), no query anywhere selects from it.
-- - player_game_stats.plus_minus: added but never written by
--   recalc_game_stats(); every row is stuck at its default 0.
-- Verified empty/all-default against the live data before writing this migration.

drop table if exists league_season_averages;

alter table player_game_stats drop column if exists plus_minus;
