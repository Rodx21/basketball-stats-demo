-- Migration: possession_rules
-- Team-rule compliance tagged on a possession, e.g. {"screen": "Follow through", "big": "Hedge"}.
alter table live_scout_events add column if not exists rules jsonb;
