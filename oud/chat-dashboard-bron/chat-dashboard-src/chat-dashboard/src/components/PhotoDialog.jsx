import { useEffect, useRef, useState } from 'react';
import { IconClose, IconLock } from './Icons.jsx';
import { encryptFile, toB64 } from '../crypto.js';
import { fetchRecord, getKey, setupVault, unlock } from '../vault.js';

const MAX = 10 * 1024 * 1024;

// Foto toevoegen. Met "Extra privé" wordt de foto eerst op dit apparaat versleuteld.
// In de demo blijft het resultaat in het geheugen; in de echte app gaat het via photos.js naar Supabase.
export default function PhotoDialog({ people, initialPerson, onSave, onClose }) {
  const [persoon, setPersoon] = useState(initialPerson || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [bijschrift, setBijschrift] = useState('');
  const [prive, setPrive] = useState(false);
  const [record, setRecord] = useState(undefined); // undefined = laden, null = nog niet ingesteld
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    fetchRecord().then(setRecord, () => setRecord(null));
  }, []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const pick = (f) => {
    setErr('');
    if (!f) return;
    if (!f.type.startsWith('image/')) return setErr('Dit is geen afbeelding.');
    if (f.size > MAX) return setErr('Maximaal 10 MB per foto.');
    setFile(f);
  };

  const needSetup = prive && !getKey() && record === null;
  const needUnlock = prive && !getKey() && !!record;

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!file) return setErr('Kies eerst een foto.');
    setBusy(true);
    try {
      if (prive && !getKey()) {
        if (needSetup) {
          if (pw.length < 8) throw new Error('Kies minstens 8 tekens.');
          if (pw !== pw2) throw new Error('De twee wachtwoorden zijn niet gelijk.');
          await setupVault(pw, 'demo');
        } else if (!(await unlock(pw))) throw new Error('Wachtwoord klopt niet.');
      }
      let blob = file;
      let cipherHex = null;
      if (prive) {
        blob = await encryptFile(getKey(), file);
        const head = new Uint8Array(await blob.slice(0, 40).arrayBuffer());
        cipherHex = Array.from(head, (b) => b.toString(16).padStart(2, '0')).join(' ');
      }
      onSave({
        id: 'u' + Date.now() + Math.random().toString(36).slice(2, 6),
        persoon_id: persoon || null,
        bijschrift: bijschrift.trim() || null,
        profiel: false,
        versleuteld: prive,
        blob,
        size: blob.size,
        cipherHex,
        url: prive ? null : URL.createObjectURL(file),
      });
    } catch (x) {
      setErr(x.message || 'Er ging iets mis.');
      setBusy(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ph-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet" onSubmit={submit}>
        <header className="sheet-head">
          <h2 id="ph-title">Foto toevoegen</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten"><IconClose /></button>
        </header>
        <div className="sheet-body">
          <div className="dropzone" onClick={() => input.current?.click()}>
            {preview ? <img src={preview} alt="Gekozen foto" /> : <span>Klik om een foto te kiezen</span>}
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files[0])} aria-label="Foto kiezen" />
          </div>
          <div className="two">
            <label className="field" htmlFor="ph-person">Persoon
              <select id="ph-person" value={persoon} onChange={(e) => setPersoon(e.target.value)}>
                <option value="">Los in de bibliotheek</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.naam}</option>)}
              </select>
            </label>
            <label className="field" htmlFor="ph-cap">Bijschrift (optioneel)
              <input id="ph-cap" type="text" value={bijschrift} onChange={(e) => setBijschrift(e.target.value)} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={prive} onChange={(e) => setPrive(e.target.checked)} />
            <span><b><IconLock width={14} height={14} /> Extra privé</b><small>Wordt op dit apparaat versleuteld met je tweede wachtwoord, voordat er iets wordt opgeslagen.</small></span>
          </label>
          {needSetup && (
            <div className="vault-box">
              <p className="hint warn">Eerste keer: kies een tweede wachtwoord (anders dan je inlog). Ben je het kwijt, dan zijn deze foto's voorgoed weg. Niemand kan ze herstellen.</p>
              <div className="two">
                <label className="field" htmlFor="ph-pw">Tweede wachtwoord
                  <input id="ph-pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
                </label>
                <label className="field" htmlFor="ph-pw2">Herhaal
                  <input id="ph-pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
                </label>
              </div>
            </div>
          )}
          {needUnlock && (
            <div className="vault-box">
              <label className="field" htmlFor="ph-pw">Tweede wachtwoord
                <input id="ph-pw" type="password" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
              </label>
            </div>
          )}
          <p className="hint warn" role="alert">{err}</p>
        </div>
        <footer className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn primary" disabled={busy || !file}>{busy ? 'Bezig…' : prive ? 'Versleutel en bewaar' : 'Bewaar foto'}</button>
        </footer>
      </form>
    </div>
  );
}
