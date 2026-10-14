-- Optional pick-and-roll context on a shot event: which defensive coverage was faced.
-- Null means the coach didn't tag this shot as a P&R possession — it's opt-in per shot,
-- not required, per the "Drafting an Offensive Game Plan" coverage framework (Drop/Hedge/Ice).
alter table game_events
  add column if not exists pnr_coverage text check (pnr_coverage in ('drop','hedge','ice'));
