-- Personenkluis migratie 2: hobby's, werk/studie, favorieten, do's & don'ts, eigen velden,
-- onderwerpen voor de volgende keer, en 'belangrijk' bij chats.
-- Uitvoeren in Supabase > SQL Editor van project "Dashboardpersonal" (ycnhujswvtyoldnqesig).
-- Past op de huidige database: kluis_chats (kolom tekst) en kluis_crypto bestaan al.
-- Veilig om vaker te draaien. Raakt bestaande data niet aan.

begin;

-- 1. Nieuwe velden op personen
alter table public.kluis_personen
  add column if not exists hobbys       text[] not null default '{}',
  add column if not exists werk         text,
  add column if not exists studie       text,
  add column if not exists favorieten   jsonb  not null default '{}'::jsonb,
  add column if not exists vermijden    text[] not null default '{}',
  add column if not exists werkt_altijd text[] not null default '{}',
  -- Eigen velden: [{"label": "Vindt ze leuk", "waarde": "Lange wandelingen"}, …]
  add column if not exists eigen_velden jsonb  not null default '[]'::jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'kluis_personen_favorieten_object') then
    alter table public.kluis_personen add constraint kluis_personen_favorieten_object
      check (jsonb_typeof(favorieten) = 'object');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'kluis_personen_eigen_velden_array') then
    alter table public.kluis_personen add constraint kluis_personen_eigen_velden_array
      check (jsonb_typeof(eigen_velden) = 'array');
  end if;
end $$;

-- 2. Onderwerpen voor de volgende keer
create table if not exists public.kluis_onderwerpen (
  id uuid primary key default gen_random_uuid(),
  persoon_id uuid not null references public.kluis_personen(id) on delete cascade,
  tekst text not null check (length(trim(tekst)) > 0),
  gedaan boolean not null default false,
  gedaan_op timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists kluis_onderwerpen_persoon_idx on public.kluis_onderwerpen (persoon_id, gedaan, created_at);
alter table public.kluis_onderwerpen enable row level security;
drop policy if exists kluis_onderwerpen_eigenaar on public.kluis_onderwerpen;
create policy kluis_onderwerpen_eigenaar on public.kluis_onderwerpen
  for all to authenticated
  using ((select public.kluis_is_owner()))
  with check ((select public.kluis_is_owner()));
revoke all on public.kluis_onderwerpen from anon;
grant select, insert, update, delete on public.kluis_onderwerpen to authenticated;

-- 3. Chats: markeren als belangrijk + index voor de lijst
alter table public.kluis_chats add column if not exists belangrijk boolean not null default false;
create index if not exists kluis_chats_persoon_idx on public.kluis_chats (persoon_id, datum desc);

-- 4. Opslaan-functie uitgebreid met de nieuwe velden
create or replace function public.kluis_opslaan_persoon(p_id uuid, p_data jsonb, p_accounts jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare v_id uuid;
begin
  if not public.kluis_is_owner() then raise exception 'Geen toegang'; end if;
  if coalesce(trim(p_data->>'naam'), '') = '' then raise exception 'Naam is verplicht'; end if;

  if p_id is null then
    insert into public.kluis_personen (naam) values (trim(p_data->>'naam')) returning id into v_id;
  else
    v_id := p_id;
  end if;

  update public.kluis_personen set
    naam             = trim(p_data->>'naam'),
    bijnaam          = nullif(trim(p_data->>'bijnaam'), ''),
    geboortedatum    = nullif(p_data->>'geboortedatum', '')::date,
    leeftijd         = nullif(p_data->>'leeftijd', '')::int,
    relatie          = nullif(trim(p_data->>'relatie'), ''),
    kennis_sinds     = nullif(p_data->>'kennis_sinds', '')::date,
    laatst_contact   = nullif(p_data->>'laatst_contact', '')::date,
    woonplaats       = nullif(trim(p_data->>'woonplaats'), ''),
    land             = nullif(trim(p_data->>'land'), ''),
    interesses       = coalesce(array(select jsonb_array_elements_text(coalesce(p_data->'interesses', '[]'::jsonb))), '{}'),
    notities         = nullif(trim(p_data->>'notities'), ''),
    favoriet         = coalesce((p_data->>'favoriet')::boolean, false),
    contact_interval = nullif(p_data->>'contact_interval', '')::int,
    hobbys           = coalesce(array(select jsonb_array_elements_text(coalesce(p_data->'hobbys', '[]'::jsonb))), '{}'),
    werk             = nullif(trim(p_data->>'werk'), ''),
    studie           = nullif(trim(p_data->>'studie'), ''),
    favorieten       = case when jsonb_typeof(p_data->'favorieten') = 'object' then p_data->'favorieten' else '{}'::jsonb end,
    vermijden        = coalesce(array(select jsonb_array_elements_text(coalesce(p_data->'vermijden', '[]'::jsonb))), '{}'),
    werkt_altijd     = coalesce(array(select jsonb_array_elements_text(coalesce(p_data->'werkt_altijd', '[]'::jsonb))), '{}'),
    eigen_velden     = case when jsonb_typeof(p_data->'eigen_velden') = 'array' then p_data->'eigen_velden' else '[]'::jsonb end
  where id = v_id;
  if not found then raise exception 'Persoon niet gevonden'; end if;

  delete from public.kluis_accounts where persoon_id = v_id;
  insert into public.kluis_accounts (persoon_id, platform, gebruikersnaam, chat_notitie)
  select v_id,
         coalesce(nullif(a->>'platform', ''), 'Anders'),
         nullif(trim(a->>'gebruikersnaam'), ''),
         nullif(trim(a->>'chat_notitie'), '')
    from jsonb_array_elements(coalesce(p_accounts, '[]'::jsonb)) a
   where coalesce(trim(a->>'gebruikersnaam'), '') <> ''
      or coalesce(trim(a->>'chat_notitie'), '') <> '';

  return v_id;
end; $$;
revoke execute on function public.kluis_opslaan_persoon(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.kluis_opslaan_persoon(uuid, jsonb, jsonb) to authenticated;

-- 5. Alles wissen: alle kluis-tabellen, inclusief het tweede-wachtwoordrecord
create or replace function public.kluis_wis_alles()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.kluis_is_owner() then raise exception 'Geen toegang'; end if;
  delete from public.kluis_onderwerpen where true;
  delete from public.kluis_gesprekken where true;
  delete from public.kluis_chats where true;
  delete from public.kluis_fotos where true;
  delete from public.kluis_accounts where true;
  delete from public.kluis_personen where true;
  delete from public.kluis_crypto where true;
end; $$;
revoke execute on function public.kluis_wis_alles() from public, anon;
grant execute on function public.kluis_wis_alles() to authenticated;

commit;

notify pgrst, 'reload schema';
