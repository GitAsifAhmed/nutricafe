-- Thali Catch: shared scores for the Nutri Café 7-day challenge.
-- Run once in Supabase → SQL editor. Safe to re-run.
--
-- Security model: the website uses the public "anon" key. It cannot read or write
-- the tables directly (row-level security with no policies). It can only call the
-- three functions below, which validate input and never return email addresses.

create extension if not exists citext;

create table if not exists public.game_players (
  id         uuid primary key default gen_random_uuid(),
  email      citext unique not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  name       text not null check (char_length(name) between 2 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.game_daily_scores (
  player_id  uuid not null references public.game_players(id) on delete cascade,
  season     text not null,                    -- 'YYYY-MM' (Dhaka time)
  day        int  not null check (day between 1 and 31),
  best       int  not null default 0 check (best >= 0),
  plays      int  not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, season, day)
);

-- Challenge calendar; keep in step with assets/js/game-config.js
create table if not exists public.game_settings (
  id        int primary key default 1 check (id = 1),
  start_day int not null default 1 check (start_day between 1 and 28),
  days      int not null default 7 check (days between 1 and 14)
);
insert into public.game_settings (id) values (1) on conflict do nothing;

alter table public.game_players      enable row level security;
alter table public.game_daily_scores enable row level security;
alter table public.game_settings     enable row level security;
revoke all on public.game_players, public.game_daily_scores, public.game_settings from anon, authenticated;

-- Which challenge (season) and day it is right now, in Dhaka time. day is null outside the challenge.
create or replace function public.game_challenge(p_at timestamptz default now())
returns table (season text, day int)
language sql stable security definer set search_path = public as $$
  select to_char(p_at at time zone 'Asia/Dhaka', 'YYYY-MM'),
         case when extract(day from p_at at time zone 'Asia/Dhaka')::int between s.start_day and s.start_day + s.days - 1
              then extract(day from p_at at time zone 'Asia/Dhaka')::int - s.start_day + 1 end
  from public.game_settings s where s.id = 1;
$$;

-- Display name on the board: first name + last initial ("Nabila R.")
create or replace function public.game_public_name(p_name text)
returns text language sql immutable as $$
  select case when position(' ' in btrim(p_name)) > 0
              then split_part(btrim(p_name), ' ', 1) || ' ' || left(split_part(btrim(p_name), ' ', 2), 1) || '.'
              else btrim(p_name) end;
$$;

-- Record one finished round. Keeps the best round per player per day.
create or replace function public.submit_score(p_email text, p_name text, p_score int, p_duration_ms int)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_player uuid; v_season text; v_day int; v_best int; v_total int; v_plays int;
begin
  if p_score is null or p_duration_ms is null or p_score < 0 or p_duration_ms < 0 then
    raise exception 'invalid score';
  end if;
  -- plausibility: the game cannot award more than ~170 points per second; allow headroom
  if p_score > 300 + (p_duration_ms / 1000.0) * 220 then
    raise exception 'score rejected';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) < 2 then raise exception 'name required'; end if;

  insert into game_players (email, name) values (lower(btrim(p_email)), left(btrim(p_name), 40))
  on conflict (email) do update set email = excluded.email   -- keeps the first name used
  returning id into v_player;

  select c.season, c.day into v_season, v_day from game_challenge() c;
  if v_day is null then
    return json_build_object('counted', false, 'season', v_season);
  end if;

  select plays into v_plays from game_daily_scores where player_id = v_player and season = v_season and day = v_day;
  if coalesce(v_plays, 0) >= 300 then raise exception 'daily limit reached'; end if;

  insert into game_daily_scores (player_id, season, day, best, plays)
  values (v_player, v_season, v_day, p_score, 1)
  on conflict (player_id, season, day) do update
    set best = greatest(game_daily_scores.best, excluded.best),
        plays = game_daily_scores.plays + 1,
        updated_at = case when excluded.best > game_daily_scores.best then now() else game_daily_scores.updated_at end
  returning best into v_best;

  select coalesce(sum(best), 0) into v_total from game_daily_scores where player_id = v_player and season = v_season;
  return json_build_object('counted', true, 'season', v_season, 'day', v_day, 'best', v_best, 'total', v_total);
end $$;

-- Top 10 for a challenge plus the caller's own rank. Never returns emails.
-- Ties: the player who reached the total first ranks higher.
create or replace function public.get_leaderboard(p_season text default null, p_email text default null)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_season text;
begin
  v_season := coalesce(p_season, (select season from game_challenge()));
  return (
    with totals as (
      select p.id, p.email, p.name, sum(s.best)::int as total, count(*)::int as days, max(s.updated_at) as reached
      from game_daily_scores s join game_players p on p.id = s.player_id
      where s.season = v_season and s.best > 0
      group by p.id
    ), ranked as (
      select *, row_number() over (order by total desc, reached asc) as rk from totals
    )
    select json_build_object(
      'season', v_season,
      'players', (select count(*) from totals),
      'top', coalesce((select json_agg(json_build_object('rank', rk, 'name', game_public_name(name), 'total', total, 'days', days,
                                                          'is_me', email = lower(btrim(coalesce(p_email, '')))) order by rk)
                       from ranked where rk <= 10), '[]'::json),
      'me', (select json_build_object('rank', rk, 'total', total, 'days', days) from ranked where email = lower(btrim(coalesce(p_email, ''))))
    )
  );
end $$;

-- A player's own daily bests for the 7-day tracker.
create or replace function public.get_my_week(p_email text, p_season text default null)
returns table (day int, best int)
language sql stable security definer set search_path = public as $$
  select s.day, s.best from game_daily_scores s join game_players p on p.id = s.player_id
  where p.email = lower(btrim(p_email)) and s.season = coalesce(p_season, (select season from game_challenge()))
  order by s.day;
$$;

revoke all on function public.game_challenge(timestamptz), public.game_public_name(text) from public, anon, authenticated;
grant execute on function public.submit_score(text, text, int, int)  to anon;
grant execute on function public.get_leaderboard(text, text)         to anon;
grant execute on function public.get_my_week(text, text)             to anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- FOR STAFF (run in the SQL editor after day 7; not callable from the website):
-- the winners of a challenge, with emails, to send the discount email.
--
--   select row_number() over (order by sum(s.best) desc, max(s.updated_at)) as rank,
--          p.name, p.email, sum(s.best) as total, count(*) as days_played
--   from game_daily_scores s join game_players p on p.id = s.player_id
--   where s.season = '2026-12'            -- the challenge month
--   group by p.id order by total desc, max(s.updated_at) limit 3;
-- ─────────────────────────────────────────────────────────────────────────────
