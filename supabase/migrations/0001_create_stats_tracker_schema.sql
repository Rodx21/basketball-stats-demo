-- Migration: create_stats_tracker_schema
-- Basketball Stats Tracker for Harbour City BC (National League)

-- ============ TEAMS ============
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  is_own_team boolean default false,
  created_at timestamptz default now()
);

-- ============ SEASONS ============
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- ============ PLAYERS ============
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade not null,
  full_name text not null,
  jersey_number int,
  position text check (position in ('PG','SG','SF','PF','C')),
  height_cm int,
  birth_date date,
  photo_url text,
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_players_team on players(team_id);

-- ============ GAMES ============
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  season_id uuid references seasons(id) on delete set null,
  home_team_id uuid references teams(id) not null,
  away_team_id uuid references teams(id) not null,
  game_date timestamptz not null,
  venue text,
  status text default 'scheduled' check (status in ('scheduled','live','final')),
  home_score int default 0,
  away_score int default 0,
  periods int default 4,
  period_length_minutes int default 10,
  created_at timestamptz default now(),
  constraint games_teams_differ check (home_team_id <> away_team_id)
);

create index if not exists idx_games_season on games(season_id);
create index if not exists idx_games_user on games(user_id);

-- ============ GAME EVENTS (fonte da verdade, entrada em tempo real) ============
create table if not exists game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade,
  team_id uuid references teams(id) not null,
  period int not null,
  game_clock_seconds int,
  event_type text not null check (event_type in (
    'fg_made_2','fg_missed_2',
    'fg_made_3','fg_missed_3',
    'ft_made','ft_missed',
    'reb_off','reb_def',
    'assist','steal','block',
    'turnover','foul_personal','foul_technical',
    'sub_in','sub_out'
  )),
  assisted_by_player_id uuid references players(id),
  created_at timestamptz default now()
);

create index if not exists idx_game_events_game on game_events(game_id);
create index if not exists idx_game_events_player on game_events(player_id);

-- ============ PLAYER GAME STATS (agregado, recalculado a partir de game_events) ============
create table if not exists player_game_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references games(id) on delete cascade not null,
  player_id uuid references players(id) on delete cascade not null,
  minutes_played numeric default 0,
  pts int default 0,
  fgm int default 0, fga int default 0,
  fg3m int default 0, fg3a int default 0,
  ftm int default 0, fta int default 0,
  oreb int default 0, dreb int default 0,
  ast int default 0, stl int default 0, blk int default 0,
  tov int default 0,
  pf int default 0,
  plus_minus int default 0,
  updated_at timestamptz default now(),
  unique (game_id, player_id)
);

create index if not exists idx_player_game_stats_player on player_game_stats(player_id);

-- ============ LEAGUE AVERAGES (necessario pro PER normalizado, por temporada) ============
create table if not exists league_season_averages (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons(id) on delete cascade not null,
  lg_pace numeric,
  lg_fg numeric, lg_fga numeric,
  lg_ft numeric, lg_fta numeric,
  lg_3p numeric,
  lg_ast numeric, lg_tov numeric,
  lg_orb numeric, lg_trb numeric,
  lg_pf numeric,
  lg_pts numeric,
  updated_at timestamptz default now(),
  unique (season_id)
);

-- ============ RLS ============
alter table teams enable row level security;
alter table seasons enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table game_events enable row level security;
alter table player_game_stats enable row level security;
alter table league_season_averages enable row level security;

-- teams: user_id direto
create policy "Owner can manage teams"
  on teams for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- seasons: user_id direto
create policy "Owner can manage seasons"
  on seasons for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- players: via teams.user_id
create policy "Owner can manage players"
  on players for all
  using (
    exists (select 1 from teams t where t.id = players.team_id and t.user_id = auth.uid())
  )
  with check (
    exists (select 1 from teams t where t.id = players.team_id and t.user_id = auth.uid())
  );

-- games: user_id direto
create policy "Owner can manage games"
  on games for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- game_events: via games.user_id
create policy "Owner can manage game_events"
  on game_events for all
  using (
    exists (select 1 from games g where g.id = game_events.game_id and g.user_id = auth.uid())
  )
  with check (
    exists (select 1 from games g where g.id = game_events.game_id and g.user_id = auth.uid())
  );

-- player_game_stats: via games.user_id
create policy "Owner can manage player_game_stats"
  on player_game_stats for all
  using (
    exists (select 1 from games g where g.id = player_game_stats.game_id and g.user_id = auth.uid())
  )
  with check (
    exists (select 1 from games g where g.id = player_game_stats.game_id and g.user_id = auth.uid())
  );

-- league_season_averages: via seasons.user_id
create policy "Owner can manage league_season_averages"
  on league_season_averages for all
  using (
    exists (select 1 from seasons s where s.id = league_season_averages.season_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from seasons s where s.id = league_season_averages.season_id and s.user_id = auth.uid())
  );
