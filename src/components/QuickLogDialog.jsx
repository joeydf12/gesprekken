import { useState } from 'react';
import { useVault } from '../vault/VaultContext.jsx';
import { useToast } from './Toast.jsx';
import { Modal, Note } from './ui.jsx';
import { LOG_VIA } from '../lib/constants.js';
import { errText, today } from '../lib/utils.js';

/** Snel een gesprek vastleggen en besproken onderwerpen afvinken. */
export default function QuickLogDialog({ personId, onClose, onOpenPerson }) {
  const vault = useVault();
  const { data, status } = vault;
  const toast = useToast();
  const person = data.personen.find((p) => p.id === personId);
  const own = [...new Set(data.accounts.filter((a) => a.persoon_id === personId).map((a) => a.platform).filter((p) => p !== 'Anders'))];
  const options = [...own, ...LOG_VIA.filter((p) => !own.includes(p))];
  const open = status.v3 ? data.onderwerpen.filter((t) => t.persoon_id === personId && !t.gedaan) : [];
  const vermijden = person?.vermijden || [];

  const [datum, setDatum] = useState(today());
  const [via, setVia] = useState(own[0] || '');
  const [tekst, setTekst] = useState('');
  const [ticked, setTicked] = useState([]);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!person) return null;
  const toggle = (id) => setTicked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  if (!status.v2) {
    return (
      <Modal title="Gesprek vastleggen" onClose={onClose} footer={<button type="button" className="btn" onClick={onClose}>Sluiten</button>}>
        <p className="hint warn">Het gesprekslog staat nog niet in je database. Voer <code>supabase-migratie.sql</code> uit in Supabase.</p>
      </Modal>
    );
  }

  async function save(e) {
    e.preventDefault();
    const topics = open.filter((t) => ticked.includes(t.id));
    // Alleen onderwerpen afgevinkt, geen tekst? Dan wordt dat de samenvatting.
    const samenvatting = tekst.trim() || (topics.length ? 'Besproken: ' + topics.map((t) => t.tekst).join(', ') : '');
    if (!samenvatting) { setMsg({ text: 'Schrijf kort op waar het over ging.', err: true }); return; }
    if (datum > today()) { setMsg({ text: 'Die datum ligt in de toekomst.', err: true }); return; }
    setBusy(true);
    try {
      await vault.quickLog(personId, { datum: datum || today(), platform: via || null, samenvatting }, ticked);
      toast(`Gesprek met ${person.naam} vastgelegd.`);
      onClose();
    } catch (err) {
      setBusy(false);
      if (!vault.authFailed(err)) setMsg({ text: 'Opslaan mislukt: ' + errText(err), err: true });
    }
  }

  return (
    <Modal title={`Gesprek met ${person.naam}`} onClose={onClose} onSubmit={save} dismissable={!tekst && !ticked.length}
      footer={<>
        <button type="button" className="btn" onClick={() => { onClose(); onOpenPerson(personId); }}>Profiel</button>
        <span className="grow" />
        <button type="submit" className="btn primary" disabled={busy}>Vastleggen</button>
      </>}>
      {vermijden.length > 0 && <div className="flag no"><b>Liever niet over:</b> {vermijden.join(' · ')}</div>}
      <div className="two">
        <label className="field">Datum<input type="date" value={datum} max={today()} onChange={(e) => setDatum(e.target.value)} /></label>
        <label className="field">Via
          <select value={via} onChange={(e) => setVia(e.target.value)}>
            <option value="">—</option>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
      </div>
      {open.length > 0 && (
        <div>
          <h3 className="mini-h">Besproken onderwerpen afvinken</h3>
          <div className="topics">
            {open.map((t) => (
              <label key={t.id} className={'topic' + (ticked.includes(t.id) ? ' done' : '')}>
                <input type="checkbox" checked={ticked.includes(t.id)} onChange={() => toggle(t.id)} />
                <span>{t.tekst}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <label className="field">Waar ging het over?
        <textarea value={tekst} onChange={(e) => setTekst(e.target.value)} autoFocus rows={4}
          placeholder={open.length ? 'Optioneel als je alleen onderwerpen afvinkt' : 'Onderwerpen, afspraken, dingen om te onthouden'} />
      </label>
      <Note msg={msg} role="alert" />
    </Modal>
  );
}
