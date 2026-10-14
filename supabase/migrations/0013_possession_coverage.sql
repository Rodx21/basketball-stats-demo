-- Migration: possession_coverage
-- Opponent pick-and-roll coverage seen on one of our possessions (Hedge, Drop, Switch...).
alter table live_scout_events add column if not exists coverage text;
