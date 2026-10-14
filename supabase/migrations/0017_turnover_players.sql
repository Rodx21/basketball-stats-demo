-- Migration: turnover_players
-- Who committed and who forced a turnover, as "#N Name" labels (ours or theirs depending on the side).
alter table live_scout_events add column if not exists tov_by text;
alter table live_scout_events add column if not exists tov_forced_by text;
