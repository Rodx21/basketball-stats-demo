-- Enable Realtime (Postgres Changes) for tables the live game screen subscribes to.
alter publication supabase_realtime add table player_game_stats;
alter publication supabase_realtime add table games;
