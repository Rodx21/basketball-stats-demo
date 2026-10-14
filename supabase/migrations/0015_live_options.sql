-- Migration: live_options
-- User-editable buttons for the live tracker (our plays, their actions, defenses).
-- Seeded from the app defaults on first use; rows can be added/removed from the live screen.

create table if not exists live_options (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null default auth.uid(),
  list text not null check (list in ('our_plays', 'their_actions', 'their_defenses', 'our_defenses')),
  group_key text not null default '',
  group_label text not null default '',
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  unique (user_id, list, group_key, label)
);

alter table live_options enable row level security;

create policy "Owner can manage live_options"
  on live_options for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
