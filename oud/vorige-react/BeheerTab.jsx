import { useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { Msg } from './ui.jsx';
import { errText, tally } from '../lib/utils.js';

function Bars({ title, counts }) {
  const arr = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!arr.length) return null;
  const max = arr[0][1];
  return (
    <div>
      <h3 style={{ fontSize: '.95rem', marginBottom: 6 }}>{title}</h3>
      {arr.map(([k, v]) => (
        <div className="bar" key={k}>
          <span>{k}</span>
          <i style={{ width: Math.max(6, Math.round((v / max) * 100)) + '%' }} />
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

export default function BeheerTab() {
  const vault = useVault();
  const { data, status, user } = vault;
  const toast = useToast();
  const [exportMsg, setExportMsg] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const [wipeMsg, setWipeMsg] = useState(null);
  const [busy, setBusy] = useState('');
  const [wipeText, setWipeText] = useState('');

  const ints = data.personen.flatMap((p) => (p.interesses || []).map((i) => i.toLowerCase()));
  const overview = [
    { title: 'Platforms', counts: tally(data.accounts.map((a) => a.platform)) },
    ...(status.v2 ? [{ title: 'Gesprekken via', counts: tally(data.gesprekken.map((g) => g.platform)) }] : []),
    { title: 'Landen', counts: tally(data.personen.map((p) => p.land)) },
    { title: 'Relaties', counts: tally(data.personen.map((p) => p.relatie)) },
    { title: "Hobby's", counts: tally(data.personen.flatMap((p) => (p.hobbys || []).map((h) => h.toLowerCase()))) },
    { title: 'Interesses', counts: tally(ints) }
  ].filter((o) => Object.keys(o.counts).length);

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
      ? { text: `Klaar, maar ${missing} foto('s) konden niet worden opgehaald.`, err: true }
      : { text: 'Klaar. Het zipbestand staat in je downloads.' });
  });

  const onImport = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    run('import', setImportMsg, async () => {
      const r = await vault.importZip(file, (text) => setImportMsg({ text }));
      setImportMsg({
        text: `${r.made} personen, ${r.logs} gesprekken, ${r.chats} chats en ${r.photos} foto's teruggezet` + (r.failed ? `, ${r.failed} overgeslagen.` : '.'),
        err: !!r.failed
      });
    });
  };

  const onWipe = () => run('wipe', setWipeMsg, async () => {
    await vault.wipeAll((text) => setWipeMsg({ text }));
    setWipeText('');
    setWipeMsg({ text: 'Alles is gewist. De kluis is leeg.' });
  });

  const onReload = async () => {
    setBusy('reload');
    if (await vault.reload({ freshUrls: true })) toast('Bijgewerkt.');
    setBusy('');
  };

  return (
    <section style={{ display: 'grid', gap: 14 }}>
      <div className="card">
        <h2>Jouw kluis</h2>
        <div className="stats">
          <div><b>{data.personen.length}</b><span>personen</span></div>
          <div><b>{data.accounts.length}</b><span>accounts</span></div>
          {status.v2 && <div><b>{data.gesprekken.length}</b><span>gesprekken</span></div>}
          {status.v3 && <div><b>{data.chats.length}</b><span>chats</span></div>}
          <div><b>{data.fotos.length}</b><span>foto's</span></div>
        </div>
        <p>Deze gegevens staan los van de rest van je dashboard, in eigen tabellen en een eigen privé fotomap.</p>
      </div>

      <div className="card">
        <h2>Koppeling met Supabase</h2>
        <div className="status">
          <div><span>Ingelogd als</span><b>{user.email || '—'}</b></div>
          <div><span>Verbinding</span><b>{status.error ? <span className="bad">Fout: {status.error}</span> : status.loadedAt ? <span className="ok">OK</span> : 'Laden…'}</b></div>
          <div><span>Laatst geladen</span><b>{status.loadedAt ? status.loadedAt.toLocaleTimeString('nl-NL') : '—'}</b></div>
          <div><span>Database</span><b>{status.v2 === null ? '—' : status.v2
            ? <span className="ok">Bijgewerkt (gesprekken en herinneringen aan)</span>
            : <span className="bad">Migratie nog niet uitgevoerd</span>}</b></div>
        </div>
        <div className="status"><div><span>Uitbreidingen</span><b>{status.v3 === null ? '—' : status.v3
          ? <span className="ok">Aan (chats, onderwerpen, hobby's, favorieten)</span>
          : <span className="bad">supabase-migratie-2.sql nog niet uitgevoerd</span>}</b></div></div>
        {status.v2 === false && (
          <p>Voer <code>supabase-migratie.sql</code> uit in de SQL Editor van Supabase om de gesprekkenlog, contactherinneringen en veilig opslaan aan te zetten.</p>
        )}
        <button className="btn" type="button" onClick={onReload} disabled={!!busy}>Opnieuw laden</button>
      </div>

      <div className="card">
        <h2>Overzicht</h2>
        <div style={{ display: 'grid', gap: 14 }}>
          {overview.length
            ? overview.map((o) => <Bars key={o.title} title={o.title} counts={o.counts} />)
            : <p>Zodra je personen toevoegt, zie je hier waar ze vandaan komen en waar ze mee bezig zijn.</p>}
        </div>
      </div>

      <div className="card">
        <h2>Alles ophalen</h2>
        <p>Download één zipbestand met alle personen, gesprekken, chats en onderwerpen (data.json) en alle foto's.</p>
        <button className="btn primary" type="button" onClick={onExport} disabled={!!busy}>Download zip</button>
        <Msg msg={exportMsg} />
      </div>

      <div className="card">
        <h2>Terugzetten uit zip</h2>
        <p>Kies een zip die je eerder via Alles ophalen hebt gedownload. Alles wordt erbij gezet en bestaande personen blijven staan. Twee keer dezelfde zip terugzetten geeft dubbele personen.</p>
        <label className="btn" htmlFor="importFile" style={{ textAlign: 'center' }} aria-disabled={!!busy}>Zip kiezen</label>
        <input id="importFile" type="file" accept=".zip,application/zip" hidden disabled={!!busy} onChange={onImport} />
        <Msg msg={importMsg} />
      </div>

      <div className="card zone">
        <h2>Alles verwijderen</h2>
        <p>Wist alle personen, accounts, gesprekken, chats, onderwerpen en foto's in deze kluis. Je andere dashboarddata blijft staan. Dit kan niet ongedaan worden gemaakt.</p>
        <label className="f" htmlFor="wipeConfirm">Typ VERWIJDER om te bevestigen
          <input id="wipeConfirm" type="text" autoComplete="off" autoCapitalize="characters" value={wipeText} onChange={(e) => setWipeText(e.target.value)} />
        </label>
        <button className="btn danger" type="button" disabled={wipeText.trim() !== 'VERWIJDER' || !!busy} onClick={onWipe}>Alles definitief wissen</button>
        <Msg msg={wipeMsg} />
      </div>
    </section>
  );
}
