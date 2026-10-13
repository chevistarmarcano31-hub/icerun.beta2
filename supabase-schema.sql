-- Ejecutar una vez en Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'client' check (role in ('client', 'root')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.products (id, data)
values
  ('demo-2', '{"id":"demo-2","title":"Juego de 4 Sillas Rústicas","category":"silla","price":180,"oldPrice":null,"images":["https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80"],"image":"https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80","tags":["nuevo"],"available":true,"material":"Pino tratado","measures":"45 × 45 × 90 cm (c/u)","shipping":"Envío local","description":"Set de 4 sillas individuales con asiento de madera pulida y respaldo alto."}'),
  ('demo-4', '{"id":"demo-4","title":"Espejo con Marco de Madera","category":"decoracion","price":95,"images":["https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80"],"image":"https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80","tags":["nuevo"],"available":true,"material":"Samán","measures":"60 × 90 cm","shipping":"Envío gratis","description":"Espejo decorativo con marco tallado a mano, ideal para recibidores."}')
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.products enable row level security;

create or replace function public.is_root()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'root'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "Only root can insert products" on public.products;
create policy "Only root can insert products"
  on public.products for insert
  to authenticated
  with check (public.is_root());

drop policy if exists "Only root can update products" on public.products;
create policy "Only root can update products"
  on public.products for update
  to authenticated
  using (public.is_root())
  with check (public.is_root());

drop policy if exists "Only root can delete products" on public.products;
create policy "Only root can delete products"
  on public.products for delete
  to authenticated
  using (public.is_root());

-- Cuenta root del proyecto.
update public.profiles
set role = 'root'
where id = 'e0ce8131-850c-4df8-9f25-dcd39bf52ca1';
