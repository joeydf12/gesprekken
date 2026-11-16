import { useMemo, useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { ConfirmButton, Modal, Note } from './ui.jsx';
import { LOG_VIA } from '../lib/constants.js';
import { errText } from '../lib/utils.js';
import { ME, expandShortcuts, firstName, parseChat, speakerKeys, todayISO } from '../lib.js';
import ChatComposer from './ChatComposer.jsx';

const EXAMPLE = `[20:14] Lisa: Hoi! Zin in een potje darts?\n[20:15] ${ME}: Altijd, wanneer?`;

/** Chat plakken (nieuw) of een bewaarde chat bewerken/verwijderen. */
export default function PasteDialog({ people, chatId, initialPerson, onSaved, onClose }) {
  const vault = useVault();
  const toast = useToast();
  const existing = chatId ? vault.data.chats.find((c) => c.id === chatId) : null;
  const sorted = useMemo(() => [...people].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')), [people]);
  const [persoon, setPersoon] = useState(existing?.persoon_id || initialPerson || '');
  const own = [...new Set((people.find((p) => p.id === persoon)?.accounts || []).map((a) => a.platform).filter((p) => p !== 'Anders'))];
  const [platform, setPlatform] = useState(existing ? existing.platform || '' : own[0] || 'Discord');
  const [datum, setDatum] = useState(existing?.datum || todayISO());
  const [titel, setTitel] = useState(existing?.titel || '');
  const [tekst, setTekst] = useState(existing?.tekst || '');
  const [belangrijk, setBelangrijk] = useState(!!existing?.belangrijk);
  const [extras, setExtras] = useState([]);       // extra namen voor groepsgesprekken
  const [extraName, setExtraName] = useState('');
  const other = firstName(people.find((p) => p.id === persoon)?.naam) || 'Ander';
  const keys = useMemo(() => speakerKeys([other, ...extras]), [other, extras]);
  // "l: hoi" -> "Lisa: hoi" (voor voorbeeld én opslaan)
  const expanded = useMemo(() => expandShortcuts(tekst, keys), [tekst, keys]);
  const addLine = (l) => setTekst((t) => (t && !t.endsWith('\n') ? t + '\n' : t) + l);
  const addExtra = () => {
    const n = extraName.trim();
    if (n && ![ME, other, ...extras].some((x) => x.toLowerCase() === n.toLowerCase())) setExtras((l) => [...l, n]);
    setExtraName('');
  };
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const options = [...own, ...LOG_VIA.filter((p) => !own.includes(p))];
  if (platform && !options.includes(platform)) options.unshift(platform);

  const parsed = useMemo(() => parseChat(expanded, datum), [expanded, datum]);
  const speakers = useMemo(() => {
    const c = {};
    parsed.forEach((m) => { if (m.from) c[m.from] = (c[m.from] || 0) + 1; });
    return Object.entries(c);
  }, [parsed]);

  const submit = async (e) => {
    e.preventDefault();
    if (!persoon) { setMsg({ text: 'Kies bij wie deze chat hoort.', err: true }); return; }
    if (!parsed.length) { setMsg({ text: 'Plak eerst een chat.', err: true }); return; }
    setBusy(true);
    try {
      const saved = await vault.saveChat({ id: existing?.id, persoon_id: persoon, platform, titel, datum, belangrijk, tekst: expanded.replace(/\s+$/, '') });
      toast(existing ? 'Chat bijgewerkt.' : 'Chat bewaard.');
      onSaved(saved);
    } catch (err) {
      setBusy(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Opslaan mislukt: ' + errText(err), err: true });
    }
  };

  const remove = async () => {
    setBusy(true);
    try { await vault.deleteChat(existing.id); toast('Chat verwijderd.'); onClose(); } catch (err) {
      setBusy(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Verwijderen mislukt: ' + errText(err), err: true });
    }
  };

  if (!people.length) {
    return (
      <Modal title="Chat plakken" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Sluiten</button>}>
        <p className="hint">Voeg eerst een persoon toe. Een chat hoort altijd bij iemand.</p>
      </Modal>
    );
  }

  return (
    <Modal title={existing ? 'Chat bewerken' : 'Chat plakken'} onClose={onClose} onSubmit={submit} dismissable={!tekst}
      footer={<>
        {existing && <ConfirmButton label="Verwijderen" onConfirm={remove} disabled={busy} className="btn danger" />}
        <span className="grow" />
        <button type="button" className="btn" onClick={onClose}>Annuleren</button>
        <button type="submit" className="btn primary" disabled={busy || !parsed.length}>{busy ? 'Bezig…' : existing ? 'Opslaan' : 'Bewaar chat'}</button>
      </>}>
      <div className="two">
        <label className="field" htmlFor="pd-person">Persoon
          <select id="pd-person" value={persoon} onChange={(e) => setPersoon(e.target.value)}>
            <option value="">Kies…</option>
            {sorted.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
          </select>
        </label>
        <label className="field" htmlFor="pd-plat">Platform
          <select id="pd-plat" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="">—</option>
            {options.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <div className="two">
        <label className="field" htmlFor="pd-date">Datum
          <input id="pd-date" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </label>
        <label className="field" htmlFor="pd-titel">Titel (optioneel)
          <input id="pd-titel" type="text" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="bv. Plannen voor zaterdag" />
        </label>
      </div>
      <ChatComposer keys={keys} onAdd={addLine} />
      <div className="composer-extra">
        <input type="text" value={extraName} onChange={(e) => setExtraName(e.target.value)} placeholder="Groepsgesprek? Naam toevoegen"
          aria-label="Extra persoon in dit gesprek" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }} />
        <button type="button" className="btn small" onClick={addExtra} disabled={!extraName.trim()}>+ Naam</button>
        {extras.map((n) => (
          <button key={n} type="button" className="chip" onClick={() => setExtras((l) => l.filter((x) => x !== n))} aria-label={n + ' weghalen'}>{n} ✕</button>
        ))}
      </div>
      <label className="field" htmlFor="pd-text">Chat (plakken, of hierboven intypen)
        <textarea id="pd-text" value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={EXAMPLE + '\n\nOf kort: ' + keys.map((k) => k.key + ': …').join('  ')} rows={9} />
      </label>
      <p className={'hint' + (tekst && !parsed.length ? ' warn' : '')}>
        {parsed.length
          ? parsed.length + ' berichten herkend: ' + speakers.map(([n, c]) => n + ' ' + c).join(', ') + `. Berichten van ${ME} staan rechts.`
          : 'Werkt met WhatsApp-exports, [20:14] Naam: tekst en Naam: tekst.'}
      </p>
      {vault.status.v3 && (
        <label className="check">
          <input type="checkbox" checked={belangrijk} onChange={(e) => setBelangrijk(e.target.checked)} />
          <span><b>★ Belangrijk</b><small>Valt op in het chatarchief.</small></span>
        </label>
      )}
      <Note msg={msg} role="alert" />
    </Modal>
  );
}
