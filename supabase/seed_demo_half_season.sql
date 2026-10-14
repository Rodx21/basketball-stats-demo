-- Demo seed: reset games/events/stats and repopulate with
--   - 9 "final" games (a "half season") with realistic per-player box scores
--   - 1 "live" game already in progress, ready for a live-tracking demo
--
-- Does NOT touch teams, players or seasons — only games, game_events and
-- player_game_stats (the last two cascade-delete when their game is deleted).
-- Safe to re-run: it wipes and regenerates every time.
--
-- Run this in the Supabase Dashboard -> SQL Editor (runs as postgres, bypasses RLS).

begin;

do $$
declare
  v_user_id uuid;
  v_own_team_id uuid;
  v_opp_team_id uuid;
  v_opp_name text;
  v_season_id uuid;
  v_game_id uuid;
  v_player_id uuid;
  v_game_date timestamptz;
  v_is_home boolean;
  v_result text;
  v_n int;
  i int;
  j int;
  v_sub_in timestamptz;
  v_players uuid[];
  v_home_score int;
  v_away_score int;
  v_own_score int;
  v_opp_score int;
begin
  select id into v_user_id from auth.users where email = 'demo@example.com';
  if v_user_id is null then
    raise exception 'Owner user not found by email';
  end if;

  select id into v_own_team_id from teams where user_id = v_user_id and is_own_team = true;
  select id, name into v_opp_team_id, v_opp_name
    from teams where user_id = v_user_id and is_own_team = false
    order by created_at limit 1;
  select id into v_season_id from seasons where user_id = v_user_id order by created_at desc limit 1;

  if v_own_team_id is null or v_opp_team_id is null or v_season_id is null then
    raise exception 'Missing own team, opponent team or season for this user - aborting';
  end if;

  select array_agg(id order by created_at) into v_players
  from (
    select id, created_at from players
    where team_id = v_own_team_id and active = true
    order by created_at limit 9
  ) p;

  if v_players is null or array_length(v_players, 1) = 0 then
    raise exception 'No active players found for own team - aborting';
  end if;

  -- reset: delete this user's games (cascades to game_events + player_game_stats)
  delete from games where user_id = v_user_id;

  -- ============ 9 FINISHED GAMES ("half season") ============
  for i in 1..9 loop
    v_game_date := now() - (interval '7 days' * (10 - i)) - (interval '2 hours' * (i % 3));
    v_is_home := (i % 2 = 1);
    v_result := case when i in (3, 7) then 'loss' else 'win' end; -- 7-2 record

    insert into games (
      user_id, season_id, home_team_id, away_team_id, game_date, venue,
      status, periods, period_length_minutes
    )
    values (
      v_user_id, v_season_id,
      case when v_is_home then v_own_team_id else v_opp_team_id end,
      case when v_is_home then v_opp_team_id else v_own_team_id end,
      v_game_date,
      case when v_is_home then 'Harbour City Arena' else 'Away @ ' || v_opp_name end,
      'final', 4, 10
    )
    returning id into v_game_id;

    -- own team: per-player box score
    for j in 1..array_length(v_players, 1) loop
      v_player_id := v_players[j];
      v_sub_in := v_game_date + (floor(random() * 5)::int || ' minutes')::interval;

      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      values (v_game_id, v_player_id, v_own_team_id, 1, 600, 'sub_in', v_sub_in);
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      values (v_game_id, v_player_id, v_own_team_id, 4, 0, 'sub_out',
              v_sub_in + ((18 + floor(random() * 15)::int) || ' minutes')::interval);

      v_n := 1 + floor(random() * 4)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'fg_made_2', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 3)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'fg_missed_2', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 2)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'fg_made_3', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 2)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'fg_missed_3', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 3)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'ft_made', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 2)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'ft_missed', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 3)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'reb_off', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 6)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'reb_def', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 5)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'assist', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 3)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'steal', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 2)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'block', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 3)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'turnover', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);

      v_n := floor(random() * 3)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
             'foul_personal', v_sub_in + (floor(random() * 25)::int || ' minutes')::interval
      from generate_series(1, v_n);
    end loop;

    -- opponent: team-level scoring only (no roster for them), tuned to the intended result
    v_n := case when v_result = 'win' then 18 + floor(random() * 8)::int else 26 + floor(random() * 8)::int end;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, null, v_opp_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
           'fg_made_2', v_game_date + (floor(random() * 100)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := 3 + floor(random() * 8)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, null, v_opp_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
           'fg_made_3', v_game_date + (floor(random() * 100)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := 5 + floor(random() * 10)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, null, v_opp_team_id, 1 + floor(random() * 4)::int, floor(random() * 600)::int,
           'ft_made', v_game_date + (floor(random() * 100)::int || ' minutes')::interval
    from generate_series(1, v_n);

    -- corrective pass: force the actual score to match the intended result
    select home_score, away_score into v_home_score, v_away_score from games where id = v_game_id;
    if v_is_home then
      v_own_score := v_home_score; v_opp_score := v_away_score;
    else
      v_own_score := v_away_score; v_opp_score := v_home_score;
    end if;

    if v_result = 'win' and v_own_score <= v_opp_score then
      v_n := ceil((v_opp_score - v_own_score + 6) / 2.0)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, null, v_own_team_id, 4, floor(random() * 300)::int,
             'fg_made_2', v_game_date + interval '95 minutes'
      from generate_series(1, v_n);
    elsif v_result = 'loss' and v_own_score >= v_opp_score then
      v_n := ceil((v_own_score - v_opp_score + 6) / 2.0)::int;
      insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
      select v_game_id, null, v_opp_team_id, 4, floor(random() * 300)::int,
             'fg_made_2', v_game_date + interval '95 minutes'
      from generate_series(1, v_n);
    end if;
  end loop;

  -- ============ LIVE DEMO GAME ============
  v_game_date := now() - interval '35 minutes';

  insert into games (
    user_id, season_id, home_team_id, away_team_id, game_date, venue,
    status, periods, period_length_minutes
  )
  values (
    v_user_id, v_season_id, v_own_team_id, v_opp_team_id, v_game_date,
    'Harbour City Arena', 'live', 4, 10
  )
  returning id into v_game_id;

  for j in 1..least(array_length(v_players, 1), 7) loop
    v_player_id := v_players[j];
    v_sub_in := v_game_date + interval '1 minute';

    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    values (v_game_id, v_player_id, v_own_team_id, 1, 600, 'sub_in', v_sub_in);

    v_n := 1 + floor(random() * 4)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
           'fg_made_2', v_sub_in + (floor(random() * 30)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := floor(random() * 2)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
           'fg_made_3', v_sub_in + (floor(random() * 30)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := 1 + floor(random() * 3)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
           'fg_missed_2', v_sub_in + (floor(random() * 30)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := floor(random() * 2)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
           'fg_missed_3', v_sub_in + (floor(random() * 30)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := floor(random() * 3)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
           'reb_def', v_sub_in + (floor(random() * 30)::int || ' minutes')::interval
    from generate_series(1, v_n);

    v_n := floor(random() * 3)::int;
    insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
    select v_game_id, v_player_id, v_own_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
           'assist', v_sub_in + (floor(random() * 30)::int || ' minutes')::interval
    from generate_series(1, v_n);
  end loop;

  -- opponent partial score for the live game (no sub_out — they're still on court)
  v_n := 8 + floor(random() * 6)::int;
  insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
  select v_game_id, null, v_opp_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
         'fg_made_2', v_game_date + (floor(random() * 30)::int || ' minutes')::interval
  from generate_series(1, v_n);

  v_n := 2 + floor(random() * 3)::int;
  insert into game_events (game_id, player_id, team_id, period, game_clock_seconds, event_type, created_at)
  select v_game_id, null, v_opp_team_id, 1 + floor(random() * 3)::int, floor(random() * 600)::int,
         'fg_made_3', v_game_date + (floor(random() * 30)::int || ' minutes')::interval
  from generate_series(1, v_n);

  raise notice 'Done: 9 final games + 1 live game created for user %, own team %, opponent % (%)',
    v_user_id, v_own_team_id, v_opp_team_id, v_opp_name;
end $$;

commit;
