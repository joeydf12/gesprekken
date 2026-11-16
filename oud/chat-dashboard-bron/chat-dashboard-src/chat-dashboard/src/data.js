// VOORBEELDDATA. Alle personen en chats hieronder zijn verzonnen.
// Later vervang je dit door queries op je Supabase-tabellen
// (kluis_personen, kluis_accounts, kluis_chats, kluis_fotos), zie README.md.
import { daysAgo, iso, parseISO, placeholderPhoto } from './lib.js';

// Chat met tijden:  [21:14] Naam: tekst
const L = (rows) => rows.map(([t, who, text]) => `[${t}] ${who}: ${text}`).join('\n');

// WhatsApp-export: 12/03/2026, 21:14 - Naam: tekst  (n = dagen geleden)
const WA = (rows) =>
  rows
    .map(([n, t, who, text]) => {
      const d = parseISO(daysAgo(n));
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${dd}/${mm}/${d.getFullYear()}, ${t} - ${who}: ${text}`;
    })
    .join('\n');

export const PERSONEN = [
  {
    id: 'p1', naam: 'Lisa de Vries', bijnaam: 'Lis', geboortedatum: '2001-11-20', leeftijd: null,
    woonplaats: 'Utrecht', land: 'Nederland', relatie: 'Gamemaatje', favoriet: true,
    interesses: ['darts', 'gamen', 'koken'], kennis_sinds: daysAgo(620),
    notities: 'Ontmoet via de darts-server.\nBegint net bij de gemeente. Houdt van pizza, haat koriander.',
    accounts: [
      { platform: 'Discord', gebruikersnaam: 'lisa99', notitie: 'Praat veel over darts' },
      { platform: 'Telegram', gebruikersnaam: '@lisadv', notitie: '' },
    ],
  },
  {
    id: 'p2', naam: 'Mark Jansen', bijnaam: null, geboortedatum: null, leeftijd: 29,
    woonplaats: 'Gent', land: 'België', relatie: 'Online vriend', favoriet: false,
    interesses: ['voetbal', 'bier brouwen'], kennis_sinds: daysAgo(210),
    notities: 'Supporter van KAA Gent. Regelt soms tickets.',
    accounts: [
      { platform: 'Reddit', gebruikersnaam: 'u/markj_gent', notitie: '' },
      { platform: 'Discord', gebruikersnaam: 'markj_gent', notitie: '' },
    ],
  },
  {
    id: 'p3', naam: 'Sven Bakker', bijnaam: null, geboortedatum: null, leeftijd: 34,
    woonplaats: 'Keulen', land: 'Duitsland', relatie: 'Gamemaatje', favoriet: false,
    interesses: ['EAFC', 'techno'], kennis_sinds: daysAgo(400),
    notities: 'Speelt Weekend League. Vaak online na 22:00.',
    accounts: [{ platform: 'Discord', gebruikersnaam: 'sven_k', notitie: '' }],
  },
  {
    id: 'p4', naam: 'Emma Visser', bijnaam: null, geboortedatum: '2003-12-02', leeftijd: null,
    woonplaats: 'Rotterdam', land: 'Nederland', relatie: 'Vriend', favoriet: true,
    interesses: ['fotografie', 'reizen', 'koffie'], kennis_sinds: daysAgo(300),
    notities: 'Maakt prachtige foto\'s. Wil in het voorjaar naar Lissabon.',
    accounts: [
      { platform: 'Telegram', gebruikersnaam: '@emmavisser', notitie: '' },
      { platform: 'Instagram', gebruikersnaam: 'emma.snaps', notitie: '' },
    ],
  },
  {
    id: 'p5', naam: 'Tom Hendriks', bijnaam: null, geboortedatum: null, leeftijd: 27,
    woonplaats: 'Eindhoven', land: 'Nederland', relatie: 'Kennis', favoriet: false,
    interesses: ['3D-printen', 'programmeren', 'toetsenborden'], kennis_sinds: daysAgo(150),
    notities: 'Helpt met printers en code.',
    accounts: [
      { platform: 'Discord', gebruikersnaam: 'tomh3d', notitie: '' },
      { platform: 'Reddit', gebruikersnaam: 'u/tom_prints', notitie: '' },
    ],
  },
  {
    id: 'p6', naam: 'Noor El Amrani', bijnaam: null, geboortedatum: '1999-11-14', leeftijd: null,
    woonplaats: 'Amsterdam', land: 'Nederland', relatie: 'Netwerk', favoriet: false,
    interesses: ['UX-design', 'hardlopen', 'boeken'], kennis_sinds: daysAgo(95),
    notities: 'Werkt als UX-onderzoeker. Denkt mee over mijn afstuderen.',
    accounts: [{ platform: 'Telegram', gebruikersnaam: '@noor.ux', notitie: 'Antwoordt meestal \'s avonds' }],
  },
  {
    id: 'p7', naam: 'Jake Miller', bijnaam: null, geboortedatum: null, leeftijd: 31,
    woonplaats: 'Manchester', land: 'Verenigd Koninkrijk', relatie: 'Online vriend', favoriet: false,
    interesses: ['darts', 'Premier League'], kennis_sinds: daysAgo(260),
    notities: 'Spreekt Engels. Kijkt elk weekend voetbal.',
    accounts: [
      { platform: 'Reddit', gebruikersnaam: 'u/jakem_darts', notitie: '' },
      { platform: 'WhatsApp', gebruikersnaam: '+44 7700 900123', notitie: 'Voorbeeldnummer' },
    ],
  },
  {
    id: 'p8', naam: 'Daan Mulder', bijnaam: null, geboortedatum: null, leeftijd: 22,
    woonplaats: 'Zwolle', land: 'Nederland', relatie: 'Kennis', favoriet: false,
    interesses: ['wielrennen', 'gamen'], kennis_sinds: daysAgo(330),
    notities: 'Wilde ooit samen een tocht fietsen.',
    accounts: [{ platform: 'Discord', gebruikersnaam: 'daanm', notitie: '' }],
  },
];

export const CHATS = [
  { id: 'c1', persoon_id: 'p1', platform: 'Discord', titel: 'Kerstplannen', datum: daysAgo(2), tekst: L([
    ['20:14', 'Lisa', 'Hey! Heb je al plannen voor kerst?'],
    ['20:15', 'Joey', 'Nog niet echt, waarschijnlijk bij mijn ouders'],
    ['20:16', 'Lisa', 'Ik dacht eraan om een darts-avond te organiseren in Utrecht, tweede kerstdag'],
    ['20:16', 'Lisa', 'Mark en Sven komen misschien ook'],
    ['20:18', 'Joey', 'Dat klinkt top, ik kom sowieso'],
    ['20:19', 'Lisa', 'Yes! Ik regel er ook een pubquiz bij, dan moet jij de vragen over voetbal bedenken'],
    ['20:21', 'Joey', 'Deal 😄'],
  ]) },
  { id: 'c2', persoon_id: 'p1', platform: 'Telegram', titel: 'Eerste week op de nieuwe baan', datum: daysAgo(9), tekst: L([
    ['19:02', 'Lisa', 'Eerste week bij de gemeente zit erop!'],
    ['19:03', 'Joey', 'Hoe was het?'],
    ['19:05', 'Lisa', 'Veel namen onthouden, maar mijn team is aardig. Ik ga iets met data doen'],
    ['19:06', 'Lisa', 'Ik was zo zenuwachtig dat ik mijn lunch vergat 🙈'],
    ['19:08', 'Joey', 'Haha dat gebeurt iedereen. Het gaat vanzelf beter'],
  ]) },
  { id: 'c3', persoon_id: 'p1', platform: 'Discord', titel: 'Cadeautips voor Mark', datum: daysAgo(41), tekst: L([
    ['16:40', 'Joey', 'Mark wordt volgende maand jarig, heb jij een idee?'],
    ['16:42', 'Lisa', 'Een setje dartpijlen? Hij zei laatst dat zijn oude kapot zijn'],
    ['16:43', 'Joey', 'Goed idee. Welk merk?'],
    ['16:45', 'Lisa', 'Volgens mij speelt hij met Target, ik vraag het wel even voorzichtig'],
  ]) },
  { id: 'c4', persoon_id: 'p1', platform: 'Discord', titel: 'Darts-avond in Utrecht', datum: daysAgo(112), tekst: L([
    ['21:10', 'Lisa', 'Zaterdag is er open darts bij café De Gouden Leeuw, ga je mee?'],
    ['21:12', 'Joey', 'Ja leuk! Hoe laat?'],
    ['21:12', 'Lisa', 'Rond 20:00. Ik neem een vriendin mee'],
    ['21:13', 'Joey', 'Top, tot dan'],
  ]) },

  { id: 'c5', persoon_id: 'p2', platform: 'Reddit', titel: 'Tickets KAA Gent', datum: daysAgo(5), tekst: L([
    ['18:20', 'Mark', 'Ik heb nog twee tickets voor 23 november, thuiswedstrijd tegen Anderlecht'],
    ['18:22', 'Joey', 'Echt? Hoeveel kosten ze?'],
    ['18:23', 'Mark', '38 euro per stuk, zitplaatsen vak 4'],
    ['18:25', 'Joey', 'Ik ben erbij. Wie neem ik mee?'],
    ['18:26', 'Mark', 'Sven wil misschien ook, vraag het hem even'],
    ['18:31', 'Joey', 'Doe ik, bedankt!'],
  ]) },
  { id: 'c6', persoon_id: 'p2', platform: 'Discord', titel: 'Bier brouwen', datum: daysAgo(33), tekst: L([
    ['20:05', 'Mark', 'Mijn tripel is klaar na vier weken gisten'],
    ['20:06', 'Joey', 'Hoe smaakt hij?'],
    ['20:08', 'Mark', 'Beter dan verwacht, wat kruidig. Ik stuur je er een paar flesjes van als je naar Gent komt'],
    ['20:09', 'Joey', 'Dat laat ik me niet twee keer zeggen'],
  ]) },
  { id: 'c7', persoon_id: 'p2', platform: 'Reddit', titel: 'Eerste contact', datum: daysAgo(150), tekst: L([
    ['13:11', 'Mark', 'Hey, ik zag je reactie in r/amateurvoetbal over de jeugdopleiding. Jij traint zelf?'],
    ['13:15', 'Joey', 'Ja, een O19-team. En jij?'],
    ['13:17', 'Mark', 'Ik ben vooral supporter, maar ik help soms bij de club met de bar'],
  ]) },

  { id: 'c8', persoon_id: 'p3', platform: 'Discord', titel: 'EAFC Weekend League', datum: daysAgo(75), tekst: L([
    ['22:30', 'Sven', 'Bro, 14 wins gehaald dit weekend 🔥'],
    ['22:31', 'Joey', 'Wat een run. Welke formatie speel je?'],
    ['22:33', 'Sven', '4-2-2-2, met die nieuwe spits uit de Bundesliga'],
    ['22:34', 'Joey', 'Ik moet ook weer eens meer spelen, was te druk met werk'],
    ['22:36', 'Sven', 'Kom volgende week online, dan doen we een paar potjes samen'],
  ]) },
  { id: 'c9', persoon_id: 'p3', platform: 'Discord', titel: 'Techno in Keulen', datum: daysAgo(190), tekst: L([
    ['23:50', 'Sven', 'Ik ga zaterdag naar een techno-avond in een oude fabriek'],
    ['23:51', 'Joey', 'Klinkt wild. Is dat iets voor mij?'],
    ['23:53', 'Sven', 'Misschien niet haha, maar je mag altijd komen'],
  ]) },

  { id: 'c10', persoon_id: 'p4', platform: 'Telegram', titel: 'Fotowandeling in Rotterdam', datum: daysAgo(14), tekst: L([
    ['11:05', 'Emma', 'Zin om zaterdag samen te fotograferen? Ik wil de Markthal proberen'],
    ['11:08', 'Joey', 'Ja graag! Ik heb mijn oude camera nog'],
    ['11:09', 'Emma', 'Ik neem koffie mee. 10:00 bij het station?'],
    ['11:10', 'Joey', 'Perfect'],
    ['11:10', 'Emma', 'Trek warme kleren aan, het waait daar altijd'],
  ]) },
  { id: 'c11', persoon_id: 'p4', platform: 'Instagram', titel: 'Foto\'s van Lissabon', datum: daysAgo(58), tekst: L([
    ['17:25', 'Emma', 'Kijk, mijn foto\'s van de trip zijn eindelijk klaar!'],
    ['17:27', 'Joey', 'Wauw, die van de tram is mooi'],
    ['17:28', 'Emma', 'Dankjewel! Voorjaar ga ik terug, wil je mee?'],
    ['17:30', 'Joey', 'Daar denk ik zeker over na'],
  ]) },

  { id: 'c12', persoon_id: 'p5', platform: 'Discord', titel: '3D-printer problemen', datum: daysAgo(70), tekst: L([
    ['19:40', 'Joey', 'Mijn eerste laag blijft niet plakken, wat doe ik fout?'],
    ['19:42', 'Tom', 'Check eerst of je bed echt waterpas staat'],
    ['19:42', 'Tom', 'En maak het glas schoon met isopropanol'],
    ['19:50', 'Joey', 'Dat was het! Eerste print is gelukt'],
    ['19:51', 'Tom', 'Mooi. Nu de rest van de verslaving 😂'],
  ]) },
  { id: 'c13', persoon_id: 'p5', platform: 'Reddit', titel: 'Mechanisch toetsenbord', datum: daysAgo(96), tekst: L([
    ['12:15', 'Tom', 'Heb je al gekeken naar een 75% layout? Handig voor je bureau'],
    ['12:20', 'Joey', 'Ik dacht aan linear switches, maar ik twijfel'],
    ['12:24', 'Tom', 'Probeer eerst een tester voordat je koopt'],
  ]) },

  { id: 'c14', persoon_id: 'p6', platform: 'Telegram', titel: 'Afstudeeronderzoek UX', datum: daysAgo(4), tekst: L([
    ['21:00', 'Noor', 'Hoe gaat het met je afstudeeropdracht?'],
    ['21:03', 'Joey', 'Ik bouw een dashboard voor een UX-lab en moet nog een interviewopzet maken'],
    ['21:05', 'Noor', 'Doe maximaal zes vragen per gesprek, anders raken mensen moe'],
    ['21:05', 'Noor', 'En begin met een vraag over hun dag, niet over het product'],
    ['21:08', 'Joey', 'Heel nuttig. Mag ik je volgende week nog iets laten zien?'],
    ['21:09', 'Noor', 'Tuurlijk. Donderdag na zessen kan ik'],
  ]) },
  { id: 'c15', persoon_id: 'p6', platform: 'Telegram', titel: 'Hardlooprondje', datum: daysAgo(27), tekst: L([
    ['08:10', 'Noor', 'Ik loop zondag een rondje door het Vondelpark, 10 km'],
    ['08:12', 'Joey', 'Ik kom wel, maar niet te snel'],
    ['08:13', 'Noor', 'Ik doe rustig 6:00 per kilometer'],
  ]) },

  { id: 'c16', persoon_id: 'p7', platform: 'WhatsApp', titel: 'Darts-finale', datum: daysAgo(12), tekst: WA([
    [12, '21:14', 'Jake', 'Did you watch the final last night?'],
    [12, '21:15', 'Joey', 'Yes! That last leg was unreal'],
    [12, '21:16', 'Jake', 'A 170 checkout to win it, absolute scenes'],
    [11, '09:02', 'Jake', 'Morning mate, are you coming over for the Premier League weekend?'],
    [11, '09:30', 'Joey', 'Would love to, but not before January'],
    [11, '09:31', 'Jake', 'No worries, the sofa is yours whenever'],
  ]) },
  { id: 'c17', persoon_id: 'p7', platform: 'Reddit', titel: 'Premier League weekend', datum: daysAgo(88), tekst: L([
    ['17:45', 'Jake', 'City against United on Sunday, pub or couch?'],
    ['17:47', 'Joey', 'Couch, with snacks'],
    ['17:48', 'Jake', 'Sensible man'],
  ]) },

  { id: 'c18', persoon_id: 'p8', platform: 'Discord', titel: 'Wielertocht plannen', datum: daysAgo(131), tekst: L([
    ['15:20', 'Daan', 'Zullen we in het voorjaar een tocht langs de IJssel fietsen?'],
    ['15:25', 'Joey', 'Graag! Hoeveel kilometer denk je?'],
    ['15:27', 'Daan', 'Zo\'n 90, rustig tempo met een koffiestop'],
    ['15:30', 'Joey', 'Ik hou je eraan'],
  ]) },

  { id: 'c19', persoon_id: 'p1', platform: 'Discord', titel: 'Eerste keer samen darten online', datum: daysAgo(238), tekst: L([
    ['21:00', 'Lisa', 'Zin om online een potje 501 te spelen?'],
    ['21:02', 'Joey', 'Ja, maar ik ben niet zo goed hoor'],
    ['21:03', 'Lisa', 'Geen zorgen, ik ook niet haha'],
    ['21:40', 'Lisa', 'Dat was leuk, volgende week weer?'],
  ]) },
  { id: 'c20', persoon_id: 'p2', platform: 'Reddit', titel: 'Tips voor een goede stadionpint', datum: daysAgo(268), tekst: L([
    ['19:12', 'Mark', 'In Gent is de beste bar vlak bij het stadion Café Den Bruinen'],
    ['19:15', 'Joey', 'Genoteerd, ik kom er een keer langs'],
  ]) },
  { id: 'c21', persoon_id: 'p4', platform: 'Instagram', titel: 'Reactie op mijn foto', datum: daysAgo(305), tekst: L([
    ['10:30', 'Emma', 'Hey, ik zag je foto van de zonsopgang, echt mooi!'],
    ['10:34', 'Joey', 'Dankjewel! Gemaakt met mijn oude camera'],
    ['10:36', 'Emma', 'Wil je een keer samen gaan fotograferen?'],
  ]) },
  { id: 'c22', persoon_id: 'p7', platform: 'Reddit', titel: 'Eerste bericht', datum: daysAgo(262), tekst: L([
    ['14:05', 'Jake', 'Saw your comment in the darts thread, you play too?'],
    ['14:09', 'Joey', 'Just started, my average is 32'],
    ['14:10', 'Jake', 'Everyone starts somewhere mate'],
  ]) },
  { id: 'c23', persoon_id: 'p3', platform: 'Discord', titel: 'Kennismaking in de EAFC-server', datum: daysAgo(396), tekst: L([
    ['23:15', 'Sven', 'Yo, jij zit ook in de Nederlandse server toch?'],
    ['23:17', 'Joey', 'Klopt, jij speelt vooral online potjes?'],
  ]) },
];

let n = 0;
const foto = (persoon_id, kind, bijschrift, profiel = false) => {
  n += 1;
  const id = 'f' + n;
  return { id, persoon_id, kind, bijschrift, profiel, datum: iso(new Date()), src: placeholderPhoto(id + (persoon_id || 'los'), kind) };
};

export const FOTOS = [
  foto('p1', 'portret', 'Lisa', true), foto('p1', 'eten', 'Zelfgemaakte pizza'), foto('p1', 'game', 'Dartsbord thuis'),
  foto('p2', 'portret', 'Mark', true), foto('p2', 'stad', 'Gent bij avond'), foto('p2', 'eten', 'Zelfgebrouwen tripel'),
  foto('p3', 'portret', 'Sven', true), foto('p3', 'game', 'EAFC-scherm'), foto('p3', 'stad', 'Keulen'),
  foto('p4', 'portret', 'Emma', true), foto('p4', 'berg', 'Duinen'), foto('p4', 'stad', 'Rotterdam skyline'), foto('p4', 'stad', 'Lissabon'),
  foto('p5', 'portret', 'Tom', true), foto('p5', 'game', '3D-geprint figuurtje'),
  foto('p6', 'portret', 'Noor', true), foto('p6', 'stad', 'Amsterdam'), foto('p6', 'berg', 'Hardlooproute'),
  foto('p7', 'portret', 'Jake', true), foto('p7', 'stad', 'Manchester'),
  foto('p8', 'portret', 'Daan', true), foto('p8', 'berg', 'Veluwe'),
  foto(null, 'eten', 'Pizza-avond'), foto(null, 'berg', 'Wandeling'), foto(null, 'stad', 'Uitzicht'),
];
