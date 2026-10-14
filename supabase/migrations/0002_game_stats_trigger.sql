-- Migration: recalc player_game_stats + games score from game_events
-- Fires on insert AND delete (delete enables an "undo last tap" affordance).
-- Minutes played is derived from sub_in/sub_out timestamp pairs (created_at),
-- with an in-progress stint counted up to now() so it updates as new events land.

create or replace function recalc_game_stats() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_game_id uuid;
begin
  if tg_op = 'DELETE' then
    v_player_id := old.player_id;
    v_game_id := old.game_id;
  else
    v_player_id := new.player_id;
    v_game_id := new.game_id;
  end if;

  if v_player_id is not null then
    with agg as (
      select
        count(*) filter (where event_type in ('fg_made_2','fg_made_3')) as fgm,
        count(*) filter (where event_type in ('fg_made_2','fg_missed_2','fg_made_3','fg_missed_3')) as fga,
        count(*) filter (where event_type = 'fg_made_3') as fg3m,
        count(*) filter (where event_type in ('fg_made_3','fg_missed_3')) as fg3a,
        count(*) filter (where event_type = 'ft_made') as ftm,
        count(*) filter (where event_type in ('ft_made','ft_missed')) as fta,
        count(*) filter (where event_type = 'reb_off') as oreb,
        count(*) filter (where event_type = 'reb_def') as dreb,
        count(*) filter (where event_type = 'assist') as ast,
        count(*) filter (where event_type = 'steal') as stl,
        count(*) filter (where event_type = 'block') as blk,
        count(*) filter (where event_type = 'turnover') as tov,
        count(*) filter (where event_type in ('foul_personal','foul_technical')) as pf,
        coalesce(sum(case event_type
          when 'fg_made_2' then 2
          when 'fg_made_3' then 3
          when 'ft_made' then 1
          else 0
        end), 0) as pts
      from game_events
      where game_id = v_game_id and player_id = v_player_id
    ),
    subs as (
      select created_at, event_type
      from game_events
      where game_id = v_game_id and player_id = v_player_id
        and event_type in ('sub_in','sub_out')
    ),
    paired as (
      select
        s_in.created_at as in_at,
        coalesce(
          (select min(s_out.created_at) from subs s_out
           where s_out.event_type = 'sub_out' and s_out.created_at > s_in.created_at),
          now()
        ) as out_at
      from subs s_in
      where s_in.event_type = 'sub_in'
    ),
    minutes as (
      select coalesce(sum(extract(epoch from (out_at - in_at))) / 60.0, 0) as minutes_played
      from paired
    )
    insert into player_game_stats (
      game_id, player_id, minutes_played, pts, fgm, fga, fg3m, fg3a, ftm, fta,
      oreb, dreb, ast, stl, blk, tov, pf, updated_at
    )
    select
      v_game_id, v_player_id, minutes.minutes_played, agg.pts, agg.fgm, agg.fga,
      agg.fg3m, agg.fg3a, agg.ftm, agg.fta, agg.oreb, agg.dreb, agg.ast, agg.stl,
      agg.blk, agg.tov, agg.pf, now()
    from agg, minutes
    on conflict (game_id, player_id) do update set
      minutes_played = excluded.minutes_played,
      pts = excluded.pts, fgm = excluded.fgm, fga = excluded.fga,
      fg3m = excluded.fg3m, fg3a = excluded.fg3a,
      ftm = excluded.ftm, fta = excluded.fta,
      oreb = excluded.oreb, dreb = excluded.dreb,
      ast = excluded.ast, stl = excluded.stl, blk = excluded.blk,
      tov = excluded.tov, pf = excluded.pf, updated_at = now();
  end if;

  update games g set
    home_score = coalesce((
      select sum(case ge.event_type
        when 'fg_made_2' then 2 when 'fg_made_3' then 3 when 'ft_made' then 1 else 0 end)
      from game_events ge where ge.game_id = v_game_id and ge.team_id = g.home_team_id
    ), 0),
    away_score = coalesce((
      select sum(case ge.event_type
        when 'fg_made_2' then 2 when 'fg_made_3' then 3 when 'ft_made' then 1 else 0 end)
      from game_events ge where ge.game_id = v_game_id and ge.team_id = g.away_team_id
    ), 0)
  where g.id = v_game_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_recalc_game_stats on game_events;
create trigger trg_recalc_game_stats
after insert or delete on game_events
for each row execute function recalc_game_stats();
