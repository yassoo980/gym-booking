-- Run this whole file once in Supabase > SQL Editor > New query > Run

create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  capacity int not null default 15 check (capacity > 0),
  price_single numeric,   -- empty = "pay per class" not offered
  price_monthly numeric,  -- empty = "monthly" not offered
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  starts_at timestamptz not null,
  capacity int check (capacity > 0),  -- empty = use the class capacity
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  phone text not null,
  plan text not null check (plan in ('single','monthly')),
  status text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create table gym_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null,
  period text not null default 'month',
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table gym_signups (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references gym_plans(id) on delete set null,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Seats left per session (public can read this, but not the bookings themselves)
create view session_availability as
select s.id, s.class_id, s.starts_at,
  coalesce(s.capacity, c.capacity) as capacity,
  coalesce(s.capacity, c.capacity)
    - (select count(*) from bookings b where b.session_id = s.id and b.status = 'confirmed') as seats_left
from sessions s join classes c on c.id = s.class_id
where c.active;
grant select on session_availability to anon, authenticated;

-- Safe booking: checks the limit and blocks overbooking
create or replace function book_session(p_session uuid, p_name text, p_phone text, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
declare cap int; taken int;
begin
  if length(trim(p_name)) < 2 or length(trim(p_phone)) < 6 then
    raise exception 'Please enter your name and phone number';
  end if;
  select coalesce(s.capacity, c.capacity) into cap
    from sessions s join classes c on c.id = s.class_id
    where s.id = p_session and c.active and s.starts_at > now()
    for update of s;
  if cap is null then raise exception 'This session is not available'; end if;
  select count(*) into taken from bookings where session_id = p_session and status = 'confirmed';
  if taken >= cap then raise exception 'This class is full'; end if;
  insert into bookings(session_id, name, phone, plan) values (p_session, trim(p_name), trim(p_phone), p_plan);
end $$;
grant execute on function book_session(uuid, text, text, text) to anon, authenticated;

-- Security: everyone can read classes/plans, only the logged-in admin can change anything
alter table classes enable row level security;
alter table sessions enable row level security;
alter table bookings enable row level security;
alter table gym_plans enable row level security;
alter table gym_signups enable row level security;

create policy "public read" on classes for select using (true);
create policy "public read" on sessions for select using (true);
create policy "public read" on gym_plans for select using (true);
create policy "public join" on gym_signups for insert to anon, authenticated with check (true);

create policy "admin all" on classes for all to authenticated using (true) with check (true);
create policy "admin all" on sessions for all to authenticated using (true) with check (true);
create policy "admin all" on bookings for all to authenticated using (true) with check (true);
create policy "admin all" on gym_plans for all to authenticated using (true) with check (true);
create policy "admin all" on gym_signups for all to authenticated using (true) with check (true);
