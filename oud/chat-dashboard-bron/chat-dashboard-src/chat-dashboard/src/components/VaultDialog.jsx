import { useEffect, useState } from 'react';
import { IconClose, IconLock } from './Icons.jsx';
import { unlock } from '../vault.js';

export default function VaultDialog({ onClose }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (await unlock(pw)) onClose();
      else setErr('Wachtwoord klopt niet.');
    } catch (x) {
      setErr(x.message);
    }
    setBusy(false);
  };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="vd-title" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet narrow" onSubmit={submit}>
        <header className="sheet-head">
          <h2 id="vd-title"><IconLock width={16} height={16} /> Extra privé ontgrendelen</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Sluiten"><IconClose /></button>
        </header>
        <div className="sheet-body">
          <label className="field" htmlFor="vd-pw">Tweede wachtwoord
            <input id="vd-pw" type="password" autoFocus autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <p className="hint warn" role="alert">{err}</p>
        </div>
        <footer className="sheet-foot">
          <button type="button" className="btn" onClick={onClose}>Annuleren</button>
          <button type="submit" className="btn primary" disabled={busy || !pw}>Ontgrendel</button>
        </footer>
      </form>
    </div>
  );
}
