-- Adds shot-location and quarter-half context to game_events, for shot-chart breakdowns.
-- shot_zone only applies to fg_made_2/fg_missed_2/fg_made_3/fg_missed_3 events; the zone
-- itself determines whether an attempt is a 2 or a 3 (enforced client-side).
-- half: which half of the period the event happened in (1 = first, 2 = second), manually
-- toggled by the coach rather than tied to an exact game clock.
-- period on game_events already supports overtime: values beyond games.periods are OT
-- (e.g. periods=4, period=5 -> OT1, period=6 -> OT2, ...).

alter table game_events
  add column if not exists shot_zone text check (shot_zone in (
    'corner3_left','corner3_right','wing3_left','wing3_right','top3',
    'layup_left','layup_right','dunk_left','dunk_right',
    'box_left','box_right','elbow_left','elbow_right','paint_left','paint_right'
  )),
  add column if not exists half smallint not null default 1 check (half in (1,2));
