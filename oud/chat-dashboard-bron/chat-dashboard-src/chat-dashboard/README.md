# Personenkluis Dashboard

Alleen-lezen chatarchief met een dashboard eroverheen. React 18 + Vite.
Alle personen en chats in `src/data.js` zijn verzonnen voorbeelddata.

## Starten

```bash
npm install
npm run dev
```

## Mappen

```
src/
  main.jsx            start van de app
  supabaseClient.js   Supabase-client (echte modus alleen met .env.local)
  crypto.js           versleuteling van extra privé foto's (WebCrypto)
  vault.js            sleutel in het geheugen: instellen, ontgrendelen, wissen
  photos.js           foto's uploaden en tonen, versleuteld of gewoon
  auth.js             inlog (demo of Supabase) en automatische vergrendeling
  App.jsx             schermkeuze, geselecteerde persoon, chats plakken
  data.js             VOORBEELDDATA (hier komt later Supabase)
  lib.js              datums, leeftijd, chat inlezen, zoeken, plaatshouder-foto's
  styles.css          alle opmaak, licht en donker via variabelen bovenaan
  components/
    Dashboard.jsx     overzicht: kerncijfers, grafiek, contact, verjaardagen
    Chart.jsx         staafgrafiek berichten per maand
    ChatsView.jsx     lijst, gesprek, zoeken, alleen-lezen balk
    PersonenView.jsx  raster met alle personen
    FotosView.jsx     fotobibliotheek
    ProfilePanel.jsx  profiel naast of over het gesprek
    PasteDialog.jsx   chat plakken (WhatsApp-export, [20:14] Naam: tekst, Naam: tekst)
    PhotoDialog.jsx   foto toevoegen, met vinkje Extra privé (versleutelt in de browser)
    VaultDialog.jsx   tweede wachtwoord invullen om extra privé foto's te tonen
    Login.jsx         inlogscherm
    Lightbox.jsx      grote foto met bladeren
```

## Aan Supabase koppelen

De vormen in `data.js` komen overeen met de tabellen uit de kluis-app
(project Dashboardpersonal):

| In de app | Supabase-tabel | Opmerking |
|---|---|---|
| `PERSONEN` | `kluis_personen` + `kluis_accounts` | accounts per persoon samenvoegen als `accounts: []` |
| `CHATS` | `kluis_chats` | veld `tekst` is de ruwe geplakte chat, `parseChat()` maakt er berichten van |
| `FOTOS` | `kluis_fotos` | `src` wordt een signed URL uit de privé bucket `kluis-fotos` |

Stappen:

1. `npm install @supabase/supabase-js`
2. Maak `src/supabase.js` met `createClient(URL, PUBLISHABLE_KEY)`.
3. De inlog staat al klaar (`src/auth.js`, `Login.jsx`): zet `VITE_SUPABASE_URL` en `VITE_SUPABASE_KEY` in `.env.local` (zie `.env.example`) en de app logt echt in en controleert `rpc('kluis_is_owner')`.
4. Laad de data in `App.jsx` met `useEffect` in plaats van de imports uit `data.js`.
5. In `saveChat` (App.jsx) een `insert` doen op `kluis_chats` in plaats van `localStorage`.

## Inlog

- Zonder `.env.local`: demo-modus, wachtwoord `demo`. Dat is alleen een slot voor de show, geen beveiliging.
- Met `.env.local`: e-mail + wachtwoord via Supabase, alleen jouw account (`kluis_owner`) komt binnen. Andere accounts in het project worden direct uitgelogd.
- Uitloggen kan links onderin; na 15 minuten niets doen vergrendelt de app vanzelf.
- Echte beveiliging zit in Supabase (RLS en de privé bucket), niet in de React-pagina.

## Alleen voor de demo

- Zelf geplakte chats staan in `localStorage` (sleutel `personenkluis-demo-chats`). Dat verdwijnt zodra je Supabase gebruikt.
- De foto's zijn getekende plaatshouders uit `placeholderPhoto()` in `lib.js`.
- `ME` in `lib.js` bepaalt welke berichten rechts staan. Zet daar je eigen naam.

## Extra privé foto's (versleuteld voor de upload)

Bedoeld voor foto's waar zelfs Supabase niet bij mag kunnen, zoals foto's van je kinderen.
De uitgebreide handleiding staat in het document "Extra privé foto's: zo werkt het".

**Wat er al is (klaar en getest, 9 controles op de versleuteling):**

- `crypto.js`: sleutel afleiden uit het tweede wachtwoord (PBKDF2-SHA256, 600.000 rondes, salt),
  versleutelen met AES-GCM 256, nieuwe IV per foto. Het mime-type zit ín de versleutelde bytes.
- `vault.js`: de sleutel leeft alleen in het geheugen. `setupVault(wachtwoord, userId)` (eenmalig),
  `unlock(wachtwoord)`, `getKey()`, `useVaultKey()`. `auth.js` roept `clearVault()` aan bij uitloggen en vergrendelen.
- `photos.js`: `uploadPhoto({ persoonId, file, key })` met `key = getKey()` versleutelt vooraf; zonder `key` is het een gewone foto.
  `photoUrl(foto, key)` geeft een `<img>`-URL (signed URL of ontsleutelde `blob:`).
- Database (al toegepast op Dashboardpersonal): `kluis_fotos.versleuteld`, tabel `kluis_crypto`
  (salt, rondes, controlewaarde; alleen voor de eigenaar), de bucket accepteert `application/octet-stream`,
  en `kluis_wis_alles()` wist ook `kluis_crypto`.

**De schermen staan er al, in demo-modus (foto's blijven in het geheugen van het tabblad).** Om ze echt te koppelen:

1. `PhotoDialog.jsx` roept nu `onSave({ blob, versleuteld, ... })` aan met een lokaal Blob. Vervang in `App.jsx` (`onSave` van PhotoDialog) het `setMine` door `uploadPhoto({ persoonId, file, key })` uit `photos.js`. Geef de oorspronkelijke `file` mee, niet het al versleutelde blob, want `uploadPhoto` versleutelt zelf. Verwijder dan het versleutelen in PhotoDialog, of geef alleen `file`, `persoon_id`, `bijschrift` en `versleuteld` door.
2. In `App.jsx` de foto's laden uit `kluis_fotos` en per foto `photoUrl(foto, getKey())` gebruiken voor `src` (de huidige `opened`-logica met `decryptToBlob` kan dan weg).
3. `setupVault(pw, userId)` krijgt nu `'demo'` als userId in PhotoDialog; geef daar het echte `user.id` mee (`supabase.auth.getUser()`).

**Regels om niet te breken:**

- Het tweede wachtwoord en de sleutel nooit in `localStorage`, Supabase, logs of de URL.
- Wachtwoord kwijt betekent foto's kwijt. Er is geen herstel.
- Bij wachtwoord wijzigen: alle versleutelde foto's ontsleutelen met de oude sleutel en opnieuw versleutelen met de nieuwe, pas daarna het record in `kluis_crypto` vervangen.
- Exports van versleutelde foto's blijven versleuteld.
