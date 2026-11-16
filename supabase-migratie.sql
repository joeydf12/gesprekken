-- Personenkluis: gesprekkenlog, contact-herinnering en atomisch opslaan.
-- Uitvoeren in Supabase > SQL Editor van project "Dashboardpersonal" (ycnhujswvtyoldnqesig).
-- Veilig om vaker te draaien. Raakt bestaande data niet aan.

begin;

-- 1. Gesprekkenlog per persoon
create table if not exists public.kluis_gesprekken (
  id uuid primary key default gen_random_uuid(),
  persoon_id uuid not null references public.kluis_personen(id) on delete cascade,
  datum date not null default current_date,
  platform text,
  samenvatting text not null check (length(trim(samenvatting)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists kluis_gesprekken_persoon_idx on public.kluis_gesprekken (persoon_id, datum desc);
alter table public.kluis_gesprekken enable row level security;
drop policy if exists kluis_gesprekken_eigenaar on public.kluis_gesprekken;
create policy kluis_gesprekken_eigenaar on public.kluis_gesprekken
  for all to authenticated
  using ((select public.kluis_is_owner()))
  with check ((select public.kluis_is_owner()));
revoke all on public.kluis_gesprekken from anon;
grant select, insert, update, delete on public.kluis_gesprekken to authenticated;

-- 2. Contact-herinnering per persoon (aantal dagen)
alter table public.kluis_personen add column if not exists contact_interval integer
  check (contact_interval is null or contact_interval between 1 and 365);

-- 3. Gesprek toevoegen => laatst_contact automatisch bijwerken
create or replace function public.kluis_gesprek_contact()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  update public.kluis_personen
     set laatst_contact = greatest(coalesce(laatst_contact, new.datum), new.datum)
   where id = new.persoon_id;
  return new;
end; $$;
drop trigger if exists kluis_gesprekken_contact on public.kluis_gesprekken;
create trigger kluis_gesprekken_contact
  after insert or update of datum on public.kluis_gesprekken
  for each row execute function public.kluis_gesprek_contact();
revoke execute on function public.kluis_gesprek_contact() from public, anon, authenticated;

-- 4. Persoon + accounts in één transactie opslaan (RLS blijft gelden: security invoker)
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
    contact_interval = nullif(p_data->>'contact_interval', '')::int
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

-- 5. Alles wissen neemt ook gesprekken mee
create or replace function public.kluis_wis_alles()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.kluis_is_owner() then raise exception 'Geen toegang'; end if;
  delete from public.kluis_gesprekken where true;
  delete from public.kluis_fotos where true;
  delete from public.kluis_accounts where true;
  delete from public.kluis_personen where true;
end; $$;
revoke execute on function public.kluis_wis_alles() from public, anon;
grant execute on function public.kluis_wis_alles() to authenticated;

-- 6. Opruiming rechten
revoke execute on function public.kluis_touch_updated_at() from public, anon, authenticated;
revoke execute on function public.kluis_is_owner() from public, anon;
grant execute on function public.kluis_is_owner() to authenticated;

commit;

-- PostgREST schema-cache verversen zodat de nieuwe tabel/functie direct zichtbaar is
notify pgrst, 'reload schema';
