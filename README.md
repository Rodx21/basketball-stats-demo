# Harbour City BC — Stats Tracker

> **Demo version.** All teams, players, venues and stats are fictional. Bring your own Supabase project (see Setup below).

Sistema de controle estatístico (National League) — Next.js (App Router) + Supabase.

## Setup

### 1. Criar o projeto no Supabase

Ainda não existe um projeto Supabase pra isso. Passos (feitos por você, fora daqui):

1. Crie uma conta/projeto em [supabase.com/dashboard](https://supabase.com/dashboard) (região Europe se possível, pra latência com a Irlanda).
2. Em **Project Settings → API**, copie a `Project URL` e a `anon public key`.
3. Copie `.env.local.example` para `.env.local` e preencha essas duas variáveis.

### 2. Aplicar as migrations

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

Isso cria as tabelas em `supabase/migrations/0001_create_stats_tracker_schema.sql`
(teams, seasons, players, games, game_events, player_game_stats, league_season_averages)
com RLS habilitado — cada linha só é visível/editável pelo `auth.uid()` dono.

### 3. Criar seu usuário de login

Como não há tela pública de cadastro (app é só pra staff do time), crie o primeiro usuário em
**Authentication → Users → Add user** no dashboard do Supabase, com seu email e uma senha.

### 4. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), faça login com o usuário criado no passo 3.

## Estrutura

- `supabase/migrations/` — schema do banco (fonte da verdade: `game_events`; agregado: `player_game_stats`)
- `lib/supabase/` — clients (browser, server, middleware) usando `@supabase/ssr`
- `lib/stats/` — fórmulas: `basic.ts` (FG%/eFG%/TS%/Game Score), `advanced.ts` (USG%/AST%), `per.ts` (uPER/PER)
- `app/elenco/` — CRUD de times e jogadores
- `app/temporadas/` — CRUD de temporadas
- `app/login/` — autenticação (Supabase Auth)

## Fases

1. ✅ Schema no Supabase + CRUD de times/jogadores/temporadas
2. ⬜ Cadastro de jogo + tela de entrada de eventos em tempo real
3. ⬜ Trigger/função que popula `player_game_stats` a partir de `game_events`
4. ⬜ Stats avançadas na UI (eFG%, TS%, USG%, Game Score)
5. ⬜ PER (uPER primeiro; PER normalizado só com dados da liga toda)
6. ⬜ Dashboards de evolução e comparação entre jogadores
