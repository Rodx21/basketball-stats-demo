-- Seed: test data for Harbour City BC Stats Tracker
-- Owner user: demo@example.com
-- Safe to re-run: skips seeding if "Harbour City BC" already exists for this user.

do $$
declare
  v_user_id uuid := (select id from auth.users where email = 'demo@example.com');
  v_team_id uuid;
  v_opponent_id uuid;
  v_season_id uuid;
begin
  if exists (
    select 1 from teams where user_id = v_user_id and name = 'Harbour City BC'
  ) then
    raise notice 'Seed data already present, skipping.';
    return;
  end if;

  insert into teams (user_id, name, is_own_team)
  values (v_user_id, 'Harbour City BC', true)
  returning id into v_team_id;

  insert into teams (user_id, name, is_own_team)
  values (v_user_id, 'Riverside Hawks', false)
  returning id into v_opponent_id;

  insert into seasons (user_id, name, start_date, end_date)
  values (v_user_id, 'National League 2026/27', '2026-09-01', '2027-04-30')
  returning id into v_season_id;

  insert into games (user_id, season_id, home_team_id, away_team_id, game_date, venue, status)
  values (
    v_user_id, v_season_id, v_team_id, v_opponent_id,
    '2026-10-03 20:00:00+01', 'Harbour City Arena', 'scheduled'
  );

  insert into players (team_id, full_name, jersey_number, position, active) values
    (v_team_id, 'Conor Byrne', 4, 'PG', true),
    (v_team_id, 'Sean Doyle', 5, 'PG', true),
    (v_team_id, 'Jack Murphy', 7, 'SG', true),
    (v_team_id, 'Ryan Kelly', 8, 'SG', true),
    (v_team_id, 'Adam Walsh', 10, 'SF', true),
    (v_team_id, 'Liam O''Brien', 11, 'SF', true),
    (v_team_id, 'Cian Duffy', 14, 'SF', true),
    (v_team_id, 'Darragh Nolan', 15, 'PF', true),
    (v_team_id, 'Eoin Farrell', 21, 'PF', true),
    (v_team_id, 'Tadhg Reilly', 22, 'PF', true),
    (v_team_id, 'Cormac Hughes', 32, 'C', true),
    (v_team_id, 'Niall Fitzgerald', 33, 'C', true),
    (v_team_id, 'Oisin Gallagher', 34, 'C', true),
    (v_team_id, 'Aaron Brennan', 44, 'SG', true);
end $$;
