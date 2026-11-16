# Personenkluis

Privé-app voor je online contacten: personen, chatarchief, gesprekslog, foto's
(ook versleuteld "extra privé") en een dashboard. React + Vite, data in Supabase
(project **Dashboardpersonal**, tabellen `kluis_*`, privé bucket `kluis-fotos`).

## Starten

```bash
npm install
npm run dev
```

`.env` bevat `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` (alleen de publishable key, nooit de secret key).
Alleen jouw account (`kluis_owner`) komt binnen; andere accounts worden direct uitgelogd.

## Database

Voer in Supabase → SQL Editor uit (beide zijn veilig om vaker te draaien):

1. `supabase-migratie.sql`: gesprekslog, contactherinneringen, veilig opslaan (**al uitgevoerd**)
2. `supabase-migratie-2.sql`: onderwerpen, hobby's, werk/studie, favorieten, do's & don'ts, eigen velden, ★ bij chats

Ontbreekt een migratie, dan werkt de app gewoon en verbergt hij die onderdelen. Onder **Beheer** zie je wat aan staat.

## Online zetten (Vercel)

`vercel.json` regelt build en beveiligingsheaders. Zet in Vercel → Settings → Environment Variables:
`VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` (zelfde waarden als in `.env`).

## Mappen

```
src/
  main.jsx               start
  App.jsx                inloggen, automatisch vergrendelen, schil met menu
  lib/supabase.js        Supabase-client
  lib/utils.js           fouten, datums, afbeeldingen verkleinen
  lib/constants.js       platforms, herinneringen, favorieten-categorieën
  lib.js                 chat inlezen (WhatsApp, [20:14] Naam:, Naam:), zoeken, grafiekdata
  crypto.js              versleuteling extra privé foto's (PBKDF2 + AES-GCM, in de browser)
  vault.js               sleutel van het tweede wachtwoord (alleen in het geheugen)
  vault/VaultContext.jsx alle Supabase-acties (laden, opslaan, foto's, export, terugzetten, wissen)
  vault/model.js         data in de vorm die de schermen gebruiken
  styles.css             alle opmaak, licht en donker
  components/            schermen (Dashboard, ChatsView, PersonenView, FotosView, BeheerView),
                         profielpaneel en vensters (persoon, snel vastleggen, chat plakken, foto's)
oud/                     eerdere versies en de bron van het chat-dashboard (niet in gebruik)
```

## Veiligheid

Wie kan erbij?
- **Zonder inlog: niemand.** Alle `kluis_*`-tabellen en de fotomap zijn afgeschermd met RLS (alleen het account in `kluis_owner`).
- **Andere accounts in het Supabase-project:** ook niet, de database weigert ze.
- **Wie je wachtwoord heeft:** wel. Gebruik dus een sterk, uniek wachtwoord (bij voorkeur uit een wachtwoordmanager).
- **Wie in je Supabase-dashboard kan (jouw Supabase-account):** kan gewone foto's en data zien. Alleen *extra privé* foto's zijn daar ook tegen beschermd.

Wat de app doet:
- Inlog alleen in sessionStorage: tabblad of browser dicht = uitgelogd. Na 15 minuten niets doen vergrendelt de app (ook na slaapstand).
- Foto's worden nooit via een deelbare (signed) link getoond, maar met je inlog gedownload en alleen in het geheugen van het tabblad gezet.
- Extra privé foto's: versleuteld in de browser (PBKDF2 600.000 rondes + AES-GCM) vóór de upload. Tweede wachtwoord kwijt = foto's kwijt.
- De gebouwde app (`npm run build`) heeft een strikte Content-Security-Policy en geen sourcemaps. De dev-server luistert alleen op deze computer.
- De export-zip bevat bewust **geen foto's**; die blijven alleen achter je inlog. De tekst in de zip is wel leesbaar: bewaar hem veilig.
- Foto's downloaden kan alleen als je bent ingelogd (Beheer → Foto's downloaden). Die zip is níet beveiligd; extra privé foto's gaan alleen mee als ze ontgrendeld zijn.

Zelf te doen in Supabase (Dashboard):
- Authentication → Providers/Policies: overweeg *Leaked password protection* aan te zetten.
