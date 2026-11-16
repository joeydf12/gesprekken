import { useEffect, useMemo, useState } from 'react';
import { IconClose } from './Icons.jsx';
import { PLATFORMS, parseChat, todayISO } from '../lib.js';

const EXAMPLE = '[20:14] Lisa: Hoi! Zin in een potje darts?\n[20:15] Joey: Altijd, wanneer?';

export default function PasteDialog({ people, initialPerson, onSave, onClose }) {
  const [persoon, setPersoon] = useState(initialPerson || people[0]?.id || '');
  const [platform, setPlatform] = useState('Discord');
  const [datum, setDatum] = useState(todayISO());
  const [titel, setTitel] = useState('');
  const [tekst, setTekst] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const parsed = useMemo(() => parseChat(tekst, datum), [tekst, datum]);
  const speakers = useMemo(() => {
    const c = {};
    parsed.forEach((m) => {
      if (m.from) c[m.from] = (c[m.from] || 0) + 1;
    });
    return Object.entries(c);
  }, [parsed]);

  const submit = (e) => {
    e.preventDefault();
    if (!parsed.length || !persoon) return;
    onSave({ id: 'x' + Date.now(), persoon_id: persoon, platform, titel: titel.trim() || null, datum, tekst: tekst.replace(/\s+$/, '') });
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pd-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={submit}>
        <header className="sheet-head">
          <h2 id="pd-title">Chat plakken</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten"><IconClose /></button>
        </header>
        <div className="sheet-body">
          <div className="two">
            <label className="field" htmlFor="pd-person">Persoon
              <select id="pd-person" value={persoon} onChange={(e) => setPersoon(e.target.value)}>
                {people.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="pd-plat">Platform
              <select id="pd-plat" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
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
          <label className="field" htmlFor="pd-text">Chat
            <textarea id="pd-text" value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder={EXAMPLE} rows={9} />
          </label>
          <p className={'hint' + (tekst && !parsed.length ? ' warn' : '')}>
            {parsed.length
              ? parsed.length + ' berichten herkend: ' + speakers.map(([n, c]) => n + ' ' + c).join(', ') + '. Berichten van Joey staan rechts.'
              : 'Werkt met WhatsApp-exports, [20:14] Naam: tekst en Naam: tekst.'}
          </p>
        </div>
        <footer className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn primary" disabled={!parsed.length}>Bewaar chat</button>
        </footer>
      </form>
    </div>
  );
}
