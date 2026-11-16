-- Personenkluis migratie 3: tweestapsverificatie afdwingen in de database.
--
-- ALLEEN UITVOEREN NADAT je in de app (Beheer -> Tweestapsverificatie -> Aanzetten)
-- je authenticator-app hebt gekoppeld en daarmee opnieuw bent ingelogd.
-- Anders kom je zelf niet meer bij je kluis.
--
-- Wat het doet: kluis_is_owner() geeft alleen nog 'true' als je sessie de tweede stap
-- heeft gehaald (aal2). Alle kluis-tabellen én de fotomap gebruiken deze functie,
-- dus zonder code uit je authenticator-app geeft de database niets meer terug,
-- ook niet aan iemand die je wachtwoord heeft en de app probeert te omzeilen.
--
-- Uitvoeren in Supabase > SQL Editor van project "Dashboardpersonal".

create or replace function public.kluis_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.kluis_owner o where o.user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2';
$$;
revoke execute on function public.kluis_is_owner() from public, anon;
grant execute on function public.kluis_is_owner() to authenticated;


-- ---------------------------------------------------------------------------
-- NOODGEVAL: telefoon/authenticator kwijt? Voer dan in de SQL Editor dit uit
-- om de regel terug te draaien (daarna kun je weer met alleen je wachtwoord in
-- en kun je in de app tweestapsverificatie opnieuw instellen):
--
-- create or replace function public.kluis_is_owner()
-- returns boolean language sql stable security definer set search_path = public as $$
--   select exists (select 1 from public.kluis_owner o where o.user_id = (select auth.uid()));
-- $$;
--
-- Oude authenticator van je kluis-account verwijderen:
-- delete from auth.mfa_factors where user_id in (select user_id from public.kluis_owner);
-- ---------------------------------------------------------------------------
