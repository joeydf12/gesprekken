import { useState } from 'react';
import { useModel } from '../vault/model.js';
import { useToast } from './Toast.jsx';
import { ConfirmButton, Note } from './ui.jsx';
import { clearVault, useVaultKey } from '../vault.js';
import { errText, tally } from '../lib/utils.js';

function HBars({ counts }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!rows.length) return <p className="muted">Nog geen gegevens.</p>;
  const max = rows[0][1];
  return (
    <ul className="hbars">
      {rows.map(([name, v]) => (
        <li key={name}>
          <span className="hb-name">{name}</span>
          <span className="hb-track"><i style={{ width: Math.max(4, (v / max) * 100) + '%' }} /></span>
          <b>{v}</b>
        </li>
      ))}
    </ul>
  );
}

const Ok = ({ on, yes, no }) => (on === null ? '—' : on ? <span className="ok">{yes}</span> : <span className="bad">{no}</span>);

export default function BeheerView() {
  const vault = useModel();
  const { data, status, user, chats } = vault;
  const key = useVaultKey();
  const toast = useToast();
  const [exportMsg, setExportMsg] = useState(null);
  const [photoMsg, setPhotoMsg] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [wipeMsg, setWipeMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const [wipeText, setWipeText] = useState('');
  const messages = chats.reduce((s, c) => s + c.messages.length, 0);

  async function run(name, setMsg, fn) {
    setBusy(name);
    try { await fn(); } catch (err) {
      if (!vault.authFailed(err)) setMsg({ text: 'Mislukt: ' + errText(err), err: true });
    }
    setBusy('');
  }

  const onExport = () => run('export', setExportMsg, async () => {
    const { missing } = await vault.exportZip((text) => setExportMsg({ text }));
    setExportMsg(missing
      ? { text: `Klaar, maar ${missing} onderdelen ontbreken.`, err: true }
      : { text: 'Klaar. Het zipbestand staat in je downloads.' });
  });

  const onPhotoExport = () => run('photos', setPhotoMsg, async () => {
    const r = await vault.exportPhotosZip((text) => setPhotoMsg({ text }));
    if (!r.added) {
      setPhotoMsg({ text: r.skipped ? 'Alleen extra privé foto\x27s gevonden: ontgrendel ze eerst onder Foto\x27s.' : 'Er zijn nog geen foto\x27s om te downloaden.', err: !!r.skipped });
      return;
    }
    const extra = [r.skipped ? r.skipped + ' extra privé overgeslagen (niet ontgrendeld)' : '', r.failed ? r.failed + ' mislukt' : ''].filter(Boolean).join(', ');
    setPhotoMsg({ text: r.added + ' foto\x27s in de zip.' + (extra ? ' ' + extra + '.' : ''), err: !!r.failed });
  });

  const onImport = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    run('import', setImportMsg, async () => {
      const r = await vault.importZip(file, (text) => setImportMsg({ text }));
      setImportMsg({
        text: `${r.made} personen, ${r.chats} chats, ${r.logs} gesprekken en ${r.photos} foto's teruggezet` + (r.failed ? `, ${r.failed} overgeslagen.` : '.'),
        err: !!r.failed
      });
    });
  };

  const onWipe = () => run('wipe', setWipeMsg, async () => {
    await vault.wipeAll((text) => setWipeMsg({ text }));
    clearVault();
    setWipeText('');
    setWipeMsg({ text: 'Alles is gewist. De kluis is leeg.' });
  });

  const onReload = async () => {
    setBusy('reload');
    if (await vault.reload()) toast('Bijgewerkt.');
    setBusy('');
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Beheer</h1>
          <p className="sub">Koppeling, back-up en opruimen.</p>
        </div>
      </header>

      <dl className="kpis">
        <div><dt>Personen</dt><dd>{data.personen.length}</dd></div>
        <div><dt>Chats</dt><dd>{data.chats.length}</dd></div>
        <div><dt>Berichten</dt><dd>{messages}</dd></div>
        <div><dt>Gesprekslog</dt><dd>{data.gesprekken.length}</dd></div>
        <div><dt>Foto's</dt><dd>{data.fotos.length}</dd></div>
      </dl>

      <div className="dgrid">
        <section className="card c8 stack">
          <h2>Koppeling met Supabase</h2>
          <dl className="status">
            <div><dt>Ingelogd als</dt><dd>{user.email || '—'}</dd></div>
            <div><dt>Verbinding</dt><dd>{status.error ? <span className="bad">Fout: {status.error}</span> : status.loadedAt ? <span className="ok">OK</span> : 'Laden…'}</dd></div>
            <div><dt>Laatst geladen</dt><dd>{status.loadedAt ? status.loadedAt.toLocaleTimeString('nl-NL') : '—'}</dd></div>
            <div><dt>Gesprekslog &amp; herinneringen</dt><dd><Ok on={status.v2} yes="Aan" no="supabase-migratie.sql nog niet uitgevoerd" /></dd></div>
            <div><dt>Chats</dt><dd><Ok on={status.chats} yes="Aan" no="Tabel kluis_chats ontbreekt" /></dd></div>
            <div><dt>Onderwerpen, hobby's, favorieten</dt><dd><Ok on={status.v3} yes="Aan" no="supabase-migratie-2.sql nog niet uitgevoerd" /></dd></div>
            <div><dt>Extra privé foto's</dt><dd>{key ? <span className="ok">Ontgrendeld</span> : 'Vergrendeld'}</dd></div>
          </dl>
          {(status.v2 === false || status.v3 === false) && (
            <p className="hint warn">Voer het ontbrekende SQL-bestand uit in Supabase → SQL Editor en tik daarna op Opnieuw laden.</p>
          )}
          <div><button className="btn" type="button" onClick={onReload} disabled={!!busy}>Opnieuw laden</button></div>
        </section>

        <section className="card c4 stack">
          <h2>Zo is je kluis beveiligd</h2>
          <ul className="sec-list">
            <li>Alleen jouw account komt binnen; de database controleert dat bij elke vraag (RLS).</li>
            <li>Foto's staan in een afgesloten map en worden nooit via een deelbare link getoond.</li>
            <li>Tabblad of browser dicht = uitgelogd. Na 15 minuten niets doen: vergrendeld.</li>
            <li>Extra privé foto's zijn versleuteld met je tweede wachtwoord; zelfs Supabase kan ze niet zien.</li>
          </ul>
        </section>

        <section className="card c4 stack">
          <h2>Relaties</h2>
          <HBars counts={tally(data.personen.map((p) => p.relatie))} />
        </section>
        <section className="card c4 stack">
          <h2>Landen</h2>
          <HBars counts={tally(data.personen.map((p) => p.land))} />
        </section>
        <section className="card c4 stack">
          <h2>Gesprekken via</h2>
          <HBars counts={tally(data.gesprekken.map((g) => g.platform))} />
        </section>
        <section className="card c4 stack">
          <h2>Hobby's</h2>
          <HBars counts={tally(data.personen.flatMap((p) => (p.hobbys || []).map((h) => h.toLowerCase())))} />
        </section>

        <section className="card c4 stack">
          <h2>Alles ophalen</h2>
          <p className="muted">Eén zipbestand met alle personen, accounts, chats, gesprekken en onderwerpen (data.json). <b>Foto's zitten er bewust niet in</b>: die blijven alleen in de app, achter je inlog.</p>
          <p className="hint warn">Let op: de tekst in de zip (namen, chats, notities) is wél leesbaar voor wie het bestand heeft. Bewaar hem veilig of verwijder hem na gebruik.</p>
          <div><button className="btn primary" type="button" onClick={onExport} disabled={!!busy}>Download zip</button></div>
          <Note msg={exportMsg} />
        </section>

        <section className="card c4 stack">
          <h2>Foto's downloaden</h2>
          <p className="muted">Alle {data.fotos.length} foto's in één zip, per persoon in een eigen map. Extra privé foto's gaan alleen mee als je ze nu hebt ontgrendeld{key ? ' (dat is zo)' : ''}.</p>
          <p className="hint warn">De foto's in deze zip zijn níet beveiligd: iedereen die het bestand heeft, kan ze zien. Haal hem alleen op je eigen apparaat binnen en verwijder hem als je klaar bent.</p>
          <div><ConfirmButton label="Download foto's" className="btn" disabled={!!busy || !data.fotos.length} onConfirm={onPhotoExport} /></div>
          <Note msg={photoMsg} />
        </section>

        <section className="card c4 stack">
          <h2>Terugzetten uit zip</h2>
          <p className="muted">Zet alles uit een eerdere export erbij. Bestaande personen blijven staan; twee keer dezelfde zip geeft dubbele personen.</p>
          <div>
            <label className="btn" htmlFor="importFile" aria-disabled={!!busy}>Zip kiezen</label>
            <input id="importFile" type="file" accept=".zip,application/zip" hidden disabled={!!busy} onChange={onImport} />
          </div>
          <Note msg={importMsg} />
        </section>

        <section className="card c4 stack zone">
          <h2>Alles verwijderen</h2>
          <p className="muted">Wist alle personen, accounts, chats, gesprekken, onderwerpen, foto's en je tweede wachtwoord. Andere dashboarddata blijft staan. Dit kan niet ongedaan worden gemaakt.</p>
          <label className="field" htmlFor="wipeConfirm">Typ VERWIJDER om te bevestigen
            <input id="wipeConfirm" type="text" autoComplete="off" autoCapitalize="characters" value={wipeText} onChange={(e) => setWipeText(e.target.value)} />
          </label>
          <div><button className="btn danger" type="button" disabled={wipeText.trim() !== 'VERWIJDER' || !!busy} onClick={onWipe}>Alles definitief wissen</button></div>
          <Note msg={wipeMsg} />
        </section>
      </div>
    </div>
  );
}
