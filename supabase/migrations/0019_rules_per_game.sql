-- Migration: rules_per_game
-- Team rules are set during the week for one game, so each rule belongs to a game.
alter table accountability_rules add column if not exists game_id uuid references games(id) on delete cascade;
alter table accountability_rules drop constraint if exists accountability_rules_user_id_label_key;
alter table accountability_rules add constraint accountability_rules_game_label_key unique (game_id, label);
create index if not exists idx_accountability_rules_game on accountability_rules(game_id);
